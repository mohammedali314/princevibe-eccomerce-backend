const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Get all orders with pagination and filtering
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter['payment.status'] = paymentStatus;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get orders with pagination
    const orders = await Order.find(filter)
      .populate('items.productId', 'name images sku')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get single order by ID
// @route   GET /api/admin/orders/:id
// @access  Private (Admin)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId', 'name images sku price specifications');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const orderId = req.params.id;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status and add timeline entry
    await order.addTimelineEntry(status, note || `Order status updated to ${status}`, req.admin.name);

    // Handle specific status updates
    if (status === 'shipped' && req.body.trackingNumber) {
      order.shipping.trackingNumber = req.body.trackingNumber;
      order.shipping.shippedAt = new Date();
    }

    if (status === 'delivered') {
      order.shipping.deliveredAt = new Date();
      order.payment.status = 'paid'; // Auto-mark as paid for COD
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/admin/orders/stats
// @access  Private (Admin)
const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.getOrderStats();

    // Get recent orders count (last 7 days)
    const recentOrdersCount = await Order.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Get monthly revenue trend (last 6 months)
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          'payment.status': 'paid',
          createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$summary.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get top-selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          productName: { $first: '$items.name' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        recentOrdersCount,
        monthlyRevenue,
        topProducts
      }
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Create sample orders for testing
// @route   POST /api/admin/orders/sample
// @access  Private (Admin)
const createSampleOrders = async (req, res) => {
  try {
    // Get some products for sample orders
    const products = await Product.find().limit(3);
    
    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No products found to create sample orders'
      });
    }

    const sampleOrders = [];
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const paymentMethods = ['cod', 'card', 'bank_transfer'];
    const cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

    for (let i = 0; i < 10; i++) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const subtotal = randomProduct.price * quantity;
      
      const order = new Order({
        customer: {
          name: `Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`,
          phone: `+92300000${1000 + i}`,
          address: {
            street: `Street ${i + 1}`,
            city: cities[Math.floor(Math.random() * cities.length)],
            state: 'Punjab',
            zipCode: `${10000 + i}`,
            country: 'Pakistan'
          }
        },
        items: [{
          productId: randomProduct._id,
          name: randomProduct.name,
          price: randomProduct.price,
          quantity,
          image: randomProduct.images[0]?.url || 'default-image.jpg',
          sku: randomProduct.sku
        }],
        summary: {
          subtotal,
          tax: Math.floor(subtotal * 0.1),
          shipping: 200,
          discount: 0,
          total: subtotal + Math.floor(subtotal * 0.1) + 200
        },
        payment: {
          method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          status: Math.random() > 0.3 ? 'paid' : 'pending'
        },
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
      });

      sampleOrders.push(order);
    }

    await Order.insertMany(sampleOrders);

    res.status(201).json({
      success: true,
      message: `${sampleOrders.length} sample orders created successfully`,
      data: sampleOrders
    });

  } catch (error) {
    console.error('Create sample orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  createSampleOrders
}; 