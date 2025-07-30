// This script helps you test Stripe webhooks without Stripe CLI
// It shows you how to manually trigger webhook events from Stripe Dashboard

console.log('🧪 Stripe Webhook Testing Guide\n');

console.log('Since Stripe CLI requires sudo access, here\'s how to test manually:\n');

console.log('1️⃣  First, make sure these environment variables are set in Netlify:');
console.log('   - STRIPE_SECRET_KEY');
console.log('   - STRIPE_WEBHOOK_SECRET'); 
console.log('   - FIREBASE_SERVICE_ACCOUNT');
console.log('   - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
console.log('   - NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID\n');

console.log('2️⃣  Configure webhook in Stripe Dashboard:');
console.log('   a. Go to https://dashboard.stripe.com/webhooks');
console.log('   b. Click "Add endpoint"');
console.log('   c. Endpoint URL: https://doshisensei.com/.netlify/functions/api-stripe-webhook');
console.log('   d. Select these events:');
console.log('      ✓ checkout.session.completed');
console.log('      ✓ customer.subscription.created');
console.log('      ✓ customer.subscription.updated');
console.log('      ✓ customer.subscription.deleted');
console.log('      ✓ invoice.payment_succeeded');
console.log('      ✓ invoice.payment_failed');
console.log('   e. Click "Add endpoint"');
console.log('   f. Copy the "Signing secret" and add it as STRIPE_WEBHOOK_SECRET in Netlify\n');

console.log('3️⃣  Test the webhook:');
console.log('   a. In Stripe Dashboard, go to your webhook endpoint');
console.log('   b. Click "Send test webhook"');
console.log('   c. Select "customer.subscription.created"');
console.log('   d. Modify the test payload to include metadata:');
console.log(`
{
  "id": "sub_test123",
  "object": "subscription",
  "customer": "cus_test123",
  "items": {
    "data": [{
      "price": {
        "id": "price_test123"
      }
    }]
  },
  "metadata": {
    "firebaseUID": "YOUR_TEST_USER_FIREBASE_UID"
  },
  "status": "active",
  "current_period_end": ${Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60},
  "created": ${Math.floor(Date.now() / 1000)},
  "cancel_at_period_end": false
}`);
console.log('\n   e. Click "Send test webhook"\n');

console.log('4️⃣  Check the results:');
console.log('   - Check Netlify function logs: Netlify Dashboard > Functions > api-stripe-webhook');
console.log('   - Check Firebase Console to see if user document was updated');
console.log('   - Check webhook logs in Firestore (webhook_logs collection)\n');

console.log('5️⃣  Alternative: Create a real test subscription:');
console.log('   a. Use Stripe test mode');
console.log('   b. Create a checkout session with a test card (4242 4242 4242 4242)');
console.log('   c. Complete the checkout');
console.log('   d. Watch the webhook fire automatically\n');

console.log('Webhook URL: https://doshisensei.com/.netlify/functions/api-stripe-webhook');
console.log('Current time:', new Date().toISOString());