# Prince Vibe - E-Commerce Backend

A robust Node.js backend API for the Prince Vibe luxury watch e-commerce platform.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Cloudinary integration with Multer
- **Password Hashing**: bcryptjs
- **Environment**: dotenv for configuration
- **CORS**: Enabled for cross-origin requests

## 📁 Project Structure

```
Prince_vibe_backend/
├── controllers/           # Request handlers
│   ├── adminController.js # Admin authentication & management
│   ├── orderController.js # Order management
│   └── productController.js # Product CRUD operations
├── middleware/            # Custom middleware
│   ├── auth.js           # Authentication middleware
│   └── upload.js         # File upload configuration
├── models/               # Database schemas
│   ├── Admin.js          # Admin user schema
│   ├── Order.js          # Order schema
│   └── Product.js        # Product schema
├── routes/               # API routes
│   └── adminRoutes.js    # Admin API endpoints
├── uploads/              # Temporary file storage
├── .env                  # Environment variables (not in repo)
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
└── server.js            # Main application entry point
```

## 🚀 Features

### Admin Management
- Admin registration and login
- JWT-based authentication
- Protected admin routes
- Profile management

### Product Management
- Create, read, update, delete products
- Image upload with Cloudinary
- Product categories and specifications
- Inventory tracking
- Product statistics

### Order Management
- Order creation and tracking
- Order status updates
- Order statistics and analytics
- Sample order generation

### Analytics Dashboard
- Product and order statistics
- Revenue tracking
- Low stock alerts
- Recent activity monitoring

## 🔧 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Cloudinary account for image storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mohammedali314/princevibe-eccomerce-backend.git
   cd princevibe-eccomerce-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   NODE_ENV=development
   
   # MongoDB
   MONGODB_URI=your_mongodb_connection_string
   
   # JWT Secret
   JWT_SECRET=your_very_secure_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_token_secret
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # CORS
   FRONTEND_URL=https://princevibe-eccomerce.vercel.app
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/register` - Admin registration
- `POST /api/admin/refresh-token` - Refresh JWT token

### Products
- `GET /api/admin/products` - Get all products
- `GET /api/admin/products/:id` - Get product by ID
- `GET /api/admin/products/stats` - Get product statistics
- `POST /api/admin/products` - Create new product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product

### Orders
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/orders/:id` - Get order by ID
- `GET /api/admin/orders/stats` - Get order statistics
- `PUT /api/admin/orders/:id/status` - Update order status

### Analytics
- `GET /api/admin/analytics/dashboard` - Get dashboard analytics

## 🌐 Deployment

### Railway Deployment

1. **Connect to GitHub**
   - Link this repository to Railway
   - Configure environment variables in Railway dashboard

2. **Environment Variables**
   Set the following in Railway:
   ```
   NODE_ENV=production
   MONGODB_URI=your_production_mongodb_uri
   JWT_SECRET=your_production_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   PORT=8080
   ```

3. **Deploy**
   Railway will automatically deploy when you push to the main branch

## 🛡️ Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Protected admin routes
- Input validation and sanitization
- CORS configuration
- Environment variable protection

## 📦 Dependencies

### Production
- express: Web framework
- mongoose: MongoDB ODM
- bcryptjs: Password hashing
- jsonwebtoken: JWT implementation
- multer: File upload handling
- cloudinary: Cloud image storage
- cors: Cross-origin resource sharing
- dotenv: Environment variable loading

### Development
- nodemon: Development server auto-restart

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions, please create an issue in the GitHub repository.

---

**Prince Vibe** - Luxury Watch E-Commerce Platform Backend 