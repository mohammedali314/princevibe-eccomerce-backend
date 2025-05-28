const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

// Middleware to authenticate admin users
const authenticateAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided or invalid format.'
      });
    }
    
    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is required.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get admin from database
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Admin not found.'
      });
    }
    
    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated.'
      });
    }
    
    // Check if admin account is locked
    if (admin.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is temporarily locked due to too many failed login attempts.'
      });
    }
    
    // Add admin to request object
    req.admin = admin;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

// Middleware to check specific permissions
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    try {
      const admin = req.admin;
      
      // Super admin has all permissions
      if (admin.role === 'super_admin') {
        return next();
      }
      
      // Check if admin has the required permission
      if (admin.permissions[resource] && admin.permissions[resource][action]) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: `Access denied. You don't have permission to ${action} ${resource}.`
      });
      
    } catch (error) {
      console.error('Permission check error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error during permission check.'
      });
    }
  };
};

// Middleware to check if admin is super admin
const requireSuperAdmin = (req, res, next) => {
  try {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }
    next();
  } catch (error) {
    console.error('Super admin check error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during super admin check.'
    });
  }
};

// Generate JWT token
const generateToken = (adminId, expiresIn = '7d') => {
  return jwt.sign(
    { adminId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

// Generate refresh token
const generateRefreshToken = (adminId) => {
  return jwt.sign(
    { adminId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // Find user by ID
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed.'
    });
  }
};

// Middleware to check if user is the owner or admin
const requireOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const userId = req.params.userId || req.params.id;
    
    if (req.user.role === 'admin' || req.user.role === 'moderator' || req.user._id.toString() === userId) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.'
      });
    }
  } catch (error) {
    console.error('Owner/Admin authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed.'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // Find user by ID
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

module.exports = {
  authenticateAdmin,
  requirePermission,
  requireSuperAdmin,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticate,
  requireAdmin,
  requireOwnerOrAdmin,
  optionalAuth
}; 