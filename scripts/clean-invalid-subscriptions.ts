#!/usr/bin/env node

/**
 * ⚠️ WARNING: This script has KNOWN ISSUES and may DELETE VALID SUBSCRIPTIONS
 * 
 * DO NOT USE THIS SCRIPT WITHOUT:
 * 1. Testing on a single user first
 * 2. Creating a full backup of subscription data
 * 3. Verifying Stripe API mode (test vs live)
 * 4. Understanding it may fail to validate properly
 * 
 * RECOMMENDED: Use restore-subscriptions-from-stripe.ts instead
 * 
 * KNOWN ISSUES:
 * - May incorrectly mark valid subscriptions as invalid
 * - Stripe API validation may fail silently
 * - Can set all users to free plan incorrectly
 */

import admin from 'firebase-admin';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Try to load service account from file first, then environment variable
  let serviceAccount;
  
  try {
    // Try loading from file
    serviceAccount = require('../firebase-service-account.json');
  } catch (error) {
    // Fallback to environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      serviceAccount = JSON.parse(serviceAccountKey);
    } else {
      throw new Error('No Firebase service account found. Please provide firebase-service-account.json or FIREBASE_SERVICE_ACCOUNT_KEY env variable.');
    }
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://doshi-sensei.firebaseio.com`,
  });
}

const db = admin.firestore();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Known test/invalid subscription IDs to remove
// WARNING: These have been removed - DO NOT hardcode subscription IDs
const INVALID_SUBSCRIPTION_IDS: string[] = [];

// Correct price IDs from Firebase Functions
const VALID_PRICE_IDS = {
  monthly: 'price_1RakzXHdrJomitOwZc0HJC4J',
  yearly: 'price_1RakzXHdrJomitOwE7B56erf'
};

interface CleanSubscriptionData {
  status: string;
  plan: 'free' | 'monthly' | 'yearly';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string | null;
  currentPeriodEnd?: admin.firestore.Timestamp | null;
  cancelAtPeriodEnd?: boolean;
  metadata?: {
    source: string;
    createdAt?: admin.firestore.Timestamp;
    updatedAt?: admin.firestore.Timestamp;
    cleanupNote?: string;
  };
}

async function validateStripeSubscription(subId: string): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subId);
    if (subscription && !subscription.deleted) {
      return subscription;
    }
    return null;
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      console.log(`   ❌ Subscription ${subId} not found in Stripe`);
    } else {
      console.error(`   ⚠️ Error checking ${subId}: ${error.message}`);
    }
    return null;
  }
}

async function cleanUserSubscription(userId: string, userData: any): Promise<boolean> {
  console.log(`\n👤 Processing user: ${userId} (${userData.email || 'no email'})`);
  
  const subscription = userData.subscription;
  if (!subscription) {
    console.log(`   ✅ No subscription data - skipping`);
    return false;
  }

  let needsUpdate = false;
  let cleanedData: CleanSubscriptionData;

  // Check if we have the OLD nested structure (should not exist but check anyway)
  if (subscription.subscription && typeof subscription.subscription === 'object') {
    console.log(`   ⚠️ Found NESTED subscription structure - will flatten`);
    const nested = subscription.subscription;
    
    cleanedData = {
      status: nested.status || 'inactive',
      plan: nested.plan || 'free',
      stripeSubscriptionId: nested.stripeSubscriptionId,
      stripeCustomerId: nested.stripeCustomerId,
      stripePriceId: nested.stripePriceId,
      currentPeriodEnd: nested.currentPeriodEnd,
      cancelAtPeriodEnd: nested.cancelAtPeriodEnd || false,
      metadata: {
        source: 'cleanup',
        updatedAt: admin.firestore.Timestamp.now(),
        cleanupNote: 'Flattened nested structure'
      }
    };
    needsUpdate = true;
  } else {
    // Already flat structure - use as is
    cleanedData = {
      status: subscription.status || 'inactive',
      plan: subscription.plan || 'free',
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripePriceId: subscription.stripePriceId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      metadata: subscription.metadata || {
        source: 'existing',
        updatedAt: admin.firestore.Timestamp.now()
      }
    };
  }

  // Check for invalid subscription IDs
  if (cleanedData.stripeSubscriptionId) {
    const subId = cleanedData.stripeSubscriptionId;
    
    // Check if it's a known invalid ID
    if (INVALID_SUBSCRIPTION_IDS.includes(subId)) {
      console.log(`   🗑️ Removing known invalid subscription ID: ${subId}`);
      
      // Reset to free plan
      cleanedData = {
        status: 'inactive',
        plan: 'free',
        stripePriceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        metadata: {
          source: 'cleanup',
          updatedAt: admin.firestore.Timestamp.now(),
          cleanupNote: `Removed invalid subscription ID: ${subId}`
        }
      };
      needsUpdate = true;
    } else {
      // Validate with Stripe API
      console.log(`   🔍 Validating subscription ID: ${subId}`);
      const stripeSubscription = await validateStripeSubscription(subId);
      
      if (!stripeSubscription) {
        console.log(`   🗑️ Removing non-existent subscription ID: ${subId}`);
        
        // Reset to free plan
        cleanedData = {
          status: 'inactive',
          plan: 'free',
          stripePriceId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          metadata: {
            source: 'cleanup',
            updatedAt: admin.firestore.Timestamp.now(),
            cleanupNote: `Removed non-existent subscription ID: ${subId}`
          }
        };
        needsUpdate = true;
      } else {
        // Subscription exists in Stripe - sync the data
        console.log(`   ✅ Valid subscription found - syncing data`);
        
        const priceId = stripeSubscription.items.data[0]?.price.id;
        let plan: 'free' | 'monthly' | 'yearly' = 'free';
        
        if (stripeSubscription.status === 'active') {
          if (priceId === VALID_PRICE_IDS.monthly) {
            plan = 'monthly';
          } else if (priceId === VALID_PRICE_IDS.yearly) {
            plan = 'yearly';
          }
        }
        
        cleanedData = {
          status: stripeSubscription.status,
          plan: plan,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: stripeSubscription.customer as string,
          stripePriceId: priceId,
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(
            new Date(stripeSubscription.current_period_end * 1000)
          ),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
          metadata: {
            source: 'stripe',
            updatedAt: admin.firestore.Timestamp.now(),
            cleanupNote: 'Synced with Stripe'
          }
        };
        needsUpdate = true;
      }
    }
  }

  // Ensure consistency: if status is not active, plan should be free
  if (cleanedData.status !== 'active' && cleanedData.plan !== 'free') {
    console.log(`   🔧 Fixing inconsistency: inactive status but ${cleanedData.plan} plan`);
    cleanedData.plan = 'free';
    needsUpdate = true;
  }

  if (needsUpdate) {
    console.log(`   💾 Updating user subscription...`);
    
    // Clean up undefined values before updating
    const cleanedForFirestore: any = {};
    Object.keys(cleanedData).forEach(key => {
      const value = (cleanedData as any)[key];
      if (value !== undefined) {
        cleanedForFirestore[key] = value;
      }
    });
    
    // Update with FLAT structure (matching Firebase Functions)
    await db.collection('users').doc(userId).update({
      subscription: cleanedForFirestore,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`   ✅ User updated successfully`);
    return true;
  }

  console.log(`   ✅ No updates needed`);
  return false;
}

async function main() {
  console.log('🚀 Starting subscription cleanup...\n');
  console.log('📌 SINGLE SOURCE OF TRUTH: Firebase Functions webhook handler');
  console.log('📌 Target structure: FLAT (user.subscription.plan)');
  console.log('📌 Removing invalid/test subscription IDs\n');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} total users\n`);
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    
    // Process in batches to avoid rate limiting
    const batchSize = 10;
    const userDocs = usersSnapshot.docs;
    
    for (let i = 0; i < userDocs.length; i += batchSize) {
      const batch = userDocs.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (doc) => {
          const userId = doc.id;
          const userData = doc.data();
          
          try {
            const wasUpdated = await cleanUserSubscription(userId, userData);
            if (wasUpdated) {
              updated++;
            }
            processed++;
          } catch (error) {
            console.error(`❌ Error processing user ${userId}:`, error);
            errors++;
          }
        })
      );
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < userDocs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 CLEANUP SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Processed: ${processed} users`);
    console.log(`💾 Updated: ${updated} users`);
    console.log(`❌ Errors: ${errors} users`);
    console.log(`📝 Unchanged: ${processed - updated - errors} users`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('\n✨ Cleanup completed successfully!');
  console.log('🔄 Next step: Deploy Firestore indexes with: firebase deploy --only firestore:indexes');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Cleanup failed:', error);
  process.exit(1);
});