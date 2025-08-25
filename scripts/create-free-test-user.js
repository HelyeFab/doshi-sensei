#!/usr/bin/env node

/**
 * Create a FREE test user in Firebase with correct subscription structure
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

async function createFreeTestUser() {
  const timestamp = Date.now();
  const email = `test-free-${timestamp}@example.com`;
  const displayName = `Test Free User ${timestamp}`;
  
  try {
    console.log('🔄 Creating FREE test user in Firebase Auth...');
    console.log(`📧 Email: ${email}`);
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: 'testpassword123',
      displayName: displayName,
      emailVerified: true
    });
    
    console.log(`✅ Auth user created with UID: ${userRecord.uid}`);
    
    // Create the correct FREE subscription structure (FLAT, not nested)
    const userData = {
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      photoURL: null,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // CORRECT FLAT STRUCTURE for FREE user
      subscription: {
        plan: 'free',
        status: 'active',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        paymentMethod: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        interval: null,
        intervalCount: null,
        created: admin.firestore.Timestamp.now(),
        priceId: null,
        productId: null
      },
      
      // User limits (for free users)
      limits: {
        daily: {
          drill_practice: 0,
          vocabulary_search: 0,
          kanji_study: 0
        },
        total: {
          study_lists: 0,
          saved_items: 0
        }
      },
      
      // User preferences
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: false,
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
    
    console.log('\n📝 Creating Firestore document for FREE user:');
    console.log('✅ subscription.plan = "free"');
    console.log('✅ subscription.status = "active"');
    console.log('✅ No nested subscription.subscription structure');
    console.log('✅ No Stripe IDs (as expected for free users)\n');
    
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
    console.log(`- Has Stripe customer ID? ${savedData.subscription.stripeCustomerId ? 'Yes' : 'No (correct for free user)'}`);
    
    console.log('\n✅ FREE test user created successfully!');
    console.log('📋 User Details:');
    console.log(`- UID: ${userRecord.uid}`);
    console.log(`- Email: ${email}`);
    console.log(`- Password: testpassword123`);
    console.log(`- Plan: ${userData.subscription.plan} (FREE)`);
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
createFreeTestUser()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });