#!/usr/bin/env node
/**
 * Test Webhook Update Behavior
 * Simulates the new update() behavior vs old set({merge: true})
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testWebhookUpdate() {
  console.log('🧪 Testing Webhook Update Behavior\n');
  
  // Test user ID (you can change this to test with a different user)
  const testUserId = '2iZTBHmjb1TNyvIiS3X23s4TzNa2';
  
  // First, let's check current state
  console.log('1️⃣ Current user state:');
  const beforeDoc = await db.collection('users').doc(testUserId).get();
  const beforeData = beforeDoc.data();
  console.log('Subscription:', JSON.stringify(beforeData.subscription, null, 2));
  
  // Simulate webhook update with new structure
  console.log('\n2️⃣ Simulating webhook update (using update() method):');
  
  const newSubscriptionData = {
    status: 'active',
    plan: 'yearly', // Changed to yearly for testing
    stripeSubscriptionId: 'sub_TEST_NEW_STRUCTURE',
    stripeCustomerId: beforeData.subscription.stripeCustomerId,
    stripePriceId: 'price_1RakzXHdrJomitOwE7B56erf', // Yearly price
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date('2026-08-01')),
    cancelAtPeriodEnd: false,
    metadata: {
      source: 'stripe',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }
  };
  
  console.log('New data:', JSON.stringify(newSubscriptionData, null, 2));
  
  // This is what the updated webhook does
  await db.collection('users').doc(testUserId).update({
    subscription: newSubscriptionData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Check result
  console.log('\n3️⃣ After update:');
  const afterDoc = await db.collection('users').doc(testUserId).get();
  const afterData = afterDoc.data();
  console.log('Subscription:', JSON.stringify(afterData.subscription, null, 2));
  
  // Verify it's clean
  const hasNestedSubscription = afterData.subscription.subscription !== undefined;
  const hasLimits = afterData.subscription.limits !== undefined;
  const hasCurrentUsage = afterData.subscription.currentUsage !== undefined;
  
  console.log('\n✅ Verification:');
  console.log(`- Has nested subscription.subscription: ${hasNestedSubscription ? '❌ YES' : '✅ NO'}`);
  console.log(`- Has subscription.limits: ${hasLimits ? '❌ YES' : '✅ NO'}`);
  console.log(`- Has subscription.currentUsage: ${hasCurrentUsage ? '❌ YES' : '✅ NO'}`);
  console.log(`- Plan updated to yearly: ${afterData.subscription.plan === 'yearly' ? '✅ YES' : '❌ NO'}`);
  
  // Restore original state
  console.log('\n4️⃣ Restoring original state...');
  await db.collection('users').doc(testUserId).update({
    subscription: beforeData.subscription,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✅ Test complete! Original state restored.');
}

testWebhookUpdate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });