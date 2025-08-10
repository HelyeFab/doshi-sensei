const https = require('https');

// Configuration - UPDATE THESE VALUES
const WEBHOOK_URL = 'https://stripewebhook-jtmxvmnera-uc.a.run.app';
const YOUR_FIREBASE_UID = 'YOUR_FIREBASE_UID_HERE'; // Replace with your actual Firebase UID

// Test with the new LIVE price IDs
const MONTHLY_PRICE_ID = 'price_1RubMXHdrJomitOwNNI4LmWB'; // £8.99/month
const YEARLY_PRICE_ID = 'price_1RubMxHdrJomitOwElEo6nys'; // £89.99/year

// Choose which plan to test
const TEST_PLAN = 'monthly'; // Change to 'yearly' to test yearly plan
const PRICE_ID = TEST_PLAN === 'yearly' ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;

// Create a test subscription event
const testEvent = {
  id: `evt_test_${Date.now()}`,
  type: 'customer.subscription.created',
  data: {
    object: {
      id: `sub_test_${Date.now()}`,
      object: 'subscription',
      status: 'active',
      customer: `cus_test_${Date.now()}`,
      current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      cancel_at_period_end: false,
      items: {
        data: [{
          price: {
            id: PRICE_ID
          }
        }]
      },
      metadata: {
        firebaseUID: YOUR_FIREBASE_UID
      }
    }
  }
};

// Create the webhook payload
const payload = JSON.stringify(testEvent);

// Parse the URL
const url = new URL(WEBHOOK_URL);

// Set up the request options
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'stripe-signature': 'test_signature' // This will bypass signature verification in test
  }
};

console.log(`Testing ${TEST_PLAN} subscription with price ID: ${PRICE_ID}`);
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Firebase UID: ${YOUR_FIREBASE_UID}`);
console.log('---');

// Make the request
const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
    
    if (res.statusCode === 200) {
      console.log('\n✅ Test successful! Check your Firebase database to see if the subscription was updated.');
      console.log(`User document: users/${YOUR_FIREBASE_UID}`);
      console.log(`Expected plan: ${TEST_PLAN}`);
      console.log(`Expected status: active`);
    } else {
      console.log('\n❌ Test failed. Check the error message above.');
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

// Send the payload
req.write(payload);
req.end();