#!/usr/bin/env node

/**
 * Fix textbook data - updates the textbook field to have the actual textbook name
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

/**
 * Parse textbook info from ID
 * IDs are typically like: genki1_l1_1, minna1_l5_3, etc.
 */
function parseTextbookFromId(id) {
  // Common textbook patterns
  const patterns = {
    'genki1': /genki1?_l?\d+/i,
    'genki2': /genki2_l?\d+/i,
    'minna1': /minna1?_l?\d+/i,
    'minna2': /minna2_l?\d+/i,
    'tobira': /tobira_l?\d+/i,
    'quartet1': /quartet1?_l?\d+/i,
    'quartet2': /quartet2_l?\d+/i,
  };
  
  // Try to match against patterns
  for (const [textbook, pattern] of Object.entries(patterns)) {
    if (pattern.test(id)) {
      return textbook;
    }
  }
  
  // Try to extract from the beginning of the ID
  const match = id.match(/^([a-zA-Z]+\d?)_/);
  if (match) {
    return match[1].toLowerCase();
  }
  
  // Default fallback
  return 'unknown';
}

/**
 * Extract lesson number from ID
 */
function parseLessonFromId(id) {
  const match = id.match(/_l?(\d+)_/);
  return match ? parseInt(match[1]) : 1;
}

async function fixTextbookData() {
  console.log('🔧 Fixing textbook data for user:', USER_ID);
  
  try {
    // Get all textbook vocabulary items
    const snapshot = await db
      .collection('users')
      .doc(USER_ID)
      .collection('textbookVocabularyProgress')
      .get();
    
    console.log(`📚 Found ${snapshot.size} items to update`);
    
    if (snapshot.empty) {
      console.log('No items found to update');
      return;
    }
    
    // Update each document
    const batch = db.batch();
    let updated = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      
      // Parse textbook and lesson from the ID
      const textbook = parseTextbookFromId(id);
      const lesson = parseLessonFromId(id);
      
      // Update the document
      const docRef = db
        .collection('users')
        .doc(USER_ID)
        .collection('textbookVocabularyProgress')
        .doc(id);
      
      batch.update(docRef, {
        textbook: textbook,
        lesson: lesson,
        // Also ensure these fields are properly formatted
        id: id,
        cardId: id, // Some systems use cardId instead of id
        sourceType: 'TEXTBOOK_VOCAB',
        // Keep original data but update these specific fields
        updatedAt: new Date().toISOString()
      });
      
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`  Processing: ${updated}/${snapshot.size}`);
      }
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Updated ${updated} documents with correct textbook information`);
    
    // Show sample of updated data
    console.log('\n📋 Sample of updated items:');
    const sampleSnapshot = await db
      .collection('users')
      .doc(USER_ID)
      .collection('textbookVocabularyProgress')
      .limit(5)
      .get();
    
    sampleSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  ${doc.id}: textbook="${data.textbook}", lesson=${data.lesson}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to fix textbook data:', error);
  }
  
  process.exit(0);
}

// Run it
fixTextbookData();