const multer = require('multer');

// Configure multer storage for Cloudinary (memory storage)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 10 files
  }
});

// Middleware for single file upload
const uploadSingle = upload.single('image');

// Middleware for multiple file upload
const uploadMultiple = upload.array('images', 10);

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB per file.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 10 files per upload.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name for file upload.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

// Validate image dimensions using buffer (for memory storage)
const validateImageDimensions = async (buffer, minWidth = 100, minHeight = 100) => {
  try {
    // For now, we'll just validate file size and return true
    // You can implement proper image dimension validation using sharp or similar library
    return buffer && buffer.length > 0;
  } catch (error) {
    console.error('Error validating image dimensions:', error);
    return false;
  }
};

// Middleware to validate uploaded images
const validateUploadedImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded.'
      });
    }
    
    // Validate each uploaded file
    for (const file of req.files) {
      const isValid = await validateImageDimensions(file.buffer);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: `Invalid image for file: ${file.originalname}`
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Image validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating uploaded images.'
    });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  validateUploadedImages
}; 