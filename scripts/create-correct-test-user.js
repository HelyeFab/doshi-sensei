#!/usr/bin/env node

/**
 * Create test users with CORRECT subscription structure from codebase
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'doshi-sensei',
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function createCorrectTestUsers() {
  const timestamp = Date.now();
  
  try {
    // Create MONTHLY subscription user - EXACTLY as defined in types
    const monthlyEmail = `test-monthly-${timestamp}@example.com`;
    console.log('Creating MONTHLY user with CORRECT structure...');
    
    const monthlyUser = await auth.createUser({
      email: monthlyEmail,
      password: 'testpassword123',
      displayName: `Test Monthly User`,
      emailVerified: true
    });
    
    // CORRECT structure from UserSubscription interface
    const monthlyUserData = {
      uid: monthlyUser.uid,
      email: monthlyEmail,
      displayName: `Test Monthly User`,
      subscription: {
        plan: 'monthly', // CORRECT: 'monthly' not 'premium'
        status: 'active',
        paymentProvider: 'stripe',
        stripeCustomerId: `cus_test_${timestamp}`,
        stripeSubscriptionId: `sub_test_${timestamp}`,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_placeholder',
        currentPeriodStart: admin.firestore.Timestamp.now(),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ),
        cancelAtPeriodEnd: false,
        limits: {
          maxLists: -1,
          maxDrillsPerDay: -1,
          maxKanjiQuestPerDay: -1,
          maxStoriesPerDay: -1,
          maxArticlesPerDay: -1,
          canSync: true,
          canSave: true
        },
        currentUsage: {
          listsCount: 0,
          drillsToday: 0,
          lastDrillDate: new Date().toISOString(),
          kanjiQuestToday: 0,
          lastKanjiQuestDate: new Date().toISOString(),
          kanaDropToday: 0,
          lastKanaDropDate: new Date().toISOString(),
          storiesToday: 0,
          lastStoryDate: new Date().toISOString(),
          articlesToday: 0,
          lastArticleDate: new Date().toISOString()
        }
      }
    };
    
    await db.collection('users').doc(monthlyUser.uid).set(monthlyUserData);
    console.log('✅ MONTHLY user created: ' + monthlyEmail);
    
    // Create FREE user - EXACTLY as defined in types
    const freeEmail = `test-free-${timestamp}@example.com`;
    console.log('Creating FREE user with CORRECT structure...');
    
    const freeUser = await auth.createUser({
      email: freeEmail,
      password: 'testpassword123',
      displayName: `Test Free User`,
      emailVerified: true
    });
    
    // CORRECT structure for FREE user
    const freeUserData = {
      uid: freeUser.uid,
      email: freeEmail,
      displayName: `Test Free User`,
      subscription: {
        plan: 'free', // CORRECT: 'free'
        status: 'active',
        limits: {
          maxLists: 3,
          maxDrillsPerDay: 3,
          maxKanjiQuestPerDay: 3,
          maxStoriesPerDay: 3,
          maxArticlesPerDay: 3,
          canSync: false,
          canSave: true
        },
        currentUsage: {
          listsCount: 0,
          drillsToday: 0,
          lastDrillDate: new Date().toISOString(),
          kanjiQuestToday: 0,
          lastKanjiQuestDate: new Date().toISOString(),
          kanaDropToday: 0,
          lastKanaDropDate: new Date().toISOString(),
          storiesToday: 0,
          lastStoryDate: new Date().toISOString(),
          articlesToday: 0,
          lastArticleDate: new Date().toISOString()
        }
      }
    };
    
    await db.collection('users').doc(freeUser.uid).set(freeUserData);
    console.log('✅ FREE user created: ' + freeEmail);
    
    console.log('\n📋 Test Users Created:');
    console.log('MONTHLY: ' + monthlyEmail + ' (password: testpassword123)');
    console.log('FREE: ' + freeEmail + ' (password: testpassword123)');
    console.log('\n✅ Both users have CORRECT subscription structure from codebase');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createCorrectTestUsers()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });