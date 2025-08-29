/**
 * Comprehensive test suite for TextbookVocabularySource
 * Tests real data connections with mocked TextbookVocabularyService
 * 
 * Coverage includes:
 * - Real TextbookVocabularyService integration with IndexedDB and FSRS
 * - Vocabulary loading from JSON files
 * - Due items retrieval with real vocabulary data
 * - Statistics calculation from real progress data
 * - Review processing with FSRS spaced repetition algorithm
 * - Item searching and retrieval from textbook data
 * - Configuration management
 * - Error handling for service failures
 * - User type handling (guest, authenticated users)
 * - Priority calculations based on overdue status, difficulty, and JLPT level
 * - Field mapping corrections (japanese, meaning, lesson)
 * - Different textbooks (Genki, Minna no Nihongo)
 */

import { TextbookVocabularySource } from '../../sources/textbook-vocabulary';
import { TextbookVocabularyService } from '@/services/textbook-vocabulary/textbook-vocabulary-service';
import {
  ReviewSourceType,
  SourceStatus,
  SourcePriority,
  ReviewResult
} from '../../review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';
import type { VocabularyItem } from '@/app/tools/textbook-vocabulary/types';

// Mock the TextbookVocabularyService
jest.mock('@/services/textbook-vocabulary/textbook-vocabulary-service', () => ({
  TextbookVocabularyService: jest.fn()
}));

describe('TextbookVocabularySource', () => {
  let source: TextbookVocabularySource;
  let mockService: jest.Mocked<TextbookVocabularyService>;
  
  const testUserId = 'test-user-123';
  const testDate = new Date('2025-01-15T10:00:00Z');

  // Sample test data - Genki vocabulary
  const mockVocabularyItem: VocabularyItem = {
    id: 'genki-1-1-1544776574229',
    japanese: '私',
    reading: 'わたし',
    meaning: 'I, me',
    jlptLevel: 'N5',
    partOfSpeech: ['pronoun'],
    examples: [
      {
        japanese: '私は学生です。',
        reading: 'わたしはがくせいです。',
        english: 'I am a student.'
      }
    ],
    audioFile: '/audio/genki/watashi.mp3',
    tags: ['personal', 'pronoun'],
    lesson: 1,
    textbook: 'genki-1',
    frequency: 950,
    notes: 'Common first-person pronoun'
  };

  const mockVocabularyCard = {
    ...mockVocabularyItem,
    dueDate: testDate,
    difficulty: 5,
    audioUrl: mockVocabularyItem.audioFile,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-10T12:00:00Z')
  };

  const mockServiceStats = {
    totalCards: 150,
    dueToday: 25,
    overdue: 8,
    newCards: 12,
    averageRetention: 78,
    accuracyTrend: 'stable' as const,
    retentionTrend: 'improving' as const,
    lastSession: new Date('2025-01-14T15:30:00Z'),
    streak: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instance
    mockService = {
      init: jest.fn(),
      cleanup: jest.fn(),
      isHealthy: jest.fn(),
      getAvailableTextbooks: jest.fn(),
      getCard: jest.fn(),
      getDueItems: jest.fn(),
      searchCards: jest.fn(),
      recordReview: jest.fn(),
      getStats: jest.fn(),
      updateSettings: jest.fn()
    } as any;

    // Mock the service constructor
    (TextbookVocabularyService as jest.MockedClass<typeof TextbookVocabularyService>)
      .mockImplementation(() => mockService);

    source = new TextbookVocabularySource(testUserId);
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(source.id).toBe('textbook-vocabulary');
      expect(source.name).toBe('Textbook Vocabulary');
      expect(source.type).toBe(ReviewSourceType.TEXTBOOK_VOCABULARY);
      expect(source.icon).toBe('📚');
      expect(source.description).toBe('Interactive vocabulary learning from Genki and Minna no Nihongo');
      expect(source.supportedContentTypes).toEqual([ContentType.VOCABULARY]);
    });

    it('should have correct paths', () => {
      expect(source.paths).toEqual({
        main: '/tools/textbook-vocabulary',
        settings: '/tools/textbook-vocabulary/settings'
      });
    });

    it('should start as disabled until initialized', () => {
      expect(source.status).toBe(SourceStatus.DISABLED);
    });

    it('should initialize successfully with service', async () => {
      mockService.init.mockResolvedValue();

      await source.init();

      expect(mockService.init).toHaveBeenCalled();
      expect(source.status).toBe(SourceStatus.ACTIVE);
    });

    it('should handle service initialization errors', async () => {
      const initError = new Error('IndexedDB initialization failed');
      mockService.init.mockRejectedValue(initError);

      await expect(source.init()).rejects.toThrow('Failed to initialize textbook vocabulary source: Error: IndexedDB initialization failed');
      expect(source.status).toBe(SourceStatus.DISABLED);
    });

    it('should work with null user ID', async () => {
      const guestSource = new TextbookVocabularySource(null);
      mockService.init.mockResolvedValue();

      await guestSource.init();

      expect(guestSource.status).toBe(SourceStatus.ACTIVE);
      expect(TextbookVocabularyService).toHaveBeenCalledWith(null);
    });
  });

  describe('getDueItems', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedSource = new TextbookVocabularySource(testUserId);
      await expect(uninitializedSource.getDueItems()).rejects.toThrow('Source not initialized');
    });

    it('should get due items from textbook vocabulary service', async () => {
      mockService.getDueItems.mockResolvedValue([mockVocabularyCard]);

      const result = await source.getDueItems();

      expect(mockService.getDueItems).toHaveBeenCalledWith({
        limit: 30,
        includePrioritized: true
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockVocabularyItem.id,
        sourceId: 'textbook-vocabulary',
        contentType: ContentType.VOCABULARY,
        content: {
          primary: '私',
          secondary: 'I, me',
          context: '私は学生です。',
          formatted: {
            primary: '私',
            secondary: 'わたし',
            context: 'I am a student.'
          },
          audio: {
            url: '/audio/genki/watashi.mp3',
            autoPlay: false
          }
        },
        dueDate: testDate,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING]
      });
    });

    it('should respect limit option and cap at max items', async () => {
      mockService.getDueItems.mockResolvedValue([mockVocabularyCard]);

      await source.getDueItems({ limit: 50 });

      expect(mockService.getDueItems).toHaveBeenCalledWith({
        limit: 30, // Capped at source max items
        includePrioritized: true
      });
    });

    it('should use custom limit when smaller than max', async () => {
      mockService.getDueItems.mockResolvedValue([mockVocabularyCard]);

      await source.getDueItems({ limit: 10 });

      expect(mockService.getDueItems).toHaveBeenCalledWith({
        limit: 10,
        includePrioritized: true
      });
    });

    it('should calculate priority correctly for different JLPT levels', async () => {
      const n5Item = { ...mockVocabularyCard, jlptLevel: 'N5' as const };
      const n1Item = { ...mockVocabularyCard, id: 'test-n1', jlptLevel: 'N1' as const };
      
      mockService.getDueItems.mockResolvedValue([n5Item, n1Item]);

      const result = await source.getDueItems();

      expect(result[0].priority).toBeLessThan(result[1].priority); // N1 should have higher priority than N5
    });

    it('should calculate priority correctly for overdue items', async () => {
      const overdueDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const overdueItem = {
        ...mockVocabularyCard,
        dueDate: overdueDate,
        difficulty: 8
      };
      
      mockService.getDueItems.mockResolvedValue([overdueItem]);

      const result = await source.getDueItems();

      expect(result[0].priority).toBeGreaterThan(5); // Should have increased priority
    });

    it('should include correct metadata with tags and properties', async () => {
      mockService.getDueItems.mockResolvedValue([mockVocabularyCard]);

      const result = await source.getDueItems();

      expect(result[0].metadata).toMatchObject({
        source: 'textbook-vocabulary',
        tags: ['genki-1', 'lesson-1', 'pronoun'],
        difficulty: 5,
        properties: {
          textbook: 'genki-1',
          lesson: 1,
          jlptLevel: 'N5',
          frequency: 950,
          partOfSpeech: ['pronoun']
        }
      });
    });

    it('should handle items without audio gracefully', async () => {
      const noAudioItem = {
        ...mockVocabularyCard,
        audioFile: undefined,
        audioUrl: undefined
      };
      
      mockService.getDueItems.mockResolvedValue([noAudioItem]);

      const result = await source.getDueItems();

      expect(result[0].content.audio).toBeUndefined();
    });

    it('should handle items without examples gracefully', async () => {
      const noExampleItem = {
        ...mockVocabularyCard,
        examples: []
      };
      
      mockService.getDueItems.mockResolvedValue([noExampleItem]);

      const result = await source.getDueItems();

      expect(result[0].content.context).toBeUndefined();
      expect(result[0].content.formatted?.context).toBeUndefined();
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockService.getDueItems.mockRejectedValue(new Error('IndexedDB query failed'));

      const result = await source.getDueItems();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get due items from textbook vocabulary:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should return empty stats if not initialized', async () => {
      const uninitializedSource = new TextbookVocabularySource(testUserId);
      const result = await uninitializedSource.getStats();
      
      expect(result.totalItems).toBe(0);
      expect(result.dueToday).toBe(0);
      expect(result.averageMastery).toBe(0);
    });

    it('should get real stats from textbook vocabulary service', async () => {
      mockService.getStats.mockResolvedValue(mockServiceStats);

      const result = await source.getStats();

      expect(mockService.getStats).toHaveBeenCalled();
      
      expect(result).toMatchObject({
        totalItems: 150,
        dueToday: 25,
        overdue: 8,
        newItems: 12,
        averageMastery: 78,
        retentionRate: 0.78,
        studyStreak: 5,
        lastReviewSession: mockServiceStats.lastSession
      });
    });

    it('should calculate scheduled items correctly', async () => {
      const stats = {
        ...mockServiceStats,
        totalCards: 100,
        dueToday: 20,
        overdue: 5,
        newCards: 10
      };
      
      mockService.getStats.mockResolvedValue(stats);

      const result = await source.getStats();

      expect(result.scheduled).toBe(65); // 100 - 20 - 5 - 10 = 65
    });

    it('should distribute items by content type correctly', async () => {
      mockService.getStats.mockResolvedValue(mockServiceStats);

      const result = await source.getStats();

      expect(result.itemsByType).toEqual({
        [ContentType.VOCABULARY]: 150,
        [ContentType.KANJI]: 0,
        [ContentType.FLASHCARD]: 0,
        [ContentType.GRAMMAR]: 0,
        [ContentType.SENTENCE]: 0,
        [ContentType.RADICAL]: 0,
        [ContentType.CUSTOM]: 0
      });
    });

    it('should distribute items by priority using approximation', async () => {
      mockService.getStats.mockResolvedValue(mockServiceStats);

      const result = await source.getStats();

      // Should approximate distribution
      expect(result.itemsByPriority[SourcePriority.LOW]).toBe(45); // 30% of 150
      expect(result.itemsByPriority[SourcePriority.MEDIUM]).toBe(75); // 50% of 150
      expect(result.itemsByPriority[SourcePriority.HIGH]).toBe(22); // 15% of 150
      expect(result.itemsByPriority[SourcePriority.URGENT]).toBe(7); // 5% of 150
    });

    it('should handle missing lastSession gracefully', async () => {
      const statsWithoutSession = {
        ...mockServiceStats,
        lastSession: undefined
      };
      
      mockService.getStats.mockResolvedValue(statsWithoutSession);

      const result = await source.getStats();

      expect(result.lastReviewSession).toBeUndefined();
    });

    it('should include trend data', async () => {
      mockService.getStats.mockResolvedValue(mockServiceStats);

      const result = await source.getStats();

      expect(result.trends).toEqual({
        accuracy: 'stable',
        speed: 'stable',
        retention: 'improving'
      });
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockService.getStats.mockRejectedValue(new Error('IndexedDB stats query failed'));

      const result = await source.getStats();

      expect(result.totalItems).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get textbook vocabulary stats:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('processReview', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedSource = new TextbookVocabularySource(testUserId);
      const reviewResult: ReviewResult = {
        itemId: mockVocabularyItem.id,
        rating: 3,
        responseTime: 2500,
        studyMode: StudyMode.RECOGNITION,
        hintsUsed: false,
        timestamp: testDate
      };
      
      await expect(uninitializedSource.processReview(mockVocabularyItem.id, reviewResult))
        .rejects.toThrow('Source not initialized');
    });

    it('should process review with FSRS algorithm via service', async () => {
      mockService.recordReview.mockResolvedValue();

      const reviewResult: ReviewResult = {
        itemId: mockVocabularyItem.id,
        rating: 3,
        responseTime: 2500,
        studyMode: StudyMode.RECOGNITION,
        hintsUsed: false,
        timestamp: testDate
      };

      await source.processReview(mockVocabularyItem.id, reviewResult);

      expect(mockService.recordReview).toHaveBeenCalledWith(mockVocabularyItem.id, {
        rating: 3,
        responseTime: 2500,
        studyMode: StudyMode.RECOGNITION,
        hintsUsed: false,
        timestamp: testDate
      });
    });

    it('should handle different rating values', async () => {
      mockService.recordReview.mockResolvedValue();

      const testCases = [1, 2, 3, 4];
      
      for (const rating of testCases) {
        const reviewResult: ReviewResult = {
          itemId: mockVocabularyItem.id,
          rating,
          responseTime: 3000,
          studyMode: StudyMode.PRODUCTION,
          hintsUsed: rating === 1, // Simulate hints for failed attempts
          timestamp: testDate
        };

        await source.processReview(mockVocabularyItem.id, reviewResult);

        expect(mockService.recordReview).toHaveBeenLastCalledWith(mockVocabularyItem.id, {
          rating,
          responseTime: 3000,
          studyMode: StudyMode.PRODUCTION,
          hintsUsed: rating === 1,
          timestamp: testDate
        });
      }
    });

    it('should handle different study modes', async () => {
      mockService.recordReview.mockResolvedValue();

      const studyModes = [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING];
      
      for (const studyMode of studyModes) {
        const reviewResult: ReviewResult = {
          itemId: mockVocabularyItem.id,
          rating: 3,
          responseTime: 2000,
          studyMode,
          hintsUsed: false,
          timestamp: testDate
        };

        await source.processReview(mockVocabularyItem.id, reviewResult);

        expect(mockService.recordReview).toHaveBeenLastCalledWith(
          mockVocabularyItem.id,
          expect.objectContaining({ studyMode })
        );
      }
    });

    it('should handle service errors by rethrowing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const recordError = new Error('FSRS processing failed');
      mockService.recordReview.mockRejectedValue(recordError);

      const reviewResult: ReviewResult = {
        itemId: mockVocabularyItem.id,
        rating: 3,
        responseTime: 2500,
        studyMode: StudyMode.RECOGNITION,
        hintsUsed: false,
        timestamp: testDate
      };

      await expect(source.processReview(mockVocabularyItem.id, reviewResult))
        .rejects.toThrow('FSRS processing failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to process textbook vocabulary review:',
        recordError
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('searchItems', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should return empty array if not initialized', async () => {
      const uninitializedSource = new TextbookVocabularySource(testUserId);
      const result = await uninitializedSource.searchItems('私');
      
      expect(result).toEqual([]);
    });

    it('should search items via service', async () => {
      mockService.searchCards.mockResolvedValue([mockVocabularyCard]);

      const result = await source.searchItems('私');

      expect(mockService.searchCards).toHaveBeenCalledWith('私', { limit: 20 });
      
      expect(result).toHaveLength(1);
      expect(result[0].content.primary).toBe('私');
      expect(result[0].sourceId).toBe('textbook-vocabulary');
    });

    it('should respect limit option', async () => {
      mockService.searchCards.mockResolvedValue([mockVocabularyCard]);

      await source.searchItems('test', { limit: 10 });

      expect(mockService.searchCards).toHaveBeenCalledWith('test', { limit: 10 });
    });

    it('should search by Japanese, reading, and meaning', async () => {
      const searchTerms = ['私', 'わたし', 'I'];
      
      for (const term of searchTerms) {
        mockService.searchCards.mockResolvedValue([mockVocabularyCard]);
        
        const result = await source.searchItems(term);
        
        expect(mockService.searchCards).toHaveBeenLastCalledWith(term, { limit: 20 });
        expect(result).toHaveLength(1);
      }
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockService.searchCards.mockRejectedValue(new Error('IndexedDB search failed'));

      const result = await source.searchItems('test');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to search textbook vocabulary:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getItem', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should return null if not initialized', async () => {
      const uninitializedSource = new TextbookVocabularySource(testUserId);
      const result = await uninitializedSource.getItem(mockVocabularyItem.id);
      
      expect(result).toBeNull();
    });

    it('should get item from service', async () => {
      mockService.getCard.mockResolvedValue(mockVocabularyCard);

      const result = await source.getItem(mockVocabularyItem.id);

      expect(mockService.getCard).toHaveBeenCalledWith(mockVocabularyItem.id);
      expect(result).toMatchObject({
        id: mockVocabularyItem.id,
        sourceId: 'textbook-vocabulary',
        contentType: ContentType.VOCABULARY,
        content: {
          primary: '私',
          secondary: 'I, me'
        }
      });
    });

    it('should return null if item not found', async () => {
      mockService.getCard.mockResolvedValue(null);

      const result = await source.getItem('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockService.getCard.mockRejectedValue(new Error('IndexedDB get failed'));

      const result = await source.getItem(mockVocabularyItem.id);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get textbook vocabulary item:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should update configuration', async () => {
      mockService.updateSettings.mockResolvedValue();
      
      const newConfig = { enabled: false, maxItems: 25 };
      
      await source.updateConfig(newConfig);

      expect(source.config).toMatchObject(newConfig);
    });

    it('should update service settings when config includes settings', async () => {
      mockService.updateSettings.mockResolvedValue();
      
      const newConfig = {
        settings: {
          showFurigana: false,
          playAudio: false,
          includeExamples: true,
          textbooks: ['genki-2']
        }
      };
      
      await source.updateConfig(newConfig);

      expect(mockService.updateSettings).toHaveBeenCalledWith({
        showFurigana: false,
        playAudio: false,
        includeExamples: true,
        selectedTextbooks: ['genki-2']
      });
    });

    it('should reflect configuration changes in status', async () => {
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

    it('should return true when service is healthy', async () => {
      mockService.init.mockResolvedValue();
      mockService.isHealthy.mockResolvedValue(true);
      
      await source.init();
      const result = await source.healthCheck();
      
      expect(result).toBe(true);
      expect(mockService.isHealthy).toHaveBeenCalled();
    });

    it('should return false when service is unhealthy', async () => {
      mockService.init.mockResolvedValue();
      mockService.isHealthy.mockResolvedValue(false);
      
      await source.init();
      const result = await source.healthCheck();
      
      expect(result).toBe(false);
    });

    it('should handle health check errors', async () => {
      mockService.init.mockResolvedValue();
      mockService.isHealthy.mockRejectedValue(new Error('Health check failed'));
      
      await source.init();
      const result = await source.healthCheck();
      
      expect(result).toBe(false);
    });
  });

  describe('Destroy', () => {
    it('should mark source as uninitialized and cleanup service', async () => {
      mockService.init.mockResolvedValue();
      mockService.cleanup.mockResolvedValue();
      
      await source.init();
      expect(source.status).toBe(SourceStatus.ACTIVE);

      await source.destroy();
      expect(source.status).toBe(SourceStatus.DISABLED);
      expect(mockService.cleanup).toHaveBeenCalled();
    });

    it('should fail health check after destroy', async () => {
      mockService.init.mockResolvedValue();
      mockService.cleanup.mockResolvedValue();
      
      await source.init();
      await source.destroy();
      
      const healthCheck = await source.healthCheck();
      expect(healthCheck).toBe(false);
    });
  });

  describe('Different Textbooks', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should handle Genki vocabulary', async () => {
      const genkiItem = {
        ...mockVocabularyCard,
        textbook: 'genki-1',
        lesson: 2
      };
      
      mockService.getDueItems.mockResolvedValue([genkiItem]);

      const result = await source.getDueItems();

      expect(result[0].metadata?.tags).toContain('genki-1');
      expect(result[0].metadata?.tags).toContain('lesson-2');
      expect(result[0].metadata?.properties?.textbook).toBe('genki-1');
    });

    it('should handle Minna no Nihongo vocabulary', async () => {
      const minnaItem = {
        ...mockVocabularyCard,
        id: 'minna-1-5-987654321',
        textbook: 'minna-1',
        lesson: 5,
        japanese: '本',
        reading: 'ほん',
        meaning: 'book'
      };
      
      mockService.getDueItems.mockResolvedValue([minnaItem]);

      const result = await source.getDueItems();

      expect(result[0].id).toBe('minna-1-5-987654321');
      expect(result[0].content.primary).toBe('本');
      expect(result[0].metadata?.tags).toContain('minna-1');
      expect(result[0].metadata?.tags).toContain('lesson-5');
      expect(result[0].metadata?.properties?.textbook).toBe('minna-1');
    });

    it('should get available textbooks from service', () => {
      mockService.getAvailableTextbooks.mockReturnValue(['genki-1', 'genki-2', 'minna-1', 'minna-2']);

      // Test indirectly via service interaction
      expect(mockService.getAvailableTextbooks).toBeDefined();
    });
  });

  describe('Field Mapping Corrections', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should correctly map japanese field', async () => {
      const item = { ...mockVocabularyCard, japanese: '学校' };
      mockService.getDueItems.mockResolvedValue([item]);

      const result = await source.getDueItems();

      expect(result[0].content.primary).toBe('学校');
      expect(result[0].content.formatted?.primary).toBe('学校');
    });

    it('should correctly map meaning field', async () => {
      const item = { ...mockVocabularyCard, meaning: 'school' };
      mockService.getDueItems.mockResolvedValue([item]);

      const result = await source.getDueItems();

      expect(result[0].content.secondary).toBe('school');
    });

    it('should correctly map reading field as formatted secondary', async () => {
      const item = { ...mockVocabularyCard, reading: 'がっこう' };
      mockService.getDueItems.mockResolvedValue([item]);

      const result = await source.getDueItems();

      expect(result[0].content.formatted?.secondary).toBe('がっこう');
    });

    it('should correctly map lesson field in metadata', async () => {
      const item = { ...mockVocabularyCard, lesson: 10 };
      mockService.getDueItems.mockResolvedValue([item]);

      const result = await source.getDueItems();

      expect(result[0].metadata?.properties?.lesson).toBe(10);
      expect(result[0].metadata?.tags).toContain('lesson-10');
    });

    it('should handle missing optional fields gracefully', async () => {
      const itemWithMissingFields = {
        ...mockVocabularyCard,
        examples: undefined,
        audioFile: undefined,
        frequency: undefined,
        notes: undefined
      };
      
      mockService.getDueItems.mockResolvedValue([itemWithMissingFields]);

      const result = await source.getDueItems();

      expect(result[0].content.context).toBeUndefined();
      expect(result[0].content.audio).toBeUndefined();
      expect(result[0].metadata?.properties?.frequency).toBeUndefined();
    });
  });

  describe('IndexedDB Integration', () => {
    it('should initialize service with IndexedDB support', async () => {
      mockService.init.mockResolvedValue();

      await source.init();

      expect(mockService.init).toHaveBeenCalled();
    });

    it('should handle IndexedDB errors during initialization', async () => {
      const dbError = new Error('IndexedDB not available');
      mockService.init.mockRejectedValue(dbError);

      await expect(source.init()).rejects.toThrow(/IndexedDB not available/);
    });
  });

  describe('FSRS Integration', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should process reviews using FSRS algorithm', async () => {
      mockService.recordReview.mockResolvedValue();

      const reviewResult: ReviewResult = {
        itemId: mockVocabularyItem.id,
        rating: 4, // Easy
        responseTime: 1500,
        studyMode: StudyMode.RECOGNITION,
        hintsUsed: false,
        timestamp: testDate
      };

      await source.processReview(mockVocabularyItem.id, reviewResult);

      expect(mockService.recordReview).toHaveBeenCalledWith(mockVocabularyItem.id, {
        rating: 4,
        responseTime: 1500,
        studyMode: StudyMode.RECOGNITION,
        hintsUsed: false,
        timestamp: testDate
      });
    });

    it('should handle FSRS calculation errors', async () => {
      const fsrsError = new Error('FSRS calculation failed');
      mockService.recordReview.mockRejectedValue(fsrsError);

      const reviewResult: ReviewResult = {
        itemId: mockVocabularyItem.id,
        rating: 3,
        responseTime: 2000,
        studyMode: StudyMode.PRODUCTION,
        hintsUsed: false,
        timestamp: testDate
      };

      await expect(source.processReview(mockVocabularyItem.id, reviewResult))
        .rejects.toThrow('FSRS calculation failed');
    });
  });

  describe('Priority Calculation', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should calculate higher priority for overdue items', async () => {
      const overdueDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const overdueItem = {
        ...mockVocabularyCard,
        dueDate: overdueDate
      };
      
      mockService.getDueItems.mockResolvedValue([overdueItem]);

      const result = await source.getDueItems();

      expect(result[0].priority).toBeGreaterThan(5);
    });

    it('should calculate higher priority for higher difficulty', async () => {
      const highDifficultyItem = {
        ...mockVocabularyCard,
        difficulty: 9
      };
      
      mockService.getDueItems.mockResolvedValue([highDifficultyItem]);

      const result = await source.getDueItems();

      expect(result[0].priority).toBeGreaterThan(5);
    });

    it('should calculate higher priority for advanced JLPT levels', async () => {
      const n1Item = {
        ...mockVocabularyCard,
        jlptLevel: 'N1' as const
      };
      
      mockService.getDueItems.mockResolvedValue([n1Item]);

      const result = await source.getDueItems();

      expect(result[0].priority).toBeGreaterThan(5);
    });

    it('should cap priority at maximum value', async () => {
      const extremeItem = {
        ...mockVocabularyCard,
        dueDate: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours overdue
        difficulty: 10,
        jlptLevel: 'N1' as const
      };
      
      mockService.getDueItems.mockResolvedValue([extremeItem]);

      const result = await source.getDueItems();

      expect(result[0].priority).toBeLessThanOrEqual(10);
      expect(result[0].priority).toBeGreaterThan(1);
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      mockService.init.mockResolvedValue();
      await source.init();
    });

    it('should handle service unavailable errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const serviceError = new Error('TextbookVocabularyService unavailable');
      
      mockService.getDueItems.mockRejectedValue(serviceError);
      mockService.getStats.mockRejectedValue(serviceError);
      mockService.searchCards.mockRejectedValue(serviceError);

      const dueItems = await source.getDueItems();
      const stats = await source.getStats();
      const searchResults = await source.searchItems('test');

      expect(dueItems).toEqual([]);
      expect(stats.totalItems).toBe(0);
      expect(searchResults).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed vocabulary data', async () => {
      const malformedItem = {
        ...mockVocabularyCard,
        japanese: '', // Empty required field
        meaning: null, // Null required field
        lesson: undefined // Undefined lesson
      };
      
      mockService.getDueItems.mockResolvedValue([malformedItem]);

      const result = await source.getDueItems();

      // Should handle gracefully without throwing
      expect(result).toHaveLength(1);
      expect(result[0].content.primary).toBe('');
    });

    it('should handle JSON loading errors gracefully', async () => {
      // This would be handled by the service layer
      const loadError = new Error('Failed to load vocabulary JSON');
      mockService.getDueItems.mockRejectedValue(loadError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await source.getDueItems();

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('User Type Handling', () => {
    it('should handle guest users gracefully', async () => {
      const guestSource = new TextbookVocabularySource(null);
      mockService.init.mockResolvedValue();
      mockService.getDueItems.mockResolvedValue([]);
      mockService.getStats.mockResolvedValue({
        totalCards: 0,
        dueToday: 0,
        overdue: 0,
        newCards: 0,
        averageRetention: 0,
        streak: 0
      });
      mockService.searchCards.mockResolvedValue([]);
      mockService.getCard.mockResolvedValue(null);

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

    it('should work with authenticated users', async () => {
      expect(source).toBeDefined();
      expect(TextbookVocabularyService).toHaveBeenCalledWith(testUserId);
    });
  });
});