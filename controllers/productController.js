const Product = require('../models/Product');
const AdminActionLog = require('../models/AdminActionLog');
const { deleteFile, getFileUrl } = require('../middleware/upload');
const { uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl } = require('../config/cloudinary');
const path = require('path');

// Helper function to build query filters
const buildQuery = (queryParams) => {
  const query = { isActive: true };
  
  if (queryParams.category) {
    query.category = queryParams.category.toLowerCase();
  }
  
  if (queryParams.priceMin || queryParams.priceMax) {
    query.price = {};
    if (queryParams.priceMin) query.price.$gte = Number(queryParams.priceMin);
    if (queryParams.priceMax) query.price.$lte = Number(queryParams.priceMax);
  }
  
  if (queryParams.inStock === 'true') {
    query.inStock = true;
    query.quantity = { $gt: 0 };
  }
  
  if (queryParams.rating) {
    query.rating = { $gte: Number(queryParams.rating) };
  }
  
  if (queryParams.tags) {
    const tags = queryParams.tags.split(',').map(tag => tag.trim().toLowerCase());
    query.tags = { $in: tags };
  }
  
  if (queryParams.featured === 'true') {
    query.isFeatured = true;
  }
  
  return query;
};

// Helper function to build sort options
const buildSort = (sortBy, sortOrder = 'desc') => {
  const order = sortOrder === 'asc' ? 1 : -1;
  
  switch (sortBy) {
    case 'price':
      return { price: order };
    case 'rating':
      return { rating: order };
    case 'name':
      return { name: order };
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'popular':
      return { salesCount: -1, viewCount: -1 };
    default:
      return { createdAt: -1 };
  }
};

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = buildQuery(req.query);
    
    // Build sort
    const sort = buildSort(req.query.sortBy, req.query.sortOrder);
    
    // Execute query with pagination
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    // Get total count for pagination
    const total = await Product.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: products
    });
    
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('-__v');
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Increment view count
    await product.incrementViews();
    
    res.status(200).json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const query = { category, isActive: true };
    const sort = buildSort(req.query.sortBy, req.query.sortOrder);
    
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    const total = await Product.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: products
    });
    
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products by category'
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    const products = await Product.find({ isFeatured: true, isActive: true })
      .sort({ rating: -1, salesCount: -1 })
      .limit(limit)
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
    
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products'
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, category, priceMin, priceMax } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Build search query
    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { 'specifications.movement': { $regex: q, $options: 'i' } },
        { 'specifications.caseMaterial': { $regex: q, $options: 'i' } }
      ]
    };
    
    // Add additional filters
    if (category) searchQuery.category = category.toLowerCase();
    if (priceMin || priceMax) {
      searchQuery.price = {};
      if (priceMin) searchQuery.price.$gte = Number(priceMin);
      if (priceMax) searchQuery.price.$lte = Number(priceMax);
    }
    
    const products = await Product.find(searchQuery)
      .sort({ rating: -1, salesCount: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    const total = await Product.countDocuments(searchQuery);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      query: q,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: products
    });
    
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products'
    });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Public
const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          averageRating: { $avg: '$rating' },
          totalViews: { $sum: '$viewCount' },
          totalSales: { $sum: '$salesCount' }
        }
      }
    ]);
    
    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        general: stats[0] || {},
        categories: categoryStats
      }
    });
    
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product statistics'
    });
  }
};

// @desc    Create new product (Admin only)
// @route   POST /api/admin/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    console.log('Creating product...');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    let productData;
    
    // Check if productData is sent as JSON string (from FormData)
    if (req.body.productData) {
      try {
        productData = JSON.parse(req.body.productData);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product data format'
        });
      }
    } else {
      // Use req.body directly for regular JSON requests
      productData = req.body;
    }
    
    // Process uploaded images to Cloudinary
    let images = [];
    if (req.files && req.files.length > 0) {
      const mainImageIndex = req.body.mainImageIndex ? parseInt(req.body.mainImageIndex) : 0;
      
      console.log('Uploading images to Cloudinary...');
      
      // Upload each image to Cloudinary
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const result = await uploadToCloudinary(file.buffer, {
            public_id: `product-${Date.now()}-${index}`,
            width: 1000,
            height: 1000,
            crop: 'limit'
          });
          
          return {
            url: result.secure_url,
            publicId: result.public_id,
            alt: file.originalname,
            isMain: index === mainImageIndex
          };
        } catch (uploadError) {
          console.error('Error uploading image to Cloudinary:', uploadError);
          throw new Error(`Failed to upload image: ${file.originalname}`);
        }
      });
      
      try {
        images = await Promise.all(uploadPromises);
        console.log('Images uploaded successfully to Cloudinary:', images.length);
      } catch (uploadError) {
        console.error('Failed to upload images:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload images to cloud storage',
          error: uploadError.message
        });
      }
    }
    
    // Create product object
    const productCreateData = {
      ...productData,
      images: images,
      // Ensure arrays are properly handled
      features: Array.isArray(productData.features) ? productData.features : [],
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      // Handle reviews field properly
      reviews: {
        count: parseInt(productData.reviews) || 0,
        data: []
      },
      // Generate SKU if not provided
      sku: productData.sku || `PV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      // Auto-generate slug if not provided
      slug: productData.seo?.slug || productData.name?.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim(),
      isActive: true,
      createdAt: new Date()
    };
    
    console.log('Creating product with data:', productCreateData);
    
    const product = new Product(productCreateData);
    const savedProduct = await product.save();
    
    console.log('Product created successfully:', savedProduct._id);
    
    // Log product creation activity
    if (req.admin) {
      try {
        await AdminActionLog.logAction({
          adminId: req.admin._id,
          adminName: req.admin.name,
          adminEmail: req.admin.email,
          action: 'product_created',
          targetType: 'product',
          targetId: savedProduct._id.toString(),
          targetName: savedProduct.name,
          description: `Created new product: ${savedProduct.name} (${savedProduct.sku})`,
          metadata: {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            productCategory: savedProduct.category,
            productPrice: savedProduct.price
          },
          severity: 'medium',
          status: 'success'
        });
      } catch (logError) {
        console.error('Failed to log product creation activity:', logError);
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct
    });
    
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU or slug already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// @desc    Update product (Admin only)
// @route   PUT /api/admin/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res) => {
  try {
    console.log('Updating product...');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Parse form data similar to createProduct
    let updateData = {};

    // Handle basic fields
    const basicFields = ['name', 'description', 'price', 'comparePrice', 'category', 'sku', 'quantity', 'rating', 'reviews', 'inStock', 'isFeatured', 'isActive'];
    basicFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'price' || field === 'comparePrice' || field === 'quantity' || field === 'rating') {
          updateData[field] = Number(req.body[field]);
        } else if (field === 'reviews') {
          // Handle reviews count properly
          updateData['reviews.count'] = parseInt(req.body[field]) || 0;
        } else if (field === 'inStock' || field === 'isFeatured' || field === 'isActive') {
          updateData[field] = req.body[field] === 'true' || req.body[field] === true;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Handle JSON fields (specifications, seo, features, tags)
    const jsonFields = ['specifications', 'seo', 'features', 'tags'];
    jsonFields.forEach(field => {
      if (req.body[field]) {
        try {
          updateData[field] = JSON.parse(req.body[field]);
        } catch (parseError) {
          console.error(`Error parsing ${field}:`, parseError);
          // Skip invalid JSON fields
        }
      }
    });

    // Handle new image uploads if any
    let newImages = [];
    if (req.files && req.files.length > 0) {
      console.log('Processing new images...');
      
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const result = await uploadToCloudinary(file.buffer, {
            public_id: `product-${product._id}-${Date.now()}-${index}`,
            transformation: [
              { width: 1000, height: 1000, crop: 'limit' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          });
          
          return {
            url: result.secure_url,
            publicId: result.public_id,
            alt: `${updateData.name || product.name} image`,
            isMain: false
          };
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error(`Failed to upload image: ${file.originalname}`);
        }
      });

      try {
        newImages = await Promise.all(uploadPromises);
        console.log('New images uploaded:', newImages.length);
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload new images',
          error: uploadError.message
        });
      }
    }

    // Handle image deletions
    let updatedImages = [...(product.images || [])];
    if (req.body.imagesToDelete) {
      try {
        const imagesToDelete = JSON.parse(req.body.imagesToDelete);
        
        // Delete from Cloudinary
        const deletePromises = imagesToDelete.map(async (publicId) => {
          try {
            await deleteFromCloudinary(publicId);
            console.log(`Deleted image from Cloudinary: ${publicId}`);
          } catch (deleteError) {
            console.error(`Failed to delete image: ${publicId}`, deleteError);
          }
        });
        
        await Promise.all(deletePromises);
        
        // Remove from product images array
        updatedImages = updatedImages.filter(img => !imagesToDelete.includes(img.publicId));
      } catch (parseError) {
        console.error('Error parsing imagesToDelete:', parseError);
      }
    }

    // Add new images to the updated images array
    if (newImages.length > 0) {
      updatedImages.push(...newImages);
    }

    // Update the images in the update data
    updateData.images = updatedImages;

    // Generate slug if name is being updated
    if (updateData.name) {
      updateData.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }

    console.log('Final update data:', updateData);

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('Product updated successfully:', updatedProduct._id);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
    
  } catch (error) {
    console.error('Update product error:', error);
    
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
      message: 'Error updating product',
      error: error.message
    });
  }
};

// @desc    Delete product (Admin only)
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Delete associated images from Cloudinary
    if (product.images && product.images.length > 0) {
      console.log('Deleting images from Cloudinary...');
      const deletePromises = product.images.map(async (image) => {
        if (image.publicId) {
          try {
            await deleteFromCloudinary(image.publicId);
            console.log(`Deleted image from Cloudinary: ${image.publicId}`);
          } catch (deleteError) {
            console.error(`Failed to delete image from Cloudinary: ${image.publicId}`, deleteError);
            // Continue with product deletion even if image deletion fails
          }
        }
      });
      
      await Promise.all(deletePromises);
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
};

// @desc    Upload product images (Admin only)
// @route   POST /api/admin/products/:id/images
// @access  Private (Admin)
const uploadProductImages = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }
    
    // Upload images to Cloudinary
    console.log('Uploading additional images to Cloudinary...');
    const uploadPromises = req.files.map(async (file, index) => {
      try {
        const result = await uploadToCloudinary(file.buffer, {
          public_id: `product-${product._id}-${Date.now()}-${index}`,
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        });
        
        return {
          url: result.secure_url,
          publicId: result.public_id,
      alt: req.body.alt ? req.body.alt[index] : `${product.name} image`,
      isMain: req.body.isMain === index.toString() || (index === 0 && product.images.length === 0)
        };
      } catch (uploadError) {
        console.error('Error uploading image to Cloudinary:', uploadError);
        throw new Error(`Failed to upload image: ${file.originalname}`);
      }
    });
    
    try {
      const newImages = await Promise.all(uploadPromises);
    
    // If setting a new main image, unset the current one
    if (req.body.isMain !== undefined) {
      product.images.forEach(image => {
        image.isMain = false;
      });
    }
    
    // Add new images to product
    product.images.push(...newImages);
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        uploadedImages: newImages,
        totalImages: product.images.length
      }
    });
    } catch (uploadError) {
      console.error('Failed to upload images:', uploadError);
      res.status(500).json({
        success: false,
        message: 'Failed to upload images to cloud storage',
        error: uploadError.message
      });
    }
    
  } catch (error) {
    console.error('Upload product images error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images'
    });
  }
};

// @desc    Delete product image (Admin only)
// @route   DELETE /api/admin/products/:id/images/:imageId
// @access  Private (Admin)
const deleteProductImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const imageIndex = product.images.findIndex(
      img => img._id.toString() === req.params.imageId
    );
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Delete image from Cloudinary
    const image = product.images[imageIndex];
    if (image.publicId) {
      try {
        await deleteFromCloudinary(image.publicId);
        console.log(`Deleted image from Cloudinary: ${image.publicId}`);
      } catch (deleteError) {
        console.error(`Failed to delete image from Cloudinary: ${image.publicId}`, deleteError);
        // Continue with removing from database even if Cloudinary deletion fails
      }
    }
    
    // Remove image from product
    product.images.splice(imageIndex, 1);
    
    // If we deleted the main image and there are other images, set the first one as main
    if (image.isMain && product.images.length > 0) {
      product.images[0].isMain = true;
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        remainingImages: product.images.length
      }
    });
    
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image'
    });
  }
};

// @desc    Update product inventory
// @route   PATCH /api/admin/products/:id/inventory
// @access  Private (Admin)
const updateInventory = async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;
    
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a non-negative number'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Update quantity based on operation
    switch (operation) {
      case 'set':
        product.quantity = quantity;
        break;
      case 'add':
        product.quantity += quantity;
        break;
      case 'subtract':
        product.quantity = Math.max(0, product.quantity - quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation. Use "set", "add", or "subtract"'
        });
    }
    
    // Update inStock status
    product.inStock = product.quantity > 0;
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: {
        id: product._id,
        name: product.name,
        quantity: product.quantity,
        inStock: product.inStock
      }
    });
    
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inventory'
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts,
  getProductStats,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  updateInventory
}; 