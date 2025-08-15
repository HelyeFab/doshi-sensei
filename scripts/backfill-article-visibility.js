#!/usr/bin/env node

/**
 * Script to backfill visibility flag for existing articles in Firestore
 * This sets visible=true for all articles that don't have the field yet
 * Run with: node scripts/backfill-article-visibility.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillVisibility() {
  console.log('🚀 Starting visibility backfill for existing articles...');
  
  try {
    // Get all articles
    const articlesRef = db.collection('articles');
    const snapshot = await articlesRef.get();
    
    if (snapshot.empty) {
      console.log('No articles found in database');
      return;
    }
    
    console.log(`Found ${snapshot.size} articles to process`);
    
    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let processed = 0;
    let updated = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = snapshot.docs.slice(i, Math.min(i + batchSize, snapshot.docs.length));
      let batchUpdates = 0;
      
      for (const doc of batchDocs) {
        const data = doc.data();
        
        // Only update if visible field doesn't exist
        if (data.visible === undefined) {
          batch.update(doc.ref, {
            visible: true, // Set all existing articles as visible by default
            validationStatus: 'legacy', // Mark as legacy content
            lastValidated: admin.firestore.FieldValue.serverTimestamp()
          });
          batchUpdates++;
        }
        processed++;
      }
      
      if (batchUpdates > 0) {
        await batch.commit();
        updated += batchUpdates;
        console.log(`✅ Updated ${batchUpdates} articles in batch ${Math.floor(i / batchSize) + 1}`);
      } else {
        console.log(`⏭️  Skipped batch ${Math.floor(i / batchSize) + 1} (all articles already have visibility)`);
      }
    }
    
    console.log(`\n✨ Backfill complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total articles processed: ${processed}`);
    console.log(`   - Articles updated: ${updated}`);
    console.log(`   - Articles already had visibility: ${processed - updated}`);
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the backfill
backfillVisibility();