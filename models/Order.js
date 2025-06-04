const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'PV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
    }
  },
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Optional for guest orders
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: 'Pakistan' }
    }
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
    sku: { type: String }
  }],
  summary: {
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  payment: {
    method: {
      type: String,
      enum: ['cod', 'card', 'bank_transfer', 'wallet'],
      default: 'cod'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  shipping: {
    method: {
      type: String,
      enum: ['standard', 'express', 'overnight'],
      default: 'standard'
    },
    fee: { type: Number, default: 0 },
    estimatedDelivery: Date,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  notes: {
    customer: String,
    admin: String
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add timeline entry
orderSchema.methods.addTimelineEntry = function(status, note, updatedBy) {
  this.timeline.push({
    status,
    note,
    updatedBy,
    timestamp: new Date()
  });
  this.status = status;
  this.updatedAt = new Date();
  return this.save();
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.summary.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.summary.total = this.summary.subtotal + this.summary.tax + this.summary.shipping - this.summary.discount;
  return this;
};

// Pre-save middleware
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Initialize timeline if empty
  if (this.timeline.length === 0) {
    this.timeline.push({
      status: this.status,
      timestamp: this.createdAt,
      note: 'Order created',
      updatedBy: 'system'
    });
  }
  
  next();
});

// Static method to get order statistics
orderSchema.statics.getOrderStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$summary.total' }
      }
    }
  ]);
  
  const totalOrders = await this.countDocuments();
  const totalRevenue = await this.aggregate([
    { $match: { 'payment.status': 'paid' } },
    { $group: { _id: null, total: { $sum: '$summary.total' } } }
  ]);
  
  return {
    statusBreakdown: stats,
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0
  };
};

module.exports = mongoose.model('Order', orderSchema); 