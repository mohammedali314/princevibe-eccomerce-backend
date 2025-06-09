const mongoose = require('mongoose');

const lowStockAlertSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  productName: {
    type: String,
    required: true
  },
  productSku: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    required: true,
    min: 1,
    default: 5 // Default threshold is 5 units
  },
  criticalStockThreshold: {
    type: Number,
    required: true,
    min: 0,
    default: 1 // Critical threshold is 1 unit
  },
  alertLevel: {
    type: String,
    enum: ['low', 'critical', 'out_of_stock'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notifications: [{
    type: {
      type: String,
      enum: ['email', 'dashboard', 'sms'],
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    recipient: String,
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'sent'
    },
    errorMessage: String
  }],
  lastNotificationSent: {
    type: Date,
    default: Date.now
  },
  notificationCount: {
    type: Number,
    default: 1,
    min: 1
  },
  restockSuggestion: {
    recommendedQuantity: {
      type: Number,
      min: 1
    },
    averageMonthlySales: Number,
    lastSaleDate: Date,
    salesVelocity: Number // Sales per day
  },
  category: String,
  price: Number,
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    adminName: String
  },
  resolution: {
    type: String,
    enum: ['restocked', 'discontinued', 'threshold_updated', 'manual_resolve'],
    required: false
  },
  metadata: {
    createdBy: String,
    source: {
      type: String,
      enum: ['system', 'manual', 'import'],
      default: 'system'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
lowStockAlertSchema.index({ productId: 1 });
lowStockAlertSchema.index({ alertLevel: 1, isActive: 1 });
lowStockAlertSchema.index({ isResolved: 1, createdAt: -1 });
lowStockAlertSchema.index({ lastNotificationSent: 1 });
lowStockAlertSchema.index({ category: 1, alertLevel: 1 });

// Determine alert level based on stock and thresholds
lowStockAlertSchema.methods.updateAlertLevel = function() {
  if (this.currentStock === 0) {
    this.alertLevel = 'out_of_stock';
    this.metadata.priority = 'urgent';
  } else if (this.currentStock <= this.criticalStockThreshold) {
    this.alertLevel = 'critical';
    this.metadata.priority = 'high';
  } else if (this.currentStock <= this.lowStockThreshold) {
    this.alertLevel = 'low';
    this.metadata.priority = 'medium';
  }
};

// Add notification record
lowStockAlertSchema.methods.addNotification = function(type, recipient, status = 'sent', errorMessage = null) {
  this.notifications.push({
    type,
    recipient,
    status,
    errorMessage
  });
  
  this.lastNotificationSent = new Date();
  this.notificationCount += 1;
};

// Calculate restock suggestion
lowStockAlertSchema.methods.calculateRestockSuggestion = async function() {
  try {
    const StockMovement = mongoose.model('StockMovement');
    
    // Get sales data for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const salesData = await StockMovement.aggregate([
      {
        $match: {
          productId: this.productId,
          movementType: 'sale',
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$quantity' },
          salesCount: { $sum: 1 },
          lastSale: { $max: '$timestamp' }
        }
      }
    ]);
    
    if (salesData.length > 0) {
      const data = salesData[0];
      const salesVelocity = data.totalSold / 30; // Sales per day
      const averageMonthlySales = data.totalSold;
      
      // Suggest restock quantity based on 30-60 days of inventory
      const recommendedQuantity = Math.max(
        Math.ceil(salesVelocity * 45), // 45 days of stock
        this.lowStockThreshold * 2,     // At least 2x low stock threshold
        10 // Minimum 10 units
      );
      
      this.restockSuggestion = {
        recommendedQuantity,
        averageMonthlySales,
        lastSaleDate: data.lastSale,
        salesVelocity: parseFloat(salesVelocity.toFixed(2))
      };
    } else {
      // No recent sales data - use conservative estimate
      this.restockSuggestion = {
        recommendedQuantity: this.lowStockThreshold * 3,
        averageMonthlySales: 0,
        salesVelocity: 0
      };
    }
  } catch (error) {
    console.error('Error calculating restock suggestion:', error);
  }
};

// Static method to create or update alert
lowStockAlertSchema.statics.createOrUpdateAlert = async function(productData) {
  try {
    const {
      productId,
      productName,
      productSku,
      currentStock,
      lowStockThreshold = 5,
      criticalStockThreshold = 1,
      category,
      price
    } = productData;
    
    // Check if alert already exists
    let alert = await this.findOne({ productId });
    
    if (alert) {
      // Update existing alert
      alert.currentStock = currentStock;
      alert.productName = productName;
      alert.productSku = productSku;
      alert.category = category;
      alert.price = price;
      
      // Check if stock was replenished (resolved)
      if (currentStock > lowStockThreshold && !alert.isResolved) {
        alert.isResolved = true;
        alert.resolvedAt = new Date();
        alert.resolution = 'restocked';
      } else if (currentStock <= lowStockThreshold && alert.isResolved) {
        // Stock is low again - reactivate alert
        alert.isResolved = false;
        alert.resolvedAt = null;
        alert.resolution = null;
        alert.isActive = true;
      }
      
      alert.updateAlertLevel();
      await alert.calculateRestockSuggestion();
      await alert.save();
      
      return alert;
    } else if (currentStock <= lowStockThreshold) {
      // Create new alert only if stock is actually low
      alert = new this({
        productId,
        productName,
        productSku,
        currentStock,
        lowStockThreshold,
        criticalStockThreshold,
        category,
        price,
        metadata: {
          source: 'system'
        }
      });
      
      alert.updateAlertLevel();
      await alert.calculateRestockSuggestion();
      await alert.save();
      
      return alert;
    }
    
    return null; // No alert needed
    
  } catch (error) {
    console.error('Error creating/updating low stock alert:', error);
    throw error;
  }
};

// Static method to get active alerts
lowStockAlertSchema.statics.getActiveAlerts = function(options = {}) {
  const {
    alertLevel,
    category,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;
  
  const filter = { isActive: true, isResolved: false };
  
  if (alertLevel) filter.alertLevel = alertLevel;
  if (category) filter.category = category;
  
  const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  return this.find(filter)
    .populate('productId', 'name images category price inStock')
    .sort(sortOptions)
    .limit(limit);
};

// Static method to resolve alert
lowStockAlertSchema.statics.resolveAlert = async function(alertId, adminData, resolution = 'manual_resolve') {
  try {
    const alert = await this.findById(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    
    alert.isResolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = {
      adminId: adminData.adminId,
      adminName: adminData.adminName
    };
    alert.resolution = resolution;
    
    await alert.save();
    return alert;
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
};

// Static method to get alert statistics
lowStockAlertSchema.statics.getAlertStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: '$alertLevel',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                { $and: ['$isActive', { $not: '$isResolved' }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    const totalAlerts = await this.countDocuments();
    const activeAlerts = await this.countDocuments({ isActive: true, isResolved: false });
    const resolvedToday = await this.countDocuments({
      isResolved: true,
      resolvedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    return {
      totalAlerts,
      activeAlerts,
      resolvedToday,
      alertsByLevel: stats
    };
  } catch (error) {
    console.error('Error getting alert stats:', error);
    throw error;
  }
};

module.exports = mongoose.model('LowStockAlert', lowStockAlertSchema); 