const AdminActionLog = require('../models/AdminActionLog');

// Middleware to log admin actions
const logAdminAction = (actionType, targetType, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log the action after successful response
      logAction(req, res, data, startTime, actionType, targetType, options);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Function to perform the actual logging
const logAction = async (req, res, responseData, startTime, actionType, targetType, options) => {
  try {
    const duration = Date.now() - startTime;
    const admin = req.admin || req.user;
    
    if (!admin) return; // Skip if no admin context
    
    // Determine target information
    let targetId = '';
    let targetName = '';
    let description = '';
    let changes = {};
    let severity = 'medium';
    
    // Extract target info based on request
    if (req.params.id) {
      targetId = req.params.id;
    }
    
    // Extract changes if available
    if (req.body && req.originalBody) {
      changes = {
        before: req.originalBody,
        after: req.body
      };
    }
    
    // Generate description based on action type
    switch (actionType) {
      case 'order_status_update':
        targetId = req.params.id;
        targetName = `Order ${req.body.orderNumber || targetId}`;
        description = `Updated order status to ${req.body.status}`;
        severity = 'high';
        break;
        
      case 'product_created':
        targetId = responseData.data?._id || req.body.name;
        targetName = req.body.name || 'New Product';
        description = `Created new product: ${targetName}`;
        severity = 'medium';
        break;
        
      case 'product_updated':
        targetId = req.params.id;
        targetName = req.body.name || 'Product';
        description = `Updated product: ${targetName}`;
        severity = 'medium';
        break;
        
      case 'inventory_updated':
        targetId = req.params.id;
        targetName = req.body.productName || 'Product';
        description = `Updated inventory for ${targetName}: ${req.body.operation} ${req.body.quantity}`;
        severity = 'high';
        break;
        
      case 'bulk_action_performed':
        targetId = 'bulk';
        targetName = `${req.body.selectedItems?.length || 0} items`;
        description = `Performed bulk action: ${req.body.action} on ${targetName}`;
        severity = 'high';
        break;
        
      default:
        targetName = options.defaultTargetName || 'System';
        description = options.defaultDescription || `Performed ${actionType}`;
    }
    
    // Determine status based on response
    const status = responseData.success !== false && res.statusCode < 400 ? 'success' : 'failed';
    const errorMessage = status === 'failed' ? responseData.message : undefined;
    
    // Log the action
    await AdminActionLog.logAction({
      adminId: admin._id,
      adminName: admin.name || admin.username,
      adminEmail: admin.email,
      action: actionType,
      targetType,
      targetId: targetId.toString(),
      targetName,
      description,
      changes,
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        duration,
        affectedRecords: options.affectedRecords
      },
      severity,
      status,
      errorMessage
    });
    
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error to prevent breaking main functionality
  }
};

// Specific middleware functions for different actions
const logOrderAction = (actionType, options = {}) => {
  return logAdminAction(actionType, 'order', options);
};

const logProductAction = (actionType, options = {}) => {
  return logAdminAction(actionType, 'product', options);
};

const logInventoryAction = (actionType, options = {}) => {
  return logAdminAction(actionType, 'inventory', options);
};

const logSystemAction = (actionType, options = {}) => {
  return logAdminAction(actionType, 'system', options);
};

// Middleware to capture original request body for change tracking
const captureOriginalData = async (req, res, next) => {
  try {
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const Model = getModelFromPath(req.path);
      if (Model && req.params.id) {
        req.originalBody = await Model.findById(req.params.id).lean();
      }
    }
  } catch (error) {
    // Continue even if we can't capture original data
  }
  next();
};

// Helper function to get model from request path
const getModelFromPath = (path) => {
  if (path.includes('/products/')) {
    return require('../models/Product');
  }
  if (path.includes('/orders/')) {
    return require('../models/Order');
  }
  return null;
};

// Middleware to log admin login
const logAdminLogin = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data.success && data.admin) {
      logLoginAction(req, data.admin);
    }
    return originalJson.call(this, data);
  };
  
  next();
};

const logLoginAction = async (req, admin) => {
  try {
    await AdminActionLog.logAction({
      adminId: admin._id,
      adminName: admin.name || admin.username,
      adminEmail: admin.email,
      action: 'admin_login',
      targetType: 'admin',
      targetId: admin._id.toString(),
      targetName: admin.name || admin.username,
      description: 'Admin logged in',
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID
      },
      severity: 'low',
      status: 'success'
    });
  } catch (error) {
    console.error('Failed to log admin login:', error);
  }
};

module.exports = {
  logAdminAction,
  logOrderAction,
  logProductAction,
  logInventoryAction,
  logSystemAction,
  captureOriginalData,
  logAdminLogin
}; 