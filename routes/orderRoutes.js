const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

// @desc    Create new order (Public route for customers)
// @route   POST /api/orders
// @access  Public
const createOrder = async (req, res) => {
  try {
    const { customer, items, summary, payment, notes } = req.body;

    // Validate required fields
    if (!customer || !items || !summary || !payment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order information'
      });
    }

    // Validate customer information
    if (!customer.name || !customer.email || !customer.phone || !customer.address) {
      return res.status(400).json({
        success: false,
        message: 'Complete customer information is required'
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Verify products exist and prices are correct
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more products not found'
      });
    }

    // Validate prices and stock
    for (const orderItem of items) {
      const product = products.find(p => p._id.toString() === orderItem.productId);
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${orderItem.name} not found`
        });
      }

      if (product.price !== orderItem.price) {
        return res.status(400).json({
          success: false,
          message: `Price mismatch for ${product.name}. Current price: Rs.${product.price}`
        });
      }

      if (product.stock < orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }
    }

    // Create order
    const order = new Order({
      customer,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        sku: item.sku
      })),
      summary: {
        subtotal: summary.subtotal,
        tax: summary.tax || 0,
        shipping: summary.shipping || 0,
        discount: summary.discount || 0,
        total: summary.total
      },
      payment: {
        method: payment.method || 'cod',
        status: payment.status || 'pending'
      },
      notes: {
        customer: notes?.customer || ''
      },
      status: 'pending'
    });

    // Calculate totals to verify
    order.calculateTotals();
    
    await order.save();

    // Update product stock
    for (const orderItem of items) {
      await Product.findByIdAndUpdate(
        orderItem.productId,
        { $inc: { stock: -orderItem.quantity } }
      );
    }

    // Populate product details for response
    await order.populate('items.productId', 'name images sku category');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get order by order number (for customer tracking)
// @route   GET /api/orders/:orderNumber
// @access  Public
const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .populate('items.productId', 'name images sku');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Remove sensitive admin information
    const orderData = order.toObject();
    delete orderData.notes?.admin;

    res.status(200).json({
      success: true,
      data: orderData
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get order tracking info
// @route   GET /api/orders/:orderNumber/tracking
// @access  Public
const getOrderTracking = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber status timeline shipping.trackingNumber shipping.estimatedDelivery createdAt');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        timeline: order.timeline,
        trackingNumber: order.shipping?.trackingNumber,
        estimatedDelivery: order.shipping?.estimatedDelivery,
        orderDate: order.createdAt
      }
    });

  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Routes
router.post('/', createOrder);
router.get('/:orderNumber', getOrderByNumber);
router.get('/:orderNumber/tracking', getOrderTracking);

module.exports = router; 