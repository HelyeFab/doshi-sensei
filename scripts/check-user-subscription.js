#!/usr/bin/env node
/**
 * Check User Subscription Status
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUserSubscription(userId) {
  console.log(`🔍 Checking subscription for user: ${userId}\n`);
  
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    console.error('❌ User not found');
    return;
  }
  
  const userData = userDoc.data();
  
  console.log('📧 Email:', userData.email);
  console.log('\n📋 Subscription Status:');
  
  if (userData.subscription) {
    console.log(JSON.stringify(userData.subscription, null, 2));
    
    if (userData.subscription.plan === 'monthly' || userData.subscription.plan === 'yearly') {
      console.log('\n✅ User has premium subscription!');
      console.log('Plan:', userData.subscription.plan);
      console.log('Status:', userData.subscription.status);
    }
  } else {
    console.log('No subscription data (clean state)');
  }
  
  console.log('\n🔄 Last updated:', userData.updatedAt?.toDate() || 'Unknown');
}

// Check our test user
checkUserSubscription('3XsntoKfV0Sphq42jmNLtHp6HZT2')
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });