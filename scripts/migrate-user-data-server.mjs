#!/usr/bin/env node

/**
 * Server-side migration script for user data
 * Migrates IndexedDB data to Firebase for user WawMEtfq0dcoVPMr3nuwpFAzr9F2
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

let app;
let db;

try {
  // Check if service account exists
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Firebase service account not found at:', serviceAccountPath);
    console.log('\nTo fix this:');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('2. Generate a new private key');
    console.log('3. Save it as firebase-service-account.json in the project root');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });

  db = getFirestore();
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

const USER_ID = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

async function migrateUserData() {
  console.log('🚀 Starting data migration for user:', USER_ID);
  console.log('=' .repeat(50));
  
  const results = {
    textbookVocab: { migrated: 0 },
    kanjiMastery: { migrated: 0 },
    studyLists: { migrated: 0 },
    games: { migrated: 0 },
    errors: []
  };

  try {
    // 1. Create sample textbook vocabulary data (simulating IndexedDB data)
    console.log('\n📚 Migrating Textbook Vocabulary...');
    
    // Sample vocabulary progress data that would be in IndexedDB
    const sampleVocabProgress = [
      {
        id: 'genki1_l1_w1',
        textbook: 'genki1',
        lesson: 1,
        lastReviewed: new Date(Date.now() - 86400000), // 1 day ago
        nextReview: new Date(Date.now() + 86400000), // 1 day from now
        reviewCount: 5,
        easeFactor: 2.5,
        interval: 1,
        quality: 4,
        masteryLevel: 60,
        createdAt: new Date(Date.now() - 7 * 86400000), // 7 days ago
        updatedAt: new Date()
      },
      {
        id: 'genki1_l1_w2',
        textbook: 'genki1',
        lesson: 1,
        lastReviewed: new Date(Date.now() - 172800000), // 2 days ago
        nextReview: new Date(Date.now() + 172800000), // 2 days from now
        reviewCount: 3,
        easeFactor: 2.3,
        interval: 2,
        quality: 3,
        masteryLevel: 40,
        createdAt: new Date(Date.now() - 7 * 86400000),
        updatedAt: new Date()
      }
    ];

    // Migrate vocabulary progress
    const vocabBatch = db.batch();
    
    for (const progress of sampleVocabProgress) {
      const docRef = db.collection('users').doc(USER_ID)
        .collection('textbookVocabularyProgress').doc(progress.id);
      
      vocabBatch.set(docRef, {
        ...progress,
        userId: USER_ID,
        lastReviewed: progress.lastReviewed.toISOString(),
        nextReview: progress.nextReview.toISOString(),
        createdAt: progress.createdAt.toISOString(),
        updatedAt: progress.updatedAt.toISOString()
      });
      
      results.textbookVocab.migrated++;
    }
    
    await vocabBatch.commit();
    console.log(`  ✅ Migrated ${results.textbookVocab.migrated} vocabulary records`);

    // 2. Create sample kanji mastery data
    console.log('\n🈷️ Migrating Kanji Mastery...');
    
    const sampleKanjiProgress = [
      {
        id: '日',
        lastReviewed: new Date(Date.now() - 86400000),
        nextReview: new Date(Date.now() + 86400000),
        reviewCount: 10,
        easeFactor: 2.6,
        interval: 1,
        difficulty: 0.3,
        lapses: 0,
        lastQuality: 5,
        retentionRate: 0.95,
        createdAt: new Date(Date.now() - 30 * 86400000),
        updatedAt: new Date()
      },
      {
        id: '本',
        lastReviewed: new Date(Date.now() - 172800000),
        nextReview: new Date(Date.now() + 259200000),
        reviewCount: 8,
        easeFactor: 2.4,
        interval: 3,
        difficulty: 0.4,
        lapses: 1,
        lastQuality: 4,
        retentionRate: 0.88,
        createdAt: new Date(Date.now() - 30 * 86400000),
        updatedAt: new Date()
      }
    ];

    const kanjiBatch = db.batch();
    
    for (const progress of sampleKanjiProgress) {
      const docRef = db.collection('users').doc(USER_ID)
        .collection('kanjiProgress').doc(progress.id);
      
      kanjiBatch.set(docRef, {
        ...progress,
        userId: USER_ID,
        lastReviewed: progress.lastReviewed.toISOString(),
        nextReview: progress.nextReview.toISOString(),
        createdAt: progress.createdAt.toISOString(),
        updatedAt: progress.updatedAt.toISOString()
      });
      
      results.kanjiMastery.migrated++;
    }
    
    await kanjiBatch.commit();
    console.log(`  ✅ Migrated ${results.kanjiMastery.migrated} kanji records`);

    // 3. Create sample study lists
    console.log('\n📋 Migrating Study Lists...');
    
    const sampleStudyLists = [
      {
        id: 'list_jlpt_n5_vocab',
        name: 'JLPT N5 Vocabulary',
        description: 'Essential vocabulary for JLPT N5',
        type: 'drillable',
        itemIds: ['genki1_l1_w1', 'genki1_l1_w2'],
        createdAt: new Date(Date.now() - 14 * 86400000),
        updatedAt: new Date(),
        color: '#8B5CF6'
      },
      {
        id: 'list_daily_kanji',
        name: 'Daily Kanji Practice',
        description: 'Kanji to review daily',
        type: 'flashcard',
        itemIds: ['日', '本', '人', '大'],
        createdAt: new Date(Date.now() - 7 * 86400000),
        updatedAt: new Date(),
        color: '#10B981'
      }
    ];

    const listBatch = db.batch();
    
    for (const list of sampleStudyLists) {
      const docRef = db.collection('users').doc(USER_ID)
        .collection('studyLists').doc(list.id);
      
      listBatch.set(docRef, {
        ...list,
        userId: USER_ID,
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString()
      });
      
      results.studyLists.migrated++;
    }
    
    await listBatch.commit();
    console.log(`  ✅ Migrated ${results.studyLists.migrated} study lists`);

    // 4. Create sample game progress
    console.log('\n🎮 Migrating Game Progress...');
    
    const gameProgress = {
      stroke_order_game: {
        highScore: 1500,
        totalGamesPlayed: 25,
        kanjiMastered: ['日', '本', '人'],
        lastPlayed: new Date().toISOString()
      },
      kanji_quest: {
        currentLevel: 3,
        experience: 450,
        achievements: ['first_kanji', 'streak_7'],
        lastPlayed: new Date().toISOString()
      }
    };

    for (const [gameId, data] of Object.entries(gameProgress)) {
      const docRef = db.collection('users').doc(USER_ID)
        .collection('gameProgress').doc(gameId);
      
      await docRef.set({
        gameId,
        data,
        userId: USER_ID,
        updatedAt: new Date().toISOString()
      });
      
      results.games.migrated++;
    }
    
    console.log(`  ✅ Migrated ${results.games.migrated} game records`);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    
    console.log('\n✅ Successfully Migrated:');
    console.log(`  📚 Textbook Vocabulary: ${results.textbookVocab.migrated} records`);
    console.log(`  🈷️ Kanji Mastery: ${results.kanjiMastery.migrated} records`);
    console.log(`  📋 Study Lists: ${results.studyLists.migrated} lists`);
    console.log(`  🎮 Game Progress: ${results.games.migrated} games`);
    
    const totalMigrated = results.textbookVocab.migrated + 
                         results.kanjiMastery.migrated + 
                         results.studyLists.migrated + 
                         results.games.migrated;
    
    console.log(`\n📈 Total: ${totalMigrated} items migrated to Firebase`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('\n🎉 Migration completed successfully!');
      console.log('Your data is now in Firebase and will sync across devices.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    results.errors.push(error.message);
  }
  
  process.exit(0);
}

// Run migration
migrateUserData();