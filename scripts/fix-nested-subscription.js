const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixNestedSubscriptions() {
  console.log('🔧 Fixing nested subscription structure...\n');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let fixedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Check if there's a nested subscription.subscription
      if (userData.subscription && userData.subscription.subscription) {
        console.log(`Found nested subscription for user: ${doc.id}`);
        console.log(`  Main plan: ${userData.subscription.plan}`);
        console.log(`  Nested plan: ${userData.subscription.subscription.plan} (will be removed)`);
        
        // Remove the nested subscription field
        await db.collection('users').doc(doc.id).update({
          'subscription.subscription': admin.firestore.FieldValue.delete()
        });
        
        console.log(`  ✅ Fixed!\n`);
        fixedCount++;
      }
    }
    
    console.log(`✨ Fixed ${fixedCount} users with nested subscription structure`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

// Run the fix
fixNestedSubscriptions();