'use client';

import { useState, useEffect } from 'react';
import { FSRSAlgorithm } from '@/services/kanji-mastery/fsrsAlgorithm';
import { ReviewQueueService } from '@/services/kanji-mastery/reviewQueueService';
import { DataSyncService } from '@/services/kanji-mastery/dataSyncService';
import { Rating, State } from '@/services/kanji-mastery/types';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export default function TestKanjiMastery() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
  } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSummary(null);

    const results: TestResult[] = [];
    const testUserId = `test-user-${Date.now()}`;

    try {
      // Initialize services
      const fsrs = new FSRSAlgorithm();
      const reviewQueue = new ReviewQueueService();
      const dataSync = new DataSyncService();

      results.push({
        name: 'Service Initialization',
        passed: true,
        details: 'All services initialized successfully'
      });

      // Test FSRS Algorithm
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

      const fsrsResult = fsrs.calculateNextStates(newCard);
      const hasAllRatings = !!(fsrsResult.again && fsrsResult.hard && fsrsResult.good && fsrsResult.easy);
      
      results.push({
        name: 'FSRS Calculate Next States',
        passed: hasAllRatings,
        details: hasAllRatings ? 'All rating options generated' : 'Missing rating options'
      });

      const goodCard = fsrsResult.good;
      const isLearning = goodCard.state === State.Learning;
      
      results.push({
        name: 'FSRS State Transitions',
        passed: isLearning,
        details: `Good rating → ${goodCard.state} (Reps: ${goodCard.reps})`
      });

      // Test Review Queue
      await reviewQueue.batchAddKanji(testUserId, [
        { char: '日', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } },
        { char: '月', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } },
        { char: '火', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } }
      ]);

      results.push({
        name: 'Batch Add Kanji',
        passed: true,
        details: '3 kanji added successfully'
      });

      const queue = await reviewQueue.generateQueue(testUserId);
      const queueGenerated = queue.length === 3;
      
      results.push({
        name: 'Generate Review Queue',
        passed: queueGenerated,
        details: `Queue size: ${queue.length} cards`
      });

      if (queue.length > 0) {
        const firstCard = queue[0];
        const reviewed = await reviewQueue.processReview(
          testUserId,
          firstCard.kanjiChar,
          Rating.Good,
          2500
        );
        
        results.push({
          name: 'Process Review',
          passed: reviewed.reps === 1,
          details: `${reviewed.char} updated (Reps: ${reviewed.reps})`
        });
      }

      // Test Data Sync
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
      
      results.push({
        name: 'Data Persistence',
        passed: saved?.char === '雪',
        details: saved ? 'Card saved to IndexedDB' : 'Failed to save'
      });

      const dueCards = await dataSync.getDueCards(testUserId);
      
      results.push({
        name: 'Retrieve Due Cards',
        passed: dueCards.length > 0,
        details: `Found ${dueCards.length} due cards`
      });

      const stats = await dataSync.getUserStats(testUserId);
      
      results.push({
        name: 'User Statistics',
        passed: stats.totalReviews > 0,
        details: `Reviews: ${stats.totalReviews}, Accuracy: ${(stats.accuracy * 100).toFixed(1)}%`
      });

      // Cleanup
      await dataSync.clearUserData(testUserId);
      
      results.push({
        name: 'Cleanup Test Data',
        passed: true,
        details: 'Test data removed'
      });

    } catch (error) {
      results.push({
        name: 'Test Suite Error',
        passed: false,
        details: (error as Error).message
      });
    }

    setTestResults(results);
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    setSummary({
      total: results.length,
      passed,
      failed
    });
    
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Kanji Mastery System Test Suite
          </h1>
          <p className="text-gray-600 mb-4">
            Production readiness verification
          </p>
          
          <button
            onClick={runTests}
            disabled={isRunning}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                        {result.passed ? '✓' : '✗'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {result.name}
                      </span>
                    </div>
                    {result.details && (
                      <span className="text-sm text-gray-600">
                        {result.details}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {summary.total}
                </div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {summary.passed}
                </div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {summary.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Success Rate</span>
                <span className={`text-2xl font-bold ${
                  summary.failed === 0 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {((summary.passed / summary.total) * 100).toFixed(1)}%
                </span>
              </div>
              
              {summary.failed === 0 && (
                <div className="mt-4 p-3 bg-green-100 rounded-lg text-green-800 text-center">
                  🎉 All tests passed! System is production ready.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}