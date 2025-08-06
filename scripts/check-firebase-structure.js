/**
 * Script to check the complete structure of Firebase entitlement rules
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

async function checkFirebaseStructure() {
  console.log('🔍 Checking complete Firebase entitlement structure...\n');
  
  try {
    // 1. Get the raw document
    console.log('📋 Fetching entitlement_rules_v1 document...');
    const configDoc = await db.collection('config').doc('entitlement_rules_v1').get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      console.log('\n✅ Document found! Here\'s the complete structure:\n');
      console.log(JSON.stringify(data, null, 2));
      
      // Look specifically for word_learning_session anywhere in the structure
      console.log('\n\n🔍 Searching for "word_learning_session" in the document...');
      const searchInObject = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (key.includes('word_learning_session')) {
            console.log(`✅ Found at path: ${currentPath}`);
            console.log(`   Value: ${JSON.stringify(value)}`);
          }
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            searchInObject(value, currentPath);
          }
        }
      };
      
      searchInObject(data);
      
    } else {
      console.log('❌ Document does not exist!');
    }
    
    // 2. Check all documents in config collection
    console.log('\n\n📁 Listing all documents in config collection:');
    const configSnapshot = await db.collection('config').get();
    
    configSnapshot.forEach(doc => {
      console.log(`  - ${doc.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await admin.app().delete();
    console.log('\n✅ Done');
  }
}

checkFirebaseStructure();