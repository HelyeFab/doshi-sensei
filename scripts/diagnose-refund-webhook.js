#!/usr/bin/env node

/**
 * Diagnostic Script for Refund Webhook Issues
 * This script safely checks the webhook configuration without making any changes
 */

const admin = require('firebase-admin');
const path = require('path');

// Only initialize Stripe if key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function diagnoseRefundWebhook() {
  console.log('🔍 REFUND WEBHOOK DIAGNOSTIC TOOL\n');
  console.log('=' .repeat(50));
  
  // 1. Check webhook logs in Firestore
  console.log('\n1️⃣  Checking recent webhook events in Firestore...\n');
  
  try {
    // Check webhook_logs collection
    const webhookLogs = await db.collection('webhook_logs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    if (!webhookLogs.empty) {
      console.log(`Found ${webhookLogs.size} recent webhook logs:`);
      let refundFound = false;
      
      webhookLogs.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
        console.log(`  - ${data.eventType || 'unknown'} at ${timestamp.toISOString()}`);
        if (data.eventType === 'charge.refunded') {
          refundFound = true;
          console.log(`    ⚠️  REFUND EVENT FOUND!`);
        }
      });
      
      if (!refundFound) {
        console.log('\n  ❌ No refund events found in webhook logs');
      }
    } else {
      console.log('  ⚠️  No webhook logs found in Firestore');
    }
    
    // Check refund_audit_logs collection
    console.log('\n2️⃣  Checking refund audit logs...\n');
    
    const refundAudits = await db.collection('refund_audit_logs')
      .orderBy('processedAt', 'desc')
      .limit(5)
      .get();
    
    if (!refundAudits.empty) {
      console.log(`Found ${refundAudits.size} refund audit logs:`);
      refundAudits.forEach(doc => {
        const data = doc.data();
        const timestamp = data.processedAt?.toDate?.() || new Date(data.processedAt);
        console.log(`  - User: ${data.userEmail || data.userId}`);
        console.log(`    Processed: ${timestamp.toISOString()}`);
        console.log(`    Method: ${data.processedBy || 'unknown'}`);
      });
    } else {
      console.log('  ℹ️  No refund audit logs found (this is where successful refunds are logged)');
    }
    
    // Check critical_alerts for refund errors
    console.log('\n3️⃣  Checking for critical alerts (refund errors)...\n');
    
    const criticalAlerts = await db.collection('critical_alerts')
      .where('type', 'in', ['refund_processing_failed', 'manual_refund_processing', 'manual_refund_processing_error'])
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (!criticalAlerts.empty) {
      console.log(`Found ${criticalAlerts.size} refund-related alerts:`);
      criticalAlerts.forEach(doc => {
        const data = doc.data();
        const timestamp = data.createdAt?.toDate?.() || new Date(data.createdAt);
        console.log(`  - Type: ${data.type}`);
        console.log(`    Message: ${data.message}`);
        console.log(`    Time: ${timestamp.toISOString()}`);
        if (data.error) {
          console.log(`    Error: ${data.error}`);
        }
      });
    } else {
      console.log('  ✅ No critical alerts for refund processing (good!)');
    }
    
  } catch (error) {
    console.error('Error checking Firestore:', error.message);
  }
  
  // 2. Check webhook secret configuration
  console.log('\n4️⃣  Checking webhook secret configuration...\n');
  
  const functionConfig = require('child_process')
    .execSync('firebase functions:config:get 2>/dev/null || echo "{}"')
    .toString();
  
  try {
    const config = JSON.parse(functionConfig);
    if (config.stripe?.webhook_secret) {
      console.log('  ✅ Webhook secret is configured in Firebase functions');
      console.log(`  Secret starts with: ${config.stripe.webhook_secret.substring(0, 10)}...`);
      
      // Check if it matches the format
      if (config.stripe.webhook_secret.startsWith('whsec_')) {
        console.log('  ✅ Secret format looks correct');
      } else {
        console.log('  ⚠️  Secret format might be incorrect (should start with whsec_)');
      }
    } else {
      console.log('  ❌ Webhook secret NOT found in Firebase config');
      console.log('  This would cause webhook signature verification to fail!');
    }
  } catch (e) {
    console.log('  ⚠️  Could not parse Firebase config');
  }
  
  // 3. Check the actual webhook endpoint
  console.log('\n5️⃣  Testing webhook endpoint accessibility...\n');
  
  const https = require('https');
  const webhookUrl = 'https://us-central1-doshi-sensei.cloudfunctions.net/stripeWebhook';
  
  https.get(webhookUrl, (res) => {
    console.log(`  HTTP Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('  ✅ Webhook endpoint is accessible');
    } else {
      console.log('  ⚠️  Unexpected status code');
    }
    
    res.on('data', (d) => {
      const response = d.toString();
      if (response.includes('Stripe webhook endpoint is active')) {
        console.log('  ✅ Webhook is responding correctly');
      }
    });
  }).on('error', (e) => {
    console.error('  ❌ Error accessing webhook:', e.message);
  });
  
  // 4. Check recent Stripe events
  console.log('\n6️⃣  Checking recent Stripe events (last 5)...\n');
  
  if (stripe) {
    try {
      const events = await stripe.events.list({ limit: 5 });
      
      events.data.forEach(event => {
        const created = new Date(event.created * 1000);
        console.log(`  - ${event.type} at ${created.toISOString()}`);
        if (event.type === 'charge.refunded') {
          console.log(`    💰 Refund amount: ${event.data.object.amount_refunded / 100} ${event.data.object.currency.toUpperCase()}`);
          console.log(`    Customer: ${event.data.object.customer || 'not set'}`);
        }
      });
    } catch (error) {
      console.log('  ⚠️  Could not fetch Stripe events:', error.message);
      console.log('  (This might be due to test/live mode mismatch)');
    }
  } else {
    console.log('  ⚠️  Stripe API key not configured - skipping Stripe event check');
  }
  
  // 5. Summary and recommendations
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 DIAGNOSTIC SUMMARY:\n');
  
  console.log('Possible issues to investigate:');
  console.log('1. Check if webhook secret in Stripe Dashboard matches Firebase config');
  console.log('2. Verify the webhook endpoint URL in Stripe Dashboard is:');
  console.log('   https://us-central1-doshi-sensei.cloudfunctions.net/stripeWebhook');
  console.log('3. Check if "charge.refunded" event is enabled in Stripe Dashboard');
  console.log('4. Look at Firebase Functions logs for any errors during refund processing');
  console.log('5. Ensure Firebase function has proper environment variables set');
  
  console.log('\n💡 Next steps:');
  console.log('- Run: firebase functions:log --only stripeWebhook');
  console.log('- Check for any errors around the time of the refund');
  console.log('- Verify webhook signing secret matches between Stripe and Firebase');
  
  process.exit(0);
}

// Run the diagnostic
diagnoseRefundWebhook().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});