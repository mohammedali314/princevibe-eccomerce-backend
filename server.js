const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const { body, validationResult } = require('express-validator');
const https = require('https');
const fs = require('fs');

// Load environment variables
dotenv.config({
    path: process.env.NODE_ENV === 'production' ? './config/production.env' : '.env'
});

// Import routes
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const securityMiddleware = require('./middleware/security');
const emailService = require('./utils/emailService');

// Create Express app
const app = express();

// Trust proxy for deployment platforms (Railway, Heroku, etc.)
app.set('trust proxy', 1);

// Security Middleware
// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for login attempts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900 // 15 minutes
  },
  skipSuccessfulRequests: true
});

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', authLimiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

// Compression middleware
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:5000',
      'https://princevibe-eccomerce.vercel.app',
      process.env.FRONTEND_URL,
      // Add Railway app domains
      /\.railway\.app$/,
      // Add other deployment domains as needed
      /\.vercel\.app$/,
      /\.netlify\.app$/
    ].filter(Boolean);
    
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format'
      });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files securely
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, path) => {
    // Only allow images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/*');
    } else {
      res.status(403).send('File type not allowed');
    }
  }
}));

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// Enhanced health check route
app.get('/api/health', (req, res) => {
  const healthcheck = {
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    service: 'Prince Vibe Backend API',
    version: '1.0.0',
    status: 'OK'
  };

  // Check database connection
  if (mongoose.connection.readyState === 1) {
    healthcheck.database = 'Connected';
  } else {
    healthcheck.database = 'Disconnected';
    healthcheck.status = 'WARNING';
  }

  res.status(200).json(healthcheck);
});

// Security endpoint
app.get('/api/security', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Security features active',
    features: {
      helmet: 'Active',
      rateLimit: 'Active',
      cors: 'Configured',
      dataValidation: 'Active',
      compression: 'Active',
      logging: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
    }
  });
});

// MongoDB Connection with enhanced error handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/princevibe', {
      // Remove deprecated options, use only essential ones
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/security',
      'POST /api/auth/login',
      'GET /api/products',
      'POST /api/orders',
      'POST /api/payments/initialize'
    ]
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(false, () => {
    console.log('🍃 MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(false, () => {
    console.log('🍃 MongoDB connection closed');
    process.exit(0);
  });
});

// Uncaught Exception Handler
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Unhandled Promise Rejection
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

// SSL Configuration for HTTPS
const startServer = async () => {
    try {
        // Initialize email service
        await emailService.verifyConnection();
        
        if (process.env.NODE_ENV === 'production' && process.env.SSL_ENABLED === 'true') {
            // HTTPS Server
            const privateKey = fs.readFileSync(process.env.SSL_PRIVATE_KEY || './ssl/private.key', 'utf8');
            const certificate = fs.readFileSync(process.env.SSL_CERTIFICATE || './ssl/certificate.crt', 'utf8');
            const ca = process.env.SSL_CA ? fs.readFileSync(process.env.SSL_CA, 'utf8') : null;

            const credentials = {
                key: privateKey,
                cert: certificate,
                ...(ca && { ca: ca })
            };

            const httpsServer = https.createServer(credentials, app);
            httpsServer.listen(PORT, () => {
                console.log(`🔒 HTTPS Server running on port ${PORT}`);
                console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
                console.log(`📧 Email service: ${emailService ? 'Connected' : 'Disconnected'}`);
            });
        } else {
            // HTTP Server (Development)
            const server = app.listen(PORT, () => {
                console.log(`🚀 HTTP Server running on port ${PORT}`);
                console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
                console.log(`📧 Email service: ${emailService ? 'Connected' : 'Disconnected'}`);
            });
        }
    } catch (error) {
        console.error('❌ Server startup error:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app; 