const fetch = require('node-fetch');

// Test webhook endpoint locally
async function testWebhook() {
  const webhookUrl = 'https://doshisensei.com/.netlify/functions/api-stripe-webhook';
  
  // First, test GET request to check if endpoint is active
  console.log('Testing GET request...');
  try {
    const getResponse = await fetch(webhookUrl);
    const getData = await getResponse.json();
    console.log('GET Response:', getData);
  } catch (error) {
    console.error('GET Error:', error.message);
  }

  // Test POST without signature (should fail)
  console.log('\nTesting POST without signature (should fail)...');
  try {
    const postResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test.webhook',
        data: { object: { id: 'test_123' } }
      })
    });
    const postData = await postResponse.json();
    console.log('POST Response:', postResponse.status, postData);
  } catch (error) {
    console.error('POST Error:', error.message);
  }
}

testWebhook();

console.log('\n=== Stripe Dashboard Test Instructions ===');
console.log('1. Go to https://dashboard.stripe.com/webhooks');
console.log('2. Click on your webhook endpoint');
console.log('3. Click "Send test webhook"');
console.log('4. Select "customer.subscription.created" as the event type');
console.log('5. Click "Send test webhook"');
console.log('\nThe webhook URL is: https://doshisensei.com/.netlify/functions/api-stripe-webhook');
console.log('\nMake sure you have set these environment variables in Netlify:');
console.log('- STRIPE_SECRET_KEY');
console.log('- STRIPE_WEBHOOK_SECRET');
console.log('- FIREBASE_SERVICE_ACCOUNT');
console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID');
console.log('- NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID');