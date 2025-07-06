const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function ensureCompleteSubscription() {
  const adminUserId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';
  
  try {
    console.log('🔧 Ensuring complete subscription structure...');
    
    // Get current user document
    const userRef = db.collection('users').doc(adminUserId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ Admin user document not found!');
      return;
    }
    
    const currentData = userDoc.data();
    console.log('📊 Current state:', {
      hasSubscription: !!currentData.subscription,
      hasLimits: !!currentData.limits,
      hasUsage: !!currentData.currentUsage
    });
    
    // Ensure all required fields are present
    const updates = {};
    
    // Ensure limits exist for yearly plan
    if (!currentData.limits) {
      updates.limits = {
        maxLists: -1,
        maxDrillsPerDay: -1,
        maxKanjiQuestPerDay: -1,
        maxKanaDropPerDay: -1,
        maxStoriesPerDay: -1,
        maxArticlesPerDay: -1,
        canSync: true,
        canSave: true
      };
      console.log('✅ Adding missing limits');
    }
    
    // Ensure usage tracking exists
    if (!currentData.currentUsage) {
      const today = new Date().toISOString().split('T')[0];
      updates.currentUsage = {
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
      };
      console.log('✅ Adding missing usage tracking');
    }
    
    // Ensure subscription has all fields
    if (currentData.subscription) {
      const subscription = currentData.subscription;
      const hasAllFields = subscription.userId && 
                          subscription.status && 
                          subscription.plan &&
                          subscription.metadata;
      
      if (!hasAllFields) {
        updates.subscription = {
          userId: adminUserId,
          status: subscription.status || 'active',
          plan: subscription.plan || 'yearly',
          stripeCustomerId: subscription.stripeCustomerId || null,
          stripeSubscriptionId: subscription.stripeSubscriptionId || null,
          currentPeriodEnd: subscription.currentPeriodEnd || null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
          metadata: subscription.metadata || {
            source: 'admin_fix',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
        console.log('✅ Fixing incomplete subscription fields');
      }
    }
    
    // Apply updates if needed
    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
      console.log('✅ Updates applied successfully!');
    } else {
      console.log('✅ All fields already present!');
    }
    
    // Verify the final state
    const finalDoc = await userRef.get();
    const finalData = finalDoc.data();
    console.log('\n🔍 Final verification:', {
      subscription: {
        plan: finalData.subscription?.plan,
        status: finalData.subscription?.status
      },
      limits: {
        hasLimits: !!finalData.limits,
        unlimited: finalData.limits?.maxDrillsPerDay === -1
      },
      usage: {
        hasUsage: !!finalData.currentUsage
      }
    });
    
  } catch (error) {
    console.error('❌ Error ensuring complete subscription:', error);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the fix
ensureCompleteSubscription();