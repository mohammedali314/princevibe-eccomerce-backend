const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Order Actions
      'order_status_update',
      'order_created',
      'order_deleted',
      'order_modified',
      'tracking_added',
      
      // Product Actions
      'product_created',
      'product_updated',
      'product_deleted',
      'product_activated',
      'product_deactivated',
      
      // Inventory Actions
      'inventory_updated',
      'stock_added',
      'stock_removed',
      'bulk_inventory_update',
      
      // Admin Actions
      'admin_login',
      'admin_logout',
      'settings_changed',
      'bulk_action_performed',
      
      // System Actions
      'data_export',
      'data_import',
      'system_backup'
    ]
  },
  targetType: {
    type: String,
    required: true,
    enum: ['order', 'product', 'user', 'admin', 'system', 'inventory']
  },
  targetId: {
    type: String, // Can be ObjectId or other identifier
    required: true
  },
  targetName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    affectedRecords: Number,
    duration: Number // in milliseconds
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  errorMessage: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
adminActionLogSchema.index({ adminId: 1, timestamp: -1 });
adminActionLogSchema.index({ action: 1, timestamp: -1 });
adminActionLogSchema.index({ targetType: 1, targetId: 1 });
adminActionLogSchema.index({ timestamp: -1 });
adminActionLogSchema.index({ severity: 1, timestamp: -1 });

// Static method to log admin action
adminActionLogSchema.statics.logAction = async function(actionData) {
  try {
    const logEntry = new this({
      adminId: actionData.adminId,
      adminName: actionData.adminName,
      adminEmail: actionData.adminEmail,
      action: actionData.action,
      targetType: actionData.targetType,
      targetId: actionData.targetId,
      targetName: actionData.targetName,
      description: actionData.description,
      changes: actionData.changes,
      metadata: actionData.metadata,
      severity: actionData.severity || 'medium',
      status: actionData.status || 'success',
      errorMessage: actionData.errorMessage
    });
    
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error to prevent breaking main functionality
  }
};

// Method to get actions by admin
adminActionLogSchema.statics.getActionsByAdmin = function(adminId, limit = 50) {
  return this.find({ adminId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Method to get recent actions
adminActionLogSchema.statics.getRecentActions = function(limit = 100) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Method to get actions by type
adminActionLogSchema.statics.getActionsByType = function(targetType, targetId) {
  return this.find({ targetType, targetId })
    .sort({ timestamp: -1 })
    .lean();
};

module.exports = mongoose.model('AdminActionLog', adminActionLogSchema); 