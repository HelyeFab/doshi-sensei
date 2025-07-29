// Script to manually fix subscription after successful Stripe payment
// Run this with: node scripts/fix-my-subscription.js

const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json'); // You'll need to add this

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://doshi-sensei.firebaseio.com"
});

const db = admin.firestore();

async function fixSubscription() {
  // IMPORTANT: Replace these with your actual values from Stripe dashboard
  const USER_EMAIL = 'your-email@gmail.com'; // Your email
  const STRIPE_CUSTOMER_ID = 'cus_XXXXX'; // Get from Stripe dashboard
  const STRIPE_SUBSCRIPTION_ID = 'sub_XXXXX'; // Get from Stripe dashboard
  const PLAN_TYPE = 'monthly'; // or 'yearly'
  
  try {
    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', USER_EMAIL)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.error('User not found with email:', USER_EMAIL);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    console.log('Found user:', userId);
    
    // Calculate period end (1 month for monthly, 1 year for yearly)
    const now = new Date();
    const periodEnd = new Date(now);
    if (PLAN_TYPE === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    // Update subscription using the new Three-Pillar structure
    const subscriptionData = {
      subscription: {
        userId: userId,
        status: 'active',
        plan: PLAN_TYPE,
        stripeCustomerId: STRIPE_CUSTOMER_ID,
        stripeSubscriptionId: STRIPE_SUBSCRIPTION_ID,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: {
          source: 'stripe',
          createdAt: now,
          updatedAt: now,
          manuallyFixed: true,
          fixReason: 'Webhook failed during Netlify redirect issue'
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
      }
    };
    
    // Update the user document
    await db.collection('users').doc(userId).set(subscriptionData, { merge: true });
    
    console.log('✅ Subscription fixed successfully!');
    console.log('User:', userId);
    console.log('Plan:', PLAN_TYPE);
    console.log('Status: active');
    console.log('Period End:', periodEnd.toISOString());
    
    // Also log this fix for audit trail
    await db.collection('webhook_logs').add({
      type: 'manual_subscription_fix',
      userId: userId,
      timestamp: now,
      details: {
        reason: 'Webhook failed during Netlify redirect issue',
        stripeCustomerId: STRIPE_CUSTOMER_ID,
        stripeSubscriptionId: STRIPE_SUBSCRIPTION_ID,
        plan: PLAN_TYPE
      }
    });
    
  } catch (error) {
    console.error('Error fixing subscription:', error);
  } finally {
    process.exit();
  }
}

// Run the fix
fixSubscription();