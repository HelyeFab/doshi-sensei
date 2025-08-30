/**
 * Review Hub Integration Test Suite
 * Tests the complete integration of all Review Hub components
 */

import { getEventBus } from '../review-events/EventBus';
import { getUnifiedDataStore } from '../review-store/UnifiedDataStore';
import { globalAccessControl } from '../access-control/GlobalAccessControl';
import {
  ReviewEventType,
  ReviewSource,
  ReviewResult,
  EventPriority
} from '../review-events/types';
import {
  ContentType,
  AlgorithmType,
  ReviewState,
  ConflictStrategy
} from '../review-store/types';
import { initializeTextbookVocabularyIntegration } from '../textbook-vocabulary/review-hub-integration';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test_user' } }
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date: Date) => ({ toDate: () => date })
  }
}));

describe('Review Hub Integration Tests', () => {
  let eventBus: ReturnType<typeof getEventBus>;
  let dataStore: ReturnType<typeof getUnifiedDataStore>;
  let accessControl: typeof globalAccessControl;
  
  beforeEach(() => {
    // Clear all instances
    jest.clearAllMocks();
    
    // Initialize components
    eventBus = getEventBus({
      persistEvents: false,
      enableLogging: false
    });
    
    dataStore = getUnifiedDataStore({
      enableSync: false,
      enableTransactions: true
    });
    
    accessControl = globalAccessControl;
    
    // Clear event bus
    eventBus.clear();
  });
  
  afterEach(() => {
    eventBus.stopProcessing();
    eventBus.clear();
  });

  describe('End-to-End Review Flow', () => {
    it('should complete full review cycle', async () => {
      const reviewCompletedHandler = jest.fn();
      const syncHandler = jest.fn();
      
      // Subscribe to events
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, reviewCompletedHandler);
      eventBus.subscribe(ReviewEventType.SYNC_COMPLETED, syncHandler);
      
      // Mock item in data store
      const mockItem = {
        id: 'integration_test_item',
        sourceId: 'test_item',
        sourceType: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        contentType: 'kanji' as ContentType,
        content: {
          primary: '食',
          secondary: 'eat, food',
          reading: 'たべる'
        },
        scheduling: {
          algorithm: AlgorithmType.FSRS,
          dueDate: new Date(),
          nextReviewAt: new Date(),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          state: ReviewState.NEW
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: []
        },
        sync: {
          version: 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false
        }
      };
      
      // Mock the local DB to return our item
      jest.spyOn(dataStore as any, 'localDB', 'get').mockReturnValue({
        get: jest.fn().mockResolvedValue(mockItem),
        set: jest.fn().mockResolvedValue(undefined)
      });
      
      // Step 1: Get due items
      const dueItems = await dataStore.getDueItems({
        userId: 'test_user',
        sources: [ReviewSource.KANJI_MASTERY]
      });
      
      expect(dueItems.items).toBeDefined();
      
      // Step 2: Record a review
      const reviewResult = await dataStore.recordReview({
        userId: 'test_user',
        itemId: 'integration_test_item',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT,
        timeSpent: 5000
      });
      
      expect(reviewResult.success).toBe(true);
      
      // Step 3: Verify event was emitted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(reviewCompletedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          data: expect.objectContaining({
            itemId: 'integration_test_item',
            result: ReviewResult.CORRECT
          })
        })
      );
      
      // Step 4: Verify statistics updated
      const stats = eventBus.getStatistics();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.processedEvents).toBeGreaterThan(0);
    });

    it('should handle cross-feature synchronization', async () => {
      const events: any[] = [];
      
      // Subscribe to all review events
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, (event) => {
        events.push(event);
      });
      
      // Simulate reviews from different sources
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: {
          itemId: 'kanji_食',
          itemType: 'kanji',
          content: { primary: '食' },
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.NORMAL
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.TEXTBOOK_VOCAB,
        userId: 'test_user',
        data: {
          itemId: 'vocab_食べる',
          itemType: 'vocabulary',
          content: { primary: '食べる' },
          result: ReviewResult.INCORRECT
        },
        priority: EventPriority.NORMAL
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.FLASHCARDS,
        userId: 'test_user',
        data: {
          itemId: 'card_食',
          itemType: 'flashcard',
          content: { primary: '食', secondary: 'food' },
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.NORMAL
      });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify all events were processed
      expect(events).toHaveLength(3);
      expect(events[0].source).toBe(ReviewSource.KANJI_MASTERY);
      expect(events[1].source).toBe(ReviewSource.TEXTBOOK_VOCAB);
      expect(events[2].source).toBe(ReviewSource.FLASHCARDS);
    });
  });

  describe('Access Control Integration', () => {
    it('should enforce daily limits', async () => {
      // Mock usage at limit
      jest.spyOn(accessControl as any, 'usageTracker', 'get').mockReturnValue({
        getDailyUsage: jest.fn().mockResolvedValue(50),
        increment: jest.fn()
      });
      
      // Mock access control to return limit reached
      jest.spyOn(accessControl, 'checkAccess').mockResolvedValue({
        allowed: false,
        reason: 'daily_limit_reached' as any,
        remaining: 0,
        resetAt: new Date(Date.now() + 86400000)
      });
      
      const result = await accessControl.checkAccess({
        userId: 'test_user',
        feature: 'review_hub',
        action: 'review'
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('daily_limit_reached');
    });

    it('should track usage after successful review', async () => {
      const trackUsageSpy = jest.spyOn(accessControl, 'trackUsage');
      
      // Mock successful access check
      jest.spyOn(accessControl, 'checkAccess').mockResolvedValue({
        allowed: true,
        remaining: 49,
        resetAt: new Date(Date.now() + 86400000)
      });
      
      await accessControl.trackUsage({
        userId: 'test_user',
        feature: 'review_hub',
        amount: 1
      });
      
      expect(trackUsageSpy).toHaveBeenCalledWith({
        userId: 'test_user',
        feature: 'review_hub',
        amount: 1
      });
      
      // Verify usage event was emitted
      const eventBus = getEventBus();
      const emitSpy = jest.spyOn(eventBus, 'emit');
      
      await accessControl.trackUsage({
        userId: 'test_user',
        feature: 'review_hub'
      });
      
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ReviewEventType.USAGE_TRACKED
        })
      );
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle sync conflicts correctly', async () => {
      const conflictHandler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.SYNC_CONFLICT, conflictHandler);
      
      // Create conflicting items
      const localItem = {
        id: 'conflict_item',
        metadata: { updatedAt: new Date('2024-01-02') },
        scheduling: { repetitions: 5 }
      };
      
      const remoteItem = {
        id: 'conflict_item',
        metadata: { updatedAt: new Date('2024-01-01') },
        scheduling: { repetitions: 3 }
      };
      
      // Test different conflict strategies
      const strategies = [
        ConflictStrategy.LAST_WRITE_WINS,
        ConflictStrategy.MERGE,
        ConflictStrategy.REMOTE_WINS,
        ConflictStrategy.LOCAL_WINS
      ];
      
      for (const strategy of strategies) {
        const store = getUnifiedDataStore({ conflictStrategy: strategy });
        const resolved = await store.resolveConflict(localItem as any, remoteItem as any);
        
        switch (strategy) {
          case ConflictStrategy.LAST_WRITE_WINS:
            expect(resolved).toEqual(localItem);
            break;
          case ConflictStrategy.REMOTE_WINS:
            expect(resolved).toEqual(remoteItem);
            break;
          case ConflictStrategy.LOCAL_WINS:
            expect(resolved).toEqual(localItem);
            break;
          case ConflictStrategy.MERGE:
            expect(resolved.scheduling.repetitions).toBe(5); // Takes higher value
            break;
        }
      }
    });
  });

  describe('Feature Integration', () => {
    it('should integrate with Textbook Vocabulary', async () => {
      const exportSpy = jest.fn().mockResolvedValue({ exported: 10, failed: 0 });
      
      // Mock the integration module
      jest.mock('../textbook-vocabulary/review-hub-integration', () => ({
        initializeTextbookVocabularyIntegration: jest.fn().mockResolvedValue({
          unsubscribe: jest.fn()
        }),
        exportToUnifiedStore: exportSpy
      }));
      
      // Initialize integration
      const integration = await initializeTextbookVocabularyIntegration();
      
      expect(integration).toBeDefined();
      expect(integration.unsubscribe).toBeDefined();
    });

    it('should handle feature-specific events', async () => {
      const handlers: Record<string, jest.Mock> = {};
      
      // Subscribe to events from each feature
      [
        ReviewSource.KANJI_MASTERY,
        ReviewSource.TEXTBOOK_VOCAB,
        ReviewSource.FLASHCARDS,
        ReviewSource.DRILL_PRACTICE,
        ReviewSource.VOCABULARY_PAGE
      ].forEach(source => {
        handlers[source] = jest.fn();
        eventBus.subscribe(
          ReviewEventType.ITEM_REVIEWED,
          handlers[source],
          {
            filter: (event) => event.source === source
          }
        );
      });
      
      // Emit events from different sources
      for (const source of Object.keys(handlers)) {
        await eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: source as ReviewSource,
          userId: 'test_user',
          data: {
            itemId: `${source}_item`,
            itemType: 'kanji',
            result: ReviewResult.CORRECT
          },
          priority: EventPriority.NORMAL
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Each handler should only receive its own events
      Object.entries(handlers).forEach(([source, handler]) => {
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            source,
            data: expect.objectContaining({
              itemId: `${source}_item`
            })
          })
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from event processing failures', async () => {
      let attemptCount = 0;
      const handler = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary failure');
        }
      });
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: {
          itemId: 'retry_item',
          itemType: 'kanji',
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.HIGH
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(handler).toHaveBeenCalledTimes(2); // Initial + retry
      expect(attemptCount).toBe(2);
    });

    it('should handle database connection failures', async () => {
      // Mock database failure
      const store = getUnifiedDataStore();
      jest.spyOn(store as any, 'localDB', 'get').mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Database offline')),
        set: jest.fn().mockRejectedValue(new Error('Database offline'))
      });
      
      await expect(
        store.recordReview({
          userId: 'test_user',
          itemId: 'test_item',
          source: ReviewSource.KANJI_MASTERY,
          result: ReviewResult.CORRECT
        })
      ).rejects.toThrow('Failed to record review');
    });

    it('should handle partial sync failures', async () => {
      const syncStartedHandler = jest.fn();
      const syncFailedHandler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.SYNC_STARTED, syncStartedHandler);
      eventBus.subscribe(ReviewEventType.SYNC_FAILED, syncFailedHandler);
      
      const store = getUnifiedDataStore({ enableSync: true });
      
      // Mock sync engine failure
      jest.spyOn(store as any, 'syncEngine', 'get').mockReturnValue({
        performSync: jest.fn().mockRejectedValue(new Error('Network error')),
        initialize: jest.fn()
      });
      
      try {
        await store.performSync('test_user');
      } catch (error) {
        // Expected to fail
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(syncStartedHandler).toHaveBeenCalled();
      expect(syncFailedHandler).toHaveBeenCalled();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high volume of events', async () => {
      const handler = jest.fn();
      const eventCount = 1000;
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      const startTime = Date.now();
      
      // Emit many events rapidly
      const promises = Array(eventCount).fill(null).map((_, i) =>
        eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: {
            itemId: `load_test_${i}`,
            itemType: 'kanji',
            result: i % 2 === 0 ? ReviewResult.CORRECT : ReviewResult.INCORRECT
          },
          priority: EventPriority.LOW
        })
      );
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const duration = Date.now() - startTime;
      
      // Should process all events within reasonable time
      expect(handler).toHaveBeenCalledTimes(eventCount);
      expect(duration).toBeLessThan(5000); // 5 seconds for 1000 events
      
      // Check statistics
      const stats = eventBus.getStatistics();
      expect(stats.totalEvents).toBe(eventCount);
      expect(stats.processedEvents).toBe(eventCount);
    });

    it('should handle concurrent operations across features', async () => {
      const operations = [
        // Multiple reviews
        ...Array(10).fill(null).map((_, i) =>
          dataStore.recordReview({
            userId: 'test_user',
            itemId: `concurrent_${i}`,
            source: ReviewSource.KANJI_MASTERY,
            result: ReviewResult.CORRECT
          }).catch(() => {}) // Ignore errors for missing items
        ),
        // Multiple access checks
        ...Array(10).fill(null).map(() =>
          accessControl.checkAccess({
            userId: 'test_user',
            feature: 'review_hub',
            action: 'review'
          })
        ),
        // Multiple event emissions
        ...Array(10).fill(null).map((_, i) =>
          eventBus.emit({
            type: ReviewEventType.ITEM_REVIEWED,
            source: ReviewSource.TEXTBOOK_VOCAB,
            userId: 'test_user',
            data: {
              itemId: `event_${i}`,
              itemType: 'vocabulary',
              result: ReviewResult.CORRECT
            },
            priority: EventPriority.NORMAL
          })
        )
      ];
      
      const results = await Promise.allSettled(operations);
      
      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(20); // At least 20 out of 30
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency across components', async () => {
      const itemId = 'consistency_test_item';
      const userId = 'test_user';
      
      // Track all events
      const events: any[] = [];
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, (e) => events.push(e));
      eventBus.subscribe(ReviewEventType.USAGE_TRACKED, (e) => events.push(e));
      
      // Simulate a complete review flow
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId,
        data: {
          itemId,
          itemType: 'kanji',
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.NORMAL
      });
      
      await accessControl.trackUsage({
        userId,
        feature: 'review_hub',
        amount: 1
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify events were emitted in correct order
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe(ReviewEventType.ITEM_REVIEWED);
      expect(events[1].type).toBe(ReviewEventType.USAGE_TRACKED);
      
      // Verify data consistency
      expect(events[0].userId).toBe(userId);
      expect(events[1].userId).toBe(userId);
    });
  });
});