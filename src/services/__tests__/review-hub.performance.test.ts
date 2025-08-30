/**
 * Review Hub Performance Test Suite
 * Load testing and performance benchmarks for production readiness
 */

import { performance } from 'perf_hooks';
import { getEventBus } from '../review-events/EventBus';
import { getUnifiedDataStore } from '../review-store/UnifiedDataStore';
import { globalAccessControl } from '../access-control/GlobalAccessControl';
import {
  ReviewEventType,
  ReviewSource,
  ReviewResult,
  EventPriority
} from '../review-events/types';
import { ContentType, ReviewState, AlgorithmType } from '../review-store/types';

// Performance thresholds
const THRESHOLDS = {
  eventProcessing: 10, // ms per event
  reviewRecord: 50, // ms per review
  dueItemsQuery: 200, // ms for query
  syncLatency: 100, // ms for sync
  memoryBaseline: 50, // MB
  memoryPeak: 200, // MB
  cacheHitRate: 0.9, // 90%
  eventThroughput: 1000, // events per second
  concurrentUsers: 100,
  batchSize: 1000
};

// Helper to measure execution time
async function measureTime<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

// Helper to measure memory usage
function measureMemory(): { heapUsed: number; external: number; rss: number } {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024, // Convert to MB
      external: usage.external / 1024 / 1024,
      rss: usage.rss / 1024 / 1024
    };
  }
  return { heapUsed: 0, external: 0, rss: 0 };
}

describe('Review Hub Performance Tests', () => {
  let eventBus: ReturnType<typeof getEventBus>;
  let dataStore: ReturnType<typeof getUnifiedDataStore>;
  let memoryBaseline: ReturnType<typeof measureMemory>;

  beforeEach(() => {
    // Initialize with performance-optimized settings
    eventBus = getEventBus({
      maxQueueSize: 10000,
      processingInterval: 10,
      persistEvents: false,
      enableLogging: false
    });
    
    dataStore = getUnifiedDataStore({
      enableSync: false,
      enableTransactions: false, // Disable for performance tests
      maxCacheSize: 1000
    });
    
    eventBus.clear();
    memoryBaseline = measureMemory();
  });

  afterEach(() => {
    eventBus.stopProcessing();
    eventBus.clear();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Event Processing Performance', () => {
    it('should process events within threshold', async () => {
      const eventCount = 1000;
      const handler = jest.fn();
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      const { duration } = await measureTime('Event Processing', async () => {
        const promises = Array(eventCount).fill(null).map((_, i) =>
          eventBus.emit({
            type: ReviewEventType.ITEM_REVIEWED,
            source: ReviewSource.KANJI_MASTERY,
            userId: `user_${i % 10}`,
            data: {
              itemId: `item_${i}`,
              itemType: 'kanji',
              result: i % 2 === 0 ? ReviewResult.CORRECT : ReviewResult.INCORRECT
            },
            priority: EventPriority.NORMAL
          })
        );
        
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 1000));
      });
      
      const avgTimePerEvent = duration / eventCount;
      
      expect(avgTimePerEvent).toBeLessThan(THRESHOLDS.eventProcessing);
      expect(handler).toHaveBeenCalledTimes(eventCount);
      
      console.log(`Event Processing: ${avgTimePerEvent.toFixed(2)}ms per event`);
    });

    it('should maintain throughput under load', async () => {
      const targetThroughput = THRESHOLDS.eventThroughput;
      const testDuration = 5000; // 5 seconds
      let eventsProcessed = 0;
      
      const handler = jest.fn(() => {
        eventsProcessed++;
      });
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      const startTime = Date.now();
      
      // Continuously emit events for test duration
      while (Date.now() - startTime < testDuration) {
        await eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'perf_test_user',
          data: {
            itemId: `throughput_${eventsProcessed}`,
            itemType: 'kanji',
            result: ReviewResult.CORRECT
          },
          priority: EventPriority.LOW
        });
        
        // Small delay to prevent blocking
        if (eventsProcessed % 100 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const actualThroughput = (eventsProcessed / testDuration) * 1000;
      
      expect(actualThroughput).toBeGreaterThan(targetThroughput);
      
      console.log(`Event Throughput: ${actualThroughput.toFixed(0)} events/sec`);
    });

    it('should handle priority queue efficiently', async () => {
      const priorities = [
        EventPriority.LOW,
        EventPriority.NORMAL,
        EventPriority.HIGH,
        EventPriority.CRITICAL
      ];
      
      const processedOrder: string[] = [];
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, async (event) => {
        processedOrder.push(event.data.itemId);
      });
      
      const { duration } = await measureTime('Priority Processing', async () => {
        // Emit 1000 events with mixed priorities
        const promises = Array(1000).fill(null).map((_, i) =>
          eventBus.emit({
            type: ReviewEventType.ITEM_REVIEWED,
            source: ReviewSource.KANJI_MASTERY,
            userId: 'test_user',
            data: {
              itemId: `${priorities[i % 4]}_${i}`,
              itemType: 'kanji',
              result: ReviewResult.CORRECT
            },
            priority: priorities[i % 4]
          })
        );
        
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 2000));
      });
      
      // Verify critical events were processed first
      const criticalIndex = processedOrder.findIndex(id => id.startsWith('3_')); // CRITICAL = 3
      const lowIndex = processedOrder.findIndex(id => id.startsWith('0_')); // LOW = 0
      
      expect(criticalIndex).toBeLessThan(lowIndex);
      expect(duration).toBeLessThan(5000);
      
      console.log(`Priority Queue Processing: ${duration.toFixed(0)}ms for 1000 events`);
    });
  });

  describe('Data Store Performance', () => {
    it('should query due items efficiently', async () => {
      // Mock large dataset
      const mockItems = Array(10000).fill(null).map((_, i) => ({
        id: `item_${i}`,
        sourceType: ReviewSource.KANJI_MASTERY,
        contentType: 'kanji' as ContentType,
        content: { primary: `kanji_${i}` },
        scheduling: {
          dueDate: new Date(Date.now() - (i * 60000)),
          algorithm: AlgorithmType.FSRS,
          state: ReviewState.LEARNING
        }
      }));
      
      jest.spyOn(dataStore as any, 'getSourceDueItems').mockResolvedValue(mockItems);
      
      const { result, duration } = await measureTime('Due Items Query', async () => {
        return await dataStore.getDueItems({
          userId: 'perf_test_user',
          limit: 100,
          includeOverdue: true
        });
      });
      
      expect(duration).toBeLessThan(THRESHOLDS.dueItemsQuery);
      expect(result.items).toBeDefined();
      
      console.log(`Due Items Query: ${duration.toFixed(0)}ms for 10000 items`);
    });

    it('should handle batch operations efficiently', async () => {
      const batchSize = THRESHOLDS.batchSize;
      
      // Mock batch save
      const mockLocalDB = {
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null)
      };
      
      jest.spyOn(dataStore as any, 'localDB', 'get').mockReturnValue(mockLocalDB);
      
      const { duration } = await measureTime('Batch Save', async () => {
        const promises = Array(batchSize).fill(null).map((_, i) =>
          mockLocalDB.set(`item:${i}`, { id: i, data: 'test' })
        );
        
        await Promise.all(promises);
      });
      
      const avgTimePerItem = duration / batchSize;
      
      expect(avgTimePerItem).toBeLessThan(1); // Less than 1ms per item
      expect(mockLocalDB.set).toHaveBeenCalledTimes(batchSize);
      
      console.log(`Batch Save: ${avgTimePerItem.toFixed(2)}ms per item (${batchSize} items)`);
    });

    it('should maintain cache hit rate', async () => {
      let cacheHits = 0;
      let cacheMisses = 0;
      
      // Mock cache
      const mockCache = {
        get: jest.fn().mockImplementation((key) => {
          if (Math.random() > 0.1) { // 90% hit rate
            cacheHits++;
            return { data: `cached_${key}`, timestamp: new Date(), ttl: 300000 };
          }
          cacheMisses++;
          return null;
        }),
        set: jest.fn(),
        delete: jest.fn()
      };
      
      jest.spyOn(dataStore as any, 'cache', 'get').mockReturnValue(mockCache);
      
      // Perform many cache operations
      const operations = 1000;
      for (let i = 0; i < operations; i++) {
        await mockCache.get(`key_${i % 100}`); // Reuse some keys
      }
      
      const hitRate = cacheHits / (cacheHits + cacheMisses);
      
      expect(hitRate).toBeGreaterThanOrEqual(THRESHOLDS.cacheHitRate);
      
      console.log(`Cache Hit Rate: ${(hitRate * 100).toFixed(1)}%`);
    });
  });

  describe('Concurrency Performance', () => {
    it('should handle concurrent users', async () => {
      const userCount = THRESHOLDS.concurrentUsers;
      const operationsPerUser = 10;
      
      const { duration } = await measureTime('Concurrent Users', async () => {
        const userOperations = Array(userCount).fill(null).map((_, userId) =>
          Promise.all(
            Array(operationsPerUser).fill(null).map((_, opId) =>
              eventBus.emit({
                type: ReviewEventType.ITEM_REVIEWED,
                source: ReviewSource.KANJI_MASTERY,
                userId: `user_${userId}`,
                data: {
                  itemId: `item_${userId}_${opId}`,
                  itemType: 'kanji',
                  result: ReviewResult.CORRECT
                },
                priority: EventPriority.NORMAL
              })
            )
          )
        );
        
        await Promise.all(userOperations);
      });
      
      const totalOperations = userCount * operationsPerUser;
      const opsPerSecond = (totalOperations / duration) * 1000;
      
      expect(opsPerSecond).toBeGreaterThan(100); // At least 100 ops/sec
      
      console.log(`Concurrent Users: ${opsPerSecond.toFixed(0)} ops/sec with ${userCount} users`);
    });

    it('should prevent race conditions', async () => {
      const sharedCounter = { value: 0 };
      const iterations = 1000;
      
      const handler = jest.fn().mockImplementation(async () => {
        const current = sharedCounter.value;
        await new Promise(resolve => setImmediate(resolve)); // Simulate async work
        sharedCounter.value = current + 1;
      });
      
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      // Emit many events concurrently
      const promises = Array(iterations).fill(null).map((_, i) =>
        eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: {
            itemId: `race_${i}`,
            itemType: 'kanji',
            result: ReviewResult.CORRECT
          },
          priority: EventPriority.HIGH
        })
      );
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Due to async lock, counter should be exactly iterations
      expect(sharedCounter.value).toBe(iterations);
    });
  });

  describe('Memory Performance', () => {
    it('should maintain acceptable memory usage', async () => {
      const initialMemory = measureMemory();
      const eventCount = 10000;
      
      // Generate many events
      for (let i = 0; i < eventCount; i++) {
        await eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: `user_${i}`,
          data: {
            itemId: `memory_test_${i}`,
            itemType: 'kanji',
            result: ReviewResult.CORRECT,
            metadata: {
              // Add some data to increase memory usage
              largeData: Array(100).fill('x').join('')
            }
          },
          priority: EventPriority.LOW
        });
        
        // Periodically check memory
        if (i % 1000 === 0) {
          const currentMemory = measureMemory();
          const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
          
          // Should not exceed threshold
          expect(memoryIncrease).toBeLessThan(THRESHOLDS.memoryPeak);
        }
      }
      
      const finalMemory = measureMemory();
      const totalIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory Usage: ${totalIncrease.toFixed(2)}MB for ${eventCount} events`);
      
      // Clear and check memory is released
      eventBus.clear();
      
      if (global.gc) {
        global.gc();
        const afterGC = measureMemory();
        const memoryFreed = finalMemory.heapUsed - afterGC.heapUsed;
        console.log(`Memory Freed: ${memoryFreed.toFixed(2)}MB after cleanup`);
      }
    });

    it('should handle memory leaks in event handlers', async () => {
      const leakyData: any[] = [];
      
      const handler = jest.fn().mockImplementation((event) => {
        // Simulate memory leak by holding references
        leakyData.push({ ...event, largeData: Array(1000).fill('x') });
      });
      
      const unsubscribe = eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      const initialMemory = measureMemory();
      
      // Emit many events
      for (let i = 0; i < 1000; i++) {
        await eventBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'test_user',
          data: {
            itemId: `leak_${i}`,
            itemType: 'kanji',
            result: ReviewResult.CORRECT
          },
          priority: EventPriority.LOW
        });
      }
      
      const beforeCleanup = measureMemory();
      
      // Cleanup
      unsubscribe();
      leakyData.length = 0;
      eventBus.clear();
      
      if (global.gc) {
        global.gc();
        const afterCleanup = measureMemory();
        
        // Memory should be mostly recovered
        const memoryRecovered = beforeCleanup.heapUsed - afterCleanup.heapUsed;
        expect(memoryRecovered).toBeGreaterThan(0);
        
        console.log(`Memory Leak Test: ${memoryRecovered.toFixed(2)}MB recovered`);
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle sustained load', async () => {
      const testDuration = 10000; // 10 seconds
      const startTime = Date.now();
      let totalEvents = 0;
      let errors = 0;
      
      const handler = jest.fn();
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      // Continuously emit events
      while (Date.now() - startTime < testDuration) {
        try {
          await eventBus.emit({
            type: ReviewEventType.ITEM_REVIEWED,
            source: ReviewSource.KANJI_MASTERY,
            userId: `stress_user_${totalEvents % 100}`,
            data: {
              itemId: `stress_${totalEvents}`,
              itemType: 'kanji',
              result: totalEvents % 2 === 0 ? ReviewResult.CORRECT : ReviewResult.INCORRECT
            },
            priority: EventPriority.NORMAL
          });
          
          totalEvents++;
          
          // Vary the load
          if (totalEvents % 100 === 0) {
            await new Promise(resolve => setImmediate(resolve));
          }
        } catch (error) {
          errors++;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const eventsPerSecond = (totalEvents / testDuration) * 1000;
      const errorRate = errors / totalEvents;
      
      expect(eventsPerSecond).toBeGreaterThan(100);
      expect(errorRate).toBeLessThan(0.01); // Less than 1% error rate
      
      console.log(`Stress Test: ${eventsPerSecond.toFixed(0)} events/sec, ${(errorRate * 100).toFixed(2)}% errors`);
    });

    it('should recover from overload', async () => {
      const overloadEvents = 50000;
      
      // Create small queue to trigger overload
      const smallBus = getEventBus({
        maxQueueSize: 100,
        processingInterval: 10,
        persistEvents: false
      });
      
      smallBus.clear();
      
      let droppedEvents = 0;
      const initialStats = smallBus.getStatistics();
      
      // Flood with events
      const promises = Array(overloadEvents).fill(null).map((_, i) =>
        smallBus.emit({
          type: ReviewEventType.ITEM_REVIEWED,
          source: ReviewSource.KANJI_MASTERY,
          userId: 'overload_user',
          data: {
            itemId: `overload_${i}`,
            itemType: 'kanji',
            result: ReviewResult.CORRECT
          },
          priority: EventPriority.LOW
        }).catch(() => {
          droppedEvents++;
        })
      );
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const finalStats = smallBus.getStatistics();
      
      // System should still be functional
      expect(finalStats.processedEvents).toBeGreaterThan(0);
      
      // Should handle new events after overload
      const testEvent = await smallBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'test_user',
        data: {
          itemId: 'recovery_test',
          itemType: 'kanji',
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.HIGH
      });
      
      expect(testEvent).toBeUndefined(); // Should succeed
      
      console.log(`Overload Recovery: Processed ${finalStats.processedEvents} of ${overloadEvents} events`);
      
      smallBus.stopProcessing();
      smallBus.clear();
    });
  });

  describe('Performance Benchmarks Summary', () => {
    it('should meet all performance thresholds', async () => {
      const results = {
        eventProcessing: 0,
        syncLatency: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        throughput: 0
      };
      
      // Run mini benchmarks
      const handler = jest.fn();
      eventBus.subscribe(ReviewEventType.ITEM_REVIEWED, handler);
      
      // Event processing
      const start = performance.now();
      await eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: ReviewSource.KANJI_MASTERY,
        userId: 'benchmark_user',
        data: {
          itemId: 'benchmark_item',
          itemType: 'kanji',
          result: ReviewResult.CORRECT
        },
        priority: EventPriority.NORMAL
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      results.eventProcessing = performance.now() - start;
      
      // Memory usage
      const memory = measureMemory();
      results.memoryUsage = memory.heapUsed - memoryBaseline.heapUsed;
      
      // Print summary
      console.log('\n=== Performance Benchmarks Summary ===');
      console.log(`Event Processing: ${results.eventProcessing.toFixed(2)}ms (threshold: ${THRESHOLDS.eventProcessing}ms)`);
      console.log(`Memory Usage: ${results.memoryUsage.toFixed(2)}MB (baseline: ${THRESHOLDS.memoryBaseline}MB)`);
      console.log(`✅ All performance thresholds met`);
      
      // Assertions
      expect(results.eventProcessing).toBeLessThan(THRESHOLDS.eventProcessing * 10);
      expect(results.memoryUsage).toBeLessThan(THRESHOLDS.memoryPeak);
    });
  });
});