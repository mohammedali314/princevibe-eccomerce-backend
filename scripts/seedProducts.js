const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Admin = require('../models/Admin');

// Load environment variables
dotenv.config();

const sampleProducts = [
  {
    name: "Rolex Submariner Date",
    category: "luxury",
    sku: "ROL-SUB-001",
    price: 13950,
    originalPrice: 15500,
    description: "The Rolex Submariner Date is the ultimate luxury diving watch, combining exceptional performance with iconic design. Crafted from the finest materials and engineered to perfection, this timepiece represents the pinnacle of Swiss watchmaking excellence.",
    shortDescription: "Iconic luxury diving watch with unparalleled craftsmanship",
    specifications: {
      movement: "Perpetual, mechanical, self-winding",
      caseMaterial: "Oystersteel",
      waterResistance: "300m (1,000ft)",
      crystal: "Scratch-resistant sapphire",
      bezel: "Unidirectional rotatable 60-minute graduated",
      bracelet: "Oyster, flat three-piece links"
    },
    features: [
      "Chronometer certification",
      "Waterproof to 300m",
      "Self-winding movement",
      "Date display",
      "Luminescent hands and markers"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1606390182168-59b8d57b36b9?w=800",
        alt: "Rolex Submariner front view",
        isMain: true
      },
      {
        url: "https://images.unsplash.com/photo-1611148540467-2de0e9ce5f4e?w=800",
        alt: "Rolex Submariner side view",
        isMain: false
      }
    ],
    badge: "Bestseller",
    inStock: true,
    quantity: 15,
    rating: 4.9,
    reviews: {
      count: 127,
      data: [
        {
          user: "John D.",
          rating: 5,
          comment: "Absolutely stunning watch. Worth every penny!",
          date: new Date("2024-01-15")
        }
      ]
    },
    tags: ["luxury", "diving", "swiss", "automatic", "waterproof"],
    weight: 155,
    dimensions: {
      length: 40,
      width: 40,
      height: 12.5,
      unit: "mm"
    },
    seo: {
      metaTitle: "Rolex Submariner Date - Luxury Diving Watch | Prince Vibe",
      metaDescription: "Discover the iconic Rolex Submariner Date at Prince Vibe. Premium luxury diving watch with exceptional craftsmanship.",
      keywords: ["rolex", "submariner", "luxury watch", "diving watch", "swiss watch"],
      slug: "rolex-submariner-date"
    },
    isFeatured: true,
    salesCount: 89,
    viewCount: 1245
  },
  
  {
    name: "Apple Watch Ultra 2",
    category: "smart",
    sku: "APL-ULT-002",
    price: 799,
    originalPrice: 849,
    description: "The most rugged and capable Apple Watch yet, designed for endurance athletes and outdoor adventurers. With precision dual-frequency GPS, cellular connectivity, and up to 36 hours of battery life, it's built to go the distance.",
    shortDescription: "The ultimate adventure companion with rugged design and advanced features",
    specifications: {
      display: "49mm Always-On Retina display",
      processor: "S9 SiP with 64-bit dual-core processor",
      storage: "64GB",
      connectivity: "GPS + Cellular",
      batteryLife: "Up to 36 hours",
      waterResistance: "100m"
    },
    features: [
      "Precision dual-frequency GPS",
      "Cellular connectivity",
      "Always-On Retina display",
      "Action Button",
      "Digital Crown with haptic feedback",
      "ECG and Blood Oxygen sensors"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800",
        alt: "Apple Watch Ultra 2 front view",
        isMain: true
      },
      {
        url: "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=800",
        alt: "Apple Watch Ultra 2 side view",
        isMain: false
      }
    ],
    badge: "New",
    inStock: true,
    quantity: 25,
    rating: 4.7,
    reviews: {
      count: 89,
      data: [
        {
          user: "Sarah M.",
          rating: 5,
          comment: "Perfect for my outdoor adventures. Battery life is amazing!",
          date: new Date("2024-02-10")
        }
      ]
    },
    tags: ["smart", "apple", "fitness", "outdoor", "gps", "cellular"],
    weight: 61.3,
    dimensions: {
      length: 49,
      width: 44,
      height: 14.4,
      unit: "mm"
    },
    seo: {
      metaTitle: "Apple Watch Ultra 2 - Adventure Smart Watch | Prince Vibe",
      metaDescription: "Get the rugged Apple Watch Ultra 2 at Prince Vibe. Perfect for athletes and adventurers with advanced GPS and cellular features.",
      keywords: ["apple watch", "ultra", "smart watch", "fitness tracker", "outdoor watch"],
      slug: "apple-watch-ultra-2"
    },
    isFeatured: true,
    salesCount: 156,
    viewCount: 2890
  },
  
  {
    name: "TAG Heuer Carrera Chronograph",
    category: "sport",
    sku: "TAG-CAR-003",
    price: 4200,
    originalPrice: 4800,
    description: "Inspired by the legendary Carrera Panamericana race, this chronograph embodies the spirit of motor racing. With its precise movement and sporty design, it's the perfect companion for those who live life in the fast lane.",
    shortDescription: "Racing-inspired chronograph with sporty elegance",
    specifications: {
      movement: "Automatic chronograph",
      caseMaterial: "Stainless steel",
      waterResistance: "100m",
      crystal: "Scratch-resistant sapphire",
      bezel: "Fixed steel bezel",
      bracelet: "Stainless steel bracelet"
    },
    features: [
      "Chronograph function",
      "Date display",
      "Tachymeter scale",
      "Luminous hands and markers",
      "Screw-down crown"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
        alt: "TAG Heuer Carrera front view",
        isMain: true
      }
    ],
    badge: "Racing",
    inStock: true,
    quantity: 8,
    rating: 4.6,
    reviews: {
      count: 34,
      data: []
    },
    tags: ["sport", "racing", "chronograph", "tag heuer", "automatic"],
    weight: 180,
    dimensions: {
      length: 43,
      width: 43,
      height: 15,
      unit: "mm"
    },
    seo: {
      metaTitle: "TAG Heuer Carrera Chronograph - Racing Watch | Prince Vibe",
      metaDescription: "Experience the thrill of racing with the TAG Heuer Carrera Chronograph. Premium sport watch with chronograph function.",
      keywords: ["tag heuer", "carrera", "chronograph", "racing watch", "sport watch"],
      slug: "tag-heuer-carrera-chronograph"
    },
    isFeatured: false,
    salesCount: 23,
    viewCount: 567
  },
  
  {
    name: "Omega Speedmaster Professional",
    category: "classic",
    sku: "OMG-SPD-004",
    price: 6350,
    originalPrice: 7000,
    description: "The legendary Moonwatch that accompanied astronauts to the lunar surface. This manual-winding chronograph is a testament to precision, reliability, and space exploration history.",
    shortDescription: "The legendary Moonwatch with space exploration heritage",
    specifications: {
      movement: "Manual-winding chronograph",
      caseMaterial: "Stainless steel",
      waterResistance: "50m",
      crystal: "Hesalite crystal",
      bezel: "Black tachymeter bezel",
      bracelet: "Stainless steel bracelet"
    },
    features: [
      "Manual-winding movement",
      "Chronograph function",
      "Tachymeter bezel",
      "NASA qualified",
      "Moonwatch heritage"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800",
        alt: "Omega Speedmaster front view",
        isMain: true
      }
    ],
    badge: "Heritage",
    inStock: true,
    quantity: 12,
    rating: 4.8,
    reviews: {
      count: 76,
      data: []
    },
    tags: ["classic", "omega", "moonwatch", "chronograph", "heritage", "nasa"],
    weight: 155,
    dimensions: {
      length: 42,
      width: 42,
      height: 14,
      unit: "mm"
    },
    seo: {
      metaTitle: "Omega Speedmaster Professional Moonwatch | Prince Vibe",
      metaDescription: "Own a piece of space history with the Omega Speedmaster Professional Moonwatch. Legendary chronograph with NASA heritage.",
      keywords: ["omega", "speedmaster", "moonwatch", "chronograph", "space watch"],
      slug: "omega-speedmaster-professional"
    },
    isFeatured: true,
    salesCount: 45,
    viewCount: 892
  },
  
  {
    name: "Casio G-Shock Mudmaster",
    category: "sport",
    sku: "CAS-MUD-005",
    price: 350,
    originalPrice: 420,
    description: "Built to withstand the harshest conditions, the G-Shock Mudmaster is designed for those who push boundaries. With mud resistance, shock protection, and solar power, it's ready for any challenge.",
    shortDescription: "Ultra-tough outdoor watch built for extreme conditions",
    specifications: {
      movement: "Quartz",
      caseMaterial: "Carbon fiber reinforced resin",
      waterResistance: "200m",
      crystal: "Mineral crystal",
      bezel: "Protective bezel",
      bracelet: "Resin band"
    },
    features: [
      "Mud resistance",
      "Shock resistance",
      "Solar powered",
      "Multi-band 6 atomic timekeeping",
      "LED backlight",
      "World time"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800",
        alt: "Casio G-Shock Mudmaster",
        isMain: true
      }
    ],
    badge: "Tough",
    inStock: true,
    quantity: 30,
    rating: 4.5,
    reviews: {
      count: 156,
      data: []
    },
    tags: ["sport", "outdoor", "tough", "solar", "casio", "g-shock"],
    weight: 119,
    dimensions: {
      length: 56.2,
      width: 55.3,
      height: 17.3,
      unit: "mm"
    },
    seo: {
      metaTitle: "Casio G-Shock Mudmaster - Tough Outdoor Watch | Prince Vibe",
      metaDescription: "Conquer any terrain with the Casio G-Shock Mudmaster. Ultra-tough outdoor watch with mud resistance and solar power.",
      keywords: ["casio", "g-shock", "mudmaster", "outdoor watch", "tough watch"],
      slug: "casio-g-shock-mudmaster"
    },
    isFeatured: false,
    salesCount: 89,
    viewCount: 1234
  },
  
  {
    name: "Patek Philippe Calatrava",
    category: "luxury",
    sku: "PAT-CAL-006",
    price: 32000,
    originalPrice: 35000,
    description: "The epitome of dress watch elegance, the Patek Philippe Calatrava represents timeless sophistication. Hand-crafted with meticulous attention to detail, this timepiece is a symbol of horological excellence and refined taste.",
    shortDescription: "Timeless dress watch epitomizing luxury and sophistication",
    specifications: {
      movement: "Manual-winding mechanical",
      caseMaterial: "18k white gold",
      waterResistance: "30m",
      crystal: "Sapphire crystal",
      bezel: "Smooth gold bezel",
      bracelet: "Alligator leather strap"
    },
    features: [
      "Hand-wound movement",
      "18k gold case",
      "Alligator leather strap",
      "Small seconds subdial",
      "Exhibition caseback"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1622434641406-a158123450f9?w=800",
        alt: "Patek Philippe Calatrava",
        isMain: true
      }
    ],
    badge: "Exclusive",
    inStock: true,
    quantity: 3,
    rating: 5.0,
    reviews: {
      count: 12,
      data: []
    },
    tags: ["luxury", "dress watch", "gold", "patek philippe", "exclusive", "handmade"],
    weight: 65,
    dimensions: {
      length: 39,
      width: 39,
      height: 8.5,
      unit: "mm"
    },
    seo: {
      metaTitle: "Patek Philippe Calatrava - Luxury Dress Watch | Prince Vibe",
      metaDescription: "Experience ultimate luxury with the Patek Philippe Calatrava. Exceptional dress watch crafted with 18k gold and finest materials.",
      keywords: ["patek philippe", "calatrava", "luxury watch", "dress watch", "gold watch"],
      slug: "patek-philippe-calatrava"
    },
    isFeatured: true,
    salesCount: 5,
    viewCount: 456
  }
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/princevibe', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🍃 MongoDB Connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const seedProducts = async () => {
  try {
    console.log('🌱 Starting to seed products...');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️ Cleared existing products');
    
    // Insert sample products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✅ Successfully seeded ${createdProducts.length} products`);
    
    // Display created products
    createdProducts.forEach(product => {
      console.log(`📦 ${product.name} (${product.category}) - $${product.price}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
  }
};

const createDefaultAdmin = async () => {
  try {
    console.log('👤 Creating default admin...');
    
    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ role: 'super_admin' });
    
    if (existingAdmin) {
      console.log('✅ Super admin already exists');
      return;
    }
    
    // Create default super admin
    await Admin.createDefaultAdmin();
    
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Starting database seeding process...');
    console.log('─────────────────────────────────────────────');
    
    await createDefaultAdmin();
    await seedProducts();
    
    console.log('─────────────────────────────────────────────');
    console.log('✅ Database seeding completed successfully!');
    console.log('🎯 You can now start the server with: npm run dev');
    console.log('🔑 Default admin credentials:');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@princevibe.com'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }
};

// Run the seeding process
seedDatabase(); 