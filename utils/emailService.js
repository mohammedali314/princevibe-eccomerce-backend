const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      // Create transporter based on environment
      if (process.env.EMAIL_SERVICE === 'gmail') {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
      } else if (process.env.SMTP_HOST) {
        // SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
      } else {
        // Development mode - use Ethereal Email (test account)
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Using Ethereal Email for development');
      }

      this.isConnected = true;
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.isConnected = false;
    }
  }

  async verifyConnection() {
    try {
      if (!this.transporter) {
        await this.init();
      }
      
      if (this.transporter) {
        await this.transporter.verify();
        this.isConnected = true;
        console.log('✅ Email service connected successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      this.isConnected = false;
    }
    return false;
  }

  async sendEmail(options) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Email service not connected, email not sent');
        return false;
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'Princevibe.store@gmail.com',
        to: options.to,
        subject: options.subject,
        html: options.html || options.text,
        text: options.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', info.messageId);
      
      // Log preview URL for development
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return false;
    }
  }

  async sendOrderConfirmation(order) {
    try {
      const emailContent = this.generateOrderConfirmationEmail(order);
      
      return await this.sendEmail({
        to: order.customer?.email || order.email,
        subject: `Order Confirmation - ${order.orderNumber || order._id}`,
        html: emailContent
      });
    } catch (error) {
      console.error('❌ Failed to send order confirmation email:', error.message);
      return false;
    }
  }

  async sendPaymentConfirmation(order) {
    try {
      const emailContent = this.generatePaymentConfirmationEmail(order);
      
      return await this.sendEmail({
        to: order.customer?.email || order.email,
        subject: `Payment Confirmed - ${order.orderNumber || order._id}`,
        html: emailContent
      });
    } catch (error) {
      console.error('❌ Failed to send payment confirmation email:', error.message);
      return false;
    }
  }

  async sendShippingNotification(order) {
    try {
      const emailContent = this.generateShippingNotificationEmail(order);
      
      return await this.sendEmail({
        to: order.customer?.email || order.email,
        subject: `Order Shipped - ${order.orderNumber || order._id}`,
        html: emailContent
      });
    } catch (error) {
      console.error('❌ Failed to send shipping notification email:', error.message);
      return false;
    }
  }

  async sendOrderStatusUpdate(order, previousStatus) {
    try {
      const emailContent = this.generateOrderStatusUpdateEmail(order, previousStatus);
      
      return await this.sendEmail({
        to: order.customer?.email || order.email,
        subject: `Order Status Update - ${order.orderNumber || order._id}`,
        html: emailContent
      });
    } catch (error) {
      console.error('❌ Failed to send order status update email:', error.message);
      return false;
    }
  }

  async sendPasswordResetEmail({ email, name, resetUrl, resetToken }) {
    try {
      const emailContent = this.generatePasswordResetEmail(name, resetUrl, resetToken);
      
      return await this.sendEmail({
        to: email,
        subject: 'Password Reset Request - Prince Vibe',
        html: emailContent
      });
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error.message);
      return false;
    }
  }

  async sendPasswordResetConfirmation({ email, name }) {
    try {
      const emailContent = this.generatePasswordResetConfirmationEmail(name);
      
      return await this.sendEmail({
        to: email,
        subject: 'Password Reset Successful - Prince Vibe',
        html: emailContent
      });
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation email:', error.message);
      return false;
    }
  }

  generateOrderConfirmationEmail(order) {
    const items = order.items?.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name || item.productName}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          PKR ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Order Confirmation</h2>
          
          <p>Dear ${order.customer?.name || 'Customer'},</p>
          
          <p>Thank you for your order! We've received your order and are processing it.</p>
          
          <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber || order._id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> PKR ${(order.total || order.summary?.total || 0).toLocaleString()}</p>
          </div>
          
          ${items ? `
          <h3>Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f1f1f1;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>
          ` : ''}
          
          <p>We'll send you another email when your order ships.</p>
          
          <p>Best regards,<br>Prince Vibe Team</p>
        </div>
      </body>
      </html>
    `;
  }

  generatePaymentConfirmationEmail(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #27ae60;">Payment Confirmed</h2>
          
          <p>Dear ${order.customer?.name || 'Customer'},</p>
          
          <p>Your payment has been successfully processed!</p>
          
          <div style="background: #d4edda; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #27ae60;">
            <h3>Payment Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber || order._id}</p>
            <p><strong>Payment Amount:</strong> PKR ${(order.payment?.amount || order.total || 0).toLocaleString()}</p>
            <p><strong>Payment Method:</strong> ${order.payment?.method || 'N/A'}</p>
            <p><strong>Transaction Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Your order is now being processed and will be shipped soon.</p>
          
          <p>Best regards,<br>Prince Vibe Team</p>
        </div>
      </body>
      </html>
    `;
  }

  generateShippingNotificationEmail(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Shipped</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3498db;">Your Order Has Shipped!</h2>
          
          <p>Dear ${order.customer?.name || 'Customer'},</p>
          
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          
          <div style="background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #3498db;">
            <h3>Shipping Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber || order._id}</p>
            ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
            <p><strong>Shipping Address:</strong><br>
            ${order.customer?.address?.street || ''}<br>
            ${order.customer?.address?.city || ''}, ${order.customer?.address?.state || ''}<br>
            ${order.customer?.address?.zipCode || ''}</p>
            ${order.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString()}</p>` : ''}
          </div>
          
          <p>You can track your package using the tracking number provided above.</p>
          
          <p>Best regards,<br>Prince Vibe Team</p>
        </div>
      </body>
      </html>
    `;
  }

  generateOrderStatusUpdateEmail(order, previousStatus) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #9b59b6;">Order Status Update</h2>
          
          <p>Dear ${order.customer?.name || 'Customer'},</p>
          
          <p>Your order status has been updated.</p>
          
          <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Status Update</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber || order._id}</p>
            <p><strong>Previous Status:</strong> ${previousStatus || 'N/A'}</p>
            <p><strong>Current Status:</strong> ${order.status || 'N/A'}</p>
            <p><strong>Updated On:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Thank you for shopping with us!</p>
          
          <p>Best regards,<br>Prince Vibe Team</p>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetEmail(name, resetUrl, resetToken) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center; }
          .content { padding: 2rem; background: #f8f9fa; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 1rem 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
          .footer { background: #333; color: white; padding: 1rem; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${name},</h2>
            
            <p>We received a request to reset your password for your Prince Vibe account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in <strong>10 minutes</strong></li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>For security, never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">
              ${resetUrl}
            </p>
            
            <p>If you have any questions or concerns, please contact our support team.</p>
            
            <p>Best regards,<br>
            The Prince Vibe Team</p>
          </div>
          
          <div class="footer">
            <p>Prince Vibe - Luxury Watches</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetConfirmationEmail(name) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Successful</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; padding: 2rem; text-align: center; }
          .content { padding: 2rem; background: #f8f9fa; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 1rem; border-radius: 6px; margin: 1rem 0; color: #155724; }
          .footer { background: #333; color: white; padding: 1rem; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Successful</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${name},</h2>
            
            <div class="success">
              <strong>✅ Success!</strong> Your password has been reset successfully.
            </div>
            
            <p>Your Prince Vibe account password has been changed. You can now log in with your new password.</p>
            
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Log in to your account with your new password</li>
              <li>Update your account security settings if needed</li>
              <li>Continue shopping for luxury watches</li>
            </ul>
            
            <p><strong>Security Tip:</strong> For your account security, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your login credentials</li>
              <li>Logging out from shared devices</li>
            </ul>
            
            <p>If you didn't make this change or if you have any concerns about your account security, please contact our support team immediately.</p>
            
            <p>Thank you for choosing Prince Vibe!</p>
            
            <p>Best regards,<br>
            The Prince Vibe Team</p>
          </div>
          
          <div class="footer">
            <p>Prince Vibe - Luxury Watches</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Create and export a singleton instance
const emailService = new EmailService();

module.exports = emailService; 