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

// Product data with SEO and specifications
const productUpdates = {
  'Black Arabic Aura Fiber Watch': {
    seo: {
      metaTitle: 'Black Arabic Aura Fiber Watch - Luxury Arabic Dial Timepiece | Prince Vibe',
      metaDescription: 'Discover the Black Arabic Aura Fiber Watch - a premium luxury timepiece featuring Arabic numerals, fiber construction, and elegant design. Perfect for those who appreciate cultural elegance and modern style.',
      keywords: ['arabic watch', 'black aura watch', 'fiber watch', 'luxury watch', 'arabic numerals', 'premium watch', 'elegant timepiece']
    },
    specifications: {
      movement: 'Quartz',
      caseMaterial: 'Fiber Composite',
      waterResistance: '3 BAR (30m)',
      crystal: 'Mineral Crystal',
      bezel: 'Fixed Bezel',
      bracelet: 'Fiber Chain Strap',
      display: 'Analog',
      customFields: [
        { key: 'Case Diameter', value: '42mm' },
        { key: 'Case Thickness', value: '12mm' },
        { key: 'Weight', value: '44g' },
        { key: 'Dial Color', value: 'Black' },
        { key: 'Numeral Style', value: 'Arabic' }
      ]
    }
  },
  'Rolex Two Tone Day And Date Jublee Chain Watch': {
    seo: {
      metaTitle: 'Rolex Two Tone Day Date Jubilee Chain Watch - Luxury Timepiece | Prince Vibe',
      metaDescription: 'Exquisite Rolex-inspired two-tone watch featuring day and date display with iconic Jubilee bracelet. Premium craftsmanship meets timeless elegance in this luxury timepiece.',
      keywords: ['rolex watch', 'two tone watch', 'jubilee bracelet', 'day date watch', 'luxury timepiece', 'premium watch', 'gold steel watch']
    },
    specifications: {
      movement: 'Automatic',
      caseMaterial: 'Stainless Steel & Gold Plated',
      waterResistance: '5 BAR (50m)',
      crystal: 'Sapphire Crystal',
      bezel: 'Fixed Gold Plated Bezel',
      bracelet: 'Jubilee Bracelet',
      display: 'Analog with Day/Date',
      customFields: [
        { key: 'Case Diameter', value: '41mm' },
        { key: 'Case Thickness', value: '13mm' },
        { key: 'Weight', value: '156g' },
        { key: 'Dial Color', value: 'Silver' },
        { key: 'Functions', value: 'Day, Date, Time' }
      ]
    }
  },
  'PATEK PHILIPPE DIAMOND WATCH': {
    seo: {
      metaTitle: 'Patek Philippe Diamond Watch - Luxury Diamond-Studded Timepiece | Prince Vibe',
      metaDescription: 'Stunning Patek Philippe-inspired diamond watch featuring premium diamonds and exquisite craftsmanship. A true luxury statement piece for the discerning collector.',
      keywords: ['patek philippe', 'diamond watch', 'luxury diamond watch', 'premium timepiece', 'diamond studded', 'exclusive watch', 'high-end watch']
    },
    specifications: {
      movement: 'Automatic',
      caseMaterial: 'Stainless Steel with Diamond Accents',
      waterResistance: '3 BAR (30m)',
      crystal: 'Sapphire Crystal',
      bezel: 'Diamond-Set Bezel',
      bracelet: 'Stainless Steel Bracelet',
      display: 'Analog',
      customFields: [
        { key: 'Case Diameter', value: '40mm' },
        { key: 'Case Thickness', value: '11mm' },
        { key: 'Weight', value: '142g' },
        { key: 'Dial Color', value: 'White' },
        { key: 'Diamond Count', value: '12 diamonds' },
        { key: 'Diamond Quality', value: 'VS1-VS2' }
      ]
    }
  },
  'HUBLOT CLASSIC FUSION TITANIUM Quartez MEN\'S WATCH': {
    seo: {
      metaTitle: 'Hublot Classic Fusion Titanium Quartz Men\'s Watch - Luxury Sport Timepiece | Prince Vibe',
      metaDescription: 'Premium Hublot Classic Fusion-inspired titanium watch with quartz movement. Lightweight, durable, and stylish - perfect for the modern gentleman who values both luxury and functionality.',
      keywords: ['hublot watch', 'titanium watch', 'classic fusion', 'quartz watch', 'mens watch', 'luxury sport watch', 'titanium timepiece']
    },
    specifications: {
      movement: 'Quartz',
      caseMaterial: 'Titanium',
      waterResistance: '5 BAR (50m)',
      crystal: 'Sapphire Crystal',
      bezel: 'Titanium Bezel',
      bracelet: 'Titanium Bracelet',
      display: 'Analog',
      customFields: [
        { key: 'Case Diameter', value: '45mm' },
        { key: 'Case Thickness', value: '14mm' },
        { key: 'Weight', value: '98g' },
        { key: 'Dial Color', value: 'Black' },
        { key: 'Material Benefits', value: 'Lightweight, Corrosion Resistant' }
      ]
    }
  },
  'Patek Philippe Nautils Nautilus Silver Watch': {
    seo: {
      metaTitle: 'Patek Philippe Nautilus Silver Watch - Iconic Luxury Sports Timepiece | Prince Vibe',
      metaDescription: 'Timeless Patek Philippe Nautilus-inspired silver watch. The iconic sports luxury design meets premium craftsmanship in this elegant timepiece for the sophisticated collector.',
      keywords: ['patek philippe nautilus', 'nautilus watch', 'silver watch', 'luxury sports watch', 'iconic timepiece', 'premium watch', 'elegant design']
    },
    specifications: {
      movement: 'Automatic',
      caseMaterial: 'Stainless Steel',
      waterResistance: '12 BAR (120m)',
      crystal: 'Sapphire Crystal',
      bezel: 'Integrated Bezel',
      bracelet: 'Integrated Steel Bracelet',
      display: 'Analog with Date',
      customFields: [
        { key: 'Case Diameter', value: '40.5mm' },
        { key: 'Case Thickness', value: '8.3mm' },
        { key: 'Weight', value: '168g' },
        { key: 'Dial Color', value: 'Silver' },
        { key: 'Functions', value: 'Date, Time' },
        { key: 'Design Style', value: 'Sports Luxury' }
      ]
    }
  },
  'Original Black Aura Arabic watch': {
    seo: {
      metaTitle: 'Original Black Aura Arabic Watch - Premium Arabic Dial Timepiece | Prince Vibe',
      metaDescription: 'The original Black Aura Arabic watch - a masterpiece of cultural design and modern luxury. Features Arabic numerals, premium materials, and exceptional craftsmanship for the discerning collector.',
      keywords: ['original aura watch', 'black arabic watch', 'arabic numerals', 'premium timepiece', 'cultural watch', 'luxury arabic watch', 'exclusive design']
    },
    specifications: {
      movement: 'Automatic',
      caseMaterial: 'Stainless Steel with Black PVD Coating',
      waterResistance: '5 BAR (50m)',
      crystal: 'Sapphire Crystal',
      bezel: 'Fixed Black Bezel',
      bracelet: 'Stainless Steel Bracelet',
      display: 'Analog',
      customFields: [
        { key: 'Case Diameter', value: '44mm' },
        { key: 'Case Thickness', value: '13mm' },
        { key: 'Weight', value: '178g' },
        { key: 'Dial Color', value: 'Black' },
        { key: 'Numeral Style', value: 'Arabic' },
        { key: 'Coating', value: 'Black PVD' }
      ]
    }
  }
};

// Update products
const updateProducts = async () => {
  try {
    console.log('🔄 Starting product updates...\n');
    
    for (const [productName, updateData] of Object.entries(productUpdates)) {
      console.log(`📝 Updating: ${productName}`);
      
      const product = await Product.findOne({ name: productName });
      
      if (!product) {
        console.log(`   ❌ Product not found: ${productName}`);
        continue;
      }
      
      // Update SEO
      if (updateData.seo) {
        product.seo = {
          ...product.seo,
          ...updateData.seo
        };
        console.log(`   ✅ SEO updated`);
      }
      
      // Update specifications
      if (updateData.specifications) {
        product.specifications = {
          ...product.specifications,
          ...updateData.specifications
        };
        console.log(`   ✅ Specifications updated`);
      }
      
      await product.save();
      console.log(`   ✅ Product saved successfully\n`);
    }
    
    console.log('🎉 All product updates completed!');
    
  } catch (error) {
    console.error('Error updating products:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await updateProducts();
  await mongoose.disconnect();
  console.log('\n✅ Updates complete. Database disconnected.');
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { updateProducts }; 