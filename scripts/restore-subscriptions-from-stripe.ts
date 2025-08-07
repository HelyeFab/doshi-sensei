#!/usr/bin/env node

/**
 * EMERGENCY: Restore Subscriptions from Stripe
 * 
 * This script restores subscription data from Stripe after the cleanup script
 * incorrectly removed valid subscriptions.
 * 
 * It will:
 * 1. Fetch ALL active subscriptions from Stripe
 * 2. Match them to Firebase users by email
 * 3. Restore the correct subscription structure
 */

import admin from 'firebase-admin';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  let serviceAccount;
  
  try {
    serviceAccount = require('../firebase-service-account.json');
  } catch (error) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      serviceAccount = JSON.parse(serviceAccountKey);
    } else {
      throw new Error('No Firebase service account found');
    }
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://doshi-sensei.firebaseio.com`,
  });
}

const db = admin.firestore();

// Initialize Stripe - MAKE SURE THIS IS LIVE KEY!
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Valid price IDs from your system
const PRICE_ID_MAP = {
  'price_1RakzXHdrJomitOwZc0HJC4J': 'monthly',  // $3.99/month
  'price_1RakzXHdrJomitOwE7B56erf': 'yearly',   // $39.99/year
} as const;

async function restoreSubscriptions() {
  console.log('🚨 EMERGENCY SUBSCRIPTION RESTORATION');
  console.log('=====================================\n');
  
  try {
    // Step 1: Fetch ALL active subscriptions from Stripe
    console.log('📥 Fetching active subscriptions from Stripe...');
    
    const subscriptions = [];
    let hasMore = true;
    let startingAfter: string | undefined;
    
    while (hasMore) {
      const response = await stripe.subscriptions.list({
        limit: 100,
        status: 'active',
        expand: ['data.customer'],
        ...(startingAfter && { starting_after: startingAfter }),
      });
      
      subscriptions.push(...response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }
    
    console.log(`✅ Found ${subscriptions.length} active subscriptions in Stripe\n`);
    
    // Step 2: Get all users from Firebase
    console.log('📥 Fetching users from Firebase...');
    const usersSnapshot = await db.collection('users').get();
    const usersByEmail = new Map();
    
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        usersByEmail.set(data.email.toLowerCase(), {
          id: doc.id,
          data: data
        });
      }
    });
    
    console.log(`✅ Found ${usersByEmail.size} users in Firebase\n`);
    
    // Step 3: Match subscriptions to users and restore
    console.log('🔄 Restoring subscriptions...\n');
    
    let restored = 0;
    let notFound = 0;
    const restorationLog = [];
    
    for (const subscription of subscriptions) {
      const customer = subscription.customer as Stripe.Customer;
      const customerEmail = customer.email?.toLowerCase();
      
      if (!customerEmail) {
        console.log(`⚠️ No email for customer ${customer.id}`);
        continue;
      }
      
      const user = usersByEmail.get(customerEmail);
      
      if (!user) {
        console.log(`❌ No Firebase user found for ${customerEmail}`);
        notFound++;
        continue;
      }
      
      // Get the price ID and determine the plan
      const priceId = subscription.items.data[0]?.price.id;
      const plan = PRICE_ID_MAP[priceId as keyof typeof PRICE_ID_MAP] || 'monthly';
      
      console.log(`👤 Restoring ${customerEmail}:`);
      console.log(`   - Subscription: ${subscription.id}`);
      console.log(`   - Plan: ${plan} (${priceId})`);
      console.log(`   - Status: ${subscription.status}`);
      
      // Create the CORRECT subscription structure (FLAT!)
      const subscriptionData = {
        status: subscription.status,
        plan: plan,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        stripePriceId: priceId,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(
          new Date(subscription.current_period_end * 1000)
        ),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        metadata: {
          source: 'stripe',
          restoredAt: admin.firestore.Timestamp.now(),
          restorationReason: 'Emergency restoration after cleanup error'
        }
      };
      
      // Update Firebase
      await db.collection('users').doc(user.id).update({
        subscription: subscriptionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`   ✅ Restored successfully\n`);
      
      restored++;
      restorationLog.push({
        userId: user.id,
        email: customerEmail,
        subscriptionId: subscription.id,
        plan: plan,
        status: subscription.status
      });
    }
    
    // Step 4: Save restoration log
    await db.collection('restoration_logs').add({
      timestamp: admin.firestore.Timestamp.now(),
      type: 'emergency_subscription_restoration',
      summary: {
        totalStripeSubscriptions: subscriptions.length,
        restoredCount: restored,
        notFoundCount: notFound
      },
      details: restorationLog
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESTORATION COMPLETE:');
    console.log('='.repeat(50));
    console.log(`✅ Restored: ${restored} subscriptions`);
    console.log(`❌ Not found in Firebase: ${notFound} customers`);
    console.log(`📝 Total Stripe subscriptions: ${subscriptions.length}`);
    console.log('\n💾 Restoration log saved to Firestore');
    
  } catch (error) {
    console.error('Fatal error during restoration:', error);
    throw error;
  }
}

// Run the restoration
console.log('⚠️  This script will restore subscription data from Stripe');
console.log('⚠️  Make sure you are using the LIVE Stripe API key!\n');

restoreSubscriptions().then(() => {
  console.log('\n✅ Restoration completed successfully!');
  console.log('📌 Please verify subscriptions in Firebase Console');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Restoration failed:', error);
  process.exit(1);
});