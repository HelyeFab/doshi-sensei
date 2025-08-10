#!/usr/bin/env node
/**
 * Clean ALL Users' Subscription Structures
 * 
 * This script ensures ALL users have clean subscription structures by:
 * 1. Removing nested subscription.subscription fields
 * 2. Removing limits and currentUsage from subscription object
 * 3. Preserving the flat structure created by the webhook
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanAllUsersSubscriptions(dryRun = true) {
  console.log('🧹 Clean ALL Users\' Subscription Structures');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}\n`);

  const batch = db.batch();
  let batchCount = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users\n`);

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      
      if (!userData.subscription) {
        totalSkipped++;
        continue;
      }

      const sub = userData.subscription;
      
      // Check if this subscription needs cleaning
      const hasNestedSubscription = sub.subscription !== undefined;
      const hasLimits = sub.limits !== undefined;
      const hasCurrentUsage = sub.currentUsage !== undefined;
      
      if (!hasNestedSubscription && !hasLimits && !hasCurrentUsage) {
        // Already clean
        totalSkipped++;
        continue;
      }

      console.log(`\n📝 User: ${userId} (${userData.email || 'No email'})`);
      console.log('Issues found:');
      if (hasNestedSubscription) console.log('  - Has nested subscription.subscription');
      if (hasLimits) console.log('  - Has subscription.limits');
      if (hasCurrentUsage) console.log('  - Has subscription.currentUsage');

      // Extract the flat fields we want to keep
      const cleanSubscription = {};
      
      // Copy only the allowed fields
      const allowedFields = [
        'status', 'plan', 'stripeSubscriptionId', 'stripeCustomerId',
        'stripePriceId', 'currentPeriodEnd', 'cancelAtPeriodEnd',
        'canceledAt', 'metadata'
      ];
      
      for (const field of allowedFields) {
        if (sub[field] !== undefined) {
          cleanSubscription[field] = sub[field];
        }
      }

      // If we have a nested subscription with different values, prefer the flat values
      // (webhook creates flat structure, so flat values are more recent)
      if (hasNestedSubscription && sub.subscription.plan && !cleanSubscription.plan) {
        console.log('  ⚠️  Using plan from nested structure (no flat plan found)');
        cleanSubscription.plan = sub.subscription.plan;
        cleanSubscription.status = sub.subscription.status || 'active';
      }

      console.log('\nClean structure:', JSON.stringify(cleanSubscription, null, 2));

      if (!dryRun) {
        // Add to batch
        batch.update(doc.ref, {
          subscription: cleanSubscription,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        batchCount++;
        totalUpdated++;

        // Commit batch every 100 operations
        if (batchCount >= 100) {
          await batch.commit();
          console.log(`\n✅ Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      } else {
        totalUpdated++;
      }
    }

    // Commit remaining batch operations
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      console.log(`\n✅ Committed final batch of ${batchCount} updates`);
    }

    console.log('\n\n=== Summary ===');
    console.log(`Total users: ${usersSnapshot.size}`);
    console.log(`Users updated: ${totalUpdated}`);
    console.log(`Users skipped (already clean): ${totalSkipped}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. Run with --execute to apply changes.');
    } else {
      console.log('\n✅ All users have been cleaned successfully!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldExecute = args.includes('--execute');

cleanAllUsersSubscriptions(!shouldExecute)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });