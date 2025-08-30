#!/usr/bin/env node

/**
 * Delete the fake data we created earlier
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_ID = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteFakeData() {
  console.log('🗑️ Deleting fake data for user:', USER_ID);
  
  try {
    // Delete from textbookVocabularyProgress
    console.log('\n📚 Deleting fake textbook vocabulary items...');
    const vocabSnapshot = await db
      .collection('users')
      .doc(USER_ID)
      .collection('textbookVocabularyProgress')
      .get();
    
    console.log(`Found ${vocabSnapshot.size} items to delete`);
    
    // Delete in batches
    const batch = db.batch();
    let deleted = 0;
    
    vocabSnapshot.forEach(doc => {
      // Delete items with fake IDs (item_1, item_2, etc)
      if (doc.id.startsWith('item_') || doc.id.match(/^genki1_l\d+_w\d+$/)) {
        batch.delete(doc.ref);
        deleted++;
      }
    });
    
    await batch.commit();
    console.log(`✅ Deleted ${deleted} fake vocabulary items`);
    
    // Delete from kanjiProgress
    console.log('\n🈷️ Deleting fake kanji items...');
    const kanjiSnapshot = await db
      .collection('users')
      .doc(USER_ID)
      .collection('kanjiProgress')
      .get();
    
    console.log(`Found ${kanjiSnapshot.size} items to delete`);
    
    const kanjiBatch = db.batch();
    let kanjiDeleted = 0;
    
    kanjiSnapshot.forEach(doc => {
      // Delete items with fake IDs
      if (doc.id.startsWith('item_')) {
        kanjiBatch.delete(doc.ref);
        kanjiDeleted++;
      }
    });
    
    await kanjiBatch.commit();
    console.log(`✅ Deleted ${kanjiDeleted} fake kanji items`);
    
    // Delete from reviewHub if any
    console.log('\n📋 Checking reviewHub collection...');
    const reviewSnapshot = await db
      .collection('users')
      .doc(USER_ID)
      .collection('reviewHub')
      .get();
    
    if (reviewSnapshot.size > 0) {
      console.log(`Found ${reviewSnapshot.size} items in reviewHub`);
      
      const reviewBatch = db.batch();
      let reviewDeleted = 0;
      
      reviewSnapshot.forEach(doc => {
        if (doc.id.startsWith('item_')) {
          reviewBatch.delete(doc.ref);
          reviewDeleted++;
        }
      });
      
      await reviewBatch.commit();
      console.log(`✅ Deleted ${reviewDeleted} items from reviewHub`);
    }
    
    console.log('\n🎉 Cleanup complete! Ready for real data import.');
    
  } catch (error) {
    console.error('❌ Error deleting fake data:', error);
  }
  
  process.exit(0);
}

// Run it
deleteFakeData();