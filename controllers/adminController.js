const Admin = require('../models/Admin');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../middleware/auth');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find admin by email
    const admin = await Admin.findByEmail(email);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }
    
    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Reset login attempts on successful login
    await admin.resetLoginAttempts();
    
    // Update last login
    await admin.updateLastLogin();
    
    // Generate tokens
    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);
    
    // Remove password from response
    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.resetPasswordToken;
    delete adminData.resetPasswordExpire;
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminData,
        token,
        refreshToken
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// @desc    Admin registration (Super admin only)
// @route   POST /api/admin/register
// @access  Private (Super Admin)
const adminRegister = async (req, res) => {
  try {
    const { email, password, name, role = 'admin', permissions } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }
    
    // Create new admin
    const adminData = {
      email,
      password,
      name,
      role,
      permissions: permissions || undefined // Use default permissions if not provided
    };
    
    const admin = new Admin(adminData);
    await admin.save();
    
    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: adminResponse
    });
    
  } catch (error) {
    console.error('Admin registration error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/admin/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    
    // Find admin
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateToken(admin._id);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newAccessToken
      }
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private (Admin)
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password -resetPasswordToken -resetPasswordExpire');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: admin
    });
    
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile'
    });
  }
};

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private (Admin)
const updateAdminProfile = async (req, res) => {
  try {
    const { name, profile, currentPassword, newPassword } = req.body;
    
    const admin = await Admin.findById(req.admin._id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Update basic profile information
    if (name) admin.name = name;
    if (profile) {
      admin.profile = { ...admin.profile, ...profile };
    }
    
    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password'
        });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      admin.password = newPassword;
    }
    
    await admin.save();
    
    // Remove sensitive data from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    delete adminResponse.resetPasswordToken;
    delete adminResponse.resetPasswordExpire;
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: adminResponse
    });
    
  } catch (error) {
    console.error('Update admin profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating admin profile'
    });
  }
};

// @desc    Get all admins (Super admin only)
// @route   GET /api/admin/admins
// @access  Private (Super Admin)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true })
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins
    });
    
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins'
    });
  }
};

// @desc    Update admin permissions (Super admin only)
// @route   PUT /api/admin/admins/:id/permissions
// @access  Private (Super Admin)
const updateAdminPermissions = async (req, res) => {
  try {
    const { permissions, role } = req.body;
    
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Don't allow changing super admin permissions
    if (admin.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify super admin permissions'
      });
    }
    
    if (permissions) admin.permissions = permissions;
    if (role && role !== 'super_admin') admin.role = role;
    
    await admin.save();
    
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    
    res.status(200).json({
      success: true,
      message: 'Admin permissions updated successfully',
      data: adminResponse
    });
    
  } catch (error) {
    console.error('Update admin permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin permissions'
    });
  }
};

// @desc    Deactivate admin account (Super admin only)
// @route   PUT /api/admin/admins/:id/deactivate
// @access  Private (Super Admin)
const deactivateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Don't allow deactivating super admin
    if (admin.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate super admin account'
      });
    }
    
    admin.isActive = false;
    await admin.save();
    
    res.status(200).json({
      success: true,
      message: 'Admin account deactivated successfully'
    });
    
  } catch (error) {
    console.error('Deactivate admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating admin account'
    });
  }
};

module.exports = {
  adminLogin,
  adminRegister,
  refreshToken,
  getAdminProfile,
  updateAdminProfile,
  getAllAdmins,
  updateAdminPermissions,
  deactivateAdmin
}; 