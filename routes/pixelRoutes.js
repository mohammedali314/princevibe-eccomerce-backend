const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const PIXEL_ID = '1047507600841338';
const ACCESS_TOKEN = 'EAARLuyywfgcBOxNm9LY2jCCOQ9hc5zk0oFij04dPQTmcrldagpNNg4uz6co8EjnR6RZCz4BvkqMKBp31aJGdzH1EWCZCVqSUyqTQdWDyiwLGMtVjSqhDTjZCErzXWq1GggJD6YtPLGJBu9KzgUuEllZBZAgSbooNUFZAcHPAZBQFcLTE7bQS6RSANpWJEvg7vtESQZDZD';

router.post('/purchase', async (req, res) => {
  const { email, value, currency, product_id, product_name } = req.body;
  console.log('Received purchase event:', req.body);
  if (!email || !value || !currency || !product_id || !product_name) {
    console.log('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const hashedEmail = crypto.createHash('sha256').update(email).digest('hex');
    
    // Extract product ID as string (handle both string and object cases)
    const productIdString = typeof product_id === 'string' ? product_id : product_id._id || product_id.id || 'UNKNOWN';
    
    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          user_data: {
            em: [hashedEmail],
            client_ip_address: req.ip,
            client_user_agent: req.headers['user-agent']
          },
          custom_data: {
            value: value,
            currency: currency,
            content_ids: [productIdString],
            content_name: product_name,
            content_type: 'product'
          },
          event_source_url: req.headers.referer || '',
          action_source: 'website',
          event_id: `purchase-${productIdString}-${Date.now()}`
        }
      ]
    };
    console.log('Sending payload to Meta:', JSON.stringify(payload, null, 2));
    
    // Use dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const data = await response.json();
    console.log('Meta response:', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error sending to Meta Pixel:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router; 