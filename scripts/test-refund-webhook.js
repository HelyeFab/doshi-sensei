#!/usr/bin/env node

/**
 * Test Refund Webhook
 * Sends a test refund event directly to your Firebase webhook
 */

const https = require('https');
const crypto = require('crypto');

// Get the webhook secret from Firebase config
const { execSync } = require('child_process');
const functionConfig = execSync('firebase functions:config:get 2>/dev/null || echo "{}"').toString();
const config = JSON.parse(functionConfig);
const webhookSecret = config.stripe?.webhook_secret;

if (!webhookSecret) {
  console.error('❌ Webhook secret not found in Firebase config');
  process.exit(1);
}

// Create a test refund event payload
const testEvent = {
  id: 'evt_test_refund_' + Date.now(),
  object: 'event',
  api_version: '2025-04-30.basil',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'ch_test_refund_' + Date.now(),
      object: 'charge',
      amount: 899,
      amount_captured: 899,
      amount_refunded: 899,
      currency: 'gbp',
      customer: 'cus_SvZRd44K7gqpFw',
      description: 'Test refund for webhook testing',
      refunded: true,
      billing_details: {
        email: 'esfabiani@outlook.com',
        name: 'Test User'
      }
    },
    previous_attributes: {
      amount_refunded: 0,
      refunded: false
    }
  },
  livemode: true,
  pending_webhooks: 1,
  request: {
    id: 'req_test_' + Date.now(),
    idempotency_key: 'test_' + Date.now()
  },
  type: 'charge.refunded'
};

// Convert payload to string
const payload = JSON.stringify(testEvent);

// Generate Stripe signature
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payload}`;
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret.replace('whsec_', ''))
  .update(signedPayload, 'utf8')
  .digest('hex');

const signature = `t=${timestamp},v1=${expectedSignature}`;

console.log('🚀 Sending test refund event to Firebase webhook...\n');
console.log('Event ID:', testEvent.id);
console.log('Customer:', testEvent.data.object.customer);
console.log('Amount:', testEvent.data.object.amount_refunded / 100, 'GBP');
console.log('');

// Send the request
const options = {
  hostname: 'us-central1-doshi-sensei.cloudfunctions.net',
  port: 443,
  path: '/stripeWebhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length,
    'stripe-signature': signature
  }
};

const req = https.request(options, (res) => {
  console.log(`📡 Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📨 Response:', data);
    
    if (res.statusCode === 200) {
      console.log('\n✅ Webhook accepted the test event!');
      console.log('Check Firebase logs to see if it was processed correctly.');
    } else {
      console.log('\n❌ Webhook rejected the event');
      console.log('This might be due to signature verification or other issues.');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error sending request:', e.message);
});

req.write(payload);
req.end();

console.log('\n💡 Run this command in another terminal to see the logs:');
console.log('firebase functions:log --only stripeWebhook | tail -20');