# 🔒 SECURITY SETUP - PRINCE VIBE

## ⚠️ BEFORE LAUNCH - REQUIRED SECURITY STEPS

### 1. Create Production Environment Variables

Create a `.env` file in your backend root with these variables:

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Security
JWT_SECRET=your_very_secure_random_string_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_token_secret_minimum_32_characters
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Admin Credentials (CHANGE THESE!)
ADMIN_EMAIL=your_secure_admin_email@domain.com
ADMIN_PASSWORD=your_very_secure_password_minimum_8_characters

# Cloudinary (Get from your Cloudinary dashboard)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL
FRONTEND_URL=https://princevibe-eccomerce.vercel.app

# Email Service (Optional - for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_business_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="Prince Vibe <noreply@princevibe.com>"

# Production Settings
NODE_ENV=production
PORT=5000
```

### 2. Generate Secure Secrets

Use these methods to generate secure secrets:

**For JWT Secrets:**
```bash
# Method 1: Online generator
# Go to: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
# Generate 256-bit key

# Method 2: Node.js command
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Change Default Admin Credentials

**NEVER use these in production:**
- ❌ admin@princevibe.com
- ❌ admin123
- ❌ Princevibe.store@gmail.com

**Use secure credentials:**
- ✅ Strong email: yourcompany@domain.com
- ✅ Strong password: minimum 12 characters, mixed case, numbers, symbols

### 4. Railway Deployment Environment Variables

Set these in your Railway dashboard:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_generated_jwt_secret
JWT_REFRESH_SECRET=your_generated_refresh_secret
ADMIN_EMAIL=your_secure_admin_email
ADMIN_PASSWORD=your_secure_admin_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://princevibe-eccomerce.vercel.app
NODE_ENV=production
```

### 5. Security Checklist

Before going live, verify:

- [ ] No hardcoded passwords in code
- [ ] No API keys in frontend code
- [ ] Environment variables set in deployment
- [ ] Admin credentials changed from defaults
- [ ] CORS properly configured
- [ ] HTTPS enabled (automatic on Railway/Vercel)
- [ ] Database connection secured
- [ ] Error messages don't expose sensitive info

### 6. Post-Launch Security

After launch:

- [ ] Change admin password monthly
- [ ] Monitor for unusual activity
- [ ] Keep dependencies updated
- [ ] Regular security audits
- [ ] Backup database regularly

## 🚨 NEVER COMMIT TO GIT:

- `.env` files
- `config/production.env`
- Any files with real credentials
- Database connection strings
- API keys or secrets

## ✅ Safe to Commit:

- `.env.example` (with placeholder values)
- Configuration files without real values
- Documentation about security setup 