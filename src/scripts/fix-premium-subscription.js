const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('Firebase project ID not found in environment variables');
  process.exit(1);
}

const serviceAccount = {
  type: "service_account",
  project_id: projectId,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixPremiumSubscription(userEmail) {
  try {
    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .get();
    
    if (usersSnapshot.empty) {
      // Try finding by auth email
      const user = await admin.auth().getUserByEmail(userEmail);
      if (!user) {
        console.error('User not found with email:', userEmail);
        return;
      }
      
      // Get user document by UID
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
        console.error('User document not found for UID:', user.uid);
        return;
      }
      
      await updateUserSubscription(user.uid, userDoc.data());
    } else {
      const userDoc = usersSnapshot.docs[0];
      await updateUserSubscription(userDoc.id, userDoc.data());
    }
  } catch (error) {
    console.error('Error fixing subscription:', error);
  }
}

async function updateUserSubscription(userId, userData) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get current subscription or create default
  const currentSubscription = userData?.subscription || {};
  
  // Determine plan type
  const plan = currentSubscription.subscription?.plan || 'yearly';
  
  // Create proper subscription structure
  const updatedSubscription = {
    subscription: {
      plan: plan,
      status: 'active',
      stripeSubscriptionId: currentSubscription.subscription?.stripeSubscriptionId || null,
      stripeCustomerId: currentSubscription.subscription?.stripeCustomerId || null,
      currentPeriodEnd: currentSubscription.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: currentSubscription.subscription?.cancelAtPeriodEnd || false
    },
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
      listsCount: currentSubscription.currentUsage?.listsCount || 0,
      drillsToday: currentSubscription.currentUsage?.drillsToday || 0,
      lastDrillDate: currentSubscription.currentUsage?.lastDrillDate || today,
      kanjiQuestToday: currentSubscription.currentUsage?.kanjiQuestToday || 0,
      lastKanjiQuestDate: currentSubscription.currentUsage?.lastKanjiQuestDate || today,
      storiesToday: currentSubscription.currentUsage?.storiesToday || 0,
      lastStoryDate: currentSubscription.currentUsage?.lastStoryDate || today,
      articlesToday: currentSubscription.currentUsage?.articlesToday || 0,
      lastArticleDate: currentSubscription.currentUsage?.lastArticleDate || today
    },
    createdAt: currentSubscription.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Update the user document
  await db.collection('users').doc(userId).update({
    subscription: updatedSubscription
  });
  
  console.log('✅ Successfully updated subscription for user:', userId);
  console.log('📊 Updated subscription:', JSON.stringify(updatedSubscription, null, 2));
}

// Run the fix
const userEmail = process.argv[2] || 'emmanuelfabiani23@gmail.com';
fixPremiumSubscription(userEmail).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});