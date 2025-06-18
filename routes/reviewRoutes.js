const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Product = require('../models/Product');

// Validation middleware
const validateReview = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Review text must be between 1 and 1000 characters')
];

// GET /api/reviews/:productId - Get reviews for a specific product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'date' } = req.query;

    // Validate product ID
    if (!require('mongoose').Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Build query
    const query = {
      productId,
      isActive: true
    };

    // Build sort object
    let sortObject = {};
    switch (sort) {
      case 'rating':
        sortObject = { rating: -1 };
        break;
      case 'date':
      default:
        sortObject = { date: -1 };
        break;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get reviews with pagination
    const reviews = await Review.find(query)
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalReviews = await Review.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalReviews / limitNum);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalReviews,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
});

// POST /api/reviews - Create a new review
router.post('/', validateReview, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId, name, rating, text } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is active
    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot review inactive product'
      });
    }

    // Create new review
    const review = new Review({
      productId,
      name,
      rating,
      text
    });

    await review.save();

    // Get updated reviews for the product
    const updatedReviews = await Review.find({ productId, isActive: true })
      .sort({ date: -1 })
      .lean();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
      totalReviews: updatedReviews.length
    });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review'
    });
  }
});

// GET /api/reviews/stats/:productId - Get review statistics for a product
router.get('/stats/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate product ID
    if (!require('mongoose').Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Get review statistics
    const stats = await Review.getAverageRating(productId);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          productId: new require('mongoose').Types.ObjectId(productId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        ratingDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review statistics'
    });
  }
});

module.exports = router; 