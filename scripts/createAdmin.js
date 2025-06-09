const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const MONGO_URI = 'mongodb+srv://Aliking:%40Aliking314@princevibe.e7wj8ye.mongodb.net/princevibe';

const createDefaultAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'Princevibe.store@gmail.com' });
    if (existingAdmin) {
      console.log('Default admin already exists');
      process.exit(0);
    }

    // Create default admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const defaultAdmin = new Admin({
      name: 'Prince Vibe Admin',
      email: 'Princevibe.store@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      permissions: {
        products: { create: true, read: true, update: true, delete: true },
        orders: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        analytics: { read: true },
        settings: { read: true, update: true }
      },
      isActive: true
    });

    await defaultAdmin.save();
    console.log('Default admin created successfully');
    console.log('Email: Princevibe.store@gmail.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating default admin:', error);
    process.exit(1);
  }
};

createDefaultAdmin(); 