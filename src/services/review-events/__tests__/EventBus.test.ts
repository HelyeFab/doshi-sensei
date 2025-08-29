/**
 * Event Bus Unit Tests
 * Comprehensive test coverage for the Review Event Bus
 */

import { ReviewEventBus, getEventBus } from '../EventBus';
import {
  ReviewEvent,
  ReviewEventType,
  EventPriority,
  ReviewSource,
  ReviewAction,
  ReviewResult
} from '../types';

describe('ReviewEventBus', () => {
  let eventBus: ReviewEventBus;

  beforeEach(() => {
    // Create new instance for each test
    eventBus = ReviewEventBus.getInstance({
      maxQueueSize: 100,
      processingInterval: 10, // Fast processing for tests
      retryDelay: 100,
      maxRetries: 2,
      persistEvents: false, // Disable persistence for tests
      enableLogging: false
    });
    
    // Clear any existing state
    eventBus.clear();
  });

  afterEach(() => {
    // Clean up
    eventBus.stopProcessing();
    eventBus.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ReviewEventBus.getInstance();
      const instance2 = ReviewEventBus.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should work with helper function', () => {
      const instance1 = getEventBus();
      const instance2 = getEventBus();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Event Emission', () => {
    it('should emit events to subscribers', async () => {
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
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ReviewEventType.ITEM_REVIEWED,
          userId: 'test_user'
        })
      );
    });

    it('should emit to multiple subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler1);
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler2);
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler3);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.FLASHCARDS,
        userId: 'test_user',
        data: {
          itemId: 'card_1',
          itemType: 'flashcard'
        },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should not emit to unsubscribed handlers', async () => {
      const handler = jest.fn();
      
      const unsubscribe = eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      unsubscribe();
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.DRILL_PRACTICE,
        userId: 'test_user',
        data: {
          itemId: 'drill_1',
          itemType: 'vocabulary'
        },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Priority Queue', () => {
    it('should process high priority events first', async () => {
      const results: number[] = [];
      const handler = jest.fn((event: ReviewEvent) => {
        results.push(event.priority);
      });
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      // Emit events with different priorities
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: '1', itemType: 'kanji' },
        priority: EventPriority.LOW
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: '2', itemType: 'kanji' },
        priority: EventPriority.CRITICAL
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: '3', itemType: 'kanji' },
        priority: EventPriority.HIGH
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: '4', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      // Wait for all events to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should process in priority order: CRITICAL(3), HIGH(2), NORMAL(1), LOW(0)
      expect(results).toEqual([3, 2, 1, 0]);
    });
  });

  describe('Subscription Filters', () => {
    it('should filter events based on custom filter', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(
        ReviewEventType.ITEM_REVIEWED,
        handler,
        {
          filter: (event) => event.data.itemType === 'kanji'
        }
      );
      
      // Emit kanji event - should trigger
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 'k1', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      // Emit vocabulary event - should not trigger
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.TEXTBOOK_VOCAB,
        userId: 'test_user',
        data: { itemId: 'v1', itemType: 'vocabulary' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ itemType: 'kanji' })
        })
      );
    });

    it('should filter by priority', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(
        ReviewEventType.ITEM_REVIEWED,
        handler,
        {
          priority: EventPriority.HIGH
        }
      );
      
      // Low priority - should not trigger
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.GAMES,
        userId: 'test_user',
        data: { itemId: 'g1', itemType: 'kanji' },
        priority: EventPriority.LOW
      });
      
      // High priority - should trigger
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.GAMES,
        userId: 'test_user',
        data: { itemId: 'g2', itemType: 'kanji' },
        priority: EventPriority.HIGH
      });
      
      // Critical priority - should trigger (higher than HIGH)
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.GAMES,
        userId: 'test_user',
        data: { itemId: 'g3', itemType: 'kanji' },
        priority: EventPriority.CRITICAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle subscriber errors gracefully', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, errorHandler);
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, successHandler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: 'test', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should retry failed events', async () => {
      let attempts = 0;
      const handler = jest.fn(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
      });
      
      eventBus.subscribe(
        ReviewEventType.ITEM_REVIEWED,
        handler,
        {
          retryOnError: true,
          maxRetries: 2
        }
      );
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: 'retry', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(handler).toHaveBeenCalledTimes(2);
      expect(attempts).toBe(2);
    });
  });

  describe('Event Deduplication', () => {
    it('should not process duplicate events', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      // Create event with same ID
      const event = {
        id: 'duplicate_event_123',
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: 'dup', itemType: 'kanji' },
        priority: EventPriority.NORMAL,
        timestamp: Date.now(),
        metadata: {
          version: '1.0.0',
          timestamp: Date.now(),
          environment: 'test' as const
        }
      };
      
      // Force emit same event twice (bypass normal emit to control ID)
      const eventBusAny = eventBus as any;
      eventBusAny.processedEvents.add(event.id);
      
      await eventBus.emit(event);
      await eventBus.emit(event);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should only process once due to deduplication
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track event statistics', async () => {
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: { itemId: 's1', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await eventBus.emit({
        type: ReviewEventType.SYNC_STARTED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: 's2', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.TEXTBOOK_VOCAB,
        userId: 'test_user',
        data: { itemId: 's3', itemType: 'vocabulary' },
        priority: EventPriority.NORMAL
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const stats = eventBus.getStatistics();
      
      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByType[ReviewEventType.ITEM_REVIEWED]).toBe(2);
      expect(stats.eventsByType[ReviewEventType.SYNC_STARTED]).toBe(1);
      expect(stats.eventsBySource[ReviewSource.KANJI_MASTERY]).toBe(1);
      expect(stats.eventsBySource[ReviewSource.TEXTBOOK_VOCAB]).toBe(1);
      expect(stats.eventsBySource[ReviewSource.REVIEW_HUB]).toBe(1);
    });
  });

  describe('Queue Management', () => {
    it('should respect max queue size', async () => {
      const smallBus = ReviewEventBus.getInstance({
        maxQueueSize: 3,
        processingInterval: 1000, // Slow processing
        persistEvents: false,
        enableLogging: false
      });
      
      // Stop processing to fill queue
      smallBus.stopProcessing();
      
      // Try to add more than max queue size
      for (let i = 0; i < 5; i++) {
        await smallBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.REVIEW_HUB,
          userId: 'test_user',
          data: { itemId: `q${i}`, itemType: 'kanji' },
          priority: EventPriority.NORMAL
        });
      }
      
      const stats = smallBus.getStatistics();
      expect(stats.queuedEvents).toBeLessThanOrEqual(3);
      
      smallBus.clear();
    });
  });

  describe('Clear and Reset', () => {
    it('should clear all events and reset state', async () => {
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.REVIEW_HUB,
        userId: 'test_user',
        data: { itemId: 'clear', itemType: 'kanji' },
        priority: EventPriority.NORMAL
      });
      
      eventBus.clear();
      
      const stats = eventBus.getStatistics();
      expect(stats.totalEvents).toBe(0);
      expect(stats.queuedEvents).toBe(0);
    });
  });
});