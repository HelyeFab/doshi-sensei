#!/usr/bin/env node

/**
 * Create a test user in Firebase with correct subscription structure
 */

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

async function createTestUser() {
  const timestamp = Date.now();
  const email = `test-user-${timestamp}@example.com`;
  const displayName = `Test User ${timestamp}`;
  
  try {
    console.log('🔄 Creating test user in Firebase Auth...');
    console.log(`📧 Email: ${email}`);
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: 'testpassword123',
      displayName: displayName,
      emailVerified: true
    });
    
    console.log(`✅ Auth user created with UID: ${userRecord.uid}`);
    
    // Create the correct subscription structure (FLAT, not nested)
    const userData = {
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      photoURL: null,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // CORRECT FLAT STRUCTURE - No nested subscription.subscription
      subscription: {
        plan: 'premium', // Testing with premium to show correct structure
        status: 'active',
        currentPeriodStart: admin.firestore.Timestamp.now(),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        ),
        stripeCustomerId: `cus_test_${timestamp}`,
        stripeSubscriptionId: `sub_test_${timestamp}`,
        paymentMethod: 'card',
        cancelAtPeriodEnd: false,
        trialEnd: null,
        interval: 'monthly',
        intervalCount: 1,
        created: admin.firestore.Timestamp.now(),
        priceId: 'price_1RubMXHdrJomitOwNNI4LmWB',
        productId: 'prod_Rg1pQrBqmqGkQn'
      },
      
      // User limits (separate from subscription)
      limits: {
        daily: {},
        total: {}
      },
      
      // User preferences
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false
        }
      },
      
      // Study data
      studyData: {
        streak: 0,
        lastStudyDate: null,
        totalStudyTime: 0,
        lessonsCompleted: 0
      }
    };
    
    console.log('\n📝 Creating Firestore document with CORRECT structure:');
    console.log('✅ subscription.plan (not subscription.subscription.plan)');
    console.log('✅ subscription.status (not subscription.subscription.status)');
    console.log('✅ All subscription fields at subscription level\n');
    
    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set(userData);
    
    console.log('✅ User document created in Firestore');
    
    // Read back to verify structure
    const doc = await db.collection('users').doc(userRecord.uid).get();
    const savedData = doc.data();
    
    console.log('\n🔍 Verifying saved structure:');
    console.log(`- subscription.plan: ${savedData.subscription.plan}`);
    console.log(`- subscription.status: ${savedData.subscription.status}`);
    console.log(`- Has nested subscription.subscription? ${savedData.subscription.subscription ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
    
    console.log('\n✅ Test user created successfully!');
    console.log('📋 User Details:');
    console.log(`- UID: ${userRecord.uid}`);
    console.log(`- Email: ${email}`);
    console.log(`- Password: testpassword123`);
    console.log(`- Plan: ${userData.subscription.plan}`);
    console.log(`- Status: ${userData.subscription.status}`);
    
    console.log('\n🔗 View in Firebase Console:');
    console.log(`https://console.firebase.google.com/u/0/project/doshi-sensei/firestore/data/~2Fusers~2F${userRecord.uid}`);
    
    return userRecord;
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

// Run the script
createTestUser()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });