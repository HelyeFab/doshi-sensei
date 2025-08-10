#!/usr/bin/env node
/**
 * Manual Subscription Update
 * Simulates what the webhook would do
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function manualSubscriptionUpdate() {
  console.log('🔧 Manual Subscription Update\n');
  
  const userId = '3XsntoKfV0Sphq42jmNLtHp6HZT2';
  const subscriptionData = {
    status: 'active',
    plan: 'monthly',
    stripeSubscriptionId: 'sub_1RrFnqHdrJomitOwcmhinAcM',
    stripeCustomerId: 'cus_SmpRTCcNGiHabk',
    stripePriceId: 'price_1RrFnHHdrJomitOwKw1x3pmM',
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date('2025-09-01')),
    cancelAtPeriodEnd: false,
    metadata: {
      source: 'manual-test',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }
  };
  
  console.log('Updating user:', userId);
  console.log('With subscription:', JSON.stringify(subscriptionData, null, 2));
  
  try {
    await db.collection('users').doc(userId).set({
      subscription: subscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('\n✅ Subscription updated successfully!');
    console.log('This simulates what the webhook would do.');
    console.log('\nThe user now has:');
    console.log('- Plan: monthly');
    console.log('- Status: active');
    console.log('- Clean structure (no nesting!)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

manualSubscriptionUpdate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });