/**
 * Script to migrate achievement stats to user documents for leaderboard
 * Run this script to populate existing users with their achievement stats
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-admin-key.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateAchievementStats() {
  console.log('🚀 Starting achievement stats migration...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users to process`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Skip if user already has achievementStats
      if (userData.achievementStats) {
        console.log(`⏭️  User ${userId} already has achievement stats, skipping...`);
        skippedCount++;
        continue;
      }
      
      // Initialize default achievement stats
      const defaultAchievementStats = {
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        drillsCompleted: 0,
        gamesPlayed: 0,
        articlesRead: 0,
        storiesCompleted: 0,
        kanjiStudied: 0,
        totalStudyTime: 0,
        lastActivityDate: userData.lastLoginAt || userData.createdAt || new Date().toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Check if user has any cloud sync data (premium users)
      try {
        const cloudStatsDoc = await db
          .collection('users')
          .doc(userId)
          .collection('cloudSync')
          .doc('achievementStats')
          .collection('data')
          .doc('current')
          .get();
          
        if (cloudStatsDoc.exists) {
          const cloudStats = cloudStatsDoc.data();
          // Merge cloud stats with defaults
          Object.assign(defaultAchievementStats, {
            totalXP: cloudStats.totalXP || 0,
            currentStreak: cloudStats.currentStreak || 0,
            longestStreak: cloudStats.longestStreak || 0,
            drillsCompleted: cloudStats.drillsCompleted || 0,
            gamesPlayed: cloudStats.gamesPlayed || 0,
            articlesRead: cloudStats.articlesRead || 0,
            storiesCompleted: cloudStats.storiesCompleted || 0,
            kanjiStudied: cloudStats.kanjiStudied || 0,
            totalStudyTime: cloudStats.totalStudyTime || 0,
            lastActivityDate: cloudStats.lastStudyDate || defaultAchievementStats.lastActivityDate
          });
          console.log(`📊 Found cloud sync data for user ${userId}`);
        }
      } catch (error) {
        // No cloud sync data, continue with defaults
      }
      
      // Update user document with achievement stats
      await db.collection('users').doc(userId).update({
        achievementStats: defaultAchievementStats
      });
      
      console.log(`✅ Migrated user ${userId} (${userData.email || 'no email'})`);
      migratedCount++;
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   Total users: ${usersSnapshot.size}`);
    console.log(`   Migrated: ${migratedCount}`);
    console.log(`   Skipped (already had stats): ${skippedCount}`);
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateAchievementStats()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });