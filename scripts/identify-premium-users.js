#!/usr/bin/env node
/**
 * Identify Premium Users Script
 * Finds all users who should be refunded based on current subscription state
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function identifyPremiumUsers() {
  console.log('🔍 Identifying premium users for refunds...\n');
  
  const premiumUsers = [];
  const problematicUsers = [];
  const stats = {
    total: 0,
    free: 0,
    monthly: 0,
    yearly: 0,
    conflicting: 0,
    withStripeId: 0
  };
  
  const users = await db.collection('users').get();
  
  for (const doc of users.docs) {
    const userData = doc.data();
    const userId = doc.id;
    stats.total++;
    
    // Multiple checks to catch ALL premium users
    let isPremium = false;
    let plan = 'unknown';
    let hasConflict = false;
    
    // Check 1: Entitlements
    if (userData.entitlements?.isPremium === true) {
      isPremium = true;
    }
    
    // Check 2: Outer subscription
    if (userData.subscription?.plan === 'monthly' || userData.subscription?.plan === 'yearly') {
      isPremium = true;
      plan = userData.subscription.plan;
    }
    
    // Check 3: Nested subscription (the problematic structure)
    if (userData.subscription?.subscription?.plan === 'monthly' || 
        userData.subscription?.subscription?.plan === 'yearly') {
      // This is problematic but they might have paid
      isPremium = true;
      if (plan !== 'unknown' && plan !== userData.subscription.subscription.plan) {
        hasConflict = true;
      }
      plan = userData.subscription.subscription.plan;
    }
    
    // Check 4: Active status with Stripe IDs
    if (userData.subscription?.stripeSubscriptionId && 
        userData.subscription?.status === 'active') {
      isPremium = true;
    }
    
    if (isPremium) {
      const userInfo = {
        userId,
        email: userData.email || 'No email',
        plan: plan,
        outerPlan: userData.subscription?.plan,
        innerPlan: userData.subscription?.subscription?.plan,
        entitlementsPremium: userData.entitlements?.isPremium,
        status: userData.subscription?.status || userData.subscription?.subscription?.status,
        stripeCustomerId: userData.subscription?.stripeCustomerId || 
                         userData.subscription?.subscription?.stripeCustomerId,
        stripeSubscriptionId: userData.subscription?.stripeSubscriptionId || 
                             userData.subscription?.subscription?.stripeSubscriptionId,
        stripePriceId: userData.subscription?.stripePriceId || 
                       userData.subscription?.subscription?.stripePriceId,
        hasConflict: hasConflict,
        createdAt: userData.createdAt,
        lastLoginAt: userData.lastLoginAt
      };
      
      premiumUsers.push(userInfo);
      
      if (hasConflict || (userInfo.outerPlan !== userInfo.innerPlan && userInfo.innerPlan)) {
        problematicUsers.push(userInfo);
        stats.conflicting++;
      }
      
      if (userInfo.stripeCustomerId) {
        stats.withStripeId++;
      }
      
      if (plan === 'monthly') stats.monthly++;
      else if (plan === 'yearly') stats.yearly++;
    } else {
      stats.free++;
    }
  }
  
  // Sort by email for easier processing
  premiumUsers.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  problematicUsers.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  
  // Print summary
  console.log('📊 SUMMARY');
  console.log('==========');
  console.log(`Total users: ${stats.total}`);
  console.log(`Free users: ${stats.free}`);
  console.log(`Premium users found: ${premiumUsers.length}`);
  console.log(`- Monthly: ${stats.monthly}`);
  console.log(`- Yearly: ${stats.yearly}`);
  console.log(`- With Stripe ID: ${stats.withStripeId}`);
  console.log(`- Conflicting data: ${stats.conflicting}`);
  
  // Print problematic users
  if (problematicUsers.length > 0) {
    console.log('\n⚠️  PROBLEMATIC USERS (like esfabiani@outlook.com):');
    console.log('These users have conflicting subscription data:');
    problematicUsers.forEach(user => {
      console.log(`\n- ${user.email} (${user.userId})`);
      console.log(`  Outer plan: ${user.outerPlan}`);
      console.log(`  Inner plan: ${user.innerPlan}`);
      console.log(`  Entitlements premium: ${user.entitlementsPremium}`);
      console.log(`  Stripe Customer: ${user.stripeCustomerId || 'None'}`);
    });
  }
  
  // Save reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(__dirname, 'premium-users-reports');
  await fs.mkdir(reportDir, { recursive: true });
  
  // Full premium users list
  await fs.writeFile(
    path.join(reportDir, `all-premium-users-${timestamp}.json`),
    JSON.stringify(premiumUsers, null, 2)
  );
  
  // Problematic users
  if (problematicUsers.length > 0) {
    await fs.writeFile(
      path.join(reportDir, `problematic-users-${timestamp}.json`),
      JSON.stringify(problematicUsers, null, 2)
    );
  }
  
  // CSV for refunds
  const csvHeader = 'Email,User ID,Plan,Stripe Customer ID,Stripe Subscription ID,Has Conflict';
  const csvRows = premiumUsers.map(u => 
    `"${u.email}","${u.userId}","${u.plan}","${u.stripeCustomerId || ''}","${u.stripeSubscriptionId || ''}","${u.hasConflict}"`
  );
  
  await fs.writeFile(
    path.join(reportDir, `refund-list-${timestamp}.csv`),
    [csvHeader, ...csvRows].join('\n')
  );
  
  console.log(`\n📄 Reports saved to: ${reportDir}`);
  console.log(`- all-premium-users-${timestamp}.json`);
  console.log(`- refund-list-${timestamp}.csv`);
  if (problematicUsers.length > 0) {
    console.log(`- problematic-users-${timestamp}.json`);
  }
  
  // Print refund estimate
  const monthlyRefund = stats.monthly * 3.99;
  const yearlyRefund = stats.yearly * 39.99;
  const totalRefund = monthlyRefund + yearlyRefund;
  
  console.log('\n💰 REFUND ESTIMATE:');
  console.log(`Monthly users (${stats.monthly} × $3.99): $${monthlyRefund.toFixed(2)}`);
  console.log(`Yearly users (${stats.yearly} × $39.99): $${yearlyRefund.toFixed(2)}`);
  console.log(`TOTAL ESTIMATED REFUNDS: $${totalRefund.toFixed(2)}`);
  
  return premiumUsers;
}

// Run the identification
identifyPremiumUsers()
  .then(() => {
    console.log('\n✅ Premium user identification complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });