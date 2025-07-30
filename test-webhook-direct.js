const https = require('https');
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = 'https://doshisensei.com/.netlify/functions/api-stripe-webhook';
const WEBHOOK_SECRET = 'YOUR_WEBHOOK_SECRET_HERE'; // Replace with your actual webhook secret from Stripe

// Test 1: Check if webhook is accessible
console.log('🔍 Testing Stripe Webhook...\n');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  // Test 1: GET request
  console.log('1️⃣ Testing GET request (health check)...');
  try {
    const getResult = await makeRequest({
      hostname: 'doshisensei.com',
      path: '/.netlify/functions/api-stripe-webhook',
      method: 'GET'
    });
    console.log(`   Status: ${getResult.status}`);
    console.log(`   Response:`, getResult.body);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 2: POST without signature
  console.log('\n2️⃣ Testing POST without signature (should fail)...');
  const testPayload = JSON.stringify({
    id: 'evt_test',
    type: 'test.ping',
    data: { object: { test: true } }
  });

  try {
    const postResult = await makeRequest({
      hostname: 'doshisensei.com',
      path: '/.netlify/functions/api-stripe-webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testPayload)
      }
    }, testPayload);
    console.log(`   Status: ${postResult.status}`);
    console.log(`   Response:`, postResult.body);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 3: Create a proper Stripe signature
  console.log('\n3️⃣ Creating test webhook with valid signature...');
  
  if (WEBHOOK_SECRET === 'YOUR_WEBHOOK_SECRET_HERE') {
    console.log('   ⚠️  Please update WEBHOOK_SECRET in this script first!');
    console.log('   Get it from: Stripe Dashboard > Webhooks > Your webhook > Signing secret');
    return;
  }

  // Create a test subscription event
  const timestamp = Math.floor(Date.now() / 1000);
  const subscriptionEvent = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'customer.subscription.created',
    created: timestamp,
    data: {
      object: {
        id: 'sub_test_' + Date.now(),
        object: 'subscription',
        customer: 'cus_test_123',
        status: 'active',
        current_period_end: timestamp + (30 * 24 * 60 * 60),
        created: timestamp,
        cancel_at_period_end: false,
        items: {
          data: [{
            price: {
              id: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || 'price_test'
            }
          }]
        },
        metadata: {
          firebaseUID: 'test_user_' + Date.now()
        }
      }
    }
  };

  const payload = JSON.stringify(subscriptionEvent);
  
  // Create Stripe signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  const signature = `t=${timestamp},v1=${expectedSignature}`;

  console.log('   Sending test subscription event...');
  console.log('   Event type:', subscriptionEvent.type);
  console.log('   Firebase UID:', subscriptionEvent.data.object.metadata.firebaseUID);

  try {
    const result = await makeRequest({
      hostname: 'doshisensei.com',
      path: '/.netlify/functions/api-stripe-webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'stripe-signature': signature
      }
    }, payload);
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.body);
    
    if (result.status === 200) {
      console.log('\n✅ Webhook is working correctly!');
      console.log('   Check Netlify function logs for processing details');
      console.log('   Check Firebase to see if test user was created/updated');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Check Netlify function logs at:');
  console.log('   https://app.netlify.com/sites/doshisensei/functions/api-stripe-webhook');
  console.log('\n2. To test with real Stripe events:');
  console.log('   - Go to Stripe Dashboard > Webhooks > Your webhook');
  console.log('   - Click "Send test webhook"');
  console.log('   - Select any event type and send');
  console.log('\n3. For production testing:');
  console.log('   - Make a real test purchase with card 4242 4242 4242 4242');
  console.log('   - Watch the webhook process the real event');
}

runTests();