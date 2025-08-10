#!/usr/bin/env node

/**
 * Migration script to upgrade user stats from v2.0 to v2.1
 * 
 * This script:
 * 1. Adds new fields for uniqueness tracking
 * 2. Migrates existing learned counts to sets
 * 3. Adds activity-specific accuracy tracking
 * 4. Updates version to 2.1
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function migrateUserStats() {
  console.log('🚀 Starting stats migration from v2.0 to v2.1...');
  
  try {
    // Get all user stats documents
    const statsSnapshot = await db.collection('userStats').get();
    console.log(`📊 Found ${statsSnapshot.size} user stats to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process each user's stats
    for (const doc of statsSnapshot.docs) {
      const userId = doc.id;
      const stats = doc.data();
      
      try {
        // Skip if already migrated
        if (stats.version === '2.1') {
          console.log(`⏭️  Skipping ${userId} - already migrated to v2.1`);
          skippedCount++;
          continue;
        }
        
        console.log(`📝 Migrating stats for user ${userId}...`);
        
        // Initialize new fields with default values
        const updates = {
          version: '2.1',
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          
          // Initialize empty sets for uniqueness tracking
          learnedKanjiSet: stats.learnedKanjiSet || [],
          learnedWordsSet: stats.learnedWordsSet || [],
          caughtPokemonSet: stats.caughtPokemonSet || [],
          
          // Initialize activity-specific stats
          drillStats: stats.drillStats || {
            totalQuestions: 0,
            totalCorrect: 0
          },
          kanjiStats: stats.kanjiStats || {
            totalQuestions: 0,
            totalCorrect: 0
          },
          gameStats: stats.gameStats || {
            totalQuestions: 0,
            totalCorrect: 0
          }
        };
        
        // Ensure activity-specific accuracy fields exist
        if (stats.drillAccuracy === undefined) updates.drillAccuracy = 0;
        if (stats.kanjiAccuracy === undefined) updates.kanjiAccuracy = 0;
        if (stats.gameAccuracy === undefined) updates.gameAccuracy = 0;
        
        // Attempt to extract unique items from daily activities
        if (stats.totalKanjiLearned > 0 || stats.totalWordsLearned > 0) {
          console.log(`  🔍 Analyzing daily activities to extract unique items...`);
          
          const dailyActivitiesSnapshot = await db
            .collection('userStats')
            .doc(userId)
            .collection('dailyActivities')
            .orderBy('date', 'desc')
            .limit(365) // Last year of activities
            .get();
          
          const uniqueKanji = new Set();
          const uniqueWords = new Set();
          const uniquePokemon = new Set();
          
          let drillQuestions = 0, drillCorrect = 0;
          let kanjiQuestions = 0, kanjiCorrect = 0;
          let gameQuestions = 0, gameCorrect = 0;
          
          // Process each day's activities
          for (const dayDoc of dailyActivitiesSnapshot.docs) {
            const dailyData = dayDoc.data();
            if (dailyData.activities) {
              for (const activity of dailyData.activities) {
                // Extract unique items
                if (activity.type === 'kanji' && activity.details?.itemId) {
                  uniqueKanji.add(activity.details.itemId);
                }
                if (activity.type === 'vocab' && activity.details?.itemId) {
                  uniqueWords.add(activity.details.itemId);
                }
                if (activity.type === 'game' && activity.details?.gameType === 'pokemon' && activity.details?.itemId) {
                  uniquePokemon.add(activity.details.itemId);
                }
                
                // Aggregate activity-specific accuracy data
                if (activity.details?.correct !== undefined && activity.details?.total !== undefined) {
                  switch (activity.type) {
                    case 'drill':
                      drillQuestions += activity.details.total;
                      drillCorrect += activity.details.correct;
                      break;
                    case 'kanji':
                      kanjiQuestions += activity.details.total;
                      kanjiCorrect += activity.details.correct;
                      break;
                    case 'game':
                      gameQuestions += activity.details.total;
                      gameCorrect += activity.details.correct;
                      break;
                  }
                }
              }
            }
          }
          
          // Update sets with extracted unique items
          updates.learnedKanjiSet = Array.from(uniqueKanji);
          updates.learnedWordsSet = Array.from(uniqueWords);
          updates.caughtPokemonSet = Array.from(uniquePokemon);
          
          // Update totals to match set lengths
          updates.totalKanjiLearned = updates.learnedKanjiSet.length;
          updates.totalWordsLearned = updates.learnedWordsSet.length;
          updates.pokemonCaught = updates.caughtPokemonSet.length;
          
          // Update activity-specific stats
          updates.drillStats = { totalQuestions: drillQuestions, totalCorrect: drillCorrect };
          updates.kanjiStats = { totalQuestions: kanjiQuestions, totalCorrect: kanjiCorrect };
          updates.gameStats = { totalQuestions: gameQuestions, totalCorrect: gameCorrect };
          
          // Calculate activity-specific accuracies
          if (drillQuestions > 0) {
            updates.drillAccuracy = Math.round((drillCorrect / drillQuestions) * 100);
          }
          if (kanjiQuestions > 0) {
            updates.kanjiAccuracy = Math.round((kanjiCorrect / kanjiQuestions) * 100);
          }
          if (gameQuestions > 0) {
            updates.gameAccuracy = Math.round((gameCorrect / gameQuestions) * 100);
          }
          
          console.log(`  ✅ Extracted ${updates.learnedKanjiSet.length} unique kanji`);
          console.log(`  ✅ Extracted ${updates.learnedWordsSet.length} unique words`);
          console.log(`  ✅ Extracted ${updates.caughtPokemonSet.length} unique Pokemon`);
          console.log(`  ✅ Calculated activity-specific accuracies`);
        }
        
        // Apply updates
        await db.collection('userStats').doc(userId).update(updates);
        console.log(`✅ Successfully migrated user ${userId}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${userId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total: ${statsSnapshot.size}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please check the logs above.');
    }
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run migration
migrateUserStats();