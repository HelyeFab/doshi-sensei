const admin = require('firebase-admin');

// Initialize Firebase Admin
// You need to either:
// 1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key path
// 2. Or uncomment and use the service account directly below

// Option 1: Using environment variable (recommended)
admin.initializeApp();

// Option 2: Using service account directly (uncomment if needed)
// const serviceAccount = require('./path-to-your-service-account-key.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const db = admin.firestore();

async function fixEmmanuelSubscription() {
  const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';
  const userEmail = 'emmanuelfabiani23@gmail.com';
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`Fixing subscription for ${userEmail} (${userId})...`);
  
  try {
    // First, let's check the current state
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ User document not found!');
      return;
    }
    
    const currentData = userDoc.data();
    console.log('\nCurrent subscription structure:');
    console.log(JSON.stringify(currentData.subscription, null, 2));
    
    // Create the correct subscription structure
    const correctSubscription = {
      status: 'active',
      plan: 'yearly',
      renewalDate: '2026-07-05T00:00:00.000Z',
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
        lastDrillDate: today,
        kanjiQuestToday: 0,
        lastKanjiQuestDate: today,
        kanaDropToday: 0,
        lastKanaDropDate: today,
        storiesToday: 0,
        lastStoryDate: today,
        articlesToday: 0,
        lastArticleDate: today
      }
    };
    
    // Update the user document
    await userRef.update({
      subscription: correctSubscription
    });
    
    console.log('\n✅ Subscription fixed successfully!');
    console.log('\nNew subscription structure:');
    console.log(JSON.stringify(correctSubscription, null, 2));
    
    // Verify the update
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    
    if (updatedData.subscription.plan === 'yearly' && updatedData.subscription.status === 'active') {
      console.log('\n✅ Verification successful - User is now a yearly premium subscriber!');
    } else {
      console.log('\n⚠️ Warning: Update may not have worked correctly');
    }
    
  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
  }
  
  process.exit(0);
}

// Run the fix
fixEmmanuelSubscription();