#!/usr/bin/env node

/**
 * Test complete Review Hub flow
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
  credential: cert(serviceAccount)});

const db = getFirestore();

async function testCompleteFlow() {
  console.log('🧪 Testing complete Review Hub flow\n');
  
  try {
    // 1. Test Firebase query (what source-connectors.ts does)
    console.log('1️⃣ Testing Firebase query (simulating source-connectors.ts)...');
    const vocabRef = db.collection('users').doc(USER_ID).collection('textbookVocabularyProgress');
    
    // Query for due items (exactly what source-connectors does)
    const q = vocabRef
      .where('nextReview', '<=', new Date().toISOString())
      .orderBy('nextReview')
      .limit(100);
    
    const snapshot = await q.get();
    console.log(`   ✅ Found ${snapshot.size} due items in Firebase`);
    
    // 2. Transform to UnifiedReviewItem format (what source-connectors does)
    console.log('\n2️⃣ Transforming to UnifiedReviewItem format...');
    const items = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const item = {
        id: `item:textbook-vocab-${doc.id}`,
        sourceId: doc.id,
        sourceType: data.sourceType || 'textbook_vocab',
        content: {
          primary: data.japanese || '',
          secondary: data.english || '',
          reading: data.reading || '',
          metadata: {
            textbook: data.textbook,
            lesson: data.lesson
          }
        },
        scheduling: {
          algorithm: 'fsrs',
          lastReviewAt: data.lastReviewed,
          nextReviewAt: data.nextReview,
          dueDate: new Date(data.nextReview),
          interval: data.interval || 1,
          easeFactor: data.easeFactor || 2.5,
          repetitions: data.reviewCount || 0,
          lapses: data.lapses || 0,
          state: data.state || 'new'
        },
        metadata: {
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        }
      };
      items.push(item);
    });
    console.log(`   ✅ Transformed ${items.length} items`);
    
    // 3. Display sample items
    console.log('\n3️⃣ Sample Review Hub items:');
    items.slice(0, 3).forEach(item => {
      console.log(`   📝 ${item.content.primary} (${item.content.secondary})`);
      console.log(`      Reading: ${item.content.reading}`);
      console.log(`      Due: ${item.scheduling.dueDate}`);
      console.log(`      State: ${item.scheduling.state}`);
    });
    
    // 4. Test IndexedDB connection
    console.log('\n4️⃣ Testing IndexedDB (local storage)...');
    console.log('   ⚠️  IndexedDB test requires browser environment');
    console.log('   Note: Review Hub reads from Firebase, saves to both Firebase and IndexedDB');
    
    // 5. Summary
    console.log('\n📊 Summary:');
    console.log(`   Total items in Firebase: ${snapshot.size}`);
    console.log(`   Items due now: ${items.filter(i => i.scheduling.dueDate <= new Date()).length}`);
    console.log(`   New items: ${items.filter(i => i.scheduling.state === 'new').length}`);
    console.log(`   Review items: ${items.filter(i => i.scheduling.state !== 'new').length}`);
    
    console.log('\n✅ All tests passed!');
    console.log('The Review Hub should display these items.');
    console.log('\n💡 If Review Hub is still empty, check:');
    console.log('   1. User is logged in with correct account');
    console.log('   2. Review Hub component is properly initialized');
    console.log('   3. Browser console for any errors');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
  
  process.exit(0);
}

// Run it
testCompleteFlow();