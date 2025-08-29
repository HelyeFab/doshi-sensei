/**
 * Integration Tests
 * End-to-end testing of the Review Hub system
 */

import { getEventBus } from '../review-events/EventBus';
import { getUnifiedDataStore } from '../review-store/UnifiedDataStore';
import { globalAccessControl } from '../access-control/GlobalAccessControl';
import { withKanjiMasterySync, withTextbookVocabularySync } from '../review-integration/withReviewSync';
import {
  ReviewEventType,
  EventPriority,
  ReviewSource,
  ReviewResult
} from '../review-events/types';
import { ConflictStrategy } from '../review-store/types';

describe('Review Hub Integration Tests', () => {
  let eventBus: ReturnType<typeof getEventBus>;
  let dataStore: ReturnType<typeof getUnifiedDataStore>;
  let eventLog: any[] = [];

  beforeEach(() => {
    // Initialize components
    eventBus = getEventBus({
      enableLogging: false,
      persistEvents: false
    });
    
    dataStore = getUnifiedDataStore({
      enableSync: false,
      conflictStrategy: ConflictStrategy.LAST_WRITE_WINS
    });
    
    // Clear state
    eventBus.clear();
    eventLog = [];
    
    // Subscribe to all events for logging
    Object.values(ReviewEventType).forEach(eventType => {
      eventBus.subscribe(eventType, (event) => {
        eventLog.push(event);
      });
    });
  });

  afterEach(() => {
    eventBus.stopProcessing();
    eventBus.clear();
  });

  describe('Event Flow Integration', () => {
    it('should flow from review action to event emission to data store', async () => {
      // 1. Simulate a review action
      const reviewData = {
        itemId: 'integration_kanji_1',
        character: '水',
        meaning: 'water',
        quality: 4,
        timestamp: new Date()
      };
      
      // 2. Wrap with sync
      const syncedReview = withKanjiMasterySync(async (data: any) => {
        // Simulate original function
        return {
          ...data,
          due_date: new Date(Date.now() + 86400000),
          interval: 1,
          ease_factor: 2.5
        };
      });
      
      // 3. Execute review
      const result = await syncedReview(reviewData);
      
      // 4. Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 5. Verify event was emitted
      const reviewEvent = eventLog.find(e => 
        e.type === ReviewEventType.ITEM_REVIEWED &&
        e.source === ReviewSource.KANJI_MASTERY
      );
      
      expect(reviewEvent).toBeDefined();
      expect(reviewEvent?.data.content.primary).toBe('水');
      expect(reviewEvent?.data.content.meaning).toBe('water');
    });

    it('should handle multiple concurrent reviews', async () => {
      const reviews = [];
      
      // Create multiple review functions
      for (let i = 0; i < 10; i++) {
        reviews.push(
          eventBus.emit({
            type: ReviewEventType.ITEM_REVIEWED,
            source: ReviewSource.DRILL_PRACTICE,
            userId: `user_${i}`,
            data: {
              itemId: `item_${i}`,
              itemType: 'vocabulary',
              result: ReviewResult.CORRECT
            },
            priority: EventPriority.NORMAL
          })
        );
      }
      
      // Execute all concurrently
      await Promise.all(reviews);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // All events should be processed
      const drillEvents = eventLog.filter(e => 
        e.source === ReviewSource.DRILL_PRACTICE
      );
      
      expect(drillEvents).toHaveLength(10);
    });
  });

  describe('Access Control Integration', () => {
    it('should enforce limits across the system', async () => {
      // Mock user with limited access
      const checkAccessSpy = jest.spyOn(globalAccessControl, 'checkAccess');
      
      // Check access for a feature
      const accessResult = await globalAccessControl.checkAccess({
        userId: 'limited_user',
        feature: 'kanji_mastery',
        subscriptionTier: 'free'
      });
      
      expect(checkAccessSpy).toHaveBeenCalled();
      expect(accessResult).toHaveProperty('allowed');
      expect(accessResult).toHaveProperty('remaining');
    });

    it('should track usage after successful access', async () => {
      const trackUsageSpy = jest.spyOn(globalAccessControl, 'trackUsage');
      
      // Track usage
      await globalAccessControl.trackUsage({
        userId: 'test_user',
        feature: 'drill_practice',
        amount: 1
      });
      
      expect(trackUsageSpy).toHaveBeenCalled();
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should emit usage tracked event
      const usageEvent = eventLog.find(e => 
        e.type === ReviewEventType.USAGE_TRACKED
      );
      
      expect(usageEvent).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      const rateLimiter = (globalAccessControl as any).rateLimiter;
      
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkLimit('test_user', 'ai_generate');
      }
      
      // Next request should be rate limited
      const result = await rateLimiter.checkLimit('test_user', 'ai_generate');
      
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Sync and Conflict Resolution', () => {
    it('should detect and resolve conflicts', async () => {
      const dataStoreWithSync = getUnifiedDataStore({
        enableSync: false, // Manual sync for testing
        conflictStrategy: ConflictStrategy.LAST_WRITE_WINS
      });
      
      // Create conflicting items
      const localItem = {
        id: 'conflict_item',
        sourceId: 'conflict_item',
        sourceType: ReviewSource.KANJI_MASTERY,
        contentType: 'kanji' as const,
        content: { primary: '火' },
        scheduling: {
          algorithm: 'FSRS' as const,
          dueDate: new Date(),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 3,
          lapses: 0,
          state: 'review' as const
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date('2024-01-01'),
          tags: []
        },
        sync: {
          version: 1,
          localChanges: true,
          remoteChanges: false
        }
      };
      
      const remoteItem = {
        ...localItem,
        scheduling: { ...localItem.scheduling, repetitions: 5 },
        metadata: { ...localItem.metadata, updatedAt: new Date('2024-01-02') },
        sync: { ...localItem.sync, remoteChanges: true }
      };
      
      // Resolve conflict
      const resolved = await dataStoreWithSync.resolveConflict(localItem, remoteItem);
      
      // Remote should win (later update time)
      expect(resolved.metadata.updatedAt).toEqual(remoteItem.metadata.updatedAt);
      expect(resolved.scheduling.repetitions).toBe(5);
    });
  });

  describe('Feature Integration Wrappers', () => {
    it('should wrap Kanji Mastery functions correctly', async () => {
      const mockKanjiReview = jest.fn(async (kanji: string, quality: number) => ({
        character: kanji,
        quality,
        due_date: new Date(Date.now() + 86400000),
        interval: 1,
        ease_factor: 2.5
      }));
      
      const wrapped = withKanjiMasterySync(mockKanjiReview);
      
      const result = await wrapped('本', 4);
      
      expect(mockKanjiReview).toHaveBeenCalledWith('本', 4);
      expect(result).toHaveProperty('character', '本');
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const event = eventLog.find(e => 
        e.source === ReviewSource.KANJI_MASTERY &&
        e.data.content?.primary === '本'
      );
      
      expect(event).toBeDefined();
    });

    it('should batch sync textbook vocabulary', async () => {
      const mockVocabReview = jest.fn(async (id: string, grade: number) => ({
        id,
        grade,
        word: '食べる',
        reading: 'たべる',
        meaning: 'to eat',
        nextReview: new Date(Date.now() + 86400000)
      }));
      
      const wrapped = withTextbookVocabularySync(mockVocabReview);
      
      // Review multiple items
      const reviews = [];
      for (let i = 0; i < 5; i++) {
        reviews.push(wrapped(`vocab_${i}`, 4));
      }
      
      await Promise.all(reviews);
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should have events for all reviews
      const vocabEvents = eventLog.filter(e => 
        e.source === ReviewSource.TEXTBOOK_VOCAB
      );
      
      expect(vocabEvents.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from event processing errors', async () => {
      let attemptCount = 0;
      
      // Subscribe with failing handler
      eventBus.subscribe(
        ReviewEventType.ITEM_REVIEWED,
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Temporary failure');
          }
        },
        {
          retryOnError: true,
          maxRetries: 2
        }
      );
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: {
          itemId: 'error_test',
          itemType: 'kanji'
        },
        priority: EventPriority.NORMAL
      });
      
      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(attemptCount).toBe(2);
    });

    it('should handle transaction rollback on failure', async () => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
        addOperation: jest.fn()
      };
      
      jest.spyOn((dataStore as any).transactionManager, 'beginTransaction')
        .mockResolvedValue(mockTransaction);
      
      // Force an error during review
      jest.spyOn(dataStore as any, 'getItem')
        .mockRejectedValue(new Error('Database error'));
      
      try {
        await dataStore.recordReview({
          userId: 'test_user',
          itemId: 'fail_item',
          source: ReviewSource.REVIEW_HUB,
          result: ReviewResult.CORRECT
        });
      } catch (error) {
        // Expected to fail
      }
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle high event throughput', async () => {
      const startTime = Date.now();
      const eventCount = 1000;
      const events = [];
      
      // Generate events
      for (let i = 0; i < eventCount; i++) {
        events.push(
          eventBus.emit({
            type: ReviewEventType.ITEM_REVIEWED,
            source: ReviewSource.DRILL_PRACTICE,
            userId: 'perf_test',
            data: {
              itemId: `perf_${i}`,
              itemType: 'vocabulary'
            },
            priority: EventPriority.LOW
          })
        );
      }
      
      await Promise.all(events);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const duration = Date.now() - startTime;
      const throughput = eventCount / (duration / 1000);
      
      console.log(`Processed ${eventCount} events in ${duration}ms (${throughput.toFixed(0)} events/sec)`);
      
      // Should process at least 100 events per second
      expect(throughput).toBeGreaterThan(100);
    });

    it('should maintain low latency under load', async () => {
      const latencies: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        
        await eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.REVIEW_HUB,
          userId: 'latency_test',
          data: {
            itemId: `latency_${i}`,
            itemType: 'kanji'
          },
          priority: EventPriority.NORMAL
        });
        
        latencies.push(Date.now() - start);
      }
      
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      console.log(`Average latency: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency}ms`);
      
      // Average should be under 10ms
      expect(avgLatency).toBeLessThan(10);
      // Max should be under 50ms
      expect(maxLatency).toBeLessThan(50);
    });
  });
});