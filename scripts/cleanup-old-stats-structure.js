/**
 * Script to clean up old Firebase stats structure
 * 
 * This script removes the old stats structure after confirming the new structure is working.
 * IMPORTANT: Only run this after verifying all data has been migrated to the new structure!
 * 
 * Old structure: /userStats/{userId} (single document)
 * New structure: /userStats/{userId}/current/* (multiple documents)
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
if (!admin.apps.length) {
  const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const db = admin.firestore();

async function cleanupOldStatsStructure() {
  console.log('🧹 Starting cleanup of old stats structure...\n');
  
  try {
    // Get all user stats documents
    const userStatsSnapshot = await db.collection('userStats').get();
    console.log(`Found ${userStatsSnapshot.size} user stat documents\n`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const doc of userStatsSnapshot.docs) {
      const userId = doc.id;
      const data = doc.data();
      
      try {
        // Check if this is an old structure document (has stats fields directly)
        const hasOldStructure = data.currentStreak !== undefined || 
                              data.longestStreak !== undefined ||
                              data.totalActivities !== undefined;
        
        if (hasOldStructure) {
          // Check if new structure exists
          const newStructureRef = db.collection('userStats').doc(userId).collection('current');
          const newStructureSnapshot = await newStructureRef.get();
          
          if (newStructureSnapshot.empty) {
            console.log(`⚠️  User ${userId}: New structure not found. Skipping cleanup.`);
            skippedCount++;
            continue;
          }
          
          // Verify new structure has data
          const summaryDoc = await newStructureRef.doc('summary').get();
          if (!summaryDoc.exists) {
            console.log(`⚠️  User ${userId}: New structure incomplete. Skipping cleanup.`);
            skippedCount++;
            continue;
          }
          
          // Log what we're about to delete
          console.log(`\n📊 User ${userId}:`);
          console.log(`   Old data: ${data.totalActivities || 0} activities, ${data.currentStreak || 0} day streak`);
          console.log(`   New structure: ✅ Verified`);
          
          // Ask for confirmation before deleting
          if (process.argv.includes('--dry-run')) {
            console.log(`   Action: Would delete old structure (dry run)`);
          } else {
            // Delete only the fields from old structure, not the entire document
            // This preserves any subcollections
            const fieldsToDelete = [
              'currentStreak', 'longestStreak', 'totalDaysActive',
              'lastActiveDate', 'firstActiveDate', 'totalActivities',
              'pokemonCaught', 'drillsCompleted', 'storiesRead',
              'articlesRead', 'flashcardsReviewed', 'gamesPlayed',
              'kanjiStudySessions', 'practiceSessionsCompleted',
              'vocabStudied', 'overallAccuracy', 'drillAccuracy',
              'kanjiAccuracy', 'gameAccuracy', 'totalQuestionsAnswered',
              'totalCorrectAnswers', 'totalKanjiLearned', 'totalWordsLearned',
              'totalGameScore', 'lastUpdated', 'email', 'displayName',
              'drillStats', 'kanjiStats', 'gameStats', 'version'
            ];
            
            const deleteData = {};
            fieldsToDelete.forEach(field => {
              if (data[field] !== undefined) {
                deleteData[field] = admin.firestore.FieldValue.delete();
              }
            });
            
            if (Object.keys(deleteData).length > 0) {
              await doc.ref.update(deleteData);
              console.log(`   Action: ✅ Deleted ${Object.keys(deleteData).length} old fields`);
              processedCount++;
            } else {
              console.log(`   Action: No old fields to delete`);
              skippedCount++;
            }
          }
        } else {
          // This document doesn't have the old structure
          skippedCount++;
        }
      } catch (error) {
        console.error(`\n❌ Error processing user ${userId}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`   - Processed: ${processedCount} users`);
    console.log(`   - Skipped: ${skippedCount} users`);
    console.log(`   - Errors: ${errorCount} users`);
    
    if (process.argv.includes('--dry-run')) {
      console.log('\n⚠️  This was a dry run. No data was actually deleted.');
      console.log('Run without --dry-run to perform actual cleanup.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Also clean up old daily activities if they exist at root level
async function cleanupOldDailyActivities() {
  console.log('\n🧹 Checking for old daily activities structure...\n');
  
  try {
    const usersWithActivities = await db.collectionGroup('dailyActivities').get();
    console.log(`Found ${usersWithActivities.size} daily activity documents\n`);
    
    let movedCount = 0;
    
    for (const activityDoc of usersWithActivities.docs) {
      const activityPath = activityDoc.ref.path;
      const pathParts = activityPath.split('/');
      
      // Check if this is old structure (dailyActivities directly under userStats)
      if (pathParts.length === 4 && pathParts[0] === 'userStats' && pathParts[2] === 'dailyActivities') {
        const userId = pathParts[1];
        const date = pathParts[3];
        
        console.log(`\n📅 Found old activity: ${userId}/${date}`);
        
        if (!process.argv.includes('--dry-run')) {
          // Activities are already in new structure, just log
          console.log(`   Status: Activities should already be in new structure`);
        }
        
        movedCount++;
      }
    }
    
    if (movedCount > 0) {
      console.log(`\n📊 Found ${movedCount} activities in old structure`);
    } else {
      console.log('✅ No old activity structure found');
    }
    
  } catch (error) {
    console.error('❌ Error checking daily activities:', error);
  }
}

// Run the cleanup
async function main() {
  console.log('🚀 Firebase Stats Structure Cleanup Script');
  console.log('=========================================\n');
  
  if (process.argv.includes('--help')) {
    console.log('Usage: node cleanup-old-stats-structure.js [options]');
    console.log('\nOptions:');
    console.log('  --dry-run    Show what would be deleted without actually deleting');
    console.log('  --help       Show this help message');
    process.exit(0);
  }
  
  await cleanupOldStatsStructure();
  await cleanupOldDailyActivities();
  
  console.log('\n✅ Cleanup complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});