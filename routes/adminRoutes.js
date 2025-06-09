const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const {
  adminLogin,
  adminRegister,
  getAdminProfile,
  updateAdminProfile,
  refreshToken
} = require('../controllers/adminController');

const {
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  getAllProducts,
  getProductById,
  getProductStats
} = require('../controllers/productController');

const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderAnalytics
} = require('../controllers/orderController');

const {
  getAdminActionLogs,
  getRecentActions,
  getActionStats,
  getLowStockAlerts,
  resolveLowStockAlert,
  getStockAlertStats,
  getStockMovements,
  getProductStockSummary
} = require('../controllers/adminLogController');

const { authenticateAdmin } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');

// Authentication Routes
router.post('/login', adminLogin);
router.post('/register', adminRegister);
router.post('/refresh-token', refreshToken);

// Protected Admin Routes (require authentication)
router.use(authenticateAdmin); // All routes below this require authentication

// Admin Profile Routes
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);

// Product Management Routes
router.get('/products/stats', getProductStats);
router.get('/products/:id', getProductById);
router.get('/products', getAllProducts);
router.post('/products', uploadMultiple, createProduct);
router.put('/products/:id', uploadMultiple, updateProduct);
router.delete('/products/:id', deleteProduct);

// Image Upload Routes
router.post('/products/:id/images', uploadMultiple, uploadProductImages);
router.delete('/products/:id/images/:imageId', deleteProductImage);

// Order Management Routes
router.get('/orders/analytics', getOrderAnalytics);
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

// Admin Action Logging Routes
router.get('/logs/actions', getAdminActionLogs);
router.get('/logs/recent', getRecentActions);
router.get('/logs/stats', getActionStats);

// Stock Alert Management Routes
router.get('/alerts/stock', getLowStockAlerts);
router.put('/alerts/stock/:id/resolve', resolveLowStockAlert);
router.get('/alerts/stock/stats', getStockAlertStats);

// Stock Movement Routes
router.get('/stock/movements', getStockMovements);
router.get('/stock/movements/:productId/summary', getProductStockSummary);

// Analytics Routes
router.get('/analytics/dashboard', async (req, res) => {
  try {
    console.log('Analytics dashboard request started');
    
    // Get basic counts
    console.log('Fetching product count...');
    const totalProducts = await Product.countDocuments();
    console.log('Product count:', totalProducts);
    
    console.log('Fetching order count...');
    const totalOrders = await Order.countDocuments();
    console.log('Order count:', totalOrders);
    
    console.log('Fetching recent orders...');
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    console.log('Recent orders:', recentOrders);
    
    console.log('Fetching revenue...');
    // Get revenue
    const revenue = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$summary.total' } } }
    ]);
    console.log('Revenue aggregate result:', revenue);
    
    console.log('Fetching low stock products...');
    // Get low stock products
    const lowStockProducts = await Product.find({ quantity: { $lt: 10 } })
      .select('name quantity sku')
      .limit(5);
    console.log('Low stock products:', lowStockProducts);
    
    const responseData = {
      totalProducts,
      totalOrders,
      recentOrders,
      totalRevenue: revenue[0]?.total || 0,
      lowStockProducts
    };
    
    console.log('Sending response:', responseData);
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router; 