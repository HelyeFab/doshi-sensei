#!/usr/bin/env node
/**
 * Fix Emmanuel's subscription to yearly premium
 * Uses the clean structure matching the new architecture
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixEmmanuelSubscription() {
  console.log('🔧 Fixing Emmanuel\'s subscription to yearly premium\n');
  
  const email = 'emmanuelfabiani23@gmail.com';
  
  try {
    // Find user by email
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();
    
    if (usersSnapshot.empty) {
      console.error('❌ User not found with email:', email);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log('Found user:', {
      id: userId,
      email: userData.email,
      currentPlan: userData.subscription?.plan || 'none'
    });
    
    // Create clean subscription structure for yearly premium
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    
    const subscriptionData = {
      status: 'active',
      plan: 'yearly',
      stripeCustomerId: userData.subscription?.stripeCustomerId || 'admin_manual_upgrade',
      stripeSubscriptionId: userData.subscription?.stripeSubscriptionId || `admin_yearly_${Date.now()}`,
      stripePriceId: 'price_1RakzXHdrJomitOwE7B56erf', // Yearly price ID
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
      cancelAtPeriodEnd: false,
      metadata: {
        source: 'admin',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        upgradedBy: 'manual_fix',
        note: 'Fixed to match clean architecture'
      }
    };
    
    console.log('\nApplying clean subscription structure:', JSON.stringify(subscriptionData, null, 2));
    
    // Update user with clean structure
    await db.collection('users').doc(userId).update({
      subscription: subscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('\n✅ Successfully upgraded to yearly premium!');
    console.log('- Plan: yearly');
    console.log('- Status: active');
    console.log('- Valid until:', periodEnd.toISOString());
    console.log('- Structure: CLEAN (no nesting)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixEmmanuelSubscription()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });