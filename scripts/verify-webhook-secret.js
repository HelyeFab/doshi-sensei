#!/usr/bin/env node

/**
 * Verify Webhook Secret Configuration
 * This script helps verify if the webhook secret is correctly configured
 */

const crypto = require('crypto');

console.log('\n🔐 WEBHOOK SECRET VERIFICATION\n');
console.log('=' .repeat(50));

// Get the configured secret from Firebase
const { execSync } = require('child_process');

try {
  const functionConfig = execSync('firebase functions:config:get 2>/dev/null || echo "{}"').toString();
  const config = JSON.parse(functionConfig);
  
  if (config.stripe?.webhook_secret) {
    const secret = config.stripe.webhook_secret;
    
    console.log('\n✅ Webhook secret found in Firebase config:');
    console.log(`   ${secret.substring(0, 15)}...${secret.substring(secret.length - 5)}`);
    console.log(`   Length: ${secret.length} characters`);
    
    if (secret.startsWith('whsec_')) {
      console.log('   ✅ Format is correct (starts with whsec_)');
    } else {
      console.log('   ⚠️  Format might be incorrect (should start with whsec_)');
    }
    
    console.log('\n📋 To verify this matches Stripe Dashboard:');
    console.log('1. Go to https://dashboard.stripe.com/workbench/webhooks');
    console.log('2. Click on your webhook endpoint');
    console.log('3. Click "Reveal" next to Signing secret');
    console.log('4. Compare with the secret shown above');
    
    console.log('\n⚠️  IMPORTANT: The webhook secret in Stripe Dashboard MUST match exactly!');
    console.log('   Even a single character difference will cause signature verification to fail.');
    
    console.log('\n🔍 The secret from your Firebase config is:');
    console.log(`   ${secret}`);
    console.log('\n   Copy this and compare it with the Stripe Dashboard secret.');
    
  } else {
    console.log('\n❌ No webhook secret found in Firebase config!');
    console.log('   This would cause ALL webhook events to fail.');
    console.log('\n   To fix this, run:');
    console.log('   firebase functions:config:set stripe.webhook_secret="YOUR_WEBHOOK_SECRET"');
    console.log('   firebase deploy --only functions');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('\n💡 If the secrets don\'t match:');
  console.log('1. Copy the secret from Stripe Dashboard');
  console.log('2. Run: firebase functions:config:set stripe.webhook_secret="PASTE_SECRET_HERE"');
  console.log('3. Deploy: firebase deploy --only functions:stripeWebhook');
  console.log('4. Test by triggering a test event from Stripe Dashboard');
  
} catch (error) {
  console.error('Error getting Firebase config:', error.message);
}

process.exit(0);