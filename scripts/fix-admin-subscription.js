const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixAdminSubscription() {
  const adminUserId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';
  
  try {
    console.log('🔧 Starting admin subscription fix...');
    
    // Get current user document
    const userRef = db.collection('users').doc(adminUserId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ Admin user document not found!');
      return;
    }
    
    const currentData = userDoc.data();
    console.log('📊 Current subscription structure:', JSON.stringify(currentData.subscription, null, 2));
    
    // Create the correct subscription structure
    const fixedSubscription = {
      userId: adminUserId,
      status: 'active',
      plan: 'yearly',
      stripeCustomerId: currentData.subscription?.subscription?.stripeCustomerId || currentData.subscription?.stripeCustomerId || null,
      stripeSubscriptionId: currentData.subscription?.subscription?.stripeSubscriptionId || currentData.subscription?.stripeSubscriptionId || null,
      currentPeriodEnd: currentData.subscription?.subscription?.currentPeriodEnd || currentData.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: false,
      metadata: {
        source: 'admin_fix',
        createdAt: new Date(),
        updatedAt: new Date(),
        originalStructure: 'nested_subscription'
      }
    };
    
    // Update the user document with the correct structure
    await userRef.update({
      subscription: fixedSubscription,
      // Ensure limits are set correctly for yearly plan
      limits: {
        maxLists: -1,
        maxDrillsPerDay: -1,
        maxKanjiQuestPerDay: -1,
        maxKanaDropPerDay: -1,
        maxStoriesPerDay: -1,
        maxArticlesPerDay: -1,
        canSync: true,
        canSave: true
      },
      // Keep current usage intact
      currentUsage: currentData.currentUsage || {
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
    });
    
    console.log('✅ Admin subscription structure fixed successfully!');
    console.log('📝 New subscription structure:', JSON.stringify(fixedSubscription, null, 2));
    
    // Verify the fix
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    console.log('\n🔍 Verification - Updated subscription:', JSON.stringify(updatedData.subscription, null, 2));
    
  } catch (error) {
    console.error('❌ Error fixing admin subscription:', error);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the fix
fixAdminSubscription();