/**
 * Comprehensive tests for FlashcardsSource
 * Tests real Firebase data connection, SRS integration, and caching mechanisms
 */

import { FlashcardsSource, createFlashcardsSource } from '../../sources/flashcards';
import { ReviewSourceType, SourceStatus } from '../../review-source.interface';
import { ContentType } from '@/lib/unified-review/types';

// Import the mock functions
import { 
  mockGetAllStudyLists, 
  mockGetItemsInList 
} from '@/utils/studyListManager';
import { 
  mockSetUser, 
  mockLoadSRSData, 
  mockGetStatistics 
} from '@/utils/flashcardSRSManager';

// Mock Firebase auth
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' }
  },
  db: {}
}));

// Mock StudyListManager with static methods
jest.mock('@/utils/studyListManager', () => {
  const mockGetAllStudyLists = jest.fn();
  const mockGetItemsInList = jest.fn();
  
  return { 
    default: {
      getAllStudyLists: mockGetAllStudyLists,
      getItemsInList: mockGetItemsInList
    },
    mockGetAllStudyLists,
    mockGetItemsInList
  };
});

// Mock flashcardSRSManager
jest.mock('@/utils/flashcardSRSManager', () => {
  const mockSetUser = jest.fn();
  const mockLoadSRSData = jest.fn();
  const mockGetStatistics = jest.fn();
  
  return {
    flashcardSRSManager: {
      setUser: mockSetUser,
      loadSRSData: mockLoadSRSData,
      getStatistics: mockGetStatistics
    },
    mockSetUser,
    mockLoadSRSData,
    mockGetStatistics
  };
});

describe('FlashcardsSource', () => {
  const TEST_USER_ID = 'test-user-123';
  let flashcardsSource: FlashcardsSource;

  // Sample test data
  const mockJapaneseWord = {
    id: 'word-1',
    kanji: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: 'to eat',
    type: 'verb',
    jlpt: 'N5',
    tags: ['food', 'action'],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const mockAnkiCard = {
    id: 'anki-1',
    itemType: 'anki_card' as const,
    ankiData: {
      originalId: 'anki-original-1',
      deckName: 'Core 2000',
      cardType: 'basic' as const,
      front: '水',
      back: 'water',
      tags: ['kanji', 'basic'],
      media: [],
      srsData: {
        ease: 2500,
        interval: 1,
        reviews: 0,
        lapses: 0,
        state: 'new' as const,
        step: 0,
        left: 0
      }
    },
    kanji: '水',
    kana: '',
    meaning: 'water',
    type: 'anki'
  };

  const mockSRSData = {
    due: new Date(),
    interval: 1,
    ease: 2500,
    reviews: 5,
    lapses: 1,
    lastReview: new Date(Date.now() - 86400000), // 1 day ago
    status: 'review' as const,
    reps: 3,
    type: 2
  };

  const mockStudyList = {
    id: 'list-1',
    name: 'Test Study List',
    type: 'flashcard' as const,
    itemIds: ['word-1', 'anki-1'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    color: '#8B5CF6'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockGetAllStudyLists.mockResolvedValue([mockStudyList]);
    mockGetItemsInList.mockResolvedValue({
      words: [mockJapaneseWord],
      kanji: [],
      sentences: [],
      ankiCards: [mockAnkiCard]
    });
    
    mockSetUser.mockImplementation(() => {});
    mockLoadSRSData.mockResolvedValue(new Map([
      ['word-1', mockSRSData],
      ['anki-1', mockSRSData]
    ]));
    mockGetStatistics.mockResolvedValue({
      totalCards: 2,
      dueToday: 1,
      newCards: 1,
      learningCards: 0,
      reviewCards: 1,
      averageEase: 2.5,
      totalReviews: 10
    });
    
    // Create fresh instance
    flashcardsSource = new FlashcardsSource(TEST_USER_ID);
  });

  describe('Basic Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(flashcardsSource.id).toBe('flashcards');
      expect(flashcardsSource.name).toBe('Flashcards');
      expect(flashcardsSource.type).toBe(ReviewSourceType.FLASHCARDS);
      expect(flashcardsSource.icon).toBe('🗃️');
      expect(flashcardsSource.supportedContentTypes).toContain(ContentType.FLASHCARD);
      expect(flashcardsSource.paths.main).toBe('/drill/flashcards');
    });

    it('should be disabled before initialization', () => {
      expect(flashcardsSource.status).toBe(SourceStatus.DISABLED);
    });

    it('should initialize successfully', async () => {
      await flashcardsSource.init();
      
      expect(mockSetUser).toHaveBeenCalledWith(TEST_USER_ID, false);
      expect(flashcardsSource.status).toBe(SourceStatus.ACTIVE);
    });

    it('should handle SRS manager initialization failure gracefully', async () => {
      mockSetUser.mockImplementationOnce(() => {
        throw new Error('SRS init failed');
      });
      const failingSource = new FlashcardsSource(TEST_USER_ID);
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await failingSource.init();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize SRS manager'),
        expect.any(Error)
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Factory function', () => {
    it('should create and initialize flashcards source', async () => {
      const source = await createFlashcardsSource(TEST_USER_ID);
      expect(source).toBeInstanceOf(FlashcardsSource);
      expect(mockSetUser).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      mockSetUser.mockImplementationOnce(() => {
        throw new Error('Init failed');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const source = await createFlashcardsSource(TEST_USER_ID);
      
      expect(source).toBeInstanceOf(FlashcardsSource);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getDueItems functionality', () => {
    beforeEach(async () => {
      await flashcardsSource.init();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedSource = new FlashcardsSource(TEST_USER_ID);
      await expect(uninitializedSource.getDueItems()).rejects.toThrow('Source not initialized');
    });

    it('should return empty array for no user', async () => {
      const noUserSource = new FlashcardsSource(null);
      await noUserSource.init();
      const items = await noUserSource.getDueItems();
      expect(items).toEqual([]);
    });

    it('should return due flashcards from study lists', async () => {
      const items = await flashcardsSource.getDueItems();
      
      expect(mockGetAllStudyLists).toHaveBeenCalled();
      expect(mockGetItemsInList).toHaveBeenCalledWith('list-1');
      expect(mockLoadSRSData).toHaveBeenCalledWith(['word-1', 'anki-1']);
      
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('word-1');
      expect(items[1].id).toBe('anki-1');
    });

    it('should handle StudyListManager errors gracefully', async () => {
      mockGetAllStudyLists.mockRejectedValue(new Error('Firebase error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const items = await flashcardsSource.getDueItems();
      
      expect(items).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should convert Japanese words to review items correctly', async () => {
      const items = await flashcardsSource.getDueItems();
      const wordItem = items.find(item => item.id === 'word-1');
      
      expect(wordItem).toBeDefined();
      expect(wordItem!.sourceId).toBe('flashcards');
      expect(wordItem!.contentType).toBe(ContentType.FLASHCARD);
      expect(wordItem!.content.primary).toBe('食べる');
      expect(wordItem!.content.secondary).toBe('to eat');
      expect(wordItem!.content.context).toBe('verb');
      expect(wordItem!.metadata.properties.cardType).toBe('word');
    });

    it('should convert Anki cards to review items correctly', async () => {
      const items = await flashcardsSource.getDueItems();
      const ankiItem = items.find(item => item.id === 'anki-1');
      
      expect(ankiItem).toBeDefined();
      expect(ankiItem!.content.primary).toBe('水');
      expect(ankiItem!.content.secondary).toBe('water');
      expect(ankiItem!.content.context).toBe('Core 2000');
      expect(ankiItem!.metadata.properties.cardType).toBe('anki');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await flashcardsSource.init();
    });

    it('should return empty stats for uninitialized source', async () => {
      const uninitializedSource = new FlashcardsSource(TEST_USER_ID);
      const stats = await uninitializedSource.getStats();
      expect(stats.totalItems).toBe(0);
      expect(stats.dueToday).toBe(0);
    });

    it('should return empty stats for no user', async () => {
      const noUserSource = new FlashcardsSource(null);
      await noUserSource.init();
      const stats = await noUserSource.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it('should return comprehensive statistics from SRS manager', async () => {
      const stats = await flashcardsSource.getStats();
      
      expect(stats.totalItems).toBe(2); // From SRS stats
      expect(stats.dueToday).toBe(1);
      expect(stats.newItems).toBe(1);
      expect(stats.itemsByType[ContentType.FLASHCARD]).toBe(1); // Anki cards
      expect(stats.itemsByType[ContentType.VOCABULARY]).toBe(1); // Japanese words
      expect(stats.averageMastery).toBe(50); // 2.5 * 20
      expect(stats.retentionRate).toBe(0.625); // 2.5 / 4
    });

    it('should handle SRS manager errors gracefully', async () => {
      mockGetStatistics.mockRejectedValue(new Error('SRS error'));
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const stats = await flashcardsSource.getStats();
      
      expect(stats.totalItems).toBeGreaterThanOrEqual(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get SRS statistics'),
        expect.any(Error)
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Review Processing', () => {
    beforeEach(async () => {
      await flashcardsSource.init();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedSource = new FlashcardsSource(TEST_USER_ID);
      await expect(uninitializedSource.processReview('test', { rating: 3, timeSpent: 1000 }))
        .rejects.toThrow('Source not initialized');
    });

    it('should throw error if no user', async () => {
      const noUserSource = new FlashcardsSource(null);
      await noUserSource.init();
      await expect(noUserSource.processReview('test', { rating: 3, timeSpent: 1000 }))
        .rejects.toThrow('User not authenticated');
    });

    it('should convert review result to SRS rating correctly', async () => {
      mockLoadSRSData.mockResolvedValue(new Map([
        ['test-card', mockSRSData]
      ]));
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Test rating conversion
      await flashcardsSource.processReview('test-card', { rating: 1, timeSpent: 1000 });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processed flashcard review for test-card with rating: again')
      );
      
      consoleLogSpy.mockRestore();
    });

    it('should handle missing SRS data', async () => {
      mockLoadSRSData.mockResolvedValue(new Map()); // No data
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await flashcardsSource.processReview('missing-card', { rating: 3, timeSpent: 1000 });
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No SRS data found for card missing-card')
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Caching Mechanism', () => {
    beforeEach(async () => {
      await flashcardsSource.init();
    });

    it('should cache flashcard data for 5 minutes', async () => {
      // First call
      await flashcardsSource.getDueItems();
      expect(mockGetAllStudyLists).toHaveBeenCalledTimes(1);
      
      // Second call immediately - should use cache
      await flashcardsSource.getDueItems();
      expect(mockGetAllStudyLists).toHaveBeenCalledTimes(1);
    });

    it('should clear cache on demand', async () => {
      // Load data to cache it
      await flashcardsSource.getDueItems();
      expect(mockGetAllStudyLists).toHaveBeenCalledTimes(1);
      
      // Clear cache
      flashcardsSource.clearCache();
      
      // Next call should reload data
      await flashcardsSource.getDueItems();
      expect(mockGetAllStudyLists).toHaveBeenCalledTimes(2);
    });
  });

  describe('Search and Item Retrieval', () => {
    beforeEach(async () => {
      await flashcardsSource.init();
    });

    it('should search by front text', async () => {
      const items = await flashcardsSource.searchItems('食べる');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('word-1');
    });

    it('should search by back text', async () => {
      const items = await flashcardsSource.searchItems('water');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('anki-1');
    });

    it('should return specific flashcard item', async () => {
      const item = await flashcardsSource.getItem('word-1');
      
      expect(item).toBeDefined();
      expect(item!.id).toBe('word-1');
      expect(item!.content.primary).toBe('食べる');
      expect(item!.metadata.properties.cardType).toBe('word');
    });

    it('should return null for non-existent item', async () => {
      const item = await flashcardsSource.getItem('non-existent');
      expect(item).toBeNull();
    });
  });

  describe('Subscription Status Management', () => {
    it('should update subscription status', async () => {
      await flashcardsSource.updateSubscriptionStatus(true);
      expect(mockSetUser).toHaveBeenCalledWith(TEST_USER_ID, true);
    });

    it('should handle no user case', async () => {
      const noUserSource = new FlashcardsSource(null);
      await noUserSource.updateSubscriptionStatus(true);
      // Should not crash or throw error
    });
  });

  describe('Health Check and Lifecycle', () => {
    it('should return initialization status', async () => {
      expect(await flashcardsSource.healthCheck()).toBe(false); // Not initialized
      
      await flashcardsSource.init();
      expect(await flashcardsSource.healthCheck()).toBe(true); // Initialized
    });

    it('should cleanup properly on destroy', async () => {
      await flashcardsSource.init();
      expect(await flashcardsSource.healthCheck()).toBe(true);
      
      await flashcardsSource.destroy();
      expect(await flashcardsSource.healthCheck()).toBe(false);
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      await flashcardsSource.init();
    });

    it('should handle empty study lists', async () => {
      mockGetAllStudyLists.mockResolvedValue([]);
      
      const items = await flashcardsSource.getDueItems();
      expect(items).toEqual([]);
      
      const stats = await flashcardsSource.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it('should handle duplicate flashcards across lists', async () => {
      // Mock two lists with overlapping items
      const list1 = { ...mockStudyList, id: 'list-1' };
      const list2 = { ...mockStudyList, id: 'list-2' };
      
      mockGetAllStudyLists.mockResolvedValue([list1, list2]);
      mockGetItemsInList.mockResolvedValue({
        words: [mockJapaneseWord], // Same word in both lists
        kanji: [],
        sentences: [],
        ankiCards: []
      });
      
      const items = await flashcardsSource.getDueItems();
      
      // Should deduplicate items
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('word-1');
    });

    it('should handle individual list processing errors', async () => {
      // Mock one successful list and one failing list
      mockGetAllStudyLists.mockResolvedValue([
        mockStudyList,
        { ...mockStudyList, id: 'failing-list' }
      ]);
      
      mockGetItemsInList
        .mockResolvedValueOnce({
          words: [mockJapaneseWord],
          kanji: [],
          sentences: [],
          ankiCards: []
        })
        .mockRejectedValueOnce(new Error('List processing failed'));
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const items = await flashcardsSource.getDueItems();
      
      // Should still return items from successful list
      expect(items).toHaveLength(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get items from list failing-list'),
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
});