/**
 * Unified Data Store Unit Tests
 * Comprehensive test coverage for the central data management
 */

import { UnifiedReviewDataStore, getUnifiedDataStore } from '../UnifiedDataStore';
import {
  UnifiedReviewItem,
  RecordReviewParams,
  GetDueItemsParams,
  ConflictStrategy,
  ReviewState,
  AlgorithmType,
  ContentType
} from '../types';
import { ReviewSource, ReviewResult } from '../../review-events/types';

// Mock adapters
jest.mock('../adapters/IndexedDBAdapter');
jest.mock('../adapters/FirebaseAdapter');
jest.mock('../adapters/MemoryCacheAdapter');
jest.mock('../SyncEngine');
jest.mock('../TransactionManager');

describe('UnifiedReviewDataStore', () => {
  let dataStore: UnifiedReviewDataStore;
  
  // Mock data
  const mockItem: UnifiedReviewItem = {
    id: 'test_item_1',
    sourceId: 'test_item_1',
    sourceType: ReviewSource.KANJI_MASTERY,
    contentType: 'kanji' as ContentType,
    content: {
      primary: '漢',
      secondary: 'かん',
      meaning: 'Chinese character'
    },
    scheduling: {
      algorithm: AlgorithmType.FSRS,
      dueDate: new Date(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      state: ReviewState.NEW,
      nextReviewAt: new Date()
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['jlpt-n5'],
      properties: {}
    },
    sync: {
      version: 1,
      localChanges: false,
      remoteChanges: false
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create new instance for each test
    dataStore = UnifiedReviewDataStore.getInstance({
      enableSync: false, // Disable sync for unit tests
      enableTransactions: true,
      conflictStrategy: ConflictStrategy.LAST_WRITE_WINS
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UnifiedReviewDataStore.getInstance();
      const instance2 = UnifiedReviewDataStore.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should work with helper function', () => {
      const instance1 = getUnifiedDataStore();
      const instance2 = getUnifiedDataStore();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Record Review', () => {
    it('should record a review successfully', async () => {
      const params: RecordReviewParams = {
        userId: 'test_user',
        itemId: 'test_item_1',
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT,
        duration: 2500,
        subscriptionTier: 'free',
        metadata: { testRun: true }
      };
      
      // Mock the internal methods
      const getItemSpy = jest.spyOn(dataStore as any, 'getItem')
        .mockResolvedValue(mockItem);
      const saveToLocalSpy = jest.spyOn(dataStore as any, 'saveToLocal')
        .mockResolvedValue(mockItem);
      const emitReviewEventSpy = jest.spyOn(dataStore as any, 'emitReviewEvent')
        .mockResolvedValue(undefined);
      const invalidateCacheSpy = jest.spyOn(dataStore as any, 'invalidateCache')
        .mockResolvedValue(undefined);
      
      const result = await dataStore.recordReview(params);
      
      expect(result).toMatchObject({
        itemId: 'test_item_1',
        success: true,
        nextReviewDate: expect.any(Date),
        interval: expect.any(Number),
        easeFactor: expect.any(Number),
        repetitions: expect.any(Number)
      });
      
      expect(getItemSpy).toHaveBeenCalledWith('test_item_1');
      expect(saveToLocalSpy).toHaveBeenCalled();
      expect(emitReviewEventSpy).toHaveBeenCalledWith(params, expect.any(Object));
      expect(invalidateCacheSpy).toHaveBeenCalledWith('test_item_1');
    });

    it('should handle incorrect reviews', async () => {
      const params: RecordReviewParams = {
        userId: 'test_user',
        itemId: 'test_item_1',
        source: ReviewSource.FLASHCARDS,
        result: ReviewResult.INCORRECT,
        duration: 3000
      };
      
      jest.spyOn(dataStore as any, 'getItem').mockResolvedValue(mockItem);
      jest.spyOn(dataStore as any, 'saveToLocal').mockResolvedValue(mockItem);
      jest.spyOn(dataStore as any, 'emitReviewEvent').mockResolvedValue(undefined);
      jest.spyOn(dataStore as any, 'invalidateCache').mockResolvedValue(undefined);
      
      const result = await dataStore.recordReview(params);
      
      expect(result.success).toBe(true);
      // For incorrect reviews, interval should reset
      expect(result.interval).toBe(1);
    });

    it('should throw error for non-existent item', async () => {
      const params: RecordReviewParams = {
        userId: 'test_user',
        itemId: 'non_existent',
        source: ReviewSource.DRILL_PRACTICE,
        result: ReviewResult.CORRECT
      };
      
      jest.spyOn(dataStore as any, 'getItem').mockResolvedValue(null);
      
      await expect(dataStore.recordReview(params)).rejects.toThrow('Item not found');
    });
  });

  describe('Get Due Items', () => {
    it('should get due items with caching', async () => {
      const params: GetDueItemsParams = {
        userId: 'test_user',
        sources: [ReviewSource.KANJI_MASTERY],
        limit: 10,
        forceRefresh: false
      };
      
      const mockDueItems = {
        items: [mockItem],
        total: 1,
        overdue: 0,
        dueToday: 1,
        dueTomorrow: 0,
        sources: { [ReviewSource.KANJI_MASTERY]: 1 },
        nextReviewTime: new Date()
      };
      
      // Mock cache miss
      jest.spyOn(dataStore as any, 'getFromCache').mockResolvedValue(null);
      jest.spyOn(dataStore as any, 'getAllSources').mockReturnValue([ReviewSource.KANJI_MASTERY]);
      jest.spyOn(dataStore as any, 'getSourceDueItems').mockResolvedValue([mockItem]);
      jest.spyOn(dataStore as any, 'mergeAndDeduplicate').mockReturnValue([mockItem]);
      jest.spyOn(dataStore as any, 'applySchedulingAlgorithm').mockResolvedValue([mockItem]);
      jest.spyOn(dataStore as any, 'setCache').mockResolvedValue(undefined);
      
      const result = await dataStore.getDueItems(params);
      
      expect(result).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        overdue: expect.any(Number),
        dueToday: expect.any(Number),
        dueTomorrow: expect.any(Number),
        sources: expect.any(Object)
      });
    });

    it('should use cache when available', async () => {
      const params: GetDueItemsParams = {
        userId: 'test_user',
        forceRefresh: false
      };
      
      const cachedData = {
        items: [mockItem],
        total: 1,
        overdue: 0,
        dueToday: 1,
        dueTomorrow: 0,
        sources: {},
        nextReviewTime: new Date()
      };
      
      const getFromCacheSpy = jest.spyOn(dataStore as any, 'getFromCache')
        .mockResolvedValue(cachedData);
      
      const result = await dataStore.getDueItems(params);
      
      expect(result).toEqual(cachedData);
      expect(getFromCacheSpy).toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      const params: GetDueItemsParams = {
        userId: 'test_user',
        forceRefresh: true
      };
      
      const getFromCacheSpy = jest.spyOn(dataStore as any, 'getFromCache');
      jest.spyOn(dataStore as any, 'getAllSources').mockReturnValue([]);
      jest.spyOn(dataStore as any, 'mergeAndDeduplicate').mockReturnValue([]);
      jest.spyOn(dataStore as any, 'applySchedulingAlgorithm').mockResolvedValue([]);
      jest.spyOn(dataStore as any, 'setCache').mockResolvedValue(undefined);
      
      await dataStore.getDueItems(params);
      
      // Should not check cache when forceRefresh is true
      expect(getFromCacheSpy).not.toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts with LAST_WRITE_WINS', async () => {
      const localItem = { ...mockItem, metadata: { ...mockItem.metadata, updatedAt: new Date('2024-01-01') } };
      const remoteItem = { ...mockItem, metadata: { ...mockItem.metadata, updatedAt: new Date('2024-01-02') } };
      
      const result = await dataStore.resolveConflict(localItem, remoteItem);
      
      // Remote has later update time, should win
      expect(result).toEqual(remoteItem);
    });

    it('should merge review data when strategy is MERGE', async () => {
      const dataStoreWithMerge = UnifiedReviewDataStore.getInstance({
        conflictStrategy: ConflictStrategy.MERGE,
        enableSync: false
      });
      
      const localItem = {
        ...mockItem,
        scheduling: { ...mockItem.scheduling, repetitions: 5, lastReviewedAt: new Date('2024-01-02') }
      };
      const remoteItem = {
        ...mockItem,
        scheduling: { ...mockItem.scheduling, repetitions: 3, lastReviewedAt: new Date('2024-01-01') }
      };
      
      const result = await dataStoreWithMerge.resolveConflict(localItem, remoteItem);
      
      // Should take the higher repetition count and later review date
      expect(result.scheduling.repetitions).toBe(5);
      expect(result.scheduling.lastReviewedAt).toEqual(localItem.scheduling.lastReviewedAt);
    });

    it('should emit event for USER_DECIDES strategy', async () => {
      const dataStoreWithUserDecides = UnifiedReviewDataStore.getInstance({
        conflictStrategy: ConflictStrategy.USER_DECIDES,
        enableSync: false
      });
      
      const eventBusSpy = jest.spyOn((dataStoreWithUserDecides as any).eventBus, 'emit')
        .mockResolvedValue(undefined);
      
      await dataStoreWithUserDecides.resolveConflict(mockItem, mockItem);
      
      expect(eventBusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              local: expect.any(Object),
              remote: expect.any(Object)
            })
          })
        })
      );
    });
  });

  describe('Sync Operations', () => {
    it('should throw error when sync is disabled', async () => {
      const dataStoreNoSync = UnifiedReviewDataStore.getInstance({
        enableSync: false
      });
      
      await expect(dataStoreNoSync.performSync('test_user'))
        .rejects.toThrow('Sync is not enabled');
    });

    it('should emit sync events during sync', async () => {
      const dataStoreWithSync = UnifiedReviewDataStore.getInstance({
        enableSync: true
      });
      
      const eventBusSpy = jest.spyOn((dataStoreWithSync as any).eventBus, 'emit')
        .mockResolvedValue(undefined);
      
      const syncEngineSpy = jest.spyOn((dataStoreWithSync as any).syncEngine, 'performSync')
        .mockResolvedValue({
          success: true,
          syncId: 'sync_123',
          itemsSynced: 10,
          conflictsResolved: 2,
          duration: 1000
        });
      
      await dataStoreWithSync.performSync('test_user');
      
      // Should emit SYNC_STARTED and SYNC_COMPLETED
      expect(eventBusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync.started'
        })
      );
      expect(eventBusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync.completed'
        })
      );
      expect(syncEngineSpy).toHaveBeenCalledWith('test_user');
    });

    it('should handle sync failures', async () => {
      const dataStoreWithSync = UnifiedReviewDataStore.getInstance({
        enableSync: true
      });
      
      const eventBusSpy = jest.spyOn((dataStoreWithSync as any).eventBus, 'emit')
        .mockResolvedValue(undefined);
      
      jest.spyOn((dataStoreWithSync as any).syncEngine, 'performSync')
        .mockRejectedValue(new Error('Sync failed'));
      
      await expect(dataStoreWithSync.performSync('test_user'))
        .rejects.toThrow('Sync failed');
      
      // Should emit SYNC_FAILED
      expect(eventBusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync.failed'
        })
      );
    });
  });

  describe('Cache Management', () => {
    it('should generate correct cache keys', () => {
      const params: GetDueItemsParams = {
        userId: 'user_123',
        sources: [ReviewSource.KANJI_MASTERY, ReviewSource.FLASHCARDS],
        contentTypes: ['kanji', 'vocabulary'],
        limit: 50,
        offset: 10
      };
      
      const key = (dataStore as any).generateCacheKey(params);
      
      expect(key).toBe('due:user_123:kanji_mastery,flashcards:kanji,vocabulary:50:10');
    });

    it('should invalidate cache on review', async () => {
      const invalidateCacheSpy = jest.spyOn(dataStore as any, 'invalidateCache')
        .mockResolvedValue(undefined);
      
      jest.spyOn(dataStore as any, 'getItem').mockResolvedValue(mockItem);
      jest.spyOn(dataStore as any, 'saveToLocal').mockResolvedValue(mockItem);
      jest.spyOn(dataStore as any, 'emitReviewEvent').mockResolvedValue(undefined);
      
      await dataStore.recordReview({
        userId: 'test_user',
        itemId: 'test_item',
        source: ReviewSource.REVIEW_HUB,
        result: ReviewResult.CORRECT
      });
      
      expect(invalidateCacheSpy).toHaveBeenCalledWith('test_item');
    });
  });

  describe('Error Handling', () => {
    it('should rollback transaction on error', async () => {
      const transactionMock = {
        commit: jest.fn(),
        rollback: jest.fn(),
        addOperation: jest.fn()
      };
      
      jest.spyOn((dataStore as any).transactionManager, 'beginTransaction')
        .mockResolvedValue(transactionMock);
      
      jest.spyOn(dataStore as any, 'getItem')
        .mockRejectedValue(new Error('Database error'));
      
      await expect(dataStore.recordReview({
        userId: 'test_user',
        itemId: 'test_item',
        source: ReviewSource.REVIEW_HUB,
        result: ReviewResult.CORRECT
      })).rejects.toThrow();
      
      expect(transactionMock.rollback).toHaveBeenCalled();
      expect(transactionMock.commit).not.toHaveBeenCalled();
    });
  });
});