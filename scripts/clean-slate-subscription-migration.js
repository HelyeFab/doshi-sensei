#!/usr/bin/env node
/**
 * Clean Slate Subscription Migration
 * 
 * This script will:
 * 1. Backup all current subscription data
 * 2. Clean all subscription fields from Firebase
 * 3. Set everyone to free tier
 * 4. Log all premium users for manual refund processing
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

async function backupSubscriptions() {
  console.log('📦 Backing up all subscription data...');
  
  const users = await db.collection('users').get();
  const backupData = [];
  const premiumUsers = [];
  
  for (const doc of users.docs) {
    const userData = doc.data();
    const userId = doc.id;
    
    // Save full backup
    if (userData.subscription || userData.entitlements) {
      backupData.push({
        userId,
        email: userData.email,
        subscription: userData.subscription,
        entitlements: userData.entitlements,
        createdAt: userData.createdAt,
        lastLoginAt: userData.lastLoginAt
      });
      
      // Track premium users for refunds
      const isPremium = 
        userData.entitlements?.isPremium === true ||
        userData.subscription?.plan === 'monthly' ||
        userData.subscription?.plan === 'yearly' ||
        userData.subscription?.subscription?.plan === 'monthly' ||
        userData.subscription?.subscription?.plan === 'yearly';
        
      if (isPremium) {
        premiumUsers.push({
          userId,
          email: userData.email,
          plan: userData.subscription?.plan || userData.subscription?.subscription?.plan || 'unknown',
          stripeCustomerId: userData.subscription?.stripeCustomerId || userData.subscription?.subscription?.stripeCustomerId,
          stripeSubscriptionId: userData.subscription?.stripeSubscriptionId || userData.subscription?.subscription?.stripeSubscriptionId,
          status: userData.subscription?.status || userData.subscription?.subscription?.status
        });
      }
    }
  }
  
  // Save backups
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'subscription-backups');
  await fs.mkdir(backupDir, { recursive: true });
  
  await fs.writeFile(
    path.join(backupDir, `full-backup-${timestamp}.json`),
    JSON.stringify(backupData, null, 2)
  );
  
  await fs.writeFile(
    path.join(backupDir, `premium-users-${timestamp}.json`),
    JSON.stringify(premiumUsers, null, 2)
  );
  
  console.log(`✅ Backed up ${backupData.length} users`);
  console.log(`💰 Found ${premiumUsers.length} premium users for refunds`);
  
  return { backupData, premiumUsers };
}

async function cleanSubscriptions(dryRun = true) {
  console.log(dryRun ? '🔍 DRY RUN - Checking what would be cleaned...' : '🧹 Cleaning subscription data...');
  
  const users = await db.collection('users').get();
  let cleanedCount = 0;
  
  const batch = db.batch();
  
  for (const doc of users.docs) {
    const userData = doc.data();
    const userId = doc.id;
    
    if (userData.subscription || userData.entitlements) {
      cleanedCount++;
      
      if (!dryRun) {
        // Build update object with only defined values
        const updateData = {
          subscription: admin.firestore.FieldValue.delete(),
          entitlements: admin.firestore.FieldValue.delete(),
          limits: admin.firestore.FieldValue.delete(),
          currentUsage: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Only add fields that exist
        if (userData.email !== undefined) updateData.email = userData.email;
        if (userData.displayName !== undefined) updateData.displayName = userData.displayName;
        if (userData.createdAt !== undefined) updateData.createdAt = userData.createdAt;
        if (userData.lastLoginAt !== undefined) updateData.lastLoginAt = userData.lastLoginAt;
        updateData.isActive = userData.isActive !== false; // Default to true
        
        batch.update(doc.ref, updateData);
      }
    }
  }
  
  if (!dryRun && cleanedCount > 0) {
    await batch.commit();
    console.log(`✅ Cleaned subscription data for ${cleanedCount} users`);
  } else {
    console.log(`Would clean ${cleanedCount} users`);
  }
  
  return cleanedCount;
}

async function generateRefundReport(premiumUsers) {
  console.log('\n💳 REFUND REPORT');
  console.log('================');
  
  const stripeUsers = premiumUsers.filter(u => u.stripeCustomerId);
  const nonStripeUsers = premiumUsers.filter(u => !u.stripeCustomerId);
  
  console.log(`\nStripe Users (${stripeUsers.length}):`);
  stripeUsers.forEach(user => {
    console.log(`- ${user.email}`);
    console.log(`  Customer: ${user.stripeCustomerId}`);
    console.log(`  Subscription: ${user.stripeSubscriptionId}`);
    console.log(`  Plan: ${user.plan}`);
    console.log('');
  });
  
  if (nonStripeUsers.length > 0) {
    console.log(`\nNon-Stripe Premium Users (${nonStripeUsers.length}):`);
    nonStripeUsers.forEach(user => {
      console.log(`- ${user.email} (${user.plan})`);
    });
  }
  
  // Create CSV for easy processing
  const csv = [
    'Email,Customer ID,Subscription ID,Plan',
    ...stripeUsers.map(u => 
      `${u.email},${u.stripeCustomerId},${u.stripeSubscriptionId},${u.plan}`
    )
  ].join('\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.writeFile(
    path.join(__dirname, 'subscription-backups', `refund-list-${timestamp}.csv`),
    csv
  );
  
  console.log('\n✅ Refund list saved to CSV');
}

async function main() {
  try {
    console.log('🚀 Starting Clean Slate Subscription Migration\n');
    
    // Step 1: Backup
    const { premiumUsers } = await backupSubscriptions();
    
    // Step 2: Generate refund report
    await generateRefundReport(premiumUsers);
    
    // Step 3: Dry run to see what would be cleaned
    await cleanSubscriptions(true);
    
    console.log('\n' + '='.repeat(50));
    console.log('⚠️  DRY RUN COMPLETE - No changes made');
    console.log('='.repeat(50));
    console.log('\nTo execute the cleanup, run:');
    console.log('node scripts/clean-slate-subscription-migration.js --execute');
    
    // Check if we should execute
    if (process.argv.includes('--execute')) {
      console.log('\n🔴 EXECUTING CLEANUP IN 5 SECONDS...');
      console.log('Press Ctrl+C to cancel\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await cleanSubscriptions(false);
      
      console.log('\n✅ CLEANUP COMPLETE!');
      console.log('\nNext steps:');
      console.log('1. Process refunds using the CSV file');
      console.log('2. Update Stripe webhook to use Three-Pillar architecture');
      console.log('3. Test new subscription flow end-to-end');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    // Wait a bit for any pending writes
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(0);
  }
}

// Run the migration
main();