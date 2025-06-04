const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const Order = require('../models/Order');
const emailService = require('../utils/emailService');

const router = express.Router();

// Payment Gateway Configurations - Updated for new payment methods
const PAYMENT_GATEWAYS = {
  mastercard: {
    // Mastercard/Credit Card processing via Stripe or similar
    apiKey: process.env.STRIPE_SECRET_KEY || process.env.MASTERCARD_API_KEY,
    apiUrl: 'https://api.stripe.com/v1/payment_intents',
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY || process.env.MASTERCARD_PUBLIC_KEY,
    returnUrl: `${process.env.FRONTEND_URL}/payment/callback/mastercard`
  },
  googlepay: {
    // Google Pay integration
    merchantId: process.env.GOOGLEPAY_MERCHANT_ID,
    environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
    apiUrl: 'https://pay.google.com/gp/p/ui/pay',
    returnUrl: `${process.env.FRONTEND_URL}/payment/callback/googlepay`
  },
  faysal: {
    // Faysal Bank - Temporarily disabled
    merchantId: process.env.FAYSAL_MERCHANT_ID,
    password: process.env.FAYSAL_PASSWORD,
    apiUrl: 'https://faysalbank.com/ecommerce/api/payment',
    returnUrl: `${process.env.FRONTEND_URL}/payment/callback/faysal`,
    enabled: false // Temporarily disabled
  }
};

// @desc    Initialize payment with selected gateway
// @route   POST /api/payments/initialize
// @access  Public
const initializePayment = async (req, res) => {
  try {
    const { orderNumber, paymentMethod, amount, currency = 'PKR' } = req.body;

    // Validate required fields
    if (!orderNumber || !paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }

    // Check if payment method is supported
    const supportedMethods = ['cod', 'mastercard', 'googlepay'];
    if (!supportedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Payment method not supported or temporarily unavailable'
      });
    }

    // Find the order
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify amount matches order total
    if (parseFloat(amount) !== order.summary.total) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match order total'
      });
    }

    let paymentResponse;

    switch (paymentMethod) {
      case 'mastercard':
        paymentResponse = await initializeMastercard(order, amount);
        break;
      case 'googlepay':
        paymentResponse = await initializeGooglePay(order, amount);
        break;
      case 'cod':
        paymentResponse = await processCOD(order);
        break;
      case 'faysal':
        return res.status(400).json({
          success: false,
          message: 'Faysal Bank payment is temporarily unavailable. Please use another payment method.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method'
        });
    }

    // Update order with payment information
    order.payment.method = paymentMethod;
    order.payment.transactionId = paymentResponse.transactionId;
    order.payment.status = 'processing';
    order.payment.gatewayResponse = paymentResponse.gatewayResponse || {};
    await order.save();

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: paymentResponse
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initialization failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Mastercard/Credit Card Payment Integration
const initializeMastercard = async (order, amount) => {
  const config = PAYMENT_GATEWAYS.mastercard;
  const transactionId = `MC${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    // For Stripe integration
    const paymentIntent = {
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency: 'pkr',
      payment_method_types: ['card'],
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email
      },
      receipt_email: order.customer.email,
      description: `Payment for Order ${order.orderNumber} - Prince Vibe`
    };

    // In a real implementation, you would make an API call to Stripe here
    // const stripeResponse = await axios.post(config.apiUrl, paymentIntent, {
    //   headers: {
    //     'Authorization': `Bearer ${config.apiKey}`,
    //     'Content-Type': 'application/json'
    //   }
    // });

    return {
      transactionId,
      paymentUrl: `${process.env.FRONTEND_URL}/payment/card-form`,
      method: 'GET',
      params: {
        orderId: order._id,
        amount: amount,
        currency: 'PKR'
      },
      redirectUrl: `${process.env.FRONTEND_URL}/payment/card-form?order=${order._id}&amount=${amount}`
    };
  } catch (error) {
    console.error('Mastercard payment initialization error:', error);
    throw new Error('Failed to initialize Mastercard payment');
  }
};

// Google Pay Payment Integration
const initializeGooglePay = async (order, amount) => {
  const config = PAYMENT_GATEWAYS.googlepay;
  const transactionId = `GP${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    const paymentData = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['MASTERCARD', 'VISA']
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'stripe',
            gatewayMerchantId: config.merchantId
          }
        }
      }],
      transactionInfo: {
        totalPrice: amount.toString(),
        totalPriceStatus: 'FINAL',
        currencyCode: 'PKR',
        transactionId: transactionId
      },
      merchantInfo: {
        merchantName: 'Prince Vibe',
        merchantId: config.merchantId
      }
    };

    return {
      transactionId,
      paymentUrl: `${process.env.FRONTEND_URL}/payment/googlepay`,
      method: 'GET',
      params: paymentData,
      redirectUrl: `${process.env.FRONTEND_URL}/payment/googlepay?data=${encodeURIComponent(JSON.stringify(paymentData))}`
    };
  } catch (error) {
    console.error('Google Pay initialization error:', error);
    throw new Error('Failed to initialize Google Pay');
  }
};

// Cash on Delivery Processing
const processCOD = async (order) => {
  const transactionId = `COD${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    // Update order status for COD
    order.payment.status = 'pending';
    order.payment.paidAt = null; // Will be updated when cash is collected
    order.status = 'confirmed';
    
    await order.save();

    // Send order confirmation email
    try {
      await emailService.sendOrderConfirmation(order);
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail the order for email issues
    }

    return {
      transactionId,
      paymentUrl: null,
      method: 'COD',
      params: {},
      redirectUrl: `${process.env.FRONTEND_URL}/order-success?order=${order.orderNumber}`,
      message: 'Order confirmed! Pay cash on delivery.'
    };
  } catch (error) {
    console.error('COD processing error:', error);
    throw new Error('Failed to process cash on delivery order');
  }
};

// @desc    Handle payment callback/webhook
// @route   POST /api/payments/callback/:gateway
// @access  Public
const handlePaymentCallback = async (req, res) => {
  try {
    const { gateway } = req.params;
    const callbackData = req.body;

    let paymentResult;

    switch (gateway) {
      case 'mastercard':
        paymentResult = await verifyMastercardPayment(callbackData);
        break;
      case 'googlepay':
        paymentResult = await verifyGooglePayPayment(callbackData);
        break;
      case 'faysal':
        return res.status(400).json({
          success: false,
          message: 'Faysal Bank payments are temporarily unavailable'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment gateway'
        });
    }

    // Find order by transaction ID
    const order = await Order.findOne({ 
      'payment.transactionId': paymentResult.transactionId 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this transaction'
      });
    }

    // Update order based on payment result
    if (paymentResult.success) {
      order.payment.status = 'paid';
      order.payment.paidAt = new Date();
      order.payment.gatewayResponse = paymentResult.gatewayResponse;
      order.status = 'confirmed';
      
      await order.save();

      // Send payment confirmation email
      try {
        await emailService.sendPaymentConfirmation(order);
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
      }

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          orderNumber: order.orderNumber,
          transactionId: paymentResult.transactionId,
          amount: order.summary.total
        }
      });
    } else {
      order.payment.status = 'failed';
      order.payment.gatewayResponse = paymentResult.gatewayResponse;
      order.status = 'payment_failed';
      
      await order.save();

      res.status(400).json({
        success: false,
        message: paymentResult.message || 'Payment failed',
        data: {
          orderNumber: order.orderNumber,
          transactionId: paymentResult.transactionId
        }
      });
    }

  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Payment verification functions
const verifyMastercardPayment = async (data) => {
  try {
    // Implement Mastercard/Stripe payment verification
    return {
      success: data.status === 'succeeded' || data.paid === true,
      transactionId: data.transactionId || data.id,
      message: data.status === 'succeeded' ? 'Payment successful' : 'Payment failed',
      gatewayResponse: data
    };
  } catch (error) {
    console.error('Mastercard verification error:', error);
    return {
      success: false,
      transactionId: data.transactionId || data.id,
      message: 'Payment verification failed',
      gatewayResponse: data
    };
  }
};

const verifyGooglePayPayment = async (data) => {
  try {
    // Implement Google Pay payment verification
    return {
      success: data.paymentStatus === 'SUCCESS',
      transactionId: data.transactionId,
      message: data.paymentStatus === 'SUCCESS' ? 'Payment successful' : 'Payment failed',
      gatewayResponse: data
    };
  } catch (error) {
    console.error('Google Pay verification error:', error);
    return {
      success: false,
      transactionId: data.transactionId,
      message: 'Payment verification failed',
      gatewayResponse: data
    };
  }
};

// Routes
router.post('/initialize', initializePayment);
router.post('/callback/:gateway', handlePaymentCallback);

// @desc    Get supported payment methods
// @route   GET /api/payments/methods
// @access  Public
router.get('/methods', (req, res) => {
  const supportedMethods = [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when your order arrives',
      enabled: true,
      popular: true
    },
    {
      id: 'mastercard',
      name: 'Mastercard',
      description: 'Secure credit/debit card payment',
      enabled: true,
      popular: true
    },
    {
      id: 'googlepay',
      name: 'Google Pay',
      description: 'Quick & secure Google Pay',
      enabled: true,
      popular: false
    },
    {
      id: 'faysal',
      name: 'Faysal Bank',
      description: 'Coming soon - Under development',
      enabled: false,
      popular: false
    }
  ];

  res.json({
    success: true,
    data: supportedMethods.filter(method => method.enabled)
  });
});

module.exports = router; 