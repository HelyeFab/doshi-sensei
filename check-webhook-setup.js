const fetch = require('node-fetch');

async function checkWebhookSetup() {
  const webhookUrl = 'https://doshisensei.com/.netlify/functions/api-stripe-webhook';
  
  console.log('🔍 Checking Stripe Webhook Setup...\n');
  
  // 1. Test if endpoint is accessible
  console.log('1. Testing endpoint accessibility...');
  try {
    const response = await fetch(webhookUrl);
    const data = await response.json();
    console.log('✅ Endpoint is accessible');
    console.log('   Response:', data);
  } catch (error) {
    console.log('❌ Endpoint is not accessible');
    console.log('   Error:', error.message);
    return;
  }

  // 2. Test POST without signature
  console.log('\n2. Testing POST without signature (should fail with 400 or 500)...');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'evt_test',
        type: 'test.webhook',
        data: { object: { id: 'test_123' } }
      })
    });
    const data = await response.json();
    
    if (response.status === 500 && data.error === 'Webhook secret not configured') {
      console.log('⚠️  Webhook secret not configured in Netlify');
      console.log('   You need to add STRIPE_WEBHOOK_SECRET to Netlify environment variables');
    } else if (response.status === 400 && data.error === 'Invalid signature') {
      console.log('✅ Webhook secret is configured');
      console.log('   Signature verification is working correctly');
    } else {
      console.log('❓ Unexpected response:', response.status, data);
    }
  } catch (error) {
    console.log('❌ Error testing POST:', error.message);
  }

  // 3. Test with fake signature
  console.log('\n3. Testing POST with fake signature (should fail with 400)...');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1234567890,v1=fake_signature'
      },
      body: JSON.stringify({
        id: 'evt_test',
        type: 'test.webhook',
        data: { object: { id: 'test_123' } }
      })
    });
    const data = await response.json();
    console.log('   Response:', response.status, data);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Go to Netlify Dashboard > Site settings > Environment variables');
  console.log('2. Add these environment variables:');
  console.log('   - STRIPE_SECRET_KEY (your Stripe secret key)');
  console.log('   - STRIPE_WEBHOOK_SECRET (from Stripe webhook settings)');
  console.log('   - FIREBASE_SERVICE_ACCOUNT (your Firebase service account JSON, stringified)');
  console.log('   - NEXT_PUBLIC_FIREBASE_PROJECT_ID (your Firebase project ID)');
  console.log('   - NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID (your yearly price ID)');
  console.log('\n3. In Stripe Dashboard:');
  console.log('   - Go to Developers > Webhooks');
  console.log('   - Add endpoint URL:', webhookUrl);
  console.log('   - Select events: checkout.session.completed, customer.subscription.*, invoice.payment_*');
  console.log('   - Copy the signing secret to STRIPE_WEBHOOK_SECRET in Netlify');
}

checkWebhookSetup();