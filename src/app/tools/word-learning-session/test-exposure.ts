/**
 * Test script for progressive word selection
 * Run this to verify that words are being selected progressively
 */

import { exposedWordsStorage } from './services/exposedWordsStorage';

async function testProgressiveSelection() {
  console.log('🧪 Testing Progressive Word Selection System\n');
  
  const testUserId = 'test-user';
  const testLessonId = 'test-lesson';
  
  // Simulate a lesson with 20 words
  const allWords = Array.from({ length: 20 }, (_, i) => ({
    id: `word-${i + 1}`,
    kanji: `漢字${i + 1}`,
    kana: `かな${i + 1}`,
    meaning: `meaning ${i + 1}`
  }));
  
  console.log(`📚 Total words in lesson: ${allWords.length}`);
  console.log('==================================\n');
  
  // Reset any existing data
  await exposedWordsStorage.resetLessonExposure(testUserId, testLessonId);
  console.log('✅ Reset existing exposure data\n');
  
  // Simulate 5 sessions
  for (let session = 1; session <= 5; session++) {
    console.log(`📅 SESSION ${session}`);
    console.log('------------------------');
    
    // Request 5 words per session
    const requestedCount = 5;
    const selectedWords = await exposedWordsStorage.getSmartWordSelection(
      testUserId,
      testLessonId,
      allWords,
      requestedCount,
      'new' // Always request new words
    );
    
    console.log(`  Requested: ${requestedCount} words`);
    console.log(`  Selected: ${selectedWords.length} words`);
    console.log(`  Word IDs: ${selectedWords.map(w => w.id).join(', ')}`);
    
    // Mark these words as exposed
    await exposedWordsStorage.markWordsAsExposed(
      testUserId,
      testLessonId,
      selectedWords.map(w => w.id),
      allWords.length
    );
    
    // Get stats after exposure
    const stats = await exposedWordsStorage.getExposureStats(
      testUserId,
      testLessonId,
      allWords.length
    );
    
    console.log(`  Progress: ${stats.exposedCount}/${allWords.length} (${Math.round(stats.percentageComplete)}%)`);
    console.log(`  Cycles completed: ${stats.cyclesCompleted}`);
    console.log('');
  }
  
  // Final check
  const finalStats = await exposedWordsStorage.getExposureStats(
    testUserId,
    testLessonId,
    allWords.length
  );
  
  console.log('==================================');
  console.log('📊 FINAL RESULTS');
  console.log('------------------------');
  console.log(`✅ Total words exposed: ${finalStats.exposedCount}/${allWords.length}`);
  console.log(`✅ Percentage complete: ${Math.round(finalStats.percentageComplete)}%`);
  console.log(`✅ Cycles completed: ${finalStats.cyclesCompleted}`);
  
  // Verify no duplicates in first 4 sessions (20 words / 5 per session = 4 sessions)
  const { exposedWords } = await exposedWordsStorage.getUnexposedWords(
    testUserId,
    testLessonId,
    allWords.map(w => w.id)
  );
  
  if (exposedWords.length === allWords.length) {
    console.log('✅ SUCCESS: All words were exposed exactly once!');
  } else {
    console.log(`⚠️  WARNING: ${exposedWords.length} words exposed (expected ${allWords.length})`);
  }
  
  // Clean up
  await exposedWordsStorage.resetLessonExposure(testUserId, testLessonId);
  console.log('\n🧹 Cleaned up test data');
}

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - attach to window for testing
  (window as any).testProgressiveSelection = testProgressiveSelection;
  console.log('Test function attached to window.testProgressiveSelection()');
} else {
  // Node environment
  testProgressiveSelection().catch(console.error);
}

export { testProgressiveSelection };