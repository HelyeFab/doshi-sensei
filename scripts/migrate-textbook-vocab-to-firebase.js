#!/usr/bin/env node

/**
 * Migration Script: Sync existing IndexedDB textbook vocabulary data to Firebase
 * Run this in the browser console to migrate your existing progress
 */

console.log(`
================================================
TEXTBOOK VOCABULARY FIREBASE MIGRATION
================================================

This script will migrate your local textbook vocabulary
progress to Firebase for cross-device sync.

To run this migration, copy and paste the following code
into your browser console while on the Doshi Sensei app:

`);

const migrationScript = `
// Migration Script - Run in Browser Console
(async () => {
  const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2'; // Your user ID
  
  console.log('🚀 Starting migration...');
  console.log('User ID:', userId);
  
  try {
    // 1. Open IndexedDB
    const dbName = \`textbook_vocabulary_\${userId}\`;
    const request = indexedDB.open(dbName);
    
    request.onerror = () => {
      console.error('❌ Failed to open IndexedDB');
      return;
    };
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      console.log('✅ IndexedDB opened');
      
      // 2. Read all review states
      const transaction = db.transaction(['reviewStates'], 'readonly');
      const store = transaction.objectStore('reviewStates');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = async () => {
        const states = getAllRequest.result;
        console.log(\`📊 Found \${states.length} review states to migrate\`);
        
        if (states.length === 0) {
          console.log('⚠️ No data to migrate');
          return;
        }
        
        // 3. Import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { 
          getFirestore, 
          collection, 
          doc, 
          writeBatch,
          Timestamp 
        } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // 4. Initialize Firebase (config from your app)
        const firebaseConfig = {
          apiKey: "AIzaSyBkEB0C7dp5QfJO5N0cLsLcSQs10YGYuIo",
          authDomain: "doshi-sensei.firebaseapp.com",
          projectId: "doshi-sensei",
          storageBucket: "doshi-sensei.appspot.com",
          messagingSenderId: "195972752231",
          appId: "1:195972752231:web:5e7fc3dc0ae97c088f093f"
        };
        
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        console.log('✅ Firebase initialized');
        
        // 5. Batch write to Firebase
        const collectionPath = \`users/\${userId}/textbookVocabularyProgress\`;
        const batch = writeBatch(db);
        let batchCount = 0;
        const batchSize = 100;
        
        for (const state of states) {
          const docRef = doc(db, collectionPath, state.card_id);
          
          batch.set(docRef, {
            cardId: state.card_id,
            state: state.state,
            due: Timestamp.fromDate(new Date(state.due)),
            stability: state.stability,
            difficulty: state.difficulty,
            elapsedDays: state.elapsed_days,
            scheduledDays: state.scheduled_days,
            reps: state.reps,
            lapses: state.lapses,
            lastReview: Timestamp.fromDate(new Date(state.last_review)),
            updatedAt: Timestamp.now(),
            syncVersion: Date.now()
          });
          
          batchCount++;
          
          // Commit batch every 100 items (Firestore limit is 500)
          if (batchCount >= batchSize) {
            await batch.commit();
            console.log(\`📤 Uploaded \${batchCount} items...\`);
            batchCount = 0;
          }
        }
        
        // Commit remaining items
        if (batchCount > 0) {
          await batch.commit();
          console.log(\`📤 Uploaded final \${batchCount} items\`);
        }
        
        console.log('');
        console.log('================================================');
        console.log('✅ MIGRATION COMPLETE!');
        console.log('================================================');
        console.log(\`Successfully migrated \${states.length} review states to Firebase\`);
        console.log('');
        console.log('Your progress is now synced and will be available on all devices!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Refresh the page to enable real-time sync');
        console.log('2. Sign in on another device to see your progress');
        console.log('');
      };
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('Please report this error for assistance');
  }
})();
`;

console.log(migrationScript);

console.log(`
================================================
IMPORTANT NOTES:
================================================

1. Run this in your BROWSER CONSOLE, not Node.js
2. Make sure you're signed in to the app
3. This will upload your progress to Firebase
4. After migration, your progress will sync automatically

================================================
`);