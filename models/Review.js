const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  
  name: {
    type: String,
    required: [true, 'Reviewer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  
  text: {
    type: String,
    required: [true, 'Review text is required'],
    trim: true,
    maxlength: [1000, 'Review text cannot exceed 1000 characters']
  },
  
  images: [{
    type: String // Cloudinary URLs
  }],
  
  date: {
    type: Date,
    default: Date.now
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
reviewSchema.index({ productId: 1, date: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isActive: 1 });

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Static method to get average rating for a product
reviewSchema.statics.getAverageRating = async function(productId) {
  const result = await this.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews
  } : {
    averageRating: 0,
    totalReviews: 0
  };
};

// Method to update product rating after review
reviewSchema.methods.updateProductRating = async function() {
  const stats = await this.constructor.getAverageRating(this.productId);
  
  // Update the product's rating and review count
  await mongoose.model('Product').findByIdAndUpdate(
    this.productId,
    {
      rating: stats.averageRating,
      'reviews.count': stats.totalReviews
    }
  );
};

// Pre-save middleware to update product rating
reviewSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('rating')) {
    await this.updateProductRating();
  }
  next();
});

// Pre-remove middleware to update product rating
reviewSchema.pre('remove', async function(next) {
  await this.updateProductRating();
  next();
});

module.exports = mongoose.model('Review', reviewSchema); 