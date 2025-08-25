#!/usr/bin/env node

/**
 * Manual Refund Processing Script
 * Use this when Stripe refund webhook fails to fire
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function processManualRefund(userEmail, chargeId) {
  console.log(`\n🔄 Processing manual refund for: ${userEmail}`);
  console.log(`Charge ID: ${chargeId}`);
  
  try {
    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      throw new Error(`User not found with email: ${userEmail}`);
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log(`\n✅ Found user: ${userId}`);
    console.log(`Current subscription: ${userData.subscription?.plan || 'none'}`);
    
    // Update user subscription to free
    const updateData = {
      subscription: {
        plan: 'free',
        status: 'canceled',
        stripeCustomerId: userData.subscription?.stripeCustomerId || null,
        stripePriceId: null,
        stripeSubscriptionId: null,
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: 'refunded',
        validUntil: null
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await userDoc.ref.update(updateData);
    console.log('\n✅ User subscription downgraded to free plan');
    
    // Create audit log
    await db.collection('refund_audit_logs').add({
      userId: userId,
      userEmail: userEmail,
      chargeId: chargeId,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedBy: 'manual_script',
      reason: 'webhook_failure',
      previousPlan: userData.subscription?.plan || 'unknown',
      newPlan: 'free',
      notes: 'Manually processed due to webhook not firing'
    });
    
    console.log('✅ Audit log created');
    
    // Create critical alert for investigation
    await db.collection('critical_alerts').add({
      type: 'manual_refund_processing',
      severity: 'medium',
      userId: userId,
      userEmail: userEmail,
      chargeId: chargeId,
      message: 'Refund processed manually - webhook may need configuration check',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      notes: 'Check Stripe Dashboard webhook configuration for charge.refunded events'
    });
    
    console.log('⚠️  Critical alert created for investigation');
    
    console.log('\n✅ Manual refund processing completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check Stripe Dashboard webhook configuration');
    console.log('2. Ensure "charge.refunded" event is enabled');
    console.log('3. Verify webhook endpoint URL is correct');
    console.log('4. Check if webhook is in live mode (not test mode)');
    
  } catch (error) {
    console.error('\n❌ Error processing refund:', error.message);
    
    // Create critical error alert
    await db.collection('critical_alerts').add({
      type: 'manual_refund_processing_error',
      severity: 'high',
      userEmail: userEmail,
      chargeId: chargeId,
      error: error.message,
      message: 'Failed to process manual refund',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false
    });
    
    process.exit(1);
  }
  
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node manual-refund-processing.js <user-email> <charge-id>');
  console.log('Example: node manual-refund-processing.js esfabiani@outlook.com ch_3RzyxzHdrJomitOw0a7qolrL');
  process.exit(1);
}

const [userEmail, chargeId] = args;

// Run the processing
processManualRefund(userEmail, chargeId)
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });