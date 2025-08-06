#!/usr/bin/env node

/**
 * Fix Subscription Issues Script
 * 
 * This script fixes multiple critical issues:
 * 1. Removes invalid/test Stripe subscription IDs from Firebase
 * 2. Flattens nested subscription structures to match SUPERPOWERS architecture
 * 3. Cleans up subscription data for consistency
 * 
 * Based on SUPERPOWERS-V-III.md architecture
 */

import admin from 'firebase-admin';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

const db = admin.firestore();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Test mode subscription IDs that need to be cleaned up
const TEST_SUBSCRIPTION_IDS = [
  'sub_1RrG99HdrJomitOwlJ1RZILf',
  'sub_1RnCCmHdrJomitOw5nbTkieG',
  'sub_1RnFCmHdrJomitOwcmhinAcM',
  'sub_1RrFnqHdrJomitOwcmhinAcM'
];

interface SubscriptionData {
  status: string;
  plan: 'free' | 'monthly' | 'yearly';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  currentPeriodEnd?: admin.firestore.Timestamp | null;
  cancelAtPeriodEnd?: boolean;
  metadata?: {
    source: string;
    createdAt?: admin.firestore.Timestamp;
    updatedAt?: admin.firestore.Timestamp;
  };
}

async function isValidStripeSubscription(subId: string): Promise<boolean> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subId);
    return subscription && !subscription.deleted;
  } catch (error: any) {
    // If error is "No such subscription", it's invalid
    if (error.code === 'resource_missing') {
      return false;
    }
    // For other errors, log and assume invalid
    console.error(`Error checking subscription ${subId}:`, error.message);
    return false;
  }
}

async function fixUserSubscription(userId: string, userData: any): Promise<boolean> {
  const subscription = userData.subscription;
  let needsUpdate = false;
  let updatedSubscription: SubscriptionData;

  // Check if subscription has nested structure (old format)
  if (subscription?.subscription) {
    console.log(`🔄 User ${userId} has nested subscription structure - flattening...`);
    
    // Extract from nested structure
    const nested = subscription.subscription;
    updatedSubscription = {
      status: nested.status || 'inactive',
      plan: nested.plan || 'free',
      stripeSubscriptionId: nested.stripeSubscriptionId,
      stripeCustomerId: nested.stripeCustomerId,
      stripePriceId: nested.stripePriceId,
      currentPeriodEnd: nested.currentPeriodEnd,
      cancelAtPeriodEnd: nested.cancelAtPeriodEnd || false,
      metadata: {
        source: 'stripe',
        updatedAt: admin.firestore.Timestamp.now()
      }
    };
    needsUpdate = true;
  } else {
    // Use existing flat structure
    updatedSubscription = subscription || {
      status: 'inactive',
      plan: 'free',
      metadata: {
        source: 'manual',
        updatedAt: admin.firestore.Timestamp.now()
      }
    };
  }

  // Check if subscription ID is valid
  if (updatedSubscription.stripeSubscriptionId) {
    const subId = updatedSubscription.stripeSubscriptionId;
    
    // Check if it's a test subscription ID
    if (TEST_SUBSCRIPTION_IDS.includes(subId)) {
      console.log(`🧪 User ${userId} has test subscription ID ${subId} - removing...`);
      updatedSubscription = {
        status: 'inactive',
        plan: 'free',
        metadata: {
          source: 'cleaned',
          updatedAt: admin.firestore.Timestamp.now(),
          previousSubscriptionId: subId
        }
      };
      needsUpdate = true;
    } else {
      // Verify with Stripe
      const isValid = await isValidStripeSubscription(subId);
      if (!isValid) {
        console.log(`❌ User ${userId} has invalid subscription ID ${subId} - removing...`);
        updatedSubscription = {
          status: 'inactive',
          plan: 'free',
          metadata: {
            source: 'cleaned',
            updatedAt: admin.firestore.Timestamp.now(),
            previousSubscriptionId: subId
          }
        };
        needsUpdate = true;
      } else {
        // Subscription is valid, fetch latest data from Stripe
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(subId);
          const priceId = stripeSubscription.items.data[0]?.price.id;
          
          // Determine plan from price ID
          let plan: 'free' | 'monthly' | 'yearly' = 'free';
          if (stripeSubscription.status === 'active') {
            const planMap: { [key: string]: 'monthly' | 'yearly' } = {
              'price_1RakzXHdrJomitOwZc0HJC4J': 'monthly',
              'price_1RakzXHdrJomitOwE7B56erf': 'yearly'
            };
            plan = planMap[priceId] || 'free';
          }
          
          updatedSubscription = {
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
              updatedAt: admin.firestore.Timestamp.now()
            }
          };
          needsUpdate = true;
          console.log(`✅ User ${userId} subscription synced with Stripe`);
        } catch (error) {
          console.error(`Error syncing subscription for user ${userId}:`, error);
        }
      }
    }
  }

  // Ensure plan matches status
  if (updatedSubscription.status !== 'active' && updatedSubscription.plan !== 'free') {
    console.log(`🔧 User ${userId} has inactive status but non-free plan - fixing...`);
    updatedSubscription.plan = 'free';
    needsUpdate = true;
  }

  if (needsUpdate) {
    await db.collection('users').doc(userId).update({
      subscription: updatedSubscription,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
  }

  return false;
}

async function main() {
  console.log('🚀 Starting subscription fix script...\n');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users\n`);
    
    let fixed = 0;
    let errors = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      
      try {
        const wasFixed = await fixUserSubscription(userId, userData);
        if (wasFixed) {
          fixed++;
        }
      } catch (error) {
        console.error(`Error fixing user ${userId}:`, error);
        errors++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Fixed: ${fixed} users`);
    console.log(`❌ Errors: ${errors} users`);
    console.log(`📝 Total processed: ${usersSnapshot.size} users`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('\n✨ Script completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
});