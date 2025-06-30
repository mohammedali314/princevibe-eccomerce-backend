const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function addQuantityToAllProducts(amount = 3) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const products = await Product.find({});
    let updatedCount = 0;

    for (const product of products) {
      const oldQty = product.quantity || 0;
      product.quantity = oldQty + amount;
      product.inStock = product.quantity > 0;
      await product.save();
      console.log(`Updated "${product.name}": ${oldQty} → ${product.quantity}`);
      updatedCount++;
    }

    console.log(`\n✅ Updated quantity for ${updatedCount} products!`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating product quantities:', err);
    process.exit(1);
  }
}

addQuantityToAllProducts(3); 