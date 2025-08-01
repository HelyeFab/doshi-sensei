#!/usr/bin/env node
/**
 * Test Webhook with Real User
 * Creates a test subscription for an existing user
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testWebhookWithRealUser() {
  console.log('🧪 Testing Webhook with Real User\n');
  
  // Get the first user from our system
  const users = await db.collection('users').limit(1).get();
  
  if (users.empty) {
    console.error('❌ No users found in database');
    return;
  }
  
  const userDoc = users.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data();
  
  console.log(`📤 Using test user: ${userData.email || userId}`);
  console.log(`User ID: ${userId}\n`);
  
  // Now you can create a Stripe test subscription with this user ID
  console.log('To complete the test:');
  console.log('1. Go to Stripe Dashboard (test mode)');
  console.log('2. Create a new customer');
  console.log(`3. Add metadata: firebaseUID = ${userId}`);
  console.log('4. Create a subscription for this customer');
  console.log('5. The webhook will automatically process it\n');
  
  console.log('Or use Stripe CLI:');
  console.log(`stripe customers create --email="${userData.email || 'test@example.com'}" --metadata="firebaseUID=${userId}"`);
  console.log('Then create a subscription for that customer ID\n');
  
  // Check current subscription status
  console.log('Current user subscription status:');
  console.log(userData.subscription || 'No subscription data (clean state ✅)');
  
  process.exit(0);
}

testWebhookWithRealUser().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});