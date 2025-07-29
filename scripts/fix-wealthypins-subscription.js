// Emergency fix for wealthypins@gmail.com subscription
// Run with: node scripts/fix-wealthypins-subscription.js

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://doshi-sensei.firebaseio.com"
});

const db = admin.firestore();

async function fixWealthypinsSubscription() {
  const EMAIL = 'wealthypins@gmail.com';
  const FIREBASE_UID = 'sQq3q6JjXiQghwhEuomjA0I4p833'; // From your Stripe webhook
  const STRIPE_CUSTOMER_ID = 'cus_SlsVSg8veGamAT'; // From your Stripe webhook
  const STRIPE_SUBSCRIPTION_ID = 'sub_1RqKoNHdrJomitOwcDj8TAXd'; // From your Stripe webhook
  
  console.log('🔍 Fixing subscription for:', EMAIL);
  console.log('🆔 Firebase UID:', FIREBASE_UID);
  console.log('💳 Stripe Customer:', STRIPE_CUSTOMER_ID);
  console.log('📋 Stripe Subscription:', STRIPE_SUBSCRIPTION_ID);
  
  try {
    // Use the exact Firebase UID from the Stripe webhook
    const userId = FIREBASE_UID;
    
    // Get current user data
    const currentDoc = await db.collection('users').doc(userId).get();
    const currentData = currentDoc.data() || {};
    
    console.log('📋 Current subscription status:', currentData.subscription?.status || 'none');
    
    // Calculate period end (1 month from now for monthly plan)
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    
    // Create the premium subscription data
    const subscriptionUpdate = {
      email: EMAIL, // Ensure email is stored
      subscription: {
        userId: userId,
        status: 'active',
        plan: 'monthly',
        stripeCustomerId: STRIPE_CUSTOMER_ID,
        stripeSubscriptionId: STRIPE_SUBSCRIPTION_ID,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: {
          source: 'stripe',
          createdAt: now,
          updatedAt: now,
          manuallyFixed: true,
          fixReason: 'Stripe payment successful but webhook failed due to Netlify redirect'
        }
      },
      limits: {
        maxLists: -1,
        maxDrillsPerDay: -1,
        maxKanjiQuestPerDay: -1,
        maxStoriesPerDay: -1,
        maxArticlesPerDay: -1,
        maxKanaDropPerDay: -1,
        canSync: true,
        canSave: true
      },
      // Preserve existing usage data
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
    };
    
    // Update the user document
    console.log('📝 Updating user document...');
    await db.collection('users').doc(userId).set(subscriptionUpdate, { merge: true });
    console.log('✅ User document updated');
    
    console.log('✅ Subscription fixed successfully!');
    console.log('📧 Email:', EMAIL);
    console.log('🆔 User ID:', userId);
    console.log('💳 Plan: Monthly ($3.99/month)');
    console.log('⏰ Active until:', periodEnd.toLocaleDateString());
    console.log('\n🎉 The user should now have full premium access!');
    
    // Log this manual fix
    await db.collection('webhook_logs').add({
      eventId: `manual_fix_${Date.now()}`,
      type: 'manual_subscription_fix',
      status: 'success',
      timestamp: now,
      data: {
        userId: userId,
        email: EMAIL,
        reason: 'Stripe webhook failed due to Netlify redirect issue',
        plan: 'monthly'
      }
    });
    
    console.log('\n📝 Audit log created');
    
  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
  }
}

// Run the fix
fixWealthypinsSubscription()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });