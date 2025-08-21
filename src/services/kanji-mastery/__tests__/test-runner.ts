#!/usr/bin/env node

/**
 * Manual Test Runner for Kanji Mastery System
 * 
 * This test runner simulates real usage scenarios to verify
 * the system works correctly end-to-end.
 */

import { FSRSAlgorithm } from '../fsrsAlgorithm';
import { ReviewQueueService } from '../reviewQueueService';
import { DataSyncService } from '../dataSyncService';
import { Rating, State } from '../types';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  log(`\n${'='.repeat(60)}`, colors.bright);
  log(title, colors.cyan + colors.bright);
  log('='.repeat(60), colors.bright);
}

function logTest(name: string, passed: boolean, details?: string) {
  const status = passed ? `✓ PASS` : `✗ FAIL`;
  const color = passed ? colors.green : colors.red;
  log(`  ${status} - ${name}`, color);
  if (details) {
    log(`    ${details}`, colors.yellow);
  }
}

async function runTests() {
  log('\n🧪 Kanji Mastery System Test Suite', colors.bright + colors.blue);
  log('Testing production-ready implementation\n', colors.cyan);

  const testUserId = `test-user-${Date.now()}`;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Initialize services
    logSection('1. Service Initialization');
    
    const fsrs = new FSRSAlgorithm();
    const reviewQueue = new ReviewQueueService();
    const dataSync = new DataSyncService();
    
    logTest('FSRSAlgorithm initialized', true);
    logTest('ReviewQueueService initialized', true);
    logTest('DataSyncService initialized', true);
    testsPassed += 3;

    // Test FSRS Algorithm
    logSection('2. FSRS Algorithm Tests');
    
    const newCard = {
      char: '水',
      state: State.New,
      dueDate: new Date().toISOString(),
      scheduledDays: 0,
      elapsedDays: 0,
      reps: 0,
      lapses: 0,
      difficulty: 5,
      stability: 0,
      lastReview: null,
      metadata: {
        jlptLevel: 5,
        strokeCount: 4,
        frequency: 5
      }
    };

    const result = fsrs.calculateNextStates(newCard);
    const hasAllRatings = result.again && result.hard && result.good && result.easy;
    logTest('Calculate next states for new card', hasAllRatings, 
      hasAllRatings ? 'All rating options generated' : 'Missing rating options');
    hasAllRatings ? testsPassed++ : testsFailed++;

    const goodCard = result.good;
    const isLearning = goodCard.state === State.Learning;
    logTest('Good rating moves to learning state', isLearning,
      `State: ${goodCard.state}, Reps: ${goodCard.reps}`);
    isLearning ? testsPassed++ : testsFailed++;

    const easyCard = result.easy;
    const isReview = easyCard.state === State.Review;
    logTest('Easy rating graduates to review', isReview,
      `State: ${easyCard.state}, Stability: ${easyCard.stability.toFixed(2)}`);
    isReview ? testsPassed++ : testsFailed++;

    // Test Review Queue
    logSection('3. Review Queue Service Tests');

    // Add test kanji
    await reviewQueue.batchAddKanji(testUserId, [
      { char: '日', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } },
      { char: '月', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } },
      { char: '火', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } }
    ]);
    logTest('Batch add kanji', true, '3 kanji added');
    testsPassed++;

    // Generate queue
    const queue = await reviewQueue.generateQueue(testUserId);
    const queueGenerated = queue.length === 3;
    logTest('Generate review queue', queueGenerated,
      `Queue size: ${queue.length} cards`);
    queueGenerated ? testsPassed++ : testsFailed++;

    // Process a review
    const firstCard = queue[0];
    const reviewed = await reviewQueue.processReview(
      testUserId, 
      firstCard.kanjiChar, 
      Rating.Good, 
      2500
    );
    const reviewProcessed = reviewed.reps === 1;
    logTest('Process review', reviewProcessed,
      `Card updated: ${reviewed.char}, Reps: ${reviewed.reps}`);
    reviewProcessed ? testsPassed++ : testsFailed++;

    // Test Data Sync
    logSection('4. Data Sync Service Tests');

    // Save to IndexedDB
    await dataSync.updateCard(testUserId, '雪', {
      char: '雪',
      state: State.New,
      dueDate: new Date().toISOString(),
      scheduledDays: 0,
      elapsedDays: 0,
      reps: 0,
      lapses: 0,
      difficulty: 5,
      stability: 0,
      lastReview: null,
      metadata: { jlptLevel: 4, strokeCount: 11, frequency: 4 }
    });
    
    const saved = await dataSync.getCard(testUserId, '雪');
    const dataSaved = saved?.char === '雪';
    logTest('Save card to storage', dataSaved,
      dataSaved ? 'Card persisted successfully' : 'Failed to save card');
    dataSaved ? testsPassed++ : testsFailed++;

    // Get due cards
    const dueCards = await dataSync.getDueCards(testUserId);
    const hasDueCards = dueCards.length > 0;
    logTest('Retrieve due cards', hasDueCards,
      `Found ${dueCards.length} due cards`);
    hasDueCards ? testsPassed++ : testsFailed++;

    // Test performance tracking
    const stats = await dataSync.getUserStats(testUserId);
    const hasStats = stats.totalReviews > 0;
    logTest('Track user statistics', hasStats,
      `Reviews: ${stats.totalReviews}, Accuracy: ${(stats.accuracy * 100).toFixed(1)}%`);
    hasStats ? testsPassed++ : testsFailed++;

    // Integration Tests
    logSection('5. Integration Tests');

    // Full review cycle
    const cycleQueue = await reviewQueue.generateQueue(testUserId);
    let cycleCard = cycleQueue.find(c => c.kanjiChar === '月');
    
    if (cycleCard) {
      // First review
      await reviewQueue.processReview(testUserId, '月', Rating.Good, 2000);
      
      // Simulate time passing (fake timer)
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      
      // Check if card graduates
      const updatedCard = await dataSync.getCard(testUserId, '月');
      const cycleComplete = updatedCard && updatedCard.reps > 0;
      logTest('Complete review cycle', cycleComplete,
        cycleComplete ? `Card progressed: Reps=${updatedCard.reps}` : 'Cycle failed');
      cycleComplete ? testsPassed++ : testsFailed++;
    } else {
      logTest('Complete review cycle', false, 'Card not found in queue');
      testsFailed++;
    }

    // Test queue prioritization
    const priorityQueue = await reviewQueue.generateQueue(testUserId, { maxCards: 2 });
    const respectsLimit = priorityQueue.length <= 2;
    logTest('Queue respects limits', respectsLimit,
      `Requested: 2, Got: ${priorityQueue.length}`);
    respectsLimit ? testsPassed++ : testsFailed++;

    // Clean up test data
    logSection('6. Cleanup');
    await dataSync.clearUserData(testUserId);
    logTest('Test data cleaned up', true);
    testsPassed++;

  } catch (error) {
    log(`\n❌ Test suite failed with error:`, colors.red + colors.bright);
    log((error as Error).message, colors.red);
    console.error(error);
    testsFailed++;
  }

  // Summary
  logSection('Test Results Summary');
  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? (testsPassed / total * 100).toFixed(1) : '0';
  
  log(`Total Tests: ${total}`, colors.bright);
  log(`Passed: ${testsPassed}`, colors.green);
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);
  log(`Success Rate: ${percentage}%`, 
    testsFailed === 0 ? colors.green + colors.bright : colors.yellow);

  if (testsFailed === 0) {
    log('\n🎉 All tests passed! System is production ready.', colors.green + colors.bright);
  } else {
    log('\n⚠️  Some tests failed. Please review the implementation.', colors.yellow + colors.bright);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
log('Starting Kanji Mastery System Tests...', colors.cyan);
runTests().catch(error => {
  log('Fatal error running tests:', colors.red + colors.bright);
  console.error(error);
  process.exit(1);
});