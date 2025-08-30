const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

async function testActivityData() {
  console.log('=== Testing Weekly Activity Dashboard Data ===\n');
  
  try {
    // Check what data exists for the dashboard
    console.log('1. USAGE DATA:');
    const usageRef = db.collection('users').doc(userId).collection('usage');
    const usageSnapshot = await usageRef.get();
    
    if (!usageSnapshot.empty) {
      const latestUsage = usageSnapshot.docs[0]?.data();
      console.log('Latest usage record:');
      if (latestUsage?.daily) {
        console.log(`  - Articles read: ${latestUsage.daily.article_reading || 0}`);
        console.log(`  - Mood boards viewed: ${latestUsage.daily.mood_board_viewing || 0}`);
        console.log(`  - Drills completed: ${latestUsage.daily.drill_practice || 0}`);
        console.log(`  - Vocabulary reviewed: ${latestUsage.daily.vocabulary_lookup || 0}`);
        console.log(`  - Videos watched: ${latestUsage.daily.youtube_shadowing || 0}`);
      }
    }
    
    console.log('\n2. KANJI STUDY SESSIONS:');
    const kanjiSessionsRef = db.collection('users').doc(userId).collection('kanjiStudySessions');
    const kanjiSnapshot = await kanjiSessionsRef.limit(3).get();
    
    kanjiSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - Session: ${data.kanjiReviewed || 0} kanji, ${Math.round((data.timeSpent || 0) / 60000)} minutes`);
    });
    
    console.log('\n3. ACHIEVEMENT STATS:');
    const achievementStatsRef = db.collection('users').doc(userId).collection('achievementStats');
    const statsSnapshot = await achievementStatsRef.get();
    if (!statsSnapshot.empty) {
      const stats = statsSnapshot.docs[0]?.data();
      console.log(`  - Current streak: ${stats?.currentStreak || 0} days`);
      console.log(`  - Games played: ${stats?.gamesPlayed || 0}`);
      console.log(`  - Stories completed: ${stats?.storiesCompleted || 0}`);
    }
    
    console.log('\n✅ Dashboard should display this data beautifully!');
    
  } catch (error) {
    console.error('Error testing activity data:', error);
  } finally {
    await admin.app().delete();
    process.exit(0);
  }
}

testActivityData();