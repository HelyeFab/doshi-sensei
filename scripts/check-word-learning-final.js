/**
 * Final check for word_learning_session limits across all user types
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

async function checkWordLearningFinal() {
  console.log('📊 WORD_LEARNING_SESSION LIMITS IN FIREBASE\n');
  console.log('=' .repeat(50));
  
  try {
    const configDoc = await db.collection('config').doc('entitlement_rules_v1').get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      const results = {};
      
      // Process the rules array
      if (data.rules && Array.isArray(data.rules)) {
        data.rules.forEach(rule => {
          const userType = rule.userTypes?.[0] || 'unknown';
          
          // Check for word_learning_session in daily limits
          const dailyLimit = rule.limits?.daily?.word_learning_session;
          
          results[userType] = {
            daily: dailyLimit !== undefined ? dailyLimit : 'NOT SET',
            permissions: rule.permissions || []
          };
        });
      }
      
      // Display results
      console.log('\n📌 CURRENT FIREBASE LIMITS:\n');
      
      const userTypeOrder = ['guest', 'free', 'monthly', 'yearly'];
      
      userTypeOrder.forEach(userType => {
        if (results[userType]) {
          const limit = results[userType].daily;
          const hasPermission = results[userType].permissions.includes('do_learning_sessions');
          
          console.log(`${userType.toUpperCase().padEnd(10)} : ${
            limit === -1 ? '∞ Unlimited' : 
            limit === 'NOT SET' ? '❌ Not configured' : 
            `${limit} sessions/day`
          }`);
          
          if (limit !== 'NOT SET' && !hasPermission) {
            console.log(`             ⚠️  Missing 'do_learning_sessions' permission`);
          }
        } else {
          console.log(`${userType.toUpperCase().padEnd(10)} : ❓ No rules found`);
        }
      });
      
      // Now compare with code defaults
      console.log('\n\n📌 CODE DEFAULTS (from entitlements/rules.ts):\n');
      console.log('GUEST      : 0 sessions/day (no access - requires auth)');
      console.log('FREE       : 5 sessions/day');
      console.log('MONTHLY    : ∞ Unlimited');
      console.log('YEARLY     : ∞ Unlimited');
      
      console.log('\n\n⚠️  DISCREPANCIES FOUND:\n');
      console.log('━'.repeat(50));
      
      // Check discrepancies
      const codeDefaults = {
        guest: 0,
        free: 5,
        monthly: -1,
        yearly: -1
      };
      
      let discrepanciesFound = false;
      
      userTypeOrder.forEach(userType => {
        if (results[userType] && results[userType].daily !== 'NOT SET') {
          const firebaseLimit = results[userType].daily;
          const codeLimit = codeDefaults[userType];
          
          if (firebaseLimit !== codeLimit) {
            discrepanciesFound = true;
            console.log(`${userType.toUpperCase()}:`);
            console.log(`  Firebase: ${firebaseLimit === -1 ? 'Unlimited' : firebaseLimit}`);
            console.log(`  Code:     ${codeLimit === -1 ? 'Unlimited' : codeLimit}`);
            console.log(`  Status:   ${firebaseLimit > codeLimit ? '✅ Firebase is more generous' : '⚠️  Firebase is more restrictive'}\n`);
          }
        }
      });
      
      if (!discrepanciesFound) {
        console.log('✅ No discrepancies found - Firebase matches code defaults!');
      }
      
      // Check last update
      if (data.lastUpdated) {
        const date = data.lastUpdated.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated);
        console.log(`\n📅 Last updated: ${date.toISOString()}`);
      }
      
    } else {
      console.log('❌ No entitlement rules found in Firebase!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await admin.app().delete();
  }
}

checkWordLearningFinal();