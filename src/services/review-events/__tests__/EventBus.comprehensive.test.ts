/**
 * Comprehensive Event Bus Test Suite
 * Complete test coverage for production readiness
 */

import { ReviewEventBus, getEventBus } from '../EventBus';
import {
  ReviewEvent,
  ReviewEventType,
  EventPriority,
  ReviewSource,
  ReviewResult,
  EventHandler,
  SubscriptionOptions
} from '../types';

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ReviewEventBus - Comprehensive Test Suite', () => {
  let eventBus: ReviewEventBus;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorageMock.clear();
    eventBus = ReviewEventBus.getInstance({
      maxQueueSize: 100,
      processingInterval: 10,
      retryDelay: 50,
      maxRetries: 2,
      persistEvents: true,
      enableLogging: false
    });
    eventBus.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    eventBus.stopProcessing();
    eventBus.clear();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Core Functionality', () => {
    it('should maintain singleton instance', () => {
      const instance1 = ReviewEventBus.getInstance();
      const instance2 = ReviewEventBus.getInstance();
      const instance3 = getEventBus();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(instance3);
    });

    it('should emit and receive events', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: {
          itemId: 'kanji_1',
          itemType: 'kanji',
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ReviewEventType.ITEM_REVIEWED,
          userId: 'test_user',
          id: expect.stringMatching(/^evt_/),
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle multiple subscribers', async () => {
      const handlers = Array(5).fill(null).map(() => jest.fn());
      
      handlers.forEach(handler => {
        eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.TEXTBOOK_VOCAB,
        userId: 'test_user',
        data: {
          itemId: 'vocab_1',
          itemType: 'vocabulary'
        },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    it('should support unsubscribe', async () => {
      const handler = jest.fn();
      
      const unsubscribe = eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.FLASHCARDS,
        userId: 'test_user',
        data: { itemId: 'card_1', itemType: 'flashcard' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(handler).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.FLASHCARDS,
        userId: 'test_user',
        data: { itemId: 'card_2', itemType: 'flashcard' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Priority Queue', () => {
    it('should process events by priority', async () => {
      const processedOrder: string[] = [];
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, async (event) => {
        processedOrder.push(event.data.itemId);
      });
      
      // Emit events with different priorities
      await Promise.all([
        eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: 'low', itemType: 'kanji' },
          priority: EventPriority.LOW
        }),
        eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: 'critical', itemType: 'kanji' },
          priority: EventPriority.CRITICAL
        }),
        eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: 'high', itemType: 'kanji' },
          priority: EventPriority.HIGH
        }),
        eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: 'normal', itemType: 'kanji' },
          priority: EventPriority.NORMAL
        })
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be processed in priority order
      expect(processedOrder[0]).toBe('critical');
      expect(processedOrder[1]).toBe('high');
      expect(processedOrder[2]).toBe('normal');
      expect(processedOrder[3]).toBe('low');
    });

    it('should handle queue overflow', async () => {
      const smallBus = ReviewEventBus.getInstance({
        maxQueueSize: 3,
        processingInterval: 1000, // Slow processing
        persistEvents: false,
        enableLogging: false
      });
      
      smallBus.clear();
      
      // Overflow the queue
      for (let i = 0; i < 5; i++) {
        await smallBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: `item_${i}`, itemType: 'kanji' },
          priority: EventPriority.NORMAL
        });
      }
      
      const stats = smallBus.getStatistics();
      expect(stats.queuedEvents).toBeLessThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should retry failed events', async () => {
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
        data: { itemId: 'retry_test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should handle max retries exceeded', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Permanent failure'));
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'fail_test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(handler).toHaveBeenCalledTimes(3); // Initial + 2 retries
      
      const failedEvents = JSON.parse(localStorage.getItem('review_events_failed') || '[]');
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].event.data.itemId).toBe('fail_test');
    });

    it('should isolate handler errors', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, failingHandler);
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, successHandler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'isolation_test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('Event Persistence', () => {
    it('should persist processed events', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'persist_test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const persistedEvents = JSON.parse(localStorage.getItem('review_events_processed') || '[]');
      expect(persistedEvents).toHaveLength(1);
      expect(persistedEvents[0].data.itemId).toBe('persist_test');
    });

    it('should limit persisted events to 100', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      // Emit 150 events
      for (let i = 0; i < 150; i++) {
        await eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: `item_${i}`, itemType: 'kanji' },
          priority: EventPriority.LOW
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const persistedEvents = JSON.parse(localStorage.getItem('review_events_processed') || '[]');
      expect(persistedEvents.length).toBeLessThanOrEqual(100);
    });

    it('should prevent duplicate processing', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      const event = {
        type: ReviewEventType.ITEM_REVIEWED as ReviewEventType,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'duplicate_test', itemType: 'kanji' as const },
        priority: EventPriority.NORMAL
      };
      
      await eventBus.emit(event);
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Try to emit the same event again
      await eventBus.emit(event);
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Handler should only be called once due to deduplication
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Subscription Filtering', () => {
    it('should filter events based on subscription options', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(
        ReviewEventType.ITEM_REVIEWED,
        handler,
        {
          filter: (event) => event.data.itemType === 'kanji',
          priority: EventPriority.HIGH
        }
      );
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'kanji_1', itemType: 'kanji' },
        priority: EventPriority.HIGH
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.TEXTBOOK_VOCAB,
        userId: 'test_user',
        data: { itemId: 'vocab_1', itemType: 'vocabulary' },
        priority: EventPriority.HIGH
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'kanji_2', itemType: 'kanji' },
        priority: EventPriority.LOW // Below threshold
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ itemId: 'kanji_1' })
        })
      );
    });

    it('should support async and sync handlers', async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined);
      const syncHandler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, asyncHandler);
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, syncHandler, { async: false });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'async_test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(asyncHandler).toHaveBeenCalled();
      expect(syncHandler).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track event statistics', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      eventBus.subscribe(ReviewEventType.SYNC_STARTED, handler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'stats_1', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.TEXTBOOK_VOCAB,
        userId: 'test_user',
        data: { itemId: 'stats_2', itemType: 'vocabulary' },
        priority: EventPriority.NORMAL
      });
      
      await eventBus.emit({
        type: ReviewEventType.SYNC_STARTED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: 'sync', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = eventBus.getStatistics();
      
      expect(stats.totalEvents).toBe(3);
      expect(stats.processedEvents).toBe(3);
      expect(stats.failedEvents).toBe(0);
      expect(stats.eventsByType[ReviewEventType.ITEM_REVIEWED]).toBe(2);
      expect(stats.eventsByType[ReviewEventType.SYNC_STARTED]).toBe(1);
      expect(stats.eventsBySource[ReviewSource.KANJI_MASTERY]).toBe(1);
      expect(stats.eventsBySource[ReviewSource.TEXTBOOK_VOCAB]).toBe(1);
      expect(stats.eventsBySource[ReviewSource.REVIEW_HUB]).toBe(1);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent event emissions', async () => {
      const handler = jest.fn();
      const eventCount = 100;
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      const promises = Array(eventCount).fill(null).map((_, i) =>
        eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: `concurrent_${i}`, itemType: 'kanji' },
          priority: EventPriority.NORMAL
        })
      );
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(handler).toHaveBeenCalledTimes(eventCount);
    });

    it('should prevent race conditions with async lock', async () => {
      const results: number[] = [];
      let counter = 0;
      
      const handler = jest.fn().mockImplementation(async () => {
        const current = counter;
        await new Promise(resolve => setTimeout(resolve, 5));
        counter = current + 1;
        results.push(counter);
      });
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      // Emit multiple events rapidly
      for (let i = 0; i < 10; i++) {
        await eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: { itemId: `race_${i}`, itemType: 'kanji' },
          priority: EventPriority.NORMAL
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check that updates were sequential (no race conditions)
      expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe('Memory Management', () => {
    it('should clear events and free memory', () => {
      // Add some events to the queue
      eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'memory_test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      const statsBefore = eventBus.getStatistics();
      expect(statsBefore.totalEvents).toBeGreaterThan(0);
      
      eventBus.clear();
      
      const statsAfter = eventBus.getStatistics();
      expect(statsAfter.totalEvents).toBe(0);
      expect(statsAfter.processedEvents).toBe(0);
      expect(statsAfter.queuedEvents).toBe(0);
    });

    it('should stop processing when requested', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      eventBus.stopProcessing();
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'stop_test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Event should be queued but not processed
      const stats = eventBus.getStatistics();
      expect(stats.queuedEvents).toBeGreaterThan(0);
    });
  });
});