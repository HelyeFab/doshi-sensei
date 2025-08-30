/**
 * Comprehensive Unified Data Store Test Suite
 * Complete test coverage for production readiness
 */

import { UnifiedReviewDataStore, getUnifiedDataStore } from '../UnifiedDataStore';
import {
  UnifiedReviewItem,
  RecordReviewParams,
  GetDueItemsParams,
  ConflictStrategy,
  ContentType,
  ReviewState,
  AlgorithmType,
  StorageAdapter
} from '../types';
import { ReviewSource, ReviewResult, EventPriority } from '../../review-events/types';
import { IndexedDBAdapter } from '../adapters/IndexedDBAdapter';
import { MemoryCacheAdapter } from '../adapters/MemoryCacheAdapter';
import { FirebaseAdapter } from '../adapters/FirebaseAdapter';

// Mock adapters
jest.mock('../adapters/IndexedDBAdapter');
jest.mock('../adapters/FirebaseAdapter');
jest.mock('../adapters/MemoryCacheAdapter');
jest.mock('../../review-events/EventBus', () => ({
  getEventBus: jest.fn(() => ({
    emit: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(() => jest.fn())
  }))
}));

// Mock source connectors
jest.mock('../source-connectors', () => ({
  getKanjiMasteryItems: jest.fn().mockResolvedValue([]),
  getTextbookVocabularyItems: jest.fn().mockResolvedValue([]),
  getFlashcardItems: jest.fn().mockResolvedValue([]),
  getStudyListItems: jest.fn().mockResolvedValue([]),
  getDrillPracticeItems: jest.fn().mockResolvedValue([])
}));

describe('UnifiedReviewDataStore - Comprehensive Test Suite', () => {
  let dataStore: UnifiedReviewDataStore;
  let mockLocalDB: jest.Mocked<StorageAdapter>;
  let mockRemoteDB: jest.Mocked<StorageAdapter>;
  let mockCache: jest.Mocked<StorageAdapter>;

  const createMockItem = (id: string, overrides: Partial<UnifiedReviewItem> = {}): UnifiedReviewItem => ({
    id,
    sourceId: id,
    sourceType: ReviewSource.KANJI_MASTERY,
    userId: 'test_user',
    contentType: 'kanji' as ContentType,
    content: {
      primary: '食',
      secondary: 'eat, food',
      reading: 'たべる',
      metadata: {}
    },
    scheduling: {
      algorithm: AlgorithmType.FSRS,
      dueDate: new Date(),
      nextReviewAt: new Date(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      state: ReviewState.NEW,
      lastReviewedAt: undefined
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      lastReviewedAt: undefined,
      lastReviewSource: ReviewSource.KANJI_MASTERY,
      tags: [],
      properties: {}
    },
    sync: {
      version: 1,
      lastSyncedAt: new Date(),
      localChanges: false,
      remoteChanges: false,
      conflictStatus: 'none'
    },
    ...overrides
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock adapters
    mockLocalDB = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      batch: jest.fn(),
      query: jest.fn()
    } as any;
    
    mockRemoteDB = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      batch: jest.fn(),
      query: jest.fn()
    } as any;
    
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      batch: jest.fn(),
      query: jest.fn()
    } as any;
    
    // Configure mock implementations
    (IndexedDBAdapter as jest.Mock).mockImplementation(() => mockLocalDB);
    (FirebaseAdapter as jest.Mock).mockImplementation(() => mockRemoteDB);
    (MemoryCacheAdapter as jest.Mock).mockImplementation(() => mockCache);
    
    // Create data store instance
    dataStore = UnifiedReviewDataStore.getInstance({
      localDB: mockLocalDB,
      remoteDB: mockRemoteDB,
      cache: mockCache,
      enableSync: false,
      enableTransactions: true,
      conflictStrategy: ConflictStrategy.LAST_WRITE_WINS
    });
  });

  describe('Core Functionality', () => {
    it('should maintain singleton instance', () => {
      const instance1 = UnifiedReviewDataStore.getInstance();
      const instance2 = UnifiedReviewDataStore.getInstance();
      const instance3 = getUnifiedDataStore();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(instance3);
    });

    it('should record review successfully', async () => {
      const mockItem = createMockItem('test_item_1');
      mockLocalDB.get.mockResolvedValue(mockItem);
      mockLocalDB.set.mockResolvedValue(undefined);
      
      const result = await dataStore.recordReview({
        userId: 'test_user',
        itemId: 'test_item_1',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT,
        timeSpent: 5000,
        duration: 5000,
        metadata: { test: true }
      });
      
      expect(result.success).toBe(true);
      expect(result.itemId).toBe('test_item_1');
      expect(result.nextReviewDate).toBeInstanceOf(Date);
      expect(mockLocalDB.set).toHaveBeenCalled();
    });

    it('should handle review failure gracefully', async () => {
      mockLocalDB.get.mockResolvedValue(null);
      
      await expect(dataStore.recordReview({
        userId: 'test_user',
        itemId: 'non_existent',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT
      })).rejects.toThrow('Item not found');
    });

    it('should get due items with aggregation', async () => {
      const mockItems = [
        createMockItem('item_1', {
          scheduling: {
            ...createMockItem('item_1').scheduling,
            dueDate: new Date(Date.now() - 86400000) // Yesterday
          }
        }),
        createMockItem('item_2', {
          scheduling: {
            ...createMockItem('item_2').scheduling,
            dueDate: new Date() // Today
          }
        }),
        createMockItem('item_3', {
          scheduling: {
            ...createMockItem('item_3').scheduling,
            dueDate: new Date(Date.now() + 86400000) // Tomorrow
          }
        })
      ];
      
      // Mock source connector responses
      const sourceConnectors = require('../source-connectors');
      sourceConnectors.getKanjiMasteryItems.mockResolvedValue(mockItems);
      
      const result = await dataStore.getDueItems({
        userId: 'test_user',
        sources: [ReviewSource.KANJI_MASTERY],
        includeOverdue: true
      });
      
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.overdue).toBe(1);
      expect(result.dueToday).toBe(1);
      expect(result.dueTomorrow).toBe(1);
    });
  });

  describe('Caching', () => {
    it('should use cache for due items', async () => {
      const cachedData = {
        items: [createMockItem('cached_item')],
        total: 1,
        overdue: 0,
        dueToday: 1,
        dueTomorrow: 0,
        sources: { [ReviewSource.KANJI_MASTERY]: 1 },
        nextReviewTime: new Date()
      };
      
      mockCache.get.mockResolvedValue({
        data: cachedData,
        timestamp: new Date(),
        ttl: 300000,
        hits: 5
      });
      
      const result = await dataStore.getDueItems({
        userId: 'test_user'
      });
      
      expect(result).toEqual(cachedData);
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('should invalidate cache after review', async () => {
      const mockItem = createMockItem('test_item');
      mockLocalDB.get.mockResolvedValue(mockItem);
      
      await dataStore.recordReview({
        userId: 'test_user',
        itemId: 'test_item',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT
      });
      
      expect(mockCache.delete).toHaveBeenCalledWith(expect.stringContaining('test_item'));
    });

    it('should refresh cache when forced', async () => {
      mockCache.get.mockResolvedValue({
        data: { items: [], total: 0 },
        timestamp: new Date(),
        ttl: 300000,
        hits: 1
      });
      
      const sourceConnectors = require('../source-connectors');
      sourceConnectors.getKanjiMasteryItems.mockResolvedValue([createMockItem('new_item')]);
      
      const result = await dataStore.getDueItems({
        userId: 'test_user',
        forceRefresh: true
      });
      
      expect(sourceConnectors.getKanjiMasteryItems).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts with last write wins', async () => {
      const localItem = createMockItem('conflict_item', {
        metadata: {
          ...createMockItem('conflict_item').metadata,
          updatedAt: new Date('2024-01-02')
        }
      });
      
      const remoteItem = createMockItem('conflict_item', {
        metadata: {
          ...createMockItem('conflict_item').metadata,
          updatedAt: new Date('2024-01-01')
        }
      });
      
      const resolved = await dataStore.resolveConflict(localItem, remoteItem);
      
      expect(resolved).toEqual(localItem);
    });

    it('should resolve conflicts with merge strategy', async () => {
      const store = UnifiedReviewDataStore.getInstance({
        conflictStrategy: ConflictStrategy.MERGE
      });
      
      const localItem = createMockItem('merge_item', {
        scheduling: { ...createMockItem('merge_item').scheduling, repetitions: 5 },
        metadata: { ...createMockItem('merge_item').metadata, tags: ['local'] }
      });
      
      const remoteItem = createMockItem('merge_item', {
        scheduling: { ...createMockItem('merge_item').scheduling, repetitions: 3 },
        metadata: { ...createMockItem('merge_item').metadata, tags: ['remote'] }
      });
      
      const resolved = await store.resolveConflict(localItem, remoteItem);
      
      expect(resolved.scheduling.repetitions).toBe(5); // Higher value
      expect(resolved.metadata.tags).toContain('local');
      expect(resolved.metadata.tags).toContain('remote');
    });

    it('should use remote wins strategy', async () => {
      const store = UnifiedReviewDataStore.getInstance({
        conflictStrategy: ConflictStrategy.REMOTE_WINS
      });
      
      const localItem = createMockItem('remote_wins_item');
      const remoteItem = createMockItem('remote_wins_item', {
        content: { ...createMockItem('remote_wins_item').content, primary: '飲' }
      });
      
      const resolved = await store.resolveConflict(localItem, remoteItem);
      
      expect(resolved).toEqual(remoteItem);
    });

    it('should use local wins strategy', async () => {
      const store = UnifiedReviewDataStore.getInstance({
        conflictStrategy: ConflictStrategy.LOCAL_WINS
      });
      
      const localItem = createMockItem('local_wins_item');
      const remoteItem = createMockItem('local_wins_item', {
        content: { ...createMockItem('local_wins_item').content, primary: '飲' }
      });
      
      const resolved = await store.resolveConflict(localItem, remoteItem);
      
      expect(resolved).toEqual(localItem);
    });
  });

  describe('Synchronization', () => {
    it('should perform sync when enabled', async () => {
      const store = UnifiedReviewDataStore.getInstance({
        enableSync: true,
        localDB: mockLocalDB,
        remoteDB: mockRemoteDB,
        cache: mockCache
      });
      
      await store.performSync('test_user');
      
      // Verify sync events were emitted
      const eventBus = require('../../review-events/EventBus').getEventBus();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync.started'
        })
      );
    });

    it('should handle sync failures', async () => {
      const store = UnifiedReviewDataStore.getInstance({
        enableSync: true
      });
      
      // Mock sync engine to throw error
      jest.spyOn(store as any, 'syncEngine', 'get').mockReturnValue({
        performSync: jest.fn().mockRejectedValue(new Error('Sync failed'))
      });
      
      await expect(store.performSync('test_user')).rejects.toThrow('Sync failed');
      
      // Verify failure event was emitted
      const eventBus = require('../../review-events/EventBus').getEventBus();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync.failed'
        })
      );
    });
  });

  describe('Transaction Support', () => {
    it('should commit transaction on success', async () => {
      const mockItem = createMockItem('transaction_item');
      mockLocalDB.get.mockResolvedValue(mockItem);
      
      const result = await dataStore.recordReview({
        userId: 'test_user',
        itemId: 'transaction_item',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT
      });
      
      expect(result.success).toBe(true);
      expect(mockLocalDB.set).toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      mockLocalDB.get.mockResolvedValue(null); // Item not found
      
      try {
        await dataStore.recordReview({
          userId: 'test_user',
          itemId: 'non_existent',
          source: ReviewSource.KANJI_MASTERY,
          result: ReviewResult.INCORRECT
        });
      } catch (error) {
        // Transaction should be rolled back
      }
      
      // Verify no data was written
      expect(mockLocalDB.set).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should calculate completed today count', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      mockCache.get.mockResolvedValue({ completed: 42 });
      
      const count = await dataStore.getCompletedToday('test_user');
      
      expect(count).toBe(42);
      expect(mockCache.get).toHaveBeenCalledWith(
        expect.stringContaining('stats:test_user')
      );
    });

    it('should get current streak', async () => {
      mockCache.get.mockResolvedValue(7);
      
      const streak = await dataStore.getCurrentStreak('test_user');
      
      expect(streak).toBe(7);
      expect(mockCache.get).toHaveBeenCalledWith('streak:test_user');
    });

    it('should handle missing stats gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const count = await dataStore.getCompletedToday('test_user');
      const streak = await dataStore.getCurrentStreak('test_user');
      
      expect(count).toBe(0);
      expect(streak).toBe(0);
    });
  });

  describe('Source Aggregation', () => {
    it('should aggregate from multiple sources', async () => {
      const sourceConnectors = require('../source-connectors');
      
      sourceConnectors.getKanjiMasteryItems.mockResolvedValue([
        createMockItem('kanji_1', { sourceType: ReviewSource.KANJI_MASTERY })
      ]);
      
      sourceConnectors.getTextbookVocabularyItems.mockResolvedValue([
        createMockItem('vocab_1', { 
          sourceType: ReviewSource.TEXTBOOK_VOCAB,
          contentType: 'vocabulary' as ContentType
        })
      ]);
      
      sourceConnectors.getFlashcardItems.mockResolvedValue([
        createMockItem('card_1', {
          sourceType: ReviewSource.FLASHCARDS,
          contentType: 'flashcard' as ContentType
        })
      ]);
      
      const result = await dataStore.getDueItems({
        userId: 'test_user',
        sources: [
          ReviewSource.KANJI_MASTERY,
          ReviewSource.TEXTBOOK_VOCAB,
          ReviewSource.FLASHCARDS
        ]
      });
      
      expect(result.items).toHaveLength(3);
      expect(result.sources[ReviewSource.KANJI_MASTERY]).toBe(1);
      expect(result.sources[ReviewSource.TEXTBOOK_VOCAB]).toBe(1);
      expect(result.sources[ReviewSource.FLASHCARDS]).toBe(1);
    });

    it('should deduplicate items', async () => {
      const duplicateItem = createMockItem('duplicate_item');
      
      const sourceConnectors = require('../source-connectors');
      sourceConnectors.getKanjiMasteryItems.mockResolvedValue([duplicateItem]);
      sourceConnectors.getTextbookVocabularyItems.mockResolvedValue([duplicateItem]);
      
      const result = await dataStore.getDueItems({
        userId: 'test_user',
        sources: [ReviewSource.KANJI_MASTERY, ReviewSource.TEXTBOOK_VOCAB]
      });
      
      expect(result.items).toHaveLength(1);
    });

    it('should apply limit and offset', async () => {
      const items = Array(20).fill(null).map((_, i) => 
        createMockItem(`item_${i}`)
      );
      
      const sourceConnectors = require('../source-connectors');
      sourceConnectors.getKanjiMasteryItems.mockResolvedValue(items);
      
      const result = await dataStore.getDueItems({
        userId: 'test_user',
        sources: [ReviewSource.KANJI_MASTERY],
        limit: 5,
        offset: 10
      });
      
      expect(result.items).toHaveLength(5);
      expect(result.items[0].id).toBe('item_10');
    });
  });

  describe('Review Algorithm', () => {
    it('should update scheduling for correct answer', async () => {
      const mockItem = createMockItem('algo_item', {
        scheduling: {
          ...createMockItem('algo_item').scheduling,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0
        }
      });
      
      mockLocalDB.get.mockResolvedValue(mockItem);
      mockLocalDB.set.mockImplementation(async (key, value) => value);
      
      await dataStore.recordReview({
        userId: 'test_user',
        itemId: 'algo_item',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT
      });
      
      const savedItem = mockLocalDB.set.mock.calls[0][1];
      expect(savedItem.scheduling.repetitions).toBe(1);
      expect(savedItem.scheduling.interval).toBeGreaterThan(1);
      expect(savedItem.scheduling.easeFactor).toBeGreaterThanOrEqual(2.5);
    });

    it('should reset scheduling for incorrect answer', async () => {
      const mockItem = createMockItem('reset_item', {
        scheduling: {
          ...createMockItem('reset_item').scheduling,
          interval: 10,
          easeFactor: 2.5,
          repetitions: 5
        }
      });
      
      mockLocalDB.get.mockResolvedValue(mockItem);
      mockLocalDB.set.mockImplementation(async (key, value) => value);
      
      await dataStore.recordReview({
        userId: 'test_user',
        itemId: 'reset_item',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.INCORRECT
      });
      
      const savedItem = mockLocalDB.set.mock.calls[0][1];
      expect(savedItem.scheduling.repetitions).toBe(0);
      expect(savedItem.scheduling.interval).toBe(1);
      expect(savedItem.scheduling.easeFactor).toBeLessThan(2.5);
      expect(savedItem.scheduling.lapses).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockLocalDB.get.mockRejectedValue(new Error('Database error'));
      
      await expect(dataStore.recordReview({
        userId: 'test_user',
        itemId: 'error_item',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT
      })).rejects.toThrow('Failed to record review');
    });

    it('should handle cache errors without failing', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));
      
      const sourceConnectors = require('../source-connectors');
      sourceConnectors.getKanjiMasteryItems.mockResolvedValue([createMockItem('item')]);
      
      const result = await dataStore.getDueItems({
        userId: 'test_user'
      });
      
      expect(result.items).toHaveLength(1);
    });

    it('should handle source connector failures', async () => {
      const sourceConnectors = require('../source-connectors');
      sourceConnectors.getKanjiMasteryItems.mockRejectedValue(new Error('Connector error'));
      sourceConnectors.getTextbookVocabularyItems.mockResolvedValue([createMockItem('vocab')]);
      
      const result = await dataStore.getDueItems({
        userId: 'test_user',
        sources: [ReviewSource.KANJI_MASTERY, ReviewSource.TEXTBOOK_VOCAB]
      });
      
      // Should still return items from working connectors
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('vocab');
    });
  });

  describe('Performance', () => {
    it('should batch save items efficiently', async () => {
      const items = Array(100).fill(null).map((_, i) => 
        createMockItem(`batch_item_${i}`)
      );
      
      const sourceConnectors = require('../source-connectors');
      sourceConnectors.getKanjiMasteryItems.mockResolvedValue(items);
      
      const start = Date.now();
      await dataStore.getDueItems({
        userId: 'test_user',
        sources: [ReviewSource.KANJI_MASTERY]
      });
      const duration = Date.now() - start;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
      
      // Should batch save to local DB
      expect(mockLocalDB.set).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent operations', async () => {
      const mockItem = createMockItem('concurrent_item');
      mockLocalDB.get.mockResolvedValue(mockItem);
      
      const promises = Array(10).fill(null).map(() =>
        dataStore.recordReview({
          userId: 'test_user',
          itemId: 'concurrent_item',
          source: ReviewSource.KANJI_MASTERY,
          result: ReviewResult.CORRECT
        })
      );
      
      const results = await Promise.allSettled(promises);
      
      // All should complete without errors
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});