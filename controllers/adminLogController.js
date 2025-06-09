const AdminActionLog = require('../models/AdminActionLog');
const LowStockAlert = require('../models/LowStockAlert');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

// Admin Action Log Controllers
const getAdminActionLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, adminId, startDate, endDate } = req.query;
    
    // Build filter object
    const filter = {};
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await AdminActionLog.find(filter)
      .populate('adminId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await AdminActionLog.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        logs,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      }
    });
  } catch (error) {
    console.error('Get admin action logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin action logs',
      error: error.message
    });
  }
};

const getRecentActions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentActions = await AdminActionLog.find()
      .populate('adminId', 'name email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: recentActions
    });
  } catch (error) {
    console.error('Get recent actions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent actions',
      error: error.message
    });
  }
};

const getActionStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get action counts by type
    const actionStats = await AdminActionLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get daily activity
    const dailyActivity = await AdminActionLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          actions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get top admins by activity
    const topAdmins = await AdminActionLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$adminId', actions: { $sum: 1 } } },
      { $sort: { actions: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $project: {
          _id: 1,
          actions: 1,
          name: '$admin.name',
          email: '$admin.email'
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        actionStats,
        dailyActivity,
        topAdmins,
        totalActions: await AdminActionLog.countDocuments({ timestamp: { $gte: startDate } })
      }
    });
  } catch (error) {
    console.error('Get action stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch action stats',
      error: error.message
    });
  }
};

// Low Stock Alert Controllers
const getLowStockAlerts = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status !== 'all') filter.status = status;
    
    const alerts = await LowStockAlert.find(filter)
      .populate('productId', 'name sku images price')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await LowStockAlert.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        alerts,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      }
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock alerts',
      error: error.message
    });
  }
};

const resolveLowStockAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    
    const alert = await LowStockAlert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    alert.status = 'resolved';
    alert.resolvedBy = req.admin.id;
    alert.resolvedAt = new Date();
    alert.resolutionAction = action;
    alert.resolutionNotes = notes;
    
    await alert.save();
    
    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });
  } catch (error) {
    console.error('Resolve low stock alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
};

const getStockAlertStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const stats = await LowStockAlert.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const criticalAlerts = await LowStockAlert.countDocuments({
      status: 'pending',
      severity: 'critical'
    });
    
    const totalAlerts = await LowStockAlert.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    res.json({
      success: true,
      data: {
        statusBreakdown: stats,
        criticalAlerts,
        totalAlerts
      }
    });
  } catch (error) {
    console.error('Get stock alert stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock alert stats',
      error: error.message
    });
  }
};

// Stock Movement Controllers
const getStockMovements = async (req, res) => {
  try {
    const { 
      productId, 
      type, 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate 
    } = req.query;
    
    const filter = {};
    if (productId) filter.productId = productId;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const movements = await StockMovement.find(filter)
      .populate('productId', 'name sku images')
      .populate('orderId', 'orderNumber')
      .populate('adminId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await StockMovement.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        movements,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      }
    });
  } catch (error) {
    console.error('Get stock movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movements',
      error: error.message
    });
  }
};

const getProductStockSummary = async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get product details
    const product = await Product.findById(productId).select('name sku quantity');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get stock movements for this product
    const movements = await StockMovement.find({
      productId: productId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });
    
    // Calculate summary statistics
    const summary = movements.reduce((acc, movement) => {
      if (movement.type === 'in') {
        acc.totalIn += movement.quantity;
      } else {
        acc.totalOut += movement.quantity;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0 });
    
    // Get movement types breakdown
    const typeBreakdown = await StockMovement.aggregate([
      { 
        $match: { 
          productId: product._id,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { type: '$type', reason: '$reason' },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        product,
        summary: {
          ...summary,
          netChange: summary.totalIn - summary.totalOut,
          currentStock: product.quantity
        },
        movements: movements.slice(0, 10), // Latest 10 movements
        typeBreakdown
      }
    });
  } catch (error) {
    console.error('Get product stock summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product stock summary',
      error: error.message
    });
  }
};

module.exports = {
  // Admin Action Log functions
  getAdminActionLogs,
  getRecentActions,
  getActionStats,
  
  // Low Stock Alert functions
  getLowStockAlerts,
  resolveLowStockAlert,
  getStockAlertStats,
  
  // Stock Movement functions
  getStockMovements,
  getProductStockSummary
}; 