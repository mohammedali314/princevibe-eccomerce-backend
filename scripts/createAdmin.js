const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const MONGO_URI = 'mongodb+srv://Aliking:%40Aliking314@princevibe.e7wj8ye.mongodb.net/princevibe';

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

    if (existingAdmin) {
      console.log('Admin already exists!');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

    // Create new admin
    const admin = new Admin({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('Use environment variables for login credentials');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    mongoose.connection.close();
  }
};

createAdmin(); 