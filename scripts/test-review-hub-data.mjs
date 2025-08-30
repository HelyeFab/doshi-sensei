#!/usr/bin/env node

/**
 * Test if Review Hub can access Firebase data
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

async function testReviewHubData() {
  console.log('🔍 Testing Review Hub data access for user:', USER_ID);
  
  try {
    // Check textbook vocabulary data
    console.log('\n📚 Checking textbook vocabulary data...');
    const vocabRef = db
      .collection('users')
      .doc(USER_ID)
      .collection('textbookVocabularyProgress');
    
    const vocabSnapshot = await vocabRef.limit(10).get();
    console.log(`Found ${vocabSnapshot.size} vocabulary items in Firebase`);
    
    if (vocabSnapshot.size > 0) {
      console.log('\nSample items:');
      vocabSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.japanese} (${data.english})`);
        console.log(`    Next review: ${data.nextReview}`);
        console.log(`    Source: ${data.sourceType}`);
      });
    }
    
    // Check items due for review
    console.log('\n⏰ Checking items due for review...');
    const now = new Date().toISOString();
    const dueQuery = vocabRef.where('nextReview', '<=', now).limit(10);
    const dueSnapshot = await dueQuery.get();
    
    console.log(`Found ${dueSnapshot.size} items due for review`);
    
    if (dueSnapshot.size > 0) {
      console.log('\nDue items:');
      dueSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.japanese} (${data.english})`);
      });
    }
    
    console.log('\n✅ Data is accessible from Firebase!');
    console.log('The Review Hub should be able to display this data.');
    
  } catch (error) {
    console.error('❌ Error accessing Firebase data:', error);
  }
  
  process.exit(0);
}

// Run it
testReviewHubData();