const cloudinary = require('cloudinary').v2;

// Ensure environment variables are loaded
require('dotenv').config();

// Configure Cloudinary with only environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim()
});

// Log configuration status without exposing credentials
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ SET' : '❌ NOT SET');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ NOT SET');

// Enhanced Debug: Log all environment variables and configuration
console.log('🔧 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

console.log('🔧 Cloudinary Configuration:');
console.log('Cloud Name:', cloudinary.config().cloud_name);
console.log('API Key:', cloudinary.config().api_key);
console.log('API Secret:', cloudinary.config().api_secret ? '***CONFIGURED***' : 'NOT SET');

// Check for missing credentials
if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
  console.error('❌ Missing Cloudinary credentials in environment variables');
  console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

// Test Cloudinary connection (non-blocking)
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary ping failed:', error?.error?.message || error.message);
    console.error('❌ HTTP Code:', error?.error?.http_code);
    if (error?.error?.message === 'cloud_name mismatch') {
      console.error('💡 Hint: Please verify your cloud_name and API credentials match');
      console.error('💡 Check your Cloudinary dashboard: https://console.cloudinary.com/');
    }
    console.log('⚠️ Continuing without ping test - will attempt uploads anyway');
    return false;
  }
};

// Test connection on startup (but don't block the app)
testCloudinaryConnection().catch(() => {
  console.log('⚠️ Cloudinary ping test failed, but uploads may still work');
});

// Upload image to Cloudinary
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: 'prince-vibe/products', // Organize uploads in folders
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' }, // Optimize image quality
        { fetch_format: 'auto' }  // Automatically select best format
      ],
      ...options
    };

    console.log('📤 Uploading to Cloudinary with options:', {
      folder: uploadOptions.folder,
      public_id: uploadOptions.public_id || 'auto-generated'
    });

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload successful:', {
            public_id: result.public_id,
            secure_url: result.secure_url
          });
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

// Delete image from Cloudinary
const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    console.log('🗑️ Deleting from Cloudinary:', publicId);
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error('❌ Cloudinary delete error:', error);
        reject(error);
      } else {
        console.log('✅ Cloudinary delete successful:', result);
        resolve(result);
      }
    });
  });
};

// Generate optimized URL with transformations
const getOptimizedUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto:good',
    fetch_format: 'auto'
  };

  return cloudinary.url(publicId, {
    ...defaultTransformations,
    ...transformations
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl,
  testCloudinaryConnection
}; 