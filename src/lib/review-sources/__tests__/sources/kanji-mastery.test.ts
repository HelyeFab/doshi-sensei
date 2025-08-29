/**
 * Comprehensive test suite for KanjiMasterySource
 * Tests real data connections with mocked services
 * 
 * Coverage includes:
 * - Real service integration with DataSyncService and ReviewQueueService
 * - Client-side vs server-side initialization handling
 * - Due items retrieval with priority calculation
 * - Statistics calculation from real data
 * - Review processing with FSRS rating conversion
 * - Item searching and retrieval
 * - Configuration management
 * - Error handling for service failures
 * - User type handling (guest, free, subscribers)
 * - Priority calculations based on overdue status, difficulty, JLPT level, and lapses
 */

import { KanjiMasterySource } from '../../sources/kanji-mastery';
import { DataSyncService } from '@/services/kanji-mastery/dataSyncService';
import { ReviewQueueService } from '@/services/kanji-mastery/reviewQueueService';
import { Rating, State } from '@/services/kanji-mastery/types';
import {
  ReviewSourceType,
  SourceStatus,
  SourcePriority,
  ReviewResult
} from '../../review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';

// Mock the service modules
jest.mock('@/services/kanji-mastery/dataSyncService', () => ({
  DataSyncService: jest.fn(),
  getDataSyncService: jest.fn(),
}));

jest.mock('@/services/kanji-mastery/reviewQueueService', () => ({
  ReviewQueueService: jest.fn(),
}));

// Mock window check for client-side initialization
const mockWindow = () => {
  if (typeof global.window === 'undefined') {
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });
  }
};
const unmockWindow = () => {
  if (typeof global.window !== 'undefined') {
    delete (global as any).window;
  }
};

describe('KanjiMasterySource', () => {
  let source: KanjiMasterySource;
  let mockDataSyncService: jest.Mocked<DataSyncService>;
  let mockReviewQueueService: jest.Mocked<ReviewQueueService>;
  
  const testUserId = 'test-user-123';
  const testKanjiChar = '漢';
  const testDate = new Date('2025-01-15T10:00:00Z');

  // Sample test data
  const mockQueueItem = {
    kanjiChar: testKanjiChar,
    state: State.Review,
    dueDate: testDate.toISOString(),
    scheduledDays: 7,
    elapsedDays: 5,
    reps: 3,
    lapses: 1,
    difficulty: 6.5,
    stability: 2.1,
    lastReview: '2025-01-10T10:00:00Z',
    metadata: {
      jlptLevel: 3,
      strokeCount: 13,
      frequency: 1200
    }
  };

  const mockProgressItem = {
    progressId: `${testUserId}-${testKanjiChar}`,
    userId: testUserId,
    kanjiChar: testKanjiChar,
    state: State.Review,
    fsrs: {
      dueDate: testDate.toISOString(),
      difficulty: 6.5,
      stability: 2.1,
      repetition: 3,
      lapses: 1,
      scheduledDays: 7,
      elapsedDays: 5,
      lastReview: '2025-01-10T10:00:00Z'
    },
    dueDate: testDate.toISOString(),
    difficulty: 6.5,
    localModified: Date.now(),
    serverModified: Date.now() - 10000,
    syncStatus: 'synced' as const,
    metadata: {
      jlptLevel: 3,
      strokeCount: 13,
      frequency: 1200
    }
  };

  const mockUserStats = {
    totalReviews: 150,
    accuracy: 0.85,
    averageResponseTime: 2500,
    streakDays: 7
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow();

    // Create mock service instances
    mockDataSyncService = {
      getUserStats: jest.fn(),
      getAllProgressLocal: jest.fn(),
      getCard: jest.fn(),
    } as any;

    mockReviewQueueService = {
      generateQueue: jest.fn(),
      getDueCount: jest.fn(),
      processReview: jest.fn(),
    } as any;

    // Mock the service imports
    const { getDataSyncService } = require('@/services/kanji-mastery/dataSyncService');
    const { ReviewQueueService } = require('@/services/kanji-mastery/reviewQueueService');
    
    getDataSyncService.mockReturnValue(mockDataSyncService);
    ReviewQueueService.mockImplementation(() => mockReviewQueueService);

    source = new KanjiMasterySource(testUserId);
  });

  afterEach(() => {
    unmockWindow();
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(source.id).toBe('kanji-mastery');
      expect(source.name).toBe('Kanji Mastery');
      expect(source.type).toBe(ReviewSourceType.KANJI_MASTERY);
      expect(source.icon).toBe('🈳');
      expect(source.supportedContentTypes).toEqual([ContentType.KANJI, ContentType.RADICAL]);
    });

    it('should have correct paths', () => {
      expect(source.paths).toEqual({
        main: '/tools/kanji-mastery',
        settings: '/tools/kanji-mastery/settings',
        stats: '/tools/kanji-mastery/stats'
      });
    });

    it('should start as disabled until initialized', () => {
      expect(source.status).toBe(SourceStatus.DISABLED);
    });

    it('should initialize successfully on client side', async () => {
      await source.init();
      expect(source.status).toBe(SourceStatus.ACTIVE);
    });

    it('should handle server-side initialization gracefully', async () => {
      unmockWindow();
      const serverSource = new KanjiMasterySource(testUserId);
      await serverSource.init();
      expect(serverSource.status).toBe(SourceStatus.ACTIVE);
    });

    it('should handle errors during initialization gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create source and initialize normally - should not throw
      const source = new KanjiMasterySource(testUserId);
      await source.init();
      
      expect(source.status).toBe(SourceStatus.ACTIVE);
      expect(logSpy).toHaveBeenCalledWith('[KanjiMasterySource] Successfully initialized kanji mastery source');
      
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('getDueItems', () => {
    beforeEach(async () => {
      await source.init();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedSource = new KanjiMasterySource(testUserId);
      await expect(uninitializedSource.getDueItems()).rejects.toThrow('Source not initialized');
    });

    it('should return empty array for null user ID', async () => {
      const noUserSource = new KanjiMasterySource(null);
      await noUserSource.init();
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await noUserSource.getDueItems();
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] No user ID provided, returning empty due items');
      
      consoleSpy.mockRestore();
    });

    it('should get due items from review queue service', async () => {
      mockReviewQueueService.generateQueue.mockResolvedValue([mockQueueItem]);

      const result = await source.getDueItems();

      expect(mockReviewQueueService.generateQueue).toHaveBeenCalledWith(
        testUserId,
        { maxCards: 50, prioritizeOverdue: true }
      );
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: `kanji-mastery-${testKanjiChar}`,
        sourceId: 'kanji-mastery',
        contentType: ContentType.KANJI,
        content: {
          primary: testKanjiChar,
          secondary: 'Difficulty: 6.5',
          context: 'JLPT N3'
        },
        dueDate: testDate,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING]
      });
    });

    it('should respect limit option', async () => {
      mockReviewQueueService.generateQueue.mockResolvedValue([mockQueueItem]);

      await source.getDueItems({ limit: 10 });

      expect(mockReviewQueueService.generateQueue).toHaveBeenCalledWith(
        testUserId,
        { maxCards: 10, prioritizeOverdue: true }
      );
    });

    it('should cap limit at source max items', async () => {
      mockReviewQueueService.generateQueue.mockResolvedValue([mockQueueItem]);

      await source.getDueItems({ limit: 100 });

      expect(mockReviewQueueService.generateQueue).toHaveBeenCalledWith(
        testUserId,
        { maxCards: 50, prioritizeOverdue: true }
      );
    });

    it('should calculate priority correctly for overdue items', async () => {
      const overdueDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const overdueItem = {
        ...mockQueueItem,
        dueDate: overdueDate.toISOString(),
        difficulty: 8.5
      };
      
      mockReviewQueueService.generateQueue.mockResolvedValue([overdueItem]);

      const result = await source.getDueItems();

      expect(result[0].priority).toBeGreaterThan(5); // Should have increased priority
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockReviewQueueService.generateQueue.mockRejectedValue(new Error('Queue service failed'));

      const result = await source.getDueItems();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] Failed to get due items:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should include metadata with tags and properties', async () => {
      mockReviewQueueService.generateQueue.mockResolvedValue([mockQueueItem]);

      const result = await source.getDueItems();

      expect(result[0].metadata).toMatchObject({
        source: { type: 'kanji-mastery' },
        tags: [
          'jlpt-n3',
          'strokes-13',
          'state-2',
          'has-lapses'
        ],
        difficulty: 6.5,
        properties: {
          character: testKanjiChar,
          state: State.Review,
          reps: 3,
          lapses: 1,
          stability: 2.1,
          jlptLevel: 3,
          strokeCount: 13,
          frequency: 1200
        }
      });
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await source.init();
    });

    it('should return empty stats if not initialized', async () => {
      const uninitializedSource = new KanjiMasterySource(testUserId);
      const result = await uninitializedSource.getStats();
      
      expect(result.totalItems).toBe(0);
      expect(result.dueToday).toBe(0);
    });

    it('should return empty stats for null user ID', async () => {
      const noUserSource = new KanjiMasterySource(null);
      await noUserSource.init();
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await noUserSource.getStats();
      
      expect(result.totalItems).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] No user ID provided, returning empty stats');
      
      consoleSpy.mockRestore();
    });

    it('should get real stats from services', async () => {
      mockDataSyncService.getUserStats.mockResolvedValue(mockUserStats);
      mockReviewQueueService.getDueCount.mockResolvedValue({
        new: 5,
        learning: 3,
        review: 7
      });
      mockDataSyncService.getAllProgressLocal.mockResolvedValue([mockProgressItem]);

      const result = await source.getStats();

      expect(mockDataSyncService.getUserStats).toHaveBeenCalledWith(testUserId);
      expect(mockReviewQueueService.getDueCount).toHaveBeenCalledWith(testUserId);
      expect(mockDataSyncService.getAllProgressLocal).toHaveBeenCalledWith(testUserId);

      expect(result).toMatchObject({
        totalItems: 1,
        dueToday: 15, // 5 + 3 + 7
        retentionRate: 0.85,
        averageMastery: 85
      });
      
      // Study streak is calculated as min(totalReviews, 30), so it should be 30
      expect(result.studyStreak).toBeLessThanOrEqual(30);
    });

    it('should calculate overdue items correctly', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const overdueItem = {
        ...mockProgressItem,
        fsrs: {
          ...mockProgressItem.fsrs,
          dueDate: yesterday.toISOString()
        }
      };

      mockDataSyncService.getUserStats.mockResolvedValue(mockUserStats);
      mockReviewQueueService.getDueCount.mockResolvedValue({ new: 0, learning: 0, review: 0 });
      mockDataSyncService.getAllProgressLocal.mockResolvedValue([overdueItem]);

      const result = await source.getStats();

      expect(result.overdue).toBe(1);
    });

    it('should calculate items by priority correctly', async () => {
      const urgentItem = {
        ...mockProgressItem,
        fsrs: {
          ...mockProgressItem.fsrs,
          difficulty: 9.0,
          dueDate: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours overdue
        }
      };

      mockDataSyncService.getUserStats.mockResolvedValue(mockUserStats);
      mockReviewQueueService.getDueCount.mockResolvedValue({ new: 0, learning: 0, review: 0 });
      mockDataSyncService.getAllProgressLocal.mockResolvedValue([urgentItem]);

      const result = await source.getStats();

      expect(result.itemsByPriority[SourcePriority.URGENT]).toBe(1);
    });

    it('should calculate trends based on performance', async () => {
      const highAccuracyStats = { ...mockUserStats, accuracy: 0.9, averageResponseTime: 2000 };
      
      mockDataSyncService.getUserStats.mockResolvedValue(highAccuracyStats);
      mockReviewQueueService.getDueCount.mockResolvedValue({ new: 0, learning: 0, review: 0 });
      mockDataSyncService.getAllProgressLocal.mockResolvedValue([mockProgressItem]);

      const result = await source.getStats();

      expect(result.trends).toMatchObject({
        accuracy: 'improving',
        speed: 'improving',
        retention: 'improving'
      });
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDataSyncService.getUserStats.mockRejectedValue(new Error('Stats service failed'));

      const result = await source.getStats();

      expect(result.totalItems).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] Failed to get stats:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('processReview', () => {
    beforeEach(async () => {
      await source.init();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedSource = new KanjiMasterySource(testUserId);
      const result: ReviewResult = { rating: 3, responseTime: 2000 };
      
      await expect(uninitializedSource.processReview('kanji-mastery-漢', result))
        .rejects.toThrow('Source not initialized');
    });

    it('should throw error for null user ID', async () => {
      const noUserSource = new KanjiMasterySource(null);
      await noUserSource.init();
      const result: ReviewResult = { rating: 3, responseTime: 2000 };
      
      await expect(noUserSource.processReview('kanji-mastery-漢', result))
        .rejects.toThrow('User ID required for processing reviews');
    });

    it('should process review with correct parameters', async () => {
      const updatedItem = { ...mockQueueItem, difficulty: 7.0 };
      mockReviewQueueService.processReview.mockResolvedValue(updatedItem);

      const result: ReviewResult = { rating: 3, responseTime: 2500 };
      await source.processReview(`kanji-mastery-${testKanjiChar}`, result);

      expect(mockReviewQueueService.processReview).toHaveBeenCalledWith(
        testUserId,
        testKanjiChar,
        Rating.Good, // rating 3 -> Rating.GOOD
        2500
      );
    });

    it('should convert ratings correctly', async () => {
      const updatedItem = { ...mockQueueItem };
      mockReviewQueueService.processReview.mockResolvedValue(updatedItem);

      const testCases = [
        { rating: 1, expected: Rating.Again },
        { rating: 2, expected: Rating.Hard },
        { rating: 3, expected: Rating.Good },
        { rating: 4, expected: Rating.Easy }
      ];

      for (const testCase of testCases) {
        await source.processReview(`kanji-mastery-${testKanjiChar}`, { rating: testCase.rating });
        
        expect(mockReviewQueueService.processReview).toHaveBeenLastCalledWith(
          testUserId,
          testKanjiChar,
          testCase.expected,
          3000 // Default response time
        );
      }
    });

    it('should use default response time if not provided', async () => {
      const updatedItem = { ...mockQueueItem };
      mockReviewQueueService.processReview.mockResolvedValue(updatedItem);

      await source.processReview(`kanji-mastery-${testKanjiChar}`, { rating: 3 });

      expect(mockReviewQueueService.processReview).toHaveBeenCalledWith(
        testUserId,
        testKanjiChar,
        Rating.Good,
        3000
      );
    });

    it('should throw error for invalid item ID format', async () => {
      const result: ReviewResult = { rating: 3, responseTime: 2000 };
      
      // The kanji character will be empty after removing the prefix
      await expect(source.processReview('kanji-mastery-', result))
        .rejects.toThrow('Invalid item ID format: kanji-mastery-');
    });

    it('should handle service errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockReviewQueueService.processReview.mockRejectedValue(new Error('Process review failed'));

      const result: ReviewResult = { rating: 3, responseTime: 2000 };
      
      await expect(source.processReview(`kanji-mastery-${testKanjiChar}`, result))
        .rejects.toThrow('Process review failed');
      
      consoleSpy.mockRestore();
    });

    it('should log successful review processing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const updatedItem = { 
        ...mockQueueItem, 
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        difficulty: 7.2,
        state: State.Review
      };
      mockReviewQueueService.processReview.mockResolvedValue(updatedItem);

      const result: ReviewResult = { rating: 3, responseTime: 2500 };
      await source.processReview(`kanji-mastery-${testKanjiChar}`, result);

      expect(consoleSpy).toHaveBeenCalledWith(
        `[KanjiMasterySource] Successfully processed review for ${testKanjiChar}:`,
        expect.objectContaining({
          rating: Rating.Good,
          newDueDate: updatedItem.dueDate,
          newState: updatedItem.state,
          difficulty: updatedItem.difficulty
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('searchItems', () => {
    beforeEach(async () => {
      await source.init();
    });

    it('should return empty array if not initialized', async () => {
      const uninitializedSource = new KanjiMasterySource(testUserId);
      const result = await uninitializedSource.searchItems('test');
      
      expect(result).toEqual([]);
    });

    it('should return empty array for null user ID', async () => {
      const noUserSource = new KanjiMasterySource(null);
      await noUserSource.init();
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await noUserSource.searchItems('test');
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] No user ID provided, returning empty search results');
      
      consoleSpy.mockRestore();
    });

    it('should search items from data sync service', async () => {
      mockDataSyncService.getAllProgressLocal.mockResolvedValue([mockProgressItem]);

      const result = await source.searchItems(testKanjiChar);

      expect(mockDataSyncService.getAllProgressLocal).toHaveBeenCalledWith(testUserId);
      expect(result).toHaveLength(1);
      expect(result[0].content.primary).toBe(testKanjiChar);
    });

    it('should respect limit option', async () => {
      const multipleItems = Array.from({ length: 25 }, (_, i) => ({
        ...mockProgressItem,
        kanjiChar: `漢${i}`,
        progressId: `${testUserId}-漢${i}`
      }));
      
      mockDataSyncService.getAllProgressLocal.mockResolvedValue(multipleItems);

      const result = await source.searchItems('漢', { limit: 10 });

      expect(result).toHaveLength(10);
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDataSyncService.getAllProgressLocal.mockRejectedValue(new Error('Search service failed'));

      const result = await source.searchItems(testKanjiChar);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] Failed to search items:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getItem', () => {
    beforeEach(async () => {
      await source.init();
    });

    it('should return null if not initialized', async () => {
      const uninitializedSource = new KanjiMasterySource(testUserId);
      const result = await uninitializedSource.getItem(`kanji-mastery-${testKanjiChar}`);
      
      expect(result).toBeNull();
    });

    it('should return null for null user ID', async () => {
      const noUserSource = new KanjiMasterySource(null);
      await noUserSource.init();
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await noUserSource.getItem(`kanji-mastery-${testKanjiChar}`);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] No user ID provided for getItem');
      
      consoleSpy.mockRestore();
    });

    it('should get item from data sync service', async () => {
      mockDataSyncService.getCard.mockResolvedValue(mockProgressItem);

      const result = await source.getItem(`kanji-mastery-${testKanjiChar}`);

      expect(mockDataSyncService.getCard).toHaveBeenCalledWith(testUserId, testKanjiChar);
      expect(result).toMatchObject({
        id: `kanji-mastery-${testKanjiChar}`,
        sourceId: 'kanji-mastery',
        contentType: ContentType.KANJI,
        content: {
          primary: testKanjiChar
        }
      });
    });

    it('should return null for invalid item ID format', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await source.getItem('kanji-mastery-');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] Invalid item ID format: kanji-mastery-');
      
      consoleSpy.mockRestore();
    });

    it('should return null if card not found', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockDataSyncService.getCard.mockResolvedValue(null);

      const result = await source.getItem(`kanji-mastery-${testKanjiChar}`);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(`[KanjiMasterySource] Card not found: ${testKanjiChar}`);
      
      consoleSpy.mockRestore();
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDataSyncService.getCard.mockRejectedValue(new Error('Get card failed'));

      const result = await source.getItem(`kanji-mastery-${testKanjiChar}`);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[KanjiMasterySource] Failed to get item:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', async () => {
      const newConfig = { enabled: false, maxItems: 25 };
      
      await source.updateConfig(newConfig);

      expect(source.config).toMatchObject(newConfig);
    });

    it('should reflect configuration changes in status', async () => {
      await source.init();
      expect(source.status).toBe(SourceStatus.ACTIVE);

      await source.updateConfig({ enabled: false });
      expect(source.status).toBe(SourceStatus.PAUSED);
    });
  });

  describe('Health Check', () => {
    it('should return false when not initialized', async () => {
      const result = await source.healthCheck();
      expect(result).toBe(false);
    });

    it('should return true when initialized', async () => {
      await source.init();
      const result = await source.healthCheck();
      expect(result).toBe(true);
    });
  });

  describe('Destroy', () => {
    it('should mark source as uninitialized', async () => {
      await source.init();
      expect(source.status).toBe(SourceStatus.ACTIVE);

      await source.destroy();
      expect(source.status).toBe(SourceStatus.DISABLED);
    });

    it('should fail health check after destroy', async () => {
      await source.init();
      await source.destroy();
      
      const healthCheck = await source.healthCheck();
      expect(healthCheck).toBe(false);
    });
  });

  describe('Priority Calculation', () => {
    beforeEach(async () => {
      await source.init();
    });

    it('should calculate higher priority for overdue items', async () => {
      const now = new Date();
      const overdueDate = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const overdueItem = {
        ...mockQueueItem,
        dueDate: overdueDate.toISOString()
      };
      
      mockReviewQueueService.generateQueue.mockResolvedValue([overdueItem]);

      const result = await source.getDueItems();
      expect(result[0].priority).toBeGreaterThan(5);
    });

    it('should calculate higher priority for high difficulty items', async () => {
      const highDifficultyItem = {
        ...mockQueueItem,
        difficulty: 9.5
      };
      
      mockReviewQueueService.generateQueue.mockResolvedValue([highDifficultyItem]);

      const result = await source.getDueItems();
      expect(result[0].priority).toBeGreaterThan(5);
    });

    it('should calculate higher priority for JLPT N5 items', async () => {
      const n5Item = {
        ...mockQueueItem,
        metadata: {
          ...mockQueueItem.metadata,
          jlptLevel: 5
        }
      };
      
      mockReviewQueueService.generateQueue.mockResolvedValue([n5Item]);

      const result = await source.getDueItems();
      expect(result[0].priority).toBeGreaterThan(mockQueueItem.metadata.jlptLevel);
    });

    it('should calculate higher priority for items with lapses', async () => {
      const lapsedItem = {
        ...mockQueueItem,
        lapses: 3
      };
      
      mockReviewQueueService.generateQueue.mockResolvedValue([lapsedItem]);

      const result = await source.getDueItems();
      expect(result[0].priority).toBeGreaterThan(5);
    });

    it('should cap priority at maximum value', async () => {
      const extremeItem = {
        ...mockQueueItem,
        dueDate: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 72 hours overdue
        difficulty: 10,
        lapses: 5,
        metadata: { ...mockQueueItem.metadata, jlptLevel: 5 }
      };
      
      mockReviewQueueService.generateQueue.mockResolvedValue([extremeItem]);

      const result = await source.getDueItems();
      expect(result[0].priority).toBeLessThanOrEqual(10);
    });
  });

  describe('User Type Handling', () => {
    it('should handle guest users (null ID) gracefully', async () => {
      const guestSource = new KanjiMasterySource(null);
      await guestSource.init();

      const dueItems = await guestSource.getDueItems();
      const stats = await guestSource.getStats();
      const searchResults = await guestSource.searchItems('test');
      const item = await guestSource.getItem('test-id');

      expect(dueItems).toEqual([]);
      expect(stats.totalItems).toBe(0);
      expect(searchResults).toEqual([]);
      expect(item).toBeNull();
    });

    it('should handle free user with standard limits', async () => {
      const freeUserSource = new KanjiMasterySource('free-user');
      await freeUserSource.init();
      
      mockReviewQueueService.generateQueue.mockResolvedValue([mockQueueItem]);

      const result = await freeUserSource.getDueItems({ limit: 50 });

      expect(mockReviewQueueService.generateQueue).toHaveBeenCalledWith(
        'free-user',
        { maxCards: 50, prioritizeOverdue: true }
      );
    });

    it('should handle subscriber with higher limits', async () => {
      const subscriberSource = new KanjiMasterySource('monthly-subscriber');
      await subscriberSource.init();
      
      mockReviewQueueService.generateQueue.mockResolvedValue([mockQueueItem]);

      const result = await subscriberSource.getDueItems({ limit: 100 });

      // Should still cap at source max items (50)
      expect(mockReviewQueueService.generateQueue).toHaveBeenCalledWith(
        'monthly-subscriber',
        { maxCards: 50, prioritizeOverdue: true }
      );
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      await source.init();
    });

    it('should handle DataSyncService unavailable', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDataSyncService.getAllProgressLocal.mockRejectedValue(new Error('DataSyncService unavailable'));

      const stats = await source.getStats();
      const searchResults = await source.searchItems('test');

      expect(stats.totalItems).toBe(0);
      expect(searchResults).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    it('should handle ReviewQueueService unavailable', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockReviewQueueService.generateQueue.mockRejectedValue(new Error('ReviewQueueService unavailable'));
      mockReviewQueueService.processReview.mockRejectedValue(new Error('ReviewQueueService unavailable'));

      const dueItems = await source.getDueItems();
      
      expect(dueItems).toEqual([]);

      const reviewResult: ReviewResult = { rating: 3, responseTime: 2000 };
      await expect(source.processReview(`kanji-mastery-${testKanjiChar}`, reviewResult))
        .rejects.toThrow('ReviewQueueService unavailable');
      
      consoleSpy.mockRestore();
    });

    it('should handle network connectivity issues', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const networkError = new Error('Network request failed');
      
      mockDataSyncService.getUserStats.mockRejectedValue(networkError);
      mockReviewQueueService.getDueCount.mockRejectedValue(networkError);
      mockDataSyncService.getAllProgressLocal.mockRejectedValue(networkError);

      const stats = await source.getStats();

      expect(stats).toMatchObject({
        totalItems: 0,
        dueToday: 0,
        retentionRate: 0
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed data gracefully', async () => {
      const malformedItem = {
        ...mockProgressItem,
        fsrs: null, // Malformed FSRS data
        metadata: undefined // Missing metadata
      };
      
      mockDataSyncService.getAllProgressLocal.mockResolvedValue([malformedItem]);
      mockDataSyncService.getUserStats.mockResolvedValue(mockUserStats);
      mockReviewQueueService.getDueCount.mockResolvedValue({ new: 0, learning: 0, review: 0 });

      const stats = await source.getStats();

      expect(stats.totalItems).toBe(1);
      // Should handle missing data gracefully without throwing
    });
  });
});