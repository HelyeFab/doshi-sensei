const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUserSubscriptions() {
  const userIds = [
    'WawMEtfq0dcoVPMr3nuwpFAzr9F2', // Admin user
    // Add the other user ID here when known
  ];
  
  console.log('🔍 Checking user subscription structures...\n');
  
  for (const userId of userIds) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.log(`❌ User ${userId} not found`);
        continue;
      }
      
      const userData = userDoc.data();
      console.log(`\n👤 User: ${userId}`);
      console.log(`📧 Email: ${userData.email || 'Not set'}`);
      console.log(`🏷️  Role: ${userData.role || 'user'}`);
      
      // Check subscription structure
      if (userData.subscription?.subscription) {
        console.log('⚠️  NESTED subscription structure detected!');
        console.log('   Current structure: subscription.subscription.plan');
        console.log(`   Plan: ${userData.subscription.subscription.plan || 'Not set'}`);
        console.log(`   Status: ${userData.subscription.subscription.status || 'Not set'}`);
      } else if (userData.subscription?.plan) {
        console.log('✅ Correct subscription structure');
        console.log(`   Plan: ${userData.subscription.plan}`);
        console.log(`   Status: ${userData.subscription.status}`);
      } else {
        console.log('❌ No subscription data found');
      }
      
      // Check limits
      console.log('\n📊 Limits:');
      if (userData.limits) {
        console.log(`   Max Lists: ${userData.limits.maxLists}`);
        console.log(`   Max Drills/Day: ${userData.limits.maxDrillsPerDay}`);
        console.log(`   Max KanjiQuest/Day: ${userData.limits.maxKanjiQuestPerDay}`);
        console.log(`   Max KanaDrop/Day: ${userData.limits.maxKanaDropPerDay || 'NOT SET'}`);
        console.log(`   Max Articles/Day: ${userData.limits.maxArticlesPerDay}`);
        console.log(`   Can Sync: ${userData.limits.canSync}`);
      } else {
        console.log('   ❌ No limits set');
      }
      
      // Check usage
      console.log('\n📈 Current Usage:');
      if (userData.currentUsage) {
        const today = new Date().toISOString().split('T')[0];
        console.log(`   Drills Today: ${userData.currentUsage.drillsToday || 0} (${userData.currentUsage.lastDrillDate === today ? 'today' : 'not today'})`);
        console.log(`   KanjiQuest Today: ${userData.currentUsage.kanjiQuestToday || 0} (${userData.currentUsage.lastKanjiQuestDate === today ? 'today' : 'not today'})`);
        console.log(`   KanaDrop Today: ${userData.currentUsage.kanaDropToday || 0} (${userData.currentUsage.lastKanaDropDate === today ? 'today' : 'not today'})`);
        console.log(`   Articles Today: ${userData.currentUsage.articlesToday || 0} (${userData.currentUsage.lastArticleDate === today ? 'today' : 'not today'})`);
        console.log(`   Lists Count: ${userData.currentUsage.listsCount || 0}`);
      } else {
        console.log('   ❌ No usage data');
      }
      
      console.log('\n' + '─'.repeat(50));
      
    } catch (error) {
      console.error(`❌ Error checking user ${userId}:`, error);
    }
  }
  
  // Clean up
  await admin.app().delete();
}

// Run the check
checkUserSubscriptions();