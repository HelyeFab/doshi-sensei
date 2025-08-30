#!/usr/bin/env node

/**
 * Test Review Hub Connectors
 */

// Set up fake Firebase config to avoid initialization errors
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';

console.log('\n📊 Review Hub Connectors Final Test\n' + '='.repeat(50));

try {
  const connectors = require('./src/services/review-store/source-connectors');
  
  const allConnectors = [
    { name: 'getKanjiMasteryItems', display: 'Kanji Mastery' },
    { name: 'getTextbookVocabularyItems', display: 'Textbook Vocabulary' },
    { name: 'getFlashcardItems', display: 'Flashcards' },
    { name: 'getStudyListItems', display: 'Study Lists' },
    { name: 'getDrillPracticeItems', display: 'Drill Practice' },
    { name: 'getKanaStudyItems', display: 'Hiragana/Katakana Study' },
    { name: 'getVocabularyLookupItems', display: 'Vocabulary Lookups' },
    { name: 'getSavedItemsReviewItems', display: 'Saved Items' }
  ];
  
  console.log('\n📚 Available Connectors:');
  console.log('─'.repeat(50));
  
  let available = 0;
  allConnectors.forEach((connector, index) => {
    const exists = typeof connectors[connector.name] === 'function';
    if (exists) available++;
    const icon = exists ? '✅' : '❌';
    const status = exists ? 'Ready' : 'Missing';
    console.log(`  ${index + 1}. ${icon} ${connector.display.padEnd(25)} [${status}]`);
  });
  
  console.log('\n🔄 Aggregator Function:');
  console.log('─'.repeat(50));
  const hasAggregator = typeof connectors.getAllSourceDueItems === 'function';
  console.log(`  ${hasAggregator ? '✅' : '❌'} getAllSourceDueItems       [${hasAggregator ? 'Ready' : 'Missing'}]`);
  
  console.log('\n📝 Summary:');
  console.log('─'.repeat(50));
  console.log(`  Total Connectors: ${allConnectors.length}`);
  console.log(`  Available: ${available}`);
  console.log(`  Missing: ${allConnectors.length - available}`);
  console.log(`  Success Rate: ${((available/allConnectors.length)*100).toFixed(1)}%`);
  
  if (available === allConnectors.length) {
    console.log('\n🎉 All connectors are successfully integrated!');
  } else {
    console.log('\n⚠️  Some connectors are missing');
  }
  
} catch (error) {
  console.error('\n❌ Error loading connectors:', error.message);
}

console.log('\n' + '='.repeat(50));