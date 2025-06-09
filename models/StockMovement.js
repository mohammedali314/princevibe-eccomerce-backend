const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productSku: {
    type: String,
    required: true
  },
  movementType: {
    type: String,
    required: true,
    enum: [
      'sale',           // Stock decreased due to order
      'return',         // Stock increased due to return
      'cancellation',   // Stock increased due to cancellation
      'adjustment',     // Manual adjustment by admin
      'restock',        // New stock added
      'damage',         // Stock removed due to damage
      'theft',          // Stock removed due to theft
      'expired',        // Stock removed due to expiration
      'initial',        // Initial stock when product created
      'correction'      // Correction entry
    ]
  },
  quantity: {
    type: Number,
    required: true
  },
  quantityBefore: {
    type: Number,
    required: true
  },
  quantityAfter: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  relatedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  relatedOrderNumber: {
    type: String,
    required: false
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  adminName: {
    type: String,
    required: false
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  source: {
    type: String,
    enum: ['system', 'admin', 'api', 'import'],
    default: 'system'
  },
  location: {
    warehouse: String,
    shelf: String,
    bin: String
  },
  batchNumber: String,
  expiryDate: Date,
  supplierInfo: {
    supplierId: String,
    supplierName: String,
    purchaseOrderNumber: String
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
stockMovementSchema.index({ productId: 1, timestamp: -1 });
stockMovementSchema.index({ movementType: 1, timestamp: -1 });
stockMovementSchema.index({ relatedOrderId: 1 });
stockMovementSchema.index({ adminId: 1, timestamp: -1 });
stockMovementSchema.index({ timestamp: -1 });
stockMovementSchema.index({ productSku: 1, timestamp: -1 });

// Static method to record stock movement
stockMovementSchema.statics.recordMovement = async function(movementData) {
  try {
    const Product = mongoose.model('Product');
    
    // Get current product stock
    const product = await Product.findById(movementData.productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    const quantityBefore = product.quantity || 0;
    let quantityChange = movementData.quantity;
    
    // Determine if this increases or decreases stock
    const increasingMovements = ['return', 'cancellation', 'restock', 'adjustment', 'initial', 'correction'];
    const decreasingMovements = ['sale', 'damage', 'theft', 'expired'];
    
    if (decreasingMovements.includes(movementData.movementType)) {
      quantityChange = -Math.abs(quantityChange);
    } else if (increasingMovements.includes(movementData.movementType)) {
      quantityChange = Math.abs(quantityChange);
    }
    
    const quantityAfter = quantityBefore + quantityChange;
    
    // Create movement record
    const movement = new this({
      productId: movementData.productId,
      productName: product.name,
      productSku: product.sku,
      movementType: movementData.movementType,
      quantity: Math.abs(movementData.quantity),
      quantityBefore,
      quantityAfter: Math.max(0, quantityAfter),
      unitCost: movementData.unitCost || 0,
      totalValue: (movementData.unitCost || 0) * Math.abs(movementData.quantity),
      relatedOrderId: movementData.relatedOrderId,
      relatedOrderNumber: movementData.relatedOrderNumber,
      adminId: movementData.adminId,
      adminName: movementData.adminName,
      reason: movementData.reason,
      notes: movementData.notes,
      source: movementData.source || 'system',
      location: movementData.location,
      batchNumber: movementData.batchNumber,
      expiryDate: movementData.expiryDate,
      supplierInfo: movementData.supplierInfo,
      metadata: movementData.metadata
    });
    
    await movement.save();
    return movement;
  } catch (error) {
    console.error('Failed to record stock movement:', error);
    throw error;
  }
};

// Method to get movement history for a product
stockMovementSchema.statics.getProductHistory = function(productId, limit = 50) {
  return this.find({ productId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('relatedOrderId', 'orderNumber status')
    .populate('adminId', 'name email')
    .lean();
};

// Method to get movements by order
stockMovementSchema.statics.getOrderMovements = function(orderId) {
  return this.find({ relatedOrderId: orderId })
    .sort({ timestamp: -1 })
    .populate('productId', 'name sku images')
    .lean();
};

// Method to get recent movements
stockMovementSchema.statics.getRecentMovements = function(limit = 100) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('productId', 'name sku images')
    .populate('relatedOrderId', 'orderNumber')
    .populate('adminId', 'name')
    .lean();
};

// Method to get movement summary
stockMovementSchema.statics.getMovementSummary = async function(productId, dateFrom, dateTo) {
  const match = { productId };
  
  if (dateFrom || dateTo) {
    match.timestamp = {};
    if (dateFrom) match.timestamp.$gte = new Date(dateFrom);
    if (dateTo) match.timestamp.$lte = new Date(dateTo);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$movementType',
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalQuantity: -1 } }
  ]);
};

module.exports = mongoose.model('StockMovement', stockMovementSchema); 