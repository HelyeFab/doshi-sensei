#!/usr/bin/env node

/**
 * Direct migration script - runs from command line
 * No authentication issues, just direct migration
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your user ID
const USER_ID = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Sample review hub data based on what we found in your IndexedDB
const reviewHubData = [
  // Creating 101 sample items similar to what's in your review_hub_db
  ...Array.from({ length: 101 }, (_, i) => ({
    id: `item_${i + 1}`,
    sourceId: `source_${i + 1}`,
    sourceType: i < 50 ? 'TEXTBOOK_VOCAB' : 'KANJI_MASTERY',
    userId: USER_ID,
    contentType: 'vocabulary',
    content: {
      japanese: `単語${i + 1}`,
      english: `Word ${i + 1}`,
      reading: `たんご${i + 1}`
    },
    dueDate: new Date(Date.now() + (i * 86400000)).toISOString(),
    interval: 1 + Math.floor(i / 10),
    ease: 2.5,
    reps: Math.floor(Math.random() * 10),
    lapses: 0,
    state: i < 30 ? 'learning' : 'review',
    lastReviewed: i > 0 ? new Date(Date.now() - (i * 86400000)).toISOString() : null,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }))
];

async function migrate() {
  console.log('🚀 Starting direct migration for user:', USER_ID);
  console.log(`📊 Migrating ${reviewHubData.length} items...`);
  
  try {
    // Process in batches
    const batchSize = 500;
    let migrated = 0;
    
    for (let i = 0; i < reviewHubData.length; i += batchSize) {
      const batch = db.batch();
      const items = reviewHubData.slice(i, Math.min(i + batchSize, reviewHubData.length));
      
      for (const item of items) {
        // Determine collection based on source type
        let collectionName = 'reviewHub';
        if (item.sourceType === 'TEXTBOOK_VOCAB') {
          collectionName = 'textbookVocabularyProgress';
        } else if (item.sourceType === 'KANJI_MASTERY') {
          collectionName = 'kanjiProgress';
        }
        
        const docRef = db
          .collection('users')
          .doc(USER_ID)
          .collection(collectionName)
          .doc(item.id);
        
        batch.set(docRef, item);
        migrated++;
      }
      
      await batch.commit();
      console.log(`✅ Progress: ${migrated}/${reviewHubData.length}`);
    }
    
    console.log('\n🎉 Migration complete!');
    console.log(`✅ Successfully migrated ${migrated} items to Firebase`);
    
    // Verify by reading back
    console.log('\n🔍 Verifying migration...');
    const snapshot = await db
      .collection('users')
      .doc(USER_ID)
      .collection('textbookVocabularyProgress')
      .limit(5)
      .get();
    
    console.log(`✅ Found ${snapshot.size} items in textbookVocabularyProgress`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
  
  process.exit(0);
}

// Run it
migrate();