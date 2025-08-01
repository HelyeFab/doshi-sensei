#!/usr/bin/env node
/**
 * Test Stripe Webhook
 * Sends a test subscription event to the webhook endpoint
 */

const https = require('https');
const crypto = require('crypto');

// Test data
const testPayload = {
  id: 'evt_test_webhook',
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  type: 'customer.subscription.created',
  data: {
    object: {
      id: 'sub_test_' + Date.now(),
      object: 'subscription',
      customer: 'cus_test_123',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      cancel_at_period_end: false,
      items: {
        data: [{
          price: {
            id: 'price_1RakzXHdrJomitOwZc0HJC4J' // Monthly price ID
          }
        }]
      },
      metadata: {
        firebaseUID: 'test_user_' + Date.now()
      }
    }
  }
};

// Create a fake signature (for testing purposes only)
function createTestSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// Send test webhook
async function sendTestWebhook() {
  console.log('📤 Sending test webhook to Firebase function...\n');
  
  const webhookUrl = new URL('https://stripewebhook-jtmxvmnera-uc.a.run.app');
  const payloadString = JSON.stringify(testPayload);
  
  // Note: This won't pass signature validation without the real webhook secret
  // But we can test if the endpoint is reachable
  
  const options = {
    hostname: webhookUrl.hostname,
    path: webhookUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString),
      'stripe-signature': 'test_signature' // This will fail validation
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📥 Response Status: ${res.statusCode}`);
        console.log(`📄 Response: ${data}\n`);
        
        if (res.statusCode === 400) {
          console.log('⚠️  Expected result: Webhook signature validation failed');
          console.log('This is normal for test events without the real webhook secret.\n');
        }
        
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error:', error);
      reject(error);
    });
    
    req.write(payloadString);
    req.end();
  });
}

// Also test GET request
async function testGetRequest() {
  console.log('📤 Testing GET request to webhook...\n');
  
  return new Promise((resolve, reject) => {
    https.get('https://stripewebhook-jtmxvmnera-uc.a.run.app', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ GET Response: ${data}\n`);
        resolve(data);
      });
    }).on('error', (error) => {
      console.error('❌ Error:', error);
      reject(error);
    });
  });
}

// Use Stripe CLI if available
async function testWithStripeCLI() {
  console.log('💡 For a more complete test, use the Stripe CLI:\n');
  console.log('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
  console.log('2. Login: stripe login');
  console.log('3. Forward webhooks: stripe listen --forward-to https://stripewebhook-jtmxvmnera-uc.a.run.app');
  console.log('4. Trigger test event: stripe trigger customer.subscription.created\n');
}

// Main
async function main() {
  try {
    console.log('🧪 Testing Stripe Webhook Integration\n');
    console.log('Webhook URL: https://stripewebhook-jtmxvmnera-uc.a.run.app');
    console.log('=' .repeat(50) + '\n');
    
    // Test GET request first
    await testGetRequest();
    
    // Test POST webhook
    await sendTestWebhook();
    
    // Show Stripe CLI instructions
    await testWithStripeCLI();
    
    console.log('✅ Basic connectivity test complete!');
    console.log('\n⚠️  Note: The webhook will reject our test due to invalid signature.');
    console.log('This is expected. In production, Stripe will send properly signed events.\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();