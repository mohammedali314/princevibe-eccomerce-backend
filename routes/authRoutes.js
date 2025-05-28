const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount
} = require('../controllers/authController');
const { authenticate } = require('../middleware/userAuth');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticate, changePassword);

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account', authenticate, deleteAccount);

module.exports = router; 