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
    const supportedMethods = ['cod'];
    if (!supportedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'We currently accept Cash on Delivery (COD) only. Other payment methods are not available at this time.'
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
      case 'cod':
        paymentResponse = await processCOD(order);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'We currently accept Cash on Delivery (COD) only. Other payment methods are not available at this time.'
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
      paymentData,
      environment: config.environment,
      redirectUrl: `${process.env.FRONTEND_URL}/payment/googlepay?order=${order._id}&amount=${amount}`
    };
  } catch (error) {
    console.error('Google Pay payment initialization error:', error);
    throw new Error('Failed to initialize Google Pay payment');
  }
};

// Cash on Delivery Processing
const processCOD = async (order) => {
  const transactionId = `COD${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    // For COD, we just need to generate a transaction ID and mark as pending
    return {
      transactionId,
      method: 'cod',
      status: 'pending',
      message: 'Cash on Delivery order confirmed. Pay when your order arrives.',
      redirectUrl: `${process.env.FRONTEND_URL}/order-confirmation/${order._id}`
    };
  } catch (error) {
    console.error('COD processing error:', error);
    throw new Error('Failed to process Cash on Delivery');
  }
};

// @desc    Handle payment callbacks from gateways
// @route   POST /api/payments/callback/:gateway
// @access  Public
const handlePaymentCallback = async (req, res) => {
  try {
    const { gateway } = req.params;
    const callbackData = req.body;

    let verificationResult;

    switch (gateway) {
      case 'mastercard':
        verificationResult = await verifyMastercardPayment(callbackData);
        break;
      case 'googlepay':
        verificationResult = await verifyGooglePayPayment(callbackData);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid payment gateway'
        });
    }

    if (verificationResult.success) {
      // Update order status
      const order = await Order.findById(verificationResult.orderId);
      if (order) {
        order.payment.status = 'completed';
        order.payment.completedAt = new Date();
        order.payment.gatewayResponse = verificationResult.gatewayResponse;
        order.status = 'confirmed';
        await order.save();

        // Send confirmation email
        await emailService.sendPaymentConfirmation(order);

        res.json({
          success: true,
          message: 'Payment verified successfully',
          orderId: order._id
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.error
      });
    }

  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment callback processing failed'
    });
  }
};

// Verify Mastercard/Stripe payment
const verifyMastercardPayment = async (data) => {
  try {
    // In a real implementation, verify the payment with Stripe API
    // const verification = await stripe.paymentIntents.retrieve(data.payment_intent);
    
    return {
      success: true,
      orderId: data.orderId,
      transactionId: data.transactionId,
      gatewayResponse: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify Google Pay payment
const verifyGooglePayPayment = async (data) => {
  try {
    // In a real implementation, verify the Google Pay token
    // This would involve decrypting and validating the payment token
    
    return {
      success: true,
      orderId: data.orderId,
      transactionId: data.transactionId,
      gatewayResponse: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
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
      description: 'Pay cash when your order is delivered to your doorstep',
      enabled: true,
      popular: true
    }
  ];

  res.json({
    success: true,
    data: supportedMethods,
    message: 'We currently accept Cash on Delivery (COD) only for your security and convenience.'
  });
});

module.exports = router; 