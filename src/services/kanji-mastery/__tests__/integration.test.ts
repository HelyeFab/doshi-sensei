import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FSRSAlgorithm } from '../fsrsAlgorithm';
import { ReviewQueueService } from '../reviewQueueService';
import { DataSyncService } from '../dataSyncService';
import { Rating, State } from '../types';

// Integration tests for the complete Kanji Mastery System
describe('Kanji Mastery System Integration', () => {
  let fsrs: FSRSAlgorithm;
  let reviewQueue: ReviewQueueService;
  let dataSync: DataSyncService;
  const testUserId = 'test-user-integration';

  beforeEach(async () => {
    // Initialize services
    fsrs = new FSRSAlgorithm();
    dataSync = new DataSyncService();
    
    // Force initialization for testing
    await dataSync.forceInitializeForTest();
    
    reviewQueue = new ReviewQueueService(dataSync);

    // Clear test data
    await dataSync.clearUserData(testUserId);
  });

  afterEach(async () => {
    // Clean up test data
    await dataSync.clearUserData(testUserId);
  });

  describe('Full Review Cycle', () => {
    it('should handle complete learning cycle from new to mature', async () => {
      // Add a new kanji
      await reviewQueue.batchAddKanji(testUserId, [
        { 
          char: '水', 
          data: { 
            jlptLevel: 5, 
            strokeCount: 4, 
            frequency: 5,
            meanings: ['water'],
            readings: { on: ['スイ'], kun: ['みず'] }
          } 
        }
      ]);

      // Generate initial queue
      let queue = await reviewQueue.generateQueue(testUserId);
      expect(queue).toHaveLength(1);
      expect(queue[0].kanjiChar).toBe('水');
      expect(queue[0].state).toBe(State.New);

      // First review - Good rating
      let card = await reviewQueue.processReview(testUserId, '水', Rating.Good, 3000);
      expect(card.state).toBe(State.Learning);
      expect(card.reps).toBe(1);

      // Wait for next review (should be in minutes for learning state)
      const learningInterval = new Date(card.dueDate).getTime() - Date.now();
      expect(learningInterval).toBeLessThan(60 * 60 * 1000); // Less than 1 hour

      // Simulate time passing
      jest.useFakeTimers();
      jest.advanceTimersByTime(learningInterval + 1000);

      // Second review - Good rating
      queue = await reviewQueue.generateQueue(testUserId);
      expect(queue).toHaveLength(1);
      
      card = await reviewQueue.processReview(testUserId, '水', Rating.Good, 2500);
      expect(card.reps).toBe(2);

      // Continue until graduation to review state
      while (card.state === State.Learning) {
        jest.advanceTimersByTime(new Date(card.dueDate).getTime() - Date.now() + 1000);
        queue = await reviewQueue.generateQueue(testUserId);
        if (queue.length > 0) {
          card = await reviewQueue.processReview(testUserId, '水', Rating.Good, 2000);
        }
      }

      expect(card.state).toBe(State.Review);
      expect(card.stability).toBeGreaterThan(1);

      jest.useRealTimers();
    });

    it('should handle lapses and relearning', async () => {
      // Add a kanji that's already in review state
      const reviewCard = {
        char: '火',
        state: State.Review,
        dueDate: new Date().toISOString(),
        scheduledDays: 7,
        elapsedDays: 7,
        reps: 5,
        lapses: 0,
        difficulty: 5,
        stability: 7,
        lastReview: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          jlptLevel: 5,
          strokeCount: 4,
          frequency: 5
        }
      };

      await dataSync.updateCard(testUserId, '火', reviewCard);

      // Generate queue
      let queue = await reviewQueue.generateQueue(testUserId);
      expect(queue).toHaveLength(1);
      expect(queue[0].state).toBe(State.Review);

      // Fail the review
      const card = await reviewQueue.processReview(testUserId, '火', Rating.Again, 5000);
      expect(card.state).toBe(State.Relearning);
      expect(card.lapses).toBe(1);
      expect(card.stability).toBeLessThan(reviewCard.stability);

      // Should have a short interval for relearning
      const relearningInterval = new Date(card.dueDate).getTime() - Date.now();
      expect(relearningInterval).toBeLessThan(24 * 60 * 60 * 1000); // Less than 1 day
    });
  });

  describe('Queue Management', () => {
    it('should prioritize cards correctly', async () => {
      const now = new Date();
      
      // Add multiple kanji with different states
      const cards = [
        {
          char: '一',
          state: State.Review,
          dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days overdue
          scheduledDays: 5,
          elapsedDays: 8,
          reps: 4,
          lapses: 0,
          difficulty: 4,
          stability: 5,
          lastReview: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 1, frequency: 5 }
        },
        {
          char: '二',
          state: State.Learning,
          dueDate: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes overdue
          scheduledDays: 0,
          elapsedDays: 0,
          reps: 1,
          lapses: 0,
          difficulty: 5,
          stability: 0.4,
          lastReview: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 2, frequency: 5 }
        },
        {
          char: '三',
          state: State.Review,
          dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day overdue
          scheduledDays: 3,
          elapsedDays: 4,
          reps: 3,
          lapses: 0,
          difficulty: 5,
          stability: 3,
          lastReview: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 3, frequency: 5 }
        },
        {
          char: '四',
          state: State.New,
          dueDate: now.toISOString(),
          scheduledDays: 0,
          elapsedDays: 0,
          reps: 0,
          lapses: 0,
          difficulty: 5,
          stability: 0,
          lastReview: null,
          metadata: { jlptLevel: 5, strokeCount: 5, frequency: 5 }
        }
      ];

      // Add all cards
      for (const card of cards) {
        await dataSync.updateCard(testUserId, card.char, card);
      }

      // Generate queue
      const queue = await reviewQueue.generateQueue(testUserId);
      
      // Should be ordered by priority: most overdue first
      expect(queue[0].kanjiChar).toBe('一'); // 3 days overdue
      expect(queue[1].kanjiChar).toBe('三'); // 1 day overdue
      expect(queue[2].kanjiChar).toBe('二'); // 30 minutes overdue (learning)
      expect(queue[3].kanjiChar).toBe('四'); // New card
    });

    it('should respect session limits', async () => {
      // Add 30 due cards
      const cards = Array(30).fill(null).map((_, i) => ({
        char: String.fromCharCode(0x4E00 + i),
        state: State.Review,
        dueDate: new Date().toISOString(),
        scheduledDays: 1,
        elapsedDays: 1,
        reps: 2,
        lapses: 0,
        difficulty: 5,
        stability: 1.3,
        lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        metadata: { jlptLevel: 5, strokeCount: 4, frequency: 5 }
      }));

      for (const card of cards) {
        await dataSync.updateCard(testUserId, card.char, card);
      }

      // Generate queue with limit
      const limitedQueue = await reviewQueue.generateQueue(testUserId, { maxCards: 20 });
      expect(limitedQueue).toHaveLength(20);

      // Generate queue without limit
      const unlimitedQueue = await reviewQueue.generateQueue(testUserId, { maxCards: 100 });
      expect(unlimitedQueue).toHaveLength(30);
    });
  });

  describe('Performance Tracking', () => {
    it('should track response times and accuracy', async () => {
      // Add test kanji
      await reviewQueue.batchAddKanji(testUserId, [
        { char: '日', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } },
        { char: '月', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } },
        { char: '火', data: { jlptLevel: 5, strokeCount: 4, frequency: 5 } }
      ]);

      // Process reviews with different response times
      await reviewQueue.processReview(testUserId, '日', Rating.Easy, 1500); // Fast and correct
      await reviewQueue.processReview(testUserId, '月', Rating.Good, 3000); // Normal speed
      await reviewQueue.processReview(testUserId, '火', Rating.Again, 8000); // Slow and wrong

      // Get performance stats
      const stats = await dataSync.getUserStats(testUserId);
      
      expect(stats.totalReviews).toBe(3);
      expect(stats.averageResponseTime).toBeCloseTo(4166.67, 0); // (1500 + 3000 + 8000) / 3
      expect(stats.accuracy).toBeCloseTo(0.667, 2); // 2/3 correct
    });

    it('should identify weak areas', async () => {
      // Add kanji with different performance
      const kanji = [
        { char: '難', jlptLevel: 2, strokeCount: 18 },
        { char: '易', jlptLevel: 3, strokeCount: 8 },
        { char: '簡', jlptLevel: 3, strokeCount: 18 },
        { char: '単', jlptLevel: 4, strokeCount: 9 }
      ];

      for (const k of kanji) {
        await dataSync.updateCard(testUserId, k.char, {
          char: k.char,
          state: State.Review,
          dueDate: new Date().toISOString(),
          scheduledDays: 1,
          elapsedDays: 1,
          reps: 5,
          lapses: k.char === '難' ? 3 : k.char === '簡' ? 2 : 0, // More lapses for harder kanji
          difficulty: 5,
          stability: 1,
          lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          metadata: { 
            jlptLevel: k.jlptLevel, 
            strokeCount: k.strokeCount, 
            frequency: 3 
          }
        });
      }

      // Analyze weaknesses
      const weaknesses = await dataSync.getWeakKanji(testUserId, 2);
      
      expect(weaknesses).toHaveLength(2);
      expect(weaknesses[0].char).toBe('難'); // Most lapses
      expect(weaknesses[1].char).toBe('簡'); // Second most lapses
    });
  });

  describe('Sync and Offline Support', () => {
    it('should handle offline/online transitions', async () => {
      // Simulate offline mode
      const offlineSync = new DataSyncService();
      offlineSync.setOfflineMode(true);

      // Add kanji while offline
      await offlineSync.updateCard(testUserId, '雨', {
        char: '雨',
        state: State.New,
        dueDate: new Date().toISOString(),
        scheduledDays: 0,
        elapsedDays: 0,
        reps: 0,
        lapses: 0,
        difficulty: 5,
        stability: 0,
        lastReview: null,
        metadata: { jlptLevel: 5, strokeCount: 8, frequency: 5 }
      });

      // Card should be in IndexedDB
      const offlineCard = await offlineSync.getCard(testUserId, '雨');
      expect(offlineCard).toBeDefined();
      expect(offlineCard?.char).toBe('雨');

      // Simulate going online
      offlineSync.setOfflineMode(false);
      await offlineSync.syncUser(testUserId);

      // Card should now be synced
      const onlineCard = await dataSync.getCard(testUserId, '雨');
      expect(onlineCard).toBeDefined();
      expect(onlineCard?.char).toBe('雨');
    });

    it('should resolve conflicts with last-write-wins', async () => {
      const now = new Date();
      
      // Create conflicting updates
      const device1Update = {
        char: '雪',
        state: State.Review,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledDays: 2,
        elapsedDays: 1,
        reps: 3,
        lapses: 0,
        difficulty: 4.8,
        stability: 2,
        lastReview: now.toISOString(),
        metadata: { jlptLevel: 4, strokeCount: 11, frequency: 4 },
        lastModified: new Date(now.getTime() + 1000).toISOString() // 1 second later
      };

      const device2Update = {
        char: '雪',
        state: State.Review,
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledDays: 3,
        elapsedDays: 1,
        reps: 3,
        lapses: 0,
        difficulty: 4.5,
        stability: 2.5,
        lastReview: now.toISOString(),
        metadata: { jlptLevel: 4, strokeCount: 11, frequency: 4 },
        lastModified: new Date(now.getTime() + 2000).toISOString() // 2 seconds later (wins)
      };

      // Apply updates
      await dataSync.updateCard(testUserId, '雪', device1Update);
      await dataSync.updateCard(testUserId, '雪', device2Update);

      // Should keep the later update
      const resolved = await dataSync.getCard(testUserId, '雪');
      expect(resolved?.stability).toBe(2.5); // From device2Update
      expect(resolved?.scheduledDays).toBe(3); // From device2Update
    });
  });
});