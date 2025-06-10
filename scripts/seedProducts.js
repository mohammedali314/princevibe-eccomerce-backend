const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
const AdminActionLog = require('../models/AdminActionLog');

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
          user: "Ahmed Hassan",
          rating: 5,
          comment: "Bilkul amazing quality! Price ke comparison mein bohat best value hai. Highly recommend!",
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
    quantity: 20,
    rating: 4.4,
    reviews: {
      count: 88,
      data: [
        {
          user: "Fatima Malik",
          rating: 5,
          comment: "Perfect for my outdoor adventures. Battery life is amazing! Delivery bhi bohat fast thi.",
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
  },

  // NEW PRODUCTS - Adding 6 more sample products
  {
    name: "Seiko Prospex Turtle",
    category: "sport",
    sku: "SEI-TUR-007",
    price: 250,
    originalPrice: 299,
    description: "The legendary Seiko Turtle returns with modern updates while maintaining its iconic cushion case design. Perfect for diving enthusiasts and collectors who appreciate vintage-inspired sports watches.",
    shortDescription: "Iconic diving watch with vintage-inspired design",
    specifications: {
      movement: "Automatic",
      caseMaterial: "Stainless steel",
      waterResistance: "200m",
      crystal: "Hardlex crystal",
      bezel: "Unidirectional rotating bezel",
      bracelet: "Stainless steel bracelet"
    },
    features: [
      "Automatic movement",
      "200m water resistance",
      "Unidirectional rotating bezel",
      "LumiBrite hands and markers",
      "Day/date display"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1600721391776-b5cd0e0048a9?w=800",
        alt: "Seiko Prospex Turtle front view",
        isMain: true
      }
    ],
    badge: "Heritage",
    inStock: true,
    quantity: 20,
    rating: 4.4,
    reviews: {
      count: 88,
      data: []
    },
    tags: ["sport", "diving", "seiko", "automatic", "vintage", "affordable"],
    weight: 165,
    dimensions: {
      length: 45,
      width: 43,
      height: 13,
      unit: "mm"
    },
    seo: {
      metaTitle: "Seiko Prospex Turtle - Vintage Diving Watch | Prince Vibe",
      metaDescription: "Discover the iconic Seiko Prospex Turtle diving watch. Classic design with modern reliability and 200m water resistance.",
      keywords: ["seiko", "prospex", "turtle", "diving watch", "automatic watch"],
      slug: "seiko-prospex-turtle"
    },
    isFeatured: false,
    salesCount: 67,
    viewCount: 890
  },

  {
    name: "Tudor Black Bay 58",
    category: "luxury",
    sku: "TUD-BB58-008",
    price: 3800,
    originalPrice: 4200,
    description: "The Tudor Black Bay 58 combines vintage aesthetics with modern performance. Inspired by Tudor's 1958 diving watch, this timepiece offers exceptional value in the luxury diving watch segment.",
    shortDescription: "Modern luxury dive watch with vintage heritage",
    specifications: {
      movement: "Automatic, manufacture calibre",
      caseMaterial: "Stainless steel",
      waterResistance: "200m",
      crystal: "Sapphire crystal",
      bezel: "Unidirectional rotating bezel",
      bracelet: "Stainless steel bracelet"
    },
    features: [
      "In-house movement",
      "39mm case size",
      "Snowflake hands",
      "200m water resistance",
      "70-hour power reserve"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800",
        alt: "Tudor Black Bay 58 front view",
        isMain: true
      }
    ],
    badge: "Heritage",
    inStock: true,
    quantity: 10,
    rating: 4.7,
    reviews: {
      count: 45,
      data: []
    },
    tags: ["luxury", "diving", "tudor", "heritage", "automatic", "manufacture"],
    weight: 140,
    dimensions: {
      length: 39,
      width: 39,
      height: 11.9,
      unit: "mm"
    },
    seo: {
      metaTitle: "Tudor Black Bay 58 - Heritage Diving Watch | Prince Vibe",
      metaDescription: "Experience the Tudor Black Bay 58, combining vintage diving watch aesthetics with modern luxury and reliability.",
      keywords: ["tudor", "black bay", "diving watch", "luxury watch", "heritage"],
      slug: "tudor-black-bay-58"
    },
    isFeatured: true,
    salesCount: 34,
    viewCount: 678
  },

  {
    name: "Samsung Galaxy Watch6 Classic",
    category: "smart",
    sku: "SAM-GW6-009",
    price: 429,
    originalPrice: 479,
    description: "The Samsung Galaxy Watch6 Classic combines sophisticated design with advanced health monitoring. Features rotating bezel navigation and comprehensive fitness tracking for the modern lifestyle.",
    shortDescription: "Premium smartwatch with advanced health and fitness features",
    specifications: {
      display: "1.5\" Super AMOLED",
      processor: "Exynos W930",
      storage: "16GB",
      connectivity: "Bluetooth, Wi-Fi, GPS",
      batteryLife: "Up to 40 hours",
      waterResistance: "5ATM + IP68"
    },
    features: [
      "Rotating bezel navigation",
      "Advanced sleep tracking",
      "Body composition analysis",
      "GPS tracking",
      "Samsung Pay",
      "Google Wear OS"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800",
        alt: "Samsung Galaxy Watch6 Classic",
        isMain: true
      }
    ],
    badge: "New",
    inStock: true,
    quantity: 35,
    rating: 4.3,
    reviews: {
      count: 124,
      data: []
    },
    tags: ["smart", "samsung", "fitness", "health", "android", "wear os"],
    weight: 59,
    dimensions: {
      length: 46.5,
      width: 46.5,
      height: 10.9,
      unit: "mm"
    },
    seo: {
      metaTitle: "Samsung Galaxy Watch6 Classic - Premium Smartwatch | Prince Vibe",
      metaDescription: "Stay connected and healthy with the Samsung Galaxy Watch6 Classic. Advanced smartwatch with rotating bezel and health monitoring.",
      keywords: ["samsung", "galaxy watch", "smartwatch", "fitness tracker", "wear os"],
      slug: "samsung-galaxy-watch6-classic"
    },
    isFeatured: false,
    salesCount: 78,
    viewCount: 1560
  },

  {
    name: "Citizen Eco-Drive Promaster",
    category: "sport",
    sku: "CIT-ECO-010",
    price: 180,
    originalPrice: 220,
    description: "Powered by light, the Citizen Eco-Drive Promaster never needs a battery. Built for outdoor adventures with robust construction and reliable solar technology that keeps it running indefinitely.",
    shortDescription: "Solar-powered outdoor watch that never needs a battery",
    specifications: {
      movement: "Eco-Drive solar",
      caseMaterial: "Stainless steel",
      waterResistance: "100m",
      crystal: "Mineral crystal",
      bezel: "Fixed bezel",
      bracelet: "Nylon strap"
    },
    features: [
      "Solar powered",
      "6-month power reserve",
      "Date display",
      "Luminous hands",
      "Shock resistant",
      "Anti-magnetic"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800",
        alt: "Citizen Eco-Drive Promaster",
        isMain: true
      }
    ],
    badge: "New",
    inStock: true,
    quantity: 25,
    rating: 4.2,
    reviews: {
      count: 92,
      data: []
    },
    tags: ["sport", "solar", "citizen", "eco-drive", "outdoor", "sustainable"],
    weight: 95,
    dimensions: {
      length: 42,
      width: 42,
      height: 11,
      unit: "mm"
    },
    seo: {
      metaTitle: "Citizen Eco-Drive Promaster - Solar Sports Watch | Prince Vibe",
      metaDescription: "Never change a battery again with the Citizen Eco-Drive Promaster. Solar-powered sports watch for outdoor enthusiasts.",
      keywords: ["citizen", "eco-drive", "solar watch", "sports watch", "outdoor"],
      slug: "citizen-eco-drive-promaster"
    },
    isFeatured: false,
    salesCount: 156,
    viewCount: 723
  },

  {
    name: "Hublot Big Bang",
    category: "luxury",
    sku: "HUB-BB-011",
    price: 15800,
    originalPrice: 17500,
    description: "The Hublot Big Bang revolutionized luxury watchmaking with its bold fusion design. Combining traditional Swiss craftsmanship with innovative materials, it's a statement piece for the modern connoisseur.",
    shortDescription: "Bold luxury timepiece with innovative fusion design",
    specifications: {
      movement: "Automatic chronograph",
      caseMaterial: "Titanium and ceramic",
      waterResistance: "100m",
      crystal: "Sapphire crystal",
      bezel: "Ceramic bezel",
      bracelet: "Rubber strap"
    },
    features: [
      "Fusion of materials",
      "Chronograph function",
      "Skeleton dial",
      "Automatic movement",
      "Limited production",
      "Ceramic bezel"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800",
        alt: "Hublot Big Bang front view",
        isMain: true
      }
    ],
    badge: "Exclusive",
    inStock: true,
    quantity: 5,
    rating: 4.6,
    reviews: {
      count: 28,
      data: []
    },
    tags: ["luxury", "bold", "hublot", "chronograph", "titanium", "ceramic"],
    weight: 158,
    dimensions: {
      length: 44,
      width: 44,
      height: 15.45,
      unit: "mm"
    },
    seo: {
      metaTitle: "Hublot Big Bang - Bold Luxury Chronograph | Prince Vibe",
      metaDescription: "Make a statement with the Hublot Big Bang. Bold luxury chronograph featuring innovative materials and fusion design.",
      keywords: ["hublot", "big bang", "luxury chronograph", "titanium", "ceramic"],
      slug: "hublot-big-bang"
    },
    isFeatured: true,
    salesCount: 12,
    viewCount: 234
  },

  {
    name: "Garmin Fenix 7X Solar",
    category: "smart",
    sku: "GAR-F7X-012",
    price: 899,
    originalPrice: 999,
    description: "The ultimate multisport GPS watch for athletes and outdoor enthusiasts. With solar charging, comprehensive training metrics, and rugged construction, it's designed to keep up with your most demanding adventures.",
    shortDescription: "Ultimate GPS smartwatch for athletes and outdoor adventures",
    specifications: {
      display: "1.4\" transflective MIP",
      processor: "Multi-GNSS GPS",
      storage: "32GB",
      connectivity: "Wi-Fi, Bluetooth, ANT+",
      batteryLife: "Up to 28 days with solar",
      waterResistance: "10ATM"
    },
    features: [
      "Solar charging capability",
      "Multi-GNSS satellite systems",
      "Training load focus",
      "ClimbPro ascent planner",
      "Pulse Ox sensor",
      "Rugged design"
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1544117519-31a4b719223d?w=800",
        alt: "Garmin Fenix 7X Solar",
        isMain: true
      }
    ],
    badge: "New",
    inStock: true,
    quantity: 15,
    rating: 4.8,
    reviews: {
      count: 167,
      data: []
    },
    tags: ["smart", "gps", "solar", "garmin", "multisport", "rugged"],
    weight: 89,
    dimensions: {
      length: 51,
      width: 51,
      height: 14.9,
      unit: "mm"
    },
    seo: {
      metaTitle: "Garmin Fenix 7X Solar - Ultimate GPS Sports Watch | Prince Vibe",
      metaDescription: "Conquer any adventure with the Garmin Fenix 7X Solar. Ultimate GPS smartwatch with solar charging and comprehensive training features.",
      keywords: ["garmin", "fenix", "gps watch", "solar", "multisport", "adventure"],
      slug: "garmin-fenix-7x-solar"
    },
    isFeatured: true,
    salesCount: 89,
    viewCount: 1123
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

const createSampleAdminActivity = async () => {
  try {
    console.log('📝 Creating sample admin activity logs...');
    
    // Clear existing activity logs
    await AdminActionLog.deleteMany({});
    console.log('🗑️ Cleared existing admin activity logs');
    
    // Find the admin to use for sample activities
    const admin = await Admin.findOne({});
    if (!admin) {
      console.log('⚠️ No admin found, skipping activity log creation');
      return;
    }
    
    // Find some products to reference
    const products = await Product.find({}).limit(3);
    
    // Create sample activity logs
    const sampleActivities = [
      {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        action: 'admin_login',
        targetType: 'admin',
        targetId: admin._id.toString(),
        targetName: admin.name,
        description: `Admin ${admin.name} logged in successfully`,
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          sessionId: 'demo-session'
        },
        severity: 'low',
        status: 'success',
        timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      },
      {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        action: 'product_created',
        targetType: 'product',
        targetId: products[0]?._id?.toString() || 'demo-product-1',
        targetName: products[0]?.name || 'Sample Product',
        description: `Created new product: ${products[0]?.name || 'Sample Product'}`,
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          productCategory: products[0]?.category || 'luxury',
          productPrice: products[0]?.price || 1000
        },
        severity: 'medium',
        status: 'success',
        timestamp: new Date(Date.now() - 25 * 60 * 1000) // 25 minutes ago
      },
      {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        action: 'inventory_updated',
        targetType: 'product',
        targetId: products[1]?._id?.toString() || 'demo-product-2',
        targetName: products[1]?.name || 'Sample Product 2',
        description: `Updated inventory for: ${products[1]?.name || 'Sample Product 2'}`,
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          previousQuantity: 10,
          newQuantity: 15,
          changeReason: 'Stock replenishment'
        },
        severity: 'medium',
        status: 'success',
        timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
      },
      {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        action: 'product_updated',
        targetType: 'product',
        targetId: products[2]?._id?.toString() || 'demo-product-3',
        targetName: products[2]?.name || 'Sample Product 3',
        description: `Updated product: ${products[2]?.name || 'Sample Product 3'}`,
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          fieldsUpdated: ['price', 'description']
        },
        severity: 'medium',
        status: 'success',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        action: 'bulk_inventory_update',
        targetType: 'system',
        targetId: 'bulk-update-' + Date.now(),
        targetName: 'Bulk Inventory Update',
        description: 'Performed bulk inventory update on multiple products',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          affectedRecords: 12,
          updateType: 'stock_levels'
        },
        severity: 'high',
        status: 'success',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      }
    ];
    
    // Insert sample activities
    const createdActivities = await AdminActionLog.insertMany(sampleActivities);
    console.log(`✅ Created ${createdActivities.length} sample admin activity logs`);
    
    // Display created activities
    createdActivities.forEach(activity => {
      console.log(`📋 ${activity.action} - ${activity.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating sample admin activity:', error.message);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Starting database seeding process...');
    console.log('─────────────────────────────────────────────');
    
    await createDefaultAdmin();
    await seedProducts();
    await createSampleAdminActivity();
    
    console.log('─────────────────────────────────────────────');
    console.log('\n🎯 Next Steps:');
    console.log('1. Start your server: npm run dev');
    console.log('2. Access admin panel: http://localhost:5000/admin');
    console.log('3. Use environment variables for admin login');
    console.log('4. Check your product catalog');
    console.log('5. Check Recent Activity section in dashboard');
    console.log('6. Test order management features');
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('🚀 Prince Vibe Backend is ready with sample activity data!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }
};

// Run the seeding process
seedDatabase(); 