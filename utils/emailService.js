const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Verify email connection
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('📧 Email service connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }

  // Send order confirmation email
  async sendOrderConfirmation(order) {
    try {
      const subject = `Order Confirmation - ${order.orderNumber}`;
      const html = this.generateOrderConfirmationHTML(order);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Prince Vibe <noreply@princevibe.com>',
        to: order.customer.email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Order confirmation sent to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Failed to send order confirmation:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(order) {
    try {
      const subject = `Payment Received - ${order.orderNumber}`;
      const html = this.generatePaymentConfirmationHTML(order);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Prince Vibe <noreply@princevibe.com>',
        to: order.customer.email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Payment confirmation sent to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Failed to send payment confirmation:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send shipping notification email
  async sendShippingNotification(order) {
    try {
      const subject = `Your Order is on the Way - ${order.orderNumber}`;
      const html = this.generateShippingNotificationHTML(order);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Prince Vibe <noreply@princevibe.com>',
        to: order.customer.email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Shipping notification sent to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Failed to send shipping notification:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send order status update email
  async sendOrderStatusUpdate(order, previousStatus) {
    try {
      const subject = `Order Update - ${order.orderNumber}`;
      const html = this.generateOrderStatusUpdateHTML(order, previousStatus);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Prince Vibe <noreply@princevibe.com>',
        to: order.customer.email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Order status update sent to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Failed to send order status update:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Generate order confirmation HTML
  generateOrderConfirmationHTML(order) {
    const itemsHTML = order.items.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #e5e5e5;">
          <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e5e5e5;">
          <h4 style="margin: 0; font-size: 16px; color: #000;">${item.name}</h4>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Qty: ${item.quantity}</p>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">
          Rs. ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #000000; color: #ffffff; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">PRINCE VIBE</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">LUXURY TIMEPIECES</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px 0; color: #000; font-size: 24px;">Order Confirmation</h2>
            <p style="margin: 0 0 30px 0; color: #666; line-height: 1.6;">
              Dear ${order.customer.name},<br><br>
              Thank you for your order! We've received your order and will begin processing it soon.
            </p>

            <!-- Order Info -->
            <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 30px; border-left: 4px solid #000;">
              <h3 style="margin: 0 0 15px 0; color: #000;">Order Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Payment Method:</strong> ${this.getPaymentMethodName(order.payment.method)}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Total Amount:</strong> Rs. ${order.summary.total.toLocaleString()}</p>
            </div>

            <!-- Items -->
            <h3 style="margin: 0 0 20px 0; color: #000;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              ${itemsHTML}
              <tr>
                <td colspan="2" style="padding: 15px; text-align: right; font-weight: 600; border-top: 2px solid #000;">
                  Total: Rs. ${order.summary.total.toLocaleString()}
                </td>
              </tr>
            </table>

            <!-- Shipping Address -->
            <h3 style="margin: 0 0 15px 0; color: #000;">Shipping Address</h3>
            <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 30px;">
              <p style="margin: 0; color: #666; line-height: 1.6;">
                ${order.customer.name}<br>
                ${order.customer.address.street}<br>
                ${order.customer.address.city}, ${order.customer.address.state} ${order.customer.address.zipCode}<br>
                ${order.customer.address.country}<br>
                Phone: ${order.customer.phone}
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
              <h3 style="margin: 0 0 15px 0;">What's Next?</h3>
              <p style="margin: 0; line-height: 1.6;">
                We'll send you another email when your order ships. You can track your order status online.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 30px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Thank you for choosing Prince Vibe</p>
            <p style="margin: 0;">If you have any questions, contact us at admin@princevibe.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate payment confirmation HTML
  generatePaymentConfirmationHTML(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #000000; color: #ffffff; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">PRINCE VIBE</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">PAYMENT CONFIRMED</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 80px; height: 80px; background-color: #22c55e; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="color: white; font-size: 40px;">✓</span>
              </div>
              <h2 style="margin: 0; color: #000; font-size: 24px;">Payment Received!</h2>
              <p style="margin: 10px 0 0 0; color: #666;">Your payment has been successfully processed.</p>
            </div>

            <!-- Payment Details -->
            <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px 0; color: #000;">Payment Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Transaction ID:</strong> ${order.payment.transactionId}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Amount Paid:</strong> Rs. ${order.summary.total.toLocaleString()}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Payment Method:</strong> ${this.getPaymentMethodName(order.payment.method)}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Payment Date:</strong> ${new Date(order.payment.paidAt).toLocaleDateString()}</p>
            </div>

            <div style="text-align: center; background-color: #000; color: #fff; padding: 20px;">
              <p style="margin: 0; line-height: 1.6;">
                Your order is now being prepared for shipment. We'll notify you when it's on the way!
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 30px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Thank you for your business!</p>
            <p style="margin: 0;">Questions? Contact us at admin@princevibe.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate shipping notification HTML
  generateShippingNotificationHTML(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Shipped</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #000000; color: #ffffff; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">PRINCE VIBE</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">ORDER SHIPPED</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 80px; height: 80px; background-color: #3b82f6; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="color: white; font-size: 30px;">📦</span>
              </div>
              <h2 style="margin: 0; color: #000; font-size: 24px;">Your Order is on the Way!</h2>
              <p style="margin: 10px 0 0 0; color: #666;">Order ${order.orderNumber} has been shipped.</p>
            </div>

            <!-- Tracking Info -->
            <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px 0; color: #000;">Shipping Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              ${order.shipping.trackingNumber ? `<p style="margin: 5px 0; color: #666;"><strong>Tracking Number:</strong> ${order.shipping.trackingNumber}</p>` : ''}
              <p style="margin: 5px 0; color: #666;"><strong>Shipped Date:</strong> ${new Date(order.shipping.shippedAt).toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Estimated Delivery:</strong> ${order.shipping.estimatedDelivery ? new Date(order.shipping.estimatedDelivery).toLocaleDateString() : '3-5 business days'}</p>
            </div>

            <div style="text-align: center; background-color: #000; color: #fff; padding: 20px;">
              <p style="margin: 0 0 15px 0; line-height: 1.6;">
                Your package is on its way! You'll receive an email confirmation when it's delivered.
              </p>
              ${order.shipping.trackingNumber ? `<p style="margin: 0; font-size: 14px; opacity: 0.9;">Track your package using the tracking number above.</p>` : ''}
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 30px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Thanks for shopping with Prince Vibe!</p>
            <p style="margin: 0;">Need help? Contact us at admin@princevibe.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate order status update HTML
  generateOrderStatusUpdateHTML(order, previousStatus) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is currently being processed.',
      shipped: 'Your order has been shipped and is on the way!',
      delivered: 'Your order has been successfully delivered.',
      cancelled: 'Your order has been cancelled.',
      returned: 'Your return has been processed.'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #000000; color: #ffffff; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px;">PRINCE VIBE</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">ORDER UPDATE</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px 0; color: #000; font-size: 24px;">Order Status Update</h2>
            <p style="margin: 0 0 30px 0; color: #666; line-height: 1.6;">
              Dear ${order.customer.name},<br><br>
              Your order status has been updated.
            </p>

            <!-- Status Update -->
            <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 30px; border-left: 4px solid #000;">
              <h3 style="margin: 0 0 15px 0; color: #000;">Current Status: ${order.status.toUpperCase()}</h3>
              <p style="margin: 0; color: #666; line-height: 1.6;">
                ${statusMessages[order.status] || 'Your order status has been updated.'}
              </p>
            </div>

            <!-- Order Details -->
            <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px 0; color: #000;">Order Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Total Amount:</strong> Rs. ${order.summary.total.toLocaleString()}</p>
            </div>

            <div style="text-align: center; background-color: #000; color: #fff; padding: 20px;">
              <p style="margin: 0; line-height: 1.6;">
                Thank you for your patience. We'll keep you updated on any further changes.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9f9f9; padding: 30px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Thank you for choosing Prince Vibe</p>
            <p style="margin: 0;">Questions? Contact us at admin@princevibe.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper method to get payment method display name
  getPaymentMethodName(method) {
    const methods = {
      'cod': 'Cash on Delivery',
      'mastercard': 'Mastercard',
      'googlepay': 'Google Pay',
      'faysal': 'Faysal Bank (Temporarily Unavailable)'
    };
    return methods[method] || method;
  }
}

module.exports = new EmailService(); 