const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['luxury', 'smart', 'sport', 'classic'],
    lowercase: true
  },
  
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  
  specifications: {
    movement: String,
    caseMaterial: String,
    waterResistance: String,
    crystal: String,
    bezel: String,
    bracelet: String,
    display: String,
    processor: String,
    storage: String,
    connectivity: String,
    batteryLife: String,
    customFields: [{
      key: String,
      value: String
    }]
  },
  
  features: [{
    type: String,
    trim: true
  }],
  
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String, // For Cloudinary
    alt: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  
  badge: {
    type: String,
    enum: ['Bestseller', 'New', 'Limited', 'Popular', 'Exclusive', 'Value', 'Racing', 'Tough', 'Heritage', 'Fitness', 'Dive', 'Iconic'],
    trim: true
  },
  
  inStock: {
    type: Boolean,
    default: true
  },
  
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  
  reviews: {
    count: {
      type: Number,
      default: 0
    },
    data: [{
      user: String,
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  sku: {
    type: String,
    unique: true,
    trim: true
  },
  
  weight: Number, // in grams
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      default: 'mm'
    }
  },
  
  shipping: {
    weight: Number,
    length: Number,
    width: Number,
    height: Number,
    freeShipping: {
      type: Boolean,
      default: true
    },
    shippingClass: {
      type: String,
      enum: ['standard', 'express', 'premium'],
      default: 'standard'
    }
  },
  
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  salesCount: {
    type: Number,
    default: 0
  },
  
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for main image
productSchema.virtual('mainImage').get(function() {
  if (!this.images || !Array.isArray(this.images)) {
    return null;
  }
  const mainImg = this.images.find(img => img.isMain);
  return mainImg ? mainImg.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Pre-save middleware to generate SKU if not provided
productSchema.pre('save', function(next) {
  if (!this.sku) {
    const category = this.category.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `PV-${category}-${timestamp}`;
  }
  
  // Generate slug if not provided
  if (!this.seo.slug) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }
  
  next();
});

// Index for better query performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ tags: 1 });

// Static method to get products by category
productSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ createdAt: -1 });
};

// Static method to get featured products
productSchema.statics.getFeatured = function() {
  return this.find({ isFeatured: true, isActive: true }).sort({ rating: -1 });
};

// Instance method to increment view count
productSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema); 