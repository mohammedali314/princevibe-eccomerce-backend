const mongoose = require('mongoose');
const Review = require('../models/Review');
require('dotenv').config();

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

// Remove images from all reviews
const removeReviewImages = async () => {
  try {
    console.log('🔍 Finding reviews with images...');
    
    // Find all reviews that have images
    const reviewsWithImages = await Review.find({ 
      images: { $exists: true, $ne: [] } 
    });
    
    console.log(`Found ${reviewsWithImages.length} reviews with images`);
    
    if (reviewsWithImages.length > 0) {
      // Remove images from all reviews
      const result = await Review.updateMany(
        {}, // Update all reviews
        { $unset: { images: "" } } // Remove the images field completely
      );
      
      console.log(`✅ Removed images from ${result.modifiedCount} reviews`);
    } else {
      console.log('✅ No reviews with images found');
    }
    
    // Also ensure all reviews have empty images array or no images field
    const result2 = await Review.updateMany(
      {}, // Update all reviews
      { $set: { images: [] } } // Set images to empty array
    );
    
    console.log(`✅ Updated ${result2.modifiedCount} reviews to have empty images array`);
    
  } catch (error) {
    console.error('Error removing review images:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  console.log('🚀 Starting to remove images from reviews...');
  
  await removeReviewImages();
  
  console.log('🎉 All review images removed successfully!');
  
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