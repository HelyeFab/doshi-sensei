// Script to fix nested subscription structure for all affected users
// Run this with: node scripts/fix-subscription-structure.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-id.firebaseio.com'
});

const db = admin.firestore();

async function fixAllSubscriptions() {
  console.log('Starting subscription structure fix...');
  
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const doc of snapshot.docs) {
    const userData = doc.data();
    
    // Check if user has nested subscription structure
    if (userData?.subscription?.subscription && !userData?.subscription?.plan) {
      console.log(`Fixing user ${doc.id} (${userData.email || 'no email'})`);
      
      try {
        // Extract the nested data
        const fixed = {
          subscription: {
            ...userData.subscription.subscription,
            limits: userData.subscription.limits || {
              maxLists: -1,
              maxDrillsPerDay: -1,
              maxKanjiQuestPerDay: -1,
              maxStoriesPerDay: -1,
              maxArticlesPerDay: -1,
              canSync: true,
              canSave: true
            },
            currentUsage: userData.subscription.currentUsage || {
              listsCount: 0,
              drillsToday: 0,
              lastDrillDate: new Date().toISOString().split('T')[0],
              kanjiQuestToday: 0,
              lastKanjiQuestDate: new Date().toISOString().split('T')[0],
              kanaDropToday: 0,
              lastKanaDropDate: new Date().toISOString().split('T')[0],
              storiesToday: 0,
              lastStoryDate: new Date().toISOString().split('T')[0],
              articlesToday: 0,
              lastArticleDate: new Date().toISOString().split('T')[0]
            }
          }
        };
        
        await doc.ref.update(fixed);
        fixedCount++;
        console.log(`✓ Fixed ${doc.id}`);
      } catch (error) {
        console.error(`✗ Error fixing ${doc.id}:`, error);
        errorCount++;
      }
    }
  }
  
  console.log('\nMigration complete!');
  console.log(`Fixed: ${fixedCount} users`);
  console.log(`Errors: ${errorCount} users`);
  console.log(`Total users checked: ${snapshot.size}`);
}

// Run the migration
fixAllSubscriptions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });