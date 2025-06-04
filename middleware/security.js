const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Input validation helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Email validation
const validateEmail = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),
  handleValidationErrors
];

// Password validation
const validatePassword = () => [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors
];

// Phone validation
const validatePhone = () => [
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .customSanitizer(value => {
      // Remove all non-numeric characters except + at the beginning
      return value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    }),
  handleValidationErrors
];

// Name validation
const validateName = (fieldName = 'name') => [
  body(fieldName)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${fieldName} must be between 2 and 50 characters`)
    .matches(/^[a-zA-Z\s\-\.\']+$/)
    .withMessage(`${fieldName} can only contain letters, spaces, hyphens, dots, and apostrophes`)
    .customSanitizer(value => {
      // Remove extra spaces and capitalize first letter of each word
      return value.replace(/\s+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }),
  handleValidationErrors
];

// Address validation
const validateAddress = () => [
  body('address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-\,\.\#\/]+$/)
    .withMessage('Address contains invalid characters'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-\.]+$/)
    .withMessage('City can only contain letters, spaces, hyphens, and dots'),
  body('zipCode')
    .trim()
    .isLength({ min: 5, max: 10 })
    .withMessage('ZIP code must be between 5 and 10 characters')
    .matches(/^[0-9\-]+$/)
    .withMessage('ZIP code can only contain numbers and hyphens'),
  handleValidationErrors
];

// Product validation
const validateProduct = () => [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-\.\,\(\)]+$/)
    .withMessage('Product name contains invalid characters'),
  body('price')
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Price must be a valid amount between 0.01 and 999999.99'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('stock')
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage('Stock must be a valid integer between 0 and 999999'),
  handleValidationErrors
];

// Order validation
const validateOrder = () => [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('customer.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  body('customer.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('customer.phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

// Payment validation
const validatePayment = () => [
  body('orderNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Order number must be between 5 and 50 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Order number contains invalid characters'),
  body('paymentMethod')
    .isIn(['cod', 'mastercard', 'googlepay'])
    .withMessage('Invalid payment method - supported methods: cod, mastercard, googlepay'),
  body('amount')
    .isFloat({ min: 1, max: 999999.99 })
    .withMessage('Amount must be a valid number between 1 and 999999.99'),
  body('currency')
    .optional()
    .isIn(['PKR', 'USD'])
    .withMessage('Currency must be PKR or USD'),
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

// Query parameter validation
const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a number between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100'),
  query('sort')
    .optional()
    .matches(/^[a-zA-Z_]+(,(asc|desc))?$/)
    .withMessage('Sort format must be field,direction (e.g., name,asc)'),
  handleValidationErrors
];

// Search query validation
const validateSearch = () => [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-\.]+$/)
    .withMessage('Search query contains invalid characters'),
  handleValidationErrors
];

// File upload validation
const validateFileUpload = (fieldName) => (req, res, next) => {
  if (!req.file && req.body[fieldName]) {
    return res.status(400).json({
      success: false,
      message: `${fieldName} file is required`
    });
  }
  
  if (req.file) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPEG, PNG, and WebP images are allowed'
      });
    }
    
    // Check file size (5MB limit)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size must be less than 5MB'
      });
    }
  }
  
  next();
};

// IP-based rate limiting for specific endpoints
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Specific rate limiters
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later.'
);

const orderRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  3, // 3 orders per minute
  'Too many orders submitted, please try again later.'
);

const paymentRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // 10 payment attempts
  'Too many payment attempts, please try again later.'
);

// CSRF protection for sensitive operations
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API endpoints in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Check for CSRF token in headers
  const token = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token required'
    });
  }
  
  // In a real implementation, you would validate the token
  // For now, we'll just check if it exists
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent information disclosure
  res.removeHeader('X-Powered-By');
  
  // Set referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

module.exports = {
  // Validation middleware
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
  validateAddress,
  validateProduct,
  validateOrder,
  validatePayment,
  validateObjectId,
  validatePagination,
  validateSearch,
  validateFileUpload,
  
  // Rate limiting
  authRateLimit,
  orderRateLimit,
  paymentRateLimit,
  createRateLimit,
  
  // Security middleware
  csrfProtection,
  securityHeaders,
  handleValidationErrors
}; 