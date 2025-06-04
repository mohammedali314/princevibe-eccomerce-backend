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
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
      } else if (process.env.SMTP_HOST) {
        // SMTP configuration
        this.transporter = nodemailer.createTransporter({
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
        this.transporter = nodemailer.createTransporter({
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
        from: process.env.FROM_EMAIL || 'noreply@princevibe.com',
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
}

// Create and export a singleton instance
const emailService = new EmailService();

module.exports = emailService; 