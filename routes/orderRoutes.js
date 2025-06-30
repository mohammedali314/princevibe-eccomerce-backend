const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const emailService = require('../utils/emailService');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { Client, LocalAuth } = require('whatsapp-web.js');

const router = express.Router();

// WhatsApp integration
let whatsappClient;

// Initialize WhatsApp client only once
if (!global._whatsappClient) {
  whatsappClient = new Client({
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    authStrategy: new LocalAuth({
      clientId: 'prince-vibe-whatsapp'
    })
  });
  
  whatsappClient.on('qr', qr => {
    console.log('Scan this QR with your WhatsApp app:');
    require('qrcode-terminal').generate(qr, { small: true });
  });
  
  whatsappClient.on('ready', () => {
    console.log('WhatsApp client is ready for order notifications!');
  });
  
  whatsappClient.on('authenticated', () => {
    console.log('WhatsApp client authenticated successfully!');
  });
  
  whatsappClient.on('auth_failure', msg => {
    console.error('WhatsApp authentication failed:', msg);
  });
  
  whatsappClient.initialize();
  global._whatsappClient = whatsappClient;
} else {
  whatsappClient = global._whatsappClient;
}

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public (with optional authentication)
const createOrder = async (req, res) => {
  try {
    const { customer, items, summary, payment, notes } = req.body;

    // Validate required fields
    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer information and order items are required'
      });
    }

    // Validate customer data
    if (!customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, email, and phone are required'
      });
    }

    // Validate address
    if (!customer.address || !customer.address.street || !customer.address.city) {
      return res.status(400).json({
        success: false,
        message: 'Complete address is required'
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.name || !item.price || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId, name, price, and quantity'
        });
      }
    }

    // Get product details to verify prices and stock
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    // Validate prices and stock (skip stock validation for now as not all products have stock field)
    for (const orderItem of items) {
      const product = products.find(p => p._id.toString() === orderItem.productId);
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${orderItem.name} not found`
        });
      }

      // Price validation (allow some tolerance for currency conversion)
      if (Math.abs(product.price - orderItem.price) > 1) {
        return res.status(400).json({
          success: false,
          message: `Price mismatch for ${product.name}. Current price: Rs.${product.price}`
        });
      }

      // Stock validation (only if product has stock field)
      if (product.quantity !== undefined && product.quantity < orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}`
        });
      }
    }

    // Prepare customer data with user ID if authenticated
    const customerData = {
      name: customer.name,
      email: customer.email.toLowerCase(),
      phone: customer.phone,
      address: customer.address
    };

    // If user is authenticated via JWT token, add userId to customer data
    if (req.user && req.user._id) {
      customerData.userId = req.user._id;
    }
    // If userId is provided in customer data (from frontend), use it
    else if (customer.userId) {
      customerData.userId = customer.userId;
    }

    // Create order
    const order = new Order({
      customer: customerData,
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

    // Update product stock only if product has quantity field
    for (const orderItem of items) {
      const product = products.find(p => p._id.toString() === orderItem.productId);
      if (product && product.quantity !== undefined) {
        await Product.findByIdAndUpdate(
          orderItem.productId,
          { $inc: { quantity: -orderItem.quantity } }
        );
      }
    }

    // WhatsApp notification logic
    if (whatsappClient && whatsappClient.info && whatsappClient.info.wid) {
      try {
        let itemLines = items.map(item => `• ${item.name} x${item.quantity} (Rs ${item.price})`).join('\n');
        let message = `🛒 *New Order Received!*
Order #: ${order.orderNumber}
Customer: ${customer.name}
Phone: ${customer.phone}
Email: ${customer.email}
City: ${customer.address.city}

*Items:*
${itemLines}

*Total:* Rs ${summary.total}\n`;
        whatsappClient.sendMessage('923089747141@c.us', message);
        console.log('WhatsApp order notification sent.');
      } catch (waError) {
        console.error('Failed to send WhatsApp notification:', waError);
      }
    } else {
      console.warn('WhatsApp client not ready, order notification not sent.');
    }

    // Send order confirmation email
    try {
      await emailService.sendOrderConfirmation(order);
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Continue with order creation even if email fails
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

// @desc    Get orders by user ID
// @route   GET /api/orders/user/:userId
// @access  Private (User)
const getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify that the requesting user is accessing their own orders (if authenticated)
    if (req.user && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own orders.'
      });
    }

    // Find orders where customer.userId matches
    const orders = await Order.find({ 'customer.userId': userId })
      .populate('items.productId', 'name images sku')
      .sort({ createdAt: -1 });

    // Remove sensitive admin information
    const orderData = orders.map(order => {
      const data = order.toObject();
      delete data.notes?.admin;
      return data;
    });

    res.status(200).json({
      success: true,
      data: orderData
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get orders by user email (fallback method)
// @route   GET /api/orders/by-email/:email
// @access  Public
const getOrdersByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    // Find orders where customer.email matches
    const orders = await Order.find({ 'customer.email': email.toLowerCase() })
      .populate('items.productId', 'name images sku')
      .sort({ createdAt: -1 });

    // Remove sensitive admin information
    const orderData = orders.map(order => {
      const data = order.toObject();
      delete data.notes?.admin;
      return data;
    });

    res.status(200).json({
      success: true,
      data: orderData
    });

  } catch (error) {
    console.error('Get orders by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Track guest order by order number and email
// @route   POST /api/orders/track-guest
// @access  Public
const trackGuestOrder = async (req, res) => {
  try {
    const { orderNumber, email } = req.body;

    if (!orderNumber || !email) {
      return res.status(400).json({
        success: false,
        message: 'Order number and email are required'
      });
    }

    // Find order by order number and customer email
    const order = await Order.findOne({ 
      orderNumber: orderNumber,
      'customer.email': email.toLowerCase()
    }).populate('items.productId', 'name images sku');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Please check your order number and email address.'
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
    console.error('Track guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get current user's orders
// @route   GET /api/orders/my-orders
// @access  Private (User)
const getMyOrders = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Find orders for the authenticated user
    const orders = await Order.find({ 'customer.userId': req.user._id })
      .populate('items.productId', 'name images sku')
      .sort({ createdAt: -1 });

    // Remove sensitive admin information
    const orderData = orders.map(order => {
      const data = order.toObject();
      delete data.notes?.admin;
      return data;
    });

    res.status(200).json({
      success: true,
      data: orderData
    });

  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get all orders (simplified version for frontend)
// @route   GET /api/orders
// @access  Public (for basic order listing)
const getAllOrdersPublic = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    
    // Get orders with basic info only
    const orders = await Order.find(filter)
      .select('orderNumber customer.name customer.email status summary.total createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Order.countDocuments(filter);
    
    res.json({
      success: true,
      data: orders,
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Routes - Order specific routes before parameterized ones
router.get('/', getAllOrdersPublic);  // Add this route for general order listing
router.post('/', optionalAuth, createOrder);  // Optional auth to allow both logged-in and guest orders
router.get('/my-orders', authenticate, getMyOrders);  // Protected route for authenticated users
router.get('/user/:userId', authenticate, getOrdersByUserId);  // Protected route
router.get('/by-email/:email', getOrdersByEmail);  // Public route for email-based lookup
router.post('/track-guest', trackGuestOrder);  // Public route for guest order tracking
router.get('/:orderNumber/tracking', getOrderTracking);
router.get('/:orderNumber', getOrderByNumber);

module.exports = router; 