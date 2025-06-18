const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts,
  getProductStats,
  getProductReviews,
  addProductReview
} = require('../controllers/productController');

// Public Routes (no authentication required)

// GET /api/products - Get all products with filtering, sorting, pagination
router.get('/', getAllProducts);

// GET /api/products/featured - Get featured products
router.get('/featured', getFeaturedProducts);

// GET /api/products/category/:category - Get products by category
router.get('/category/:category', getProductsByCategory);

// GET /api/products/search - Search products
router.get('/search', searchProducts);

// GET /api/products/stats - Get product statistics
router.get('/stats', getProductStats);

// GET /api/products/:id - Get single product by ID
router.get('/:id', getProductById);

// GET /api/products/:id/reviews - Get reviews for a product
router.get('/:id/reviews', getProductReviews);

// POST /api/products/:id/reviews - Add a review to a product
router.post('/:id/reviews', addProductReview);

module.exports = router; 