#!/usr/bin/env node

/**
 * Script to check Textbook Vocabulary items from IndexedDB
 * These are stored locally, not in Firebase!
 */

const { TextbookVocabularyService } = require('../src/services/textbook-vocabulary/textbook-vocabulary-service.ts');

async function checkTextbookVocab() {
  console.log('================================================');
  console.log('Checking Textbook Vocabulary Items');
  console.log('Current time:', new Date().toISOString());
  console.log('================================================\n');

  const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';
  
  try {
    // Initialize the service
    const service = new TextbookVocabularyService(userId);
    await service.init();
    
    // Get all review states
    console.log('📚 Getting review states from IndexedDB...\n');
    
    const allStates = await service.getAllReviewStates();
    console.log(`Total items with review data: ${Object.keys(allStates).length}`);
    
    // Get due items
    const dueItems = await service.getDueItems({ limit: 200 });
    console.log(`\n⏰ Due items: ${dueItems.length}\n`);
    
    if (dueItems.length > 0) {
      console.log('First 10 due items:');
      console.log('----------------------------------------');
      dueItems.slice(0, 10).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.japanese} (${item.reading})`);
        console.log(`   Meaning: ${item.meaning}`);
        console.log(`   Source: ${item.textbook} - Lesson ${item.lesson}`);
        console.log(`   Due Date: ${item.dueDate}`);
        if (item.difficulty) {
          console.log(`   Difficulty: ${item.difficulty}`);
        }
      });
      
      if (dueItems.length > 10) {
        console.log(`\n... and ${dueItems.length - 10} more items`);
      }
    }
    
    // Check statistics
    console.log('\n📊 Statistics:');
    console.log('----------------------------------------');
    const stats = await service.getStatistics();
    console.log('Total cards:', stats.totalCards);
    console.log('New cards:', stats.newCards);
    console.log('Learning cards:', stats.learningCards);
    console.log('Review cards:', stats.reviewCards);
    console.log('Due today:', stats.dueToday);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nNote: This script needs to run in a browser environment to access IndexedDB.');
    console.log('The textbook vocabulary data is stored locally in the browser, not on the server.');
  }
}

// Check if we're in Node.js
if (typeof window === 'undefined') {
  console.log('================================================');
  console.log('⚠️  IMPORTANT: Textbook Vocabulary Issue Found!');
  console.log('================================================\n');
  console.log('The Textbook Vocabulary items are stored in IndexedDB (browser storage),');
  console.log('not in Firebase. This means:');
  console.log('\n1. The data is LOCAL to each browser/device');
  console.log('2. It cannot be accessed via server-side scripts');
  console.log('3. The Review Hub is correctly showing these items in the UI');
  console.log('\nTo properly check this data, we need to:');
  console.log('1. Run the check in the browser console');
  console.log('2. Or implement a Firebase sync for these items');
  console.log('\n----------------------------------------');
  console.log('Here\'s what you can run in your browser console:\n');
  
  console.log(`
// Paste this in your browser console on the Review Hub page:

(async () => {
  const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';
  const dbName = \`textbook_vocabulary_\${userId}\`;
  
  const request = indexedDB.open(dbName);
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['reviewStates'], 'readonly');
    const store = transaction.objectStore('reviewStates');
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const states = getAllRequest.result;
      const now = Date.now();
      const dueItems = states.filter(state => {
        const scheduledTime = state.scheduled_days * 24 * 60 * 60 * 1000;
        const nextReview = state.last_review + scheduledTime;
        return nextReview <= now;
      });
      
      console.log('Total items with review data:', states.length);
      console.log('Due items:', dueItems.length);
      console.log('First 5 due items:', dueItems.slice(0, 5));
    };
  };
})();
  `);
} else {
  // If somehow running in browser environment
  checkTextbookVocab();
}