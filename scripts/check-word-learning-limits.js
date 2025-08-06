/**
 * Script to check word_learning_session limits in Firebase
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function checkWordLearningLimits() {
  console.log('🔍 Checking word_learning_session limits in Firebase...\n');
  
  try {
    // 1. Check the entitlement rules in Firestore config
    console.log('📋 Checking entitlement_rules_v1 in config collection...');
    const configDoc = await db.collection('config').doc('entitlement_rules_v1').get();
    
    if (configDoc.exists) {
      const rules = configDoc.data();
      console.log('✅ Found entitlement rules in Firebase!\n');
      
      // Check each user type
      const userTypes = ['guest', 'free', 'monthly', 'yearly'];
      
      for (const userType of userTypes) {
        console.log(`\n📌 ${userType.toUpperCase()} USER LIMITS:`);
        console.log('━'.repeat(40));
        
        if (rules.rules && rules.rules[userType]) {
          const userRules = rules.rules[userType];
          
          // Check daily limits
          if (userRules.limits?.daily?.word_learning_session !== undefined) {
            const limit = userRules.limits.daily.word_learning_session;
            console.log(`  word_learning_session (daily): ${limit === -1 ? '∞ Unlimited' : limit + ' sessions/day'}`);
          } else {
            console.log(`  word_learning_session (daily): ❌ Not defined`);
          }
          
          // Check total limits if any
          if (userRules.limits?.total?.word_learning_session !== undefined) {
            const limit = userRules.limits.total.word_learning_session;
            console.log(`  word_learning_session (total): ${limit === -1 ? '∞ Unlimited' : limit + ' sessions total'}`);
          }
          
          // Check permissions
          if (userRules.permissions) {
            const hasLearningPermission = userRules.permissions.includes('do_learning_sessions');
            console.log(`  Has 'do_learning_sessions' permission: ${hasLearningPermission ? '✅' : '❌'}`);
          }
        } else {
          console.log(`  ⚠️  No rules found for ${userType}`);
        }
      }
      
      // Show the full structure for word_learning_session
      console.log('\n\n📊 COMPLETE WORD_LEARNING_SESSION CONFIG:');
      console.log('━'.repeat(40));
      
      for (const userType of userTypes) {
        if (rules.rules?.[userType]?.limits?.daily?.word_learning_session !== undefined) {
          console.log(`${userType}: ${rules.rules[userType].limits.daily.word_learning_session}`);
        }
      }
      
      // Check when rules were last updated
      if (rules.version) {
        console.log(`\n📅 Rules version: ${rules.version}`);
      }
      if (rules.lastUpdated) {
        console.log(`📅 Last updated: ${rules.lastUpdated.toDate ? rules.lastUpdated.toDate().toISOString() : rules.lastUpdated}`);
      }
      
    } else {
      console.log('❌ No entitlement_rules_v1 document found in config collection');
      console.log('   The system might be using default rules from code.');
    }
    
    // 2. Also check if there are any feature-specific overrides
    console.log('\n\n🔍 Checking for feature-specific configs...');
    const featuresDoc = await db.collection('config').doc('features').get();
    
    if (featuresDoc.exists) {
      const features = featuresDoc.data();
      if (features.word_learning_session) {
        console.log('✅ Found word_learning_session in features config:');
        console.log(JSON.stringify(features.word_learning_session, null, 2));
      } else {
        console.log('ℹ️  No specific word_learning_session config in features document');
      }
    } else {
      console.log('ℹ️  No features config document found');
    }
    
    // 3. Check a sample user to see actual usage
    console.log('\n\n👤 Checking sample user usage (if any)...');
    const usersSnapshot = await db.collection('users')
      .limit(5)
      .get();
    
    let foundUsage = false;
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.usage?.daily?.word_learning_session || userData.usage?.total?.word_learning_session) {
        if (!foundUsage) {
          console.log('Found users with word_learning_session usage:');
          foundUsage = true;
        }
        console.log(`  User ${doc.id.substring(0, 8)}...: daily=${userData.usage?.daily?.word_learning_session || 0}, total=${userData.usage?.total?.word_learning_session || 0}`);
      }
    });
    
    if (!foundUsage) {
      console.log('  No users found with word_learning_session usage tracked');
    }
    
  } catch (error) {
    console.error('❌ Error querying Firebase:', error.message);
    console.error('   Make sure firebase-service-account.json exists and has proper permissions');
  } finally {
    // Clean up
    await admin.app().delete();
    console.log('\n✅ Firebase connection closed');
  }
}

// Run the check
checkWordLearningLimits();