#!/usr/bin/env node

/**
 * Import REAL data from the exported JSON file
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

async function importRealData() {
  console.log('📥 Importing REAL data for user:', USER_ID);
  
  try {
    // Read the exported data
    const dataPath = '/home/helye/Downloads/doshi-sensei-data-1756550684557.json';
    console.log(`Reading data from: ${dataPath}`);
    
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log(`\n📊 Data Summary:`);
    console.log(`  Review Hub items: ${data.reviewHub?.length || 0}`);
    console.log(`  Textbook Vocab items: ${data.textbookVocab?.length || 0}`);
    console.log(`  localStorage keys: ${Object.keys(data.localStorage || {}).length}`);
    
    // Import Review Hub data
    if (data.reviewHub && data.reviewHub.length > 0) {
      console.log(`\n📚 Importing ${data.reviewHub.length} Review Hub items...`);
      
      const batchSize = 500;
      let imported = 0;
      
      for (let i = 0; i < data.reviewHub.length; i += batchSize) {
        const batch = db.batch();
        const items = data.reviewHub.slice(i, Math.min(i + batchSize, data.reviewHub.length));
        
        for (const item of items) {
          // Determine the correct collection based on sourceType
          let collectionName = 'textbookVocabularyProgress';
          
          // Extract textbook info from the item
          const textbook = item.content?.metadata?.textbook || 'unknown';
          const lesson = item.content?.metadata?.lesson || 1;
          
          // Create a proper document ID
          const docId = item.id || `${textbook}_l${lesson}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const docRef = db
            .collection('users')
            .doc(USER_ID)
            .collection(collectionName)
            .doc(docId);
          
          // Transform the data to match the expected format
          const docData = {
            id: docId,
            userId: USER_ID,
            textbook: textbook.replace('-', ''), // Convert 'genki-1' to 'genki1'
            lesson: lesson,
            
            // Content
            japanese: item.content?.primary || '',
            english: item.content?.secondary || '',
            reading: item.content?.reading || '',
            partOfSpeech: item.content?.metadata?.properties?.partOfSpeech || [],
            
            // Scheduling (FSRS data)
            lastReviewed: item.scheduling?.lastReviewAt || new Date().toISOString(),
            nextReview: item.scheduling?.dueDate || item.scheduling?.nextReviewAt || new Date().toISOString(),
            reviewCount: item.scheduling?.repetitions || 0,
            easeFactor: item.scheduling?.easeFactor || 2.5,
            interval: item.scheduling?.interval || 1,
            lapses: item.scheduling?.lapses || 0,
            state: item.scheduling?.state || 'new',
            
            // Metadata
            sourceType: item.sourceType || 'textbook_vocab',
            sourceId: item.sourceId || docId, // Ensure sourceId is never undefined
            createdAt: item.metadata?.createdAt || new Date().toISOString(),
            updatedAt: item.metadata?.updatedAt || new Date().toISOString()
          };
          
          batch.set(docRef, docData);
          imported++;
        }
        
        await batch.commit();
        console.log(`  Progress: ${imported}/${data.reviewHub.length}`);
      }
      
      console.log(`✅ Imported ${imported} Review Hub items`);
    }
    
    // Import localStorage data if needed
    if (data.localStorage?.review_events_processed) {
      console.log(`\n📝 Importing review events from localStorage...`);
      
      const events = data.localStorage.review_events_processed;
      const docRef = db
        .collection('users')
        .doc(USER_ID)
        .collection('reviewEvents')
        .doc('processed');
      
      await docRef.set({
        events: events,
        userId: USER_ID,
        importedAt: new Date().toISOString()
      });
      
      console.log(`✅ Imported ${events.length} review events`);
    }
    
    console.log('\n🎉 Real data import complete!');
    console.log('Your actual vocabulary data is now in Firebase.');
    
    // Verify the import
    console.log('\n🔍 Verifying import...');
    const snapshot = await db
      .collection('users')
      .doc(USER_ID)
      .collection('textbookVocabularyProgress')
      .limit(5)
      .get();
    
    console.log(`\nSample of imported items:`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  ${doc.id}:`);
      console.log(`    Textbook: ${data.textbook}`);
      console.log(`    Japanese: ${data.japanese}`);
      console.log(`    English: ${data.english}`);
    });
    
  } catch (error) {
    console.error('❌ Error importing real data:', error);
  }
  
  process.exit(0);
}

// Run it
importRealData();