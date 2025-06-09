const Order = require('../models/Order');
const Product = require('../models/Product');
const AdminActionLog = require('../models/AdminActionLog');
const StockMovement = require('../models/StockMovement');
const emailService = require('../utils/emailService');

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

    // Get order-related stock movements
    const stockMovements = await StockMovement.getOrderMovements(order._id);

    // Get order-related admin actions
    const adminActions = await AdminActionLog.getActionsByType('order', order._id.toString());

    res.status(200).json({
      success: true,
      data: {
        order,
        stockMovements,
        adminActions: adminActions.slice(0, 10) // Limit to recent 10 actions
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Update order status with business logic validation
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const orderId = req.params.id;

    console.log('Order status update request:', { orderId, status, note, adminId: req.admin?._id });

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = order.status;

    // ✅ ORDER MODIFICATION RESTRICTIONS - Business Logic Validation
    const restrictedTransitions = {
      'delivered': ['pending', 'confirmed', 'processing'], // Can't go back from delivered
      'cancelled': ['confirmed', 'processing', 'shipped', 'delivered'], // Can't change from cancelled (except to returned)
      'returned': ['pending', 'confirmed', 'processing', 'shipped'] // Returns are final
    };

    if (restrictedTransitions[previousStatus] && restrictedTransitions[previousStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order status from ${previousStatus} to ${status}. Invalid status transition.`
      });
    }

    // ✅ PREVENT MODIFICATION OF OLD ORDERS
    const orderAge = (new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24); // Days
    if (orderAge > 30 && ['cancelled', 'returned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel or return orders older than 30 days. Please contact system administrator.'
      });
    }

    // ✅ STOCK MOVEMENT TRACKING - Handle inventory changes
    let stockMovements = [];
    
    // Handle status changes that affect inventory
    if (status === 'cancelled' && !['cancelled', 'returned'].includes(previousStatus)) {
      // Restore inventory for cancelled orders
      for (const item of order.items) {
        try {
          // Update product stock
          await Product.findByIdAndUpdate(
            item.productId,
            { 
              $inc: { quantity: item.quantity },
              $set: { inStock: true } // Mark as in stock
            }
          );

          // Record stock movement (if StockMovement model exists and admin is authenticated)
          if (req.admin && StockMovement.recordMovement) {
            const movement = await StockMovement.recordMovement({
              productId: item.productId,
              movementType: 'cancellation',
              quantity: item.quantity,
              relatedOrderId: order._id,
              relatedOrderNumber: order.orderNumber,
              adminId: req.admin._id,
              adminName: req.admin.name,
              reason: `Order cancelled - stock restored`,
              notes: note || 'Order cancelled by admin',
              source: 'admin'
            });
            stockMovements.push(movement);
          }
        } catch (stockError) {
          console.error('Stock restoration error:', stockError);
          // Continue with status update even if stock update fails
        }
      }
    }

    if (status === 'returned' && !['cancelled', 'returned'].includes(previousStatus)) {
      // Restore inventory for returned orders
      for (const item of order.items) {
        try {
          // Update product stock
          await Product.findByIdAndUpdate(
            item.productId,
            { 
              $inc: { quantity: item.quantity },
              $set: { inStock: true }
            }
          );

          // Record stock movement (if StockMovement model exists and admin is authenticated)
          if (req.admin && StockMovement.recordMovement) {
            const movement = await StockMovement.recordMovement({
              productId: item.productId,
              movementType: 'return',
              quantity: item.quantity,
              relatedOrderId: order._id,
              relatedOrderNumber: order.orderNumber,
              adminId: req.admin._id,
              adminName: req.admin.name,
              reason: `Order returned - stock restored`,
              notes: note || 'Order returned by customer',
              source: 'admin'
            });
            stockMovements.push(movement);
          }
        } catch (stockError) {
          console.error('Stock restoration error:', stockError);
        }
      }
    }

    // Update order status and add timeline entry
    const adminName = req.admin?.name || 'System';
    await order.addTimelineEntry(status, note || `Order status updated to ${status}`, adminName);

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

    // ✅ ADMIN ACTION LOGGING (if admin is authenticated and AdminActionLog exists)
    if (req.admin && AdminActionLog.logAction) {
      try {
        await AdminActionLog.logAction({
          adminId: req.admin._id,
          adminName: req.admin.name,
          adminEmail: req.admin.email,
          action: 'order_status_update',
          targetType: 'order',
          targetId: order._id.toString(),
          targetName: `Order ${order.orderNumber}`,
          description: `Updated order status from ${previousStatus} to ${status}`,
          changes: {
            before: { status: previousStatus },
            after: { status: status, note: note }
          },
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            stockMovements: stockMovements.length,
            trackingNumber: req.body.trackingNumber
          },
          severity: ['cancelled', 'returned'].includes(status) ? 'high' : 'medium',
          status: 'success'
        });
      } catch (logError) {
        console.error('Admin action logging error:', logError);
        // Continue even if logging fails
      }
    }

    // Send appropriate email notification
    try {
      if (status === 'shipped') {
        await emailService.sendShippingNotification(order);
      } else if (status !== previousStatus) {
        await emailService.sendOrderStatusUpdate(order, previousStatus);
      }
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
      // Continue with order update even if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order,
        stockMovements,
        previousStatus,
        newStatus: status
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    console.error('Error stack:', error.stack);
    
    // Log failed action (if admin exists and AdminActionLog exists)
    if (req.admin && AdminActionLog.logAction) {
      try {
        await AdminActionLog.logAction({
          adminId: req.admin._id,
          adminName: req.admin.name,
          adminEmail: req.admin.email,
          action: 'order_status_update',
          targetType: 'order',
          targetId: req.params.id,
          targetName: `Order ${req.params.id}`,
          description: `Failed to update order status to ${req.body.status}`,
          severity: 'high',
          status: 'failed',
          errorMessage: error.message
        });
      } catch (logError) {
        console.error('Failed action logging error:', logError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// @desc    Delete order with restrictions
// @route   DELETE /api/admin/orders/:id
// @access  Private (Admin)
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // ✅ ORDER DELETION RESTRICTIONS
    const restrictedStatuses = ['processing', 'shipped', 'delivered'];
    if (restrictedStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete order with status '${order.status}'. Orders can only be deleted if they are pending, confirmed, cancelled, or returned.`
      });
    }

    // Restore inventory if order was confirmed but not yet shipped
    if (order.status === 'confirmed') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { 
            $inc: { quantity: item.quantity },
            $set: { inStock: true }
          }
        );

        // Record stock movement
        await StockMovement.recordMovement({
          productId: item.productId,
          movementType: 'cancellation',
          quantity: item.quantity,
          relatedOrderId: order._id,
          relatedOrderNumber: order.orderNumber,
          adminId: req.admin._id,
          adminName: req.admin.name,
          reason: `Order deleted - stock restored`,
          source: 'admin'
        });
      }
    }

    await Order.findByIdAndDelete(req.params.id);

    // Log deletion
    await AdminActionLog.logAction({
      adminId: req.admin._id,
      adminName: req.admin.name,
      adminEmail: req.admin.email,
      action: 'order_deleted',
      targetType: 'order',
      targetId: order._id.toString(),
      targetName: `Order ${order.orderNumber}`,
      description: `Deleted order ${order.orderNumber}`,
      severity: 'high',
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get order analytics
// @route   GET /api/admin/orders/analytics
// @access  Private (Admin)
const getOrderAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$summary.total' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get analytics error:', error);
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
  deleteOrder,
  getOrderAnalytics
}; 