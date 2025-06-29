const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
require('dotenv').config();

// Sample review data
const dummyReviews = [
  {
    name: "Sarah Johnson",
    rating: 5,
    text: "Absolutely stunning watch! The quality is unmatched and the packaging was so luxurious. I've received countless compliments since wearing it."
  },
  {
    name: "Michael Chen",
    rating: 4,
    text: "Very elegant and comfortable. Got lots of compliments! The craftsmanship is excellent and it keeps perfect time."
  },
  {
    name: "Emily Rodriguez",
    rating: 5,
    text: "Exceeded my expectations. Will buy again for gifts. The attention to detail is remarkable and the customer service was outstanding."
  },
  {
    name: "David Thompson",
    rating: 3,
    text: "Good value for money, but shipping was a bit slow. The watch itself is nice, though the strap could be better quality."
  },
  {
    name: "Lisa Wang",
    rating: 5,
    text: "The best luxury watch I have ever owned. Highly recommend! The movement is smooth and the design is timeless."
  },
  {
    name: "James Wilson",
    rating: 4,
    text: "Beautiful timepiece with excellent build quality. The dial is perfectly balanced and the hands are very precise."
  },
  {
    name: "Amanda Davis",
    rating: 5,
    text: "Incredible attention to detail. This watch feels premium and looks even better in person than in photos."
  },
  {
    name: "Robert Kim",
    rating: 4,
    text: "Great investment piece. The watch has a classic design that will never go out of style. Very satisfied with my purchase."
  },
  {
    name: "Jennifer Lee",
    rating: 5,
    text: "Outstanding quality and service. The watch arrived perfectly packaged and keeps excellent time. Highly recommend!"
  },
  {
    name: "Christopher Brown",
    rating: 4,
    text: "Solid construction and beautiful design. The watch feels substantial on the wrist and the finish is impeccable."
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Add dummy reviews to standalone Review collection
const addReviewsToCollection = async () => {
  try {
    const products = await Product.find({ isActive: true });
    console.log(`Found ${products.length} active products`);

    for (const product of products) {
      console.log(`Adding reviews for product: ${product.name}`);
      
      // Add 3-8 random reviews per product
      const numReviews = Math.floor(Math.random() * 6) + 3; // 3-8 reviews
      const selectedReviews = [];
      
      for (let i = 0; i < numReviews; i++) {
        const randomReview = dummyReviews[Math.floor(Math.random() * dummyReviews.length)];
        const reviewDate = new Date();
        reviewDate.setDate(reviewDate.getDate() - Math.floor(Math.random() * 365)); // Random date within last year
        
        selectedReviews.push({
          productId: product._id,
          name: randomReview.name,
          rating: randomReview.rating,
          text: randomReview.text,
          date: reviewDate,
          isVerified: true,
          isActive: true
        });
      }
      
      // Insert reviews
      await Review.insertMany(selectedReviews);
      console.log(`Added ${numReviews} reviews for ${product.name}`);
    }
    
    console.log('✅ Successfully added dummy reviews to Review collection');
  } catch (error) {
    console.error('Error adding reviews to collection:', error);
  }
};

// Update product ratings and review counts
const updateProductRatings = async () => {
  try {
    const products = await Product.find({ isActive: true });
    
    for (const product of products) {
      // Get reviews for this product
      const reviews = await Review.find({ 
        productId: product._id, 
        isActive: true 
      });
      
      if (reviews.length > 0) {
        // Calculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
        
        // Update product
        await Product.findByIdAndUpdate(product._id, {
          rating: averageRating,
          'reviews.count': reviews.length
        });
        
        console.log(`Updated ${product.name}: Rating ${averageRating}, Reviews ${reviews.length}`);
      }
    }
    
    console.log('✅ Successfully updated product ratings and review counts');
  } catch (error) {
    console.error('Error updating product ratings:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  console.log('🚀 Starting to add dummy reviews...');
  
  // Add reviews to Review collection
  await addReviewsToCollection();
  
  // Update product ratings
  await updateProductRatings();
  
  console.log('🎉 All dummy reviews added successfully!');
  
  // Disconnect from database
  await mongoose.disconnect();
  console.log('Database disconnected');
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
}); 