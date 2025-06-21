const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Analyze all products
const analyzeProducts = async () => {
  try {
    console.log('🔍 Analyzing all products in database...\n');
    
    const products = await Product.find({}).select('name category seo specifications images quantity price rating');
    
    console.log(`📊 Found ${products.length} products in database\n`);
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Price: PKR ${product.price}`);
      console.log(`   Quantity: ${product.quantity}`);
      console.log(`   Rating: ${product.rating}`);
      console.log(`   Images: ${product.images.length} images`);
      
      // Check SEO
      console.log(`   📝 SEO Status:`);
      console.log(`      Meta Title: ${product.seo?.metaTitle ? '✅ Set' : '❌ Missing'}`);
      console.log(`      Meta Description: ${product.seo?.metaDescription ? '✅ Set' : '❌ Missing'}`);
      console.log(`      Slug: ${product.seo?.slug ? '✅ Set' : '❌ Missing'}`);
      console.log(`      Keywords: ${product.seo?.keywords?.length || 0} keywords`);
      
      // Check Specifications
      console.log(`   🔧 Specifications Status:`);
      const specs = product.specifications || {};
      const specFields = ['movement', 'caseMaterial', 'waterResistance', 'crystal', 'bezel', 'bracelet', 'display'];
      let filledSpecs = 0;
      
      specFields.forEach(field => {
        if (specs[field] && specs[field].trim()) {
          filledSpecs++;
        }
      });
      
      console.log(`      Filled fields: ${filledSpecs}/${specFields.length}`);
      console.log(`      Custom fields: ${specs.customFields?.length || 0}`);
      
      // Show current SEO data if exists
      if (product.seo?.metaTitle || product.seo?.metaDescription) {
        console.log(`   📋 Current SEO Data:`);
        if (product.seo.metaTitle) console.log(`      Title: ${product.seo.metaTitle}`);
        if (product.seo.metaDescription) console.log(`      Description: ${product.seo.metaDescription.substring(0, 100)}...`);
        if (product.seo.slug) console.log(`      Slug: ${product.seo.slug}`);
      }
      
      // Show current specifications if exists
      if (filledSpecs > 0) {
        console.log(`   🔧 Current Specifications:`);
        specFields.forEach(field => {
          if (specs[field] && specs[field].trim()) {
            console.log(`      ${field}: ${specs[field]}`);
          }
        });
      }
      
      console.log('   ' + '─'.repeat(50));
    });
    
    // Summary
    console.log('\n📈 SUMMARY:');
    const productsWithSEO = products.filter(p => p.seo?.metaTitle && p.seo?.metaDescription);
    const productsWithSpecs = products.filter(p => {
      const specs = p.specifications || {};
      return specs.movement || specs.caseMaterial || specs.waterResistance;
    });
    
    console.log(`   Products with SEO: ${productsWithSEO.length}/${products.length}`);
    console.log(`   Products with Specifications: ${productsWithSpecs.length}/${products.length}`);
    
  } catch (error) {
    console.error('Error analyzing products:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await analyzeProducts();
  await mongoose.disconnect();
  console.log('\n✅ Analysis complete. Database disconnected.');
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeProducts }; 