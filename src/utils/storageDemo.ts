import { AppSettings, UserProgress, JapaneseWord, JLPTLevel } from '@/types';
import EnhancedStorageManager from './storage';
import {
  ProgressManager,
  VocabularyCacheManager,
  StudySessionManager,
  APICacheManager,
  WordsManager,
  getStorageUsage
} from './indexedDB';

/**
 * Demonstration utility for the enhanced storage system
 * Shows how to use IndexedDB features with localStorage fallback
 */
export class StorageDemo {

  /**
   * Initialize storage and show storage information
   */
  static async initializeAndShowInfo(): Promise<void> {

    // Initialize the enhanced storage manager
    await EnhancedStorageManager.initialize();

    // Get storage information
    const storageInfo = await EnhancedStorageManager.getStorageInfo();

    if (storageInfo.type === 'IndexedDB') {
      const usage = await getStorageUsage();
    }
  }

  /**
   * Demo: Settings Management
   */
  static async demoSettings(): Promise<void> {

    // Create sample settings
    const sampleSettings: AppSettings = {
      theme: 'dark',
      colorScheme: 'default',
      showRomaji: true,
      showCompanion: true, // Add this line
      dailyGoal: 50,
      practiceReminders: true,
      companionHistory: {
        recentCharacters: [],
        lastShownDate: undefined
      },
      navigationPreferences: {
        customNavItems: ['drill', 'vocabulary', 'games'],
        useCustomNavigation: false
      }
    };

    // Save settings
    await EnhancedStorageManager.saveSettings(sampleSettings);

    // Load settings
    const loadedSettings = await EnhancedStorageManager.loadSettings();

    // Update settings
    const updatedSettings = { ...sampleSettings, dailyGoal: 100 };
    await EnhancedStorageManager.saveSettings(updatedSettings);
  }

  /**
   * Demo: Progress Tracking
   */
  static async demoProgress(): Promise<void> {

    // Create sample progress data
    const sampleProgress: UserProgress[] = [
      {
        id: 'progress_1',
        wordId: 'word_arigatou',
        correctAnswers: 8,
        totalAttempts: 10,
        lastReviewed: new Date(),
        difficulty: 'easy',
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        masteryLevel: 80
      },
      {
        id: 'progress_2',
        wordId: 'word_konnichiwa',
        correctAnswers: 6,
        totalAttempts: 12,
        lastReviewed: new Date(),
        difficulty: 'medium',
        nextReviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        masteryLevel: 50
      },
      {
        id: 'progress_3',
        wordId: 'word_ganbatte',
        correctAnswers: 3,
        totalAttempts: 8,
        lastReviewed: new Date(),
        difficulty: 'hard',
        nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        masteryLevel: 37
      }
    ];

    // Save progress for each word
    for (const progress of sampleProgress) {
      await EnhancedStorageManager.saveProgress(progress);
    }

    // Get all progress
    const allProgress = await EnhancedStorageManager.getAllProgress();

    // Get specific word progress
    const specificProgress = await EnhancedStorageManager.getProgress('word_arigatou');

    // Update mastery level (only available with IndexedDB)
    try {
      await ProgressManager.updateMasteryLevel('word_arigatou', 90);
    } catch (error) {
    }
  }

  /**
   * Demo: Recently Viewed Words
   */
  static async demoRecentlyViewed(): Promise<void> {

    const sampleWords = [
      'word_arigatou',
      'word_konnichiwa',
      'word_sayonara',
      'word_ganbatte',
      'word_oishii'
    ];

    // Add words to recently viewed
    for (const word of sampleWords) {
      await EnhancedStorageManager.addRecentlyViewed(word, 'demo');
    }

    // Get recently viewed words
    const recentWords = await EnhancedStorageManager.getRecentlyViewedWordIds(10);
  }

  /**
   * Demo: Vocabulary Caching (IndexedDB only)
   */
  static async demoVocabularyCache(): Promise<void> {

    const sampleVocabulary: JapaneseWord[] = [
      {
        id: 'word_arigatou',
        kanji: 'ありがとう',
        kana: 'ありがとう',
        romaji: 'arigatou',
        meaning: 'thank you',
        type: 'other',
        jlpt: 'N5',
        tags: []
      },
      {
        id: 'word_konnichiwa',
        kanji: 'こんにちは',
        kana: 'こんにちは',
        romaji: 'konnichiwa',
        meaning: 'hello (afternoon)',
        type: 'other',
        jlpt: 'N5',
        tags: []
      },
      {
        id: 'word_ganbatte',
        kanji: '頑張って',
        kana: 'がんばって',
        romaji: 'ganbatte',
        meaning: 'good luck / do your best',
        type: 'other',
        jlpt: 'N4',
        tags: []
      }
    ];

    try {
      // Cache vocabulary data
      await EnhancedStorageManager.cacheVocabularyData('N5', sampleVocabulary.filter(w => w.jlpt === 'N5'));
      await EnhancedStorageManager.cacheVocabularyData('N4', sampleVocabulary.filter(w => w.jlpt === 'N4'));

      // Retrieve cached vocabulary
      const cachedN5 = await EnhancedStorageManager.getCachedVocabularyData('N5');
      const cachedN4 = await EnhancedStorageManager.getCachedVocabularyData('N4');


    } catch (error) {
    }
  }

  /**
   * Demo: Study Session Tracking (IndexedDB only)
   */
  static async demoStudySessions(): Promise<void> {

    try {
      const sampleSession = {
        id: `session_${Date.now()}`,
        userId: 'demo_user',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        endTime: new Date(),
        wordsStudied: ['word_arigatou', 'word_konnichiwa', 'word_ganbatte'],
        accuracy: 0.85,
        sessionType: 'practice' as const
      };

      // Save study session
      await StudySessionManager.saveSession(sampleSession);

      // Get session stats
      const stats = await StudySessionManager.getSessionStats(7);

    } catch (error) {
    }
  }

  /**
   * Demo: API Response Caching (IndexedDB only)
   */
  static async demoAPICache(): Promise<void> {

    try {
      const sampleAPIResponse = {
        data: [
          { word: 'arigatou', meaning: 'thank you' },
          { word: 'konnichiwa', meaning: 'hello' }
        ],
        timestamp: new Date().toISOString()
      };

      // Cache API response
      await APICacheManager.cacheAPIResponse('/api/words', { level: 'N5' }, sampleAPIResponse);

      // Retrieve cached response
      const cachedResponse = await APICacheManager.getCachedAPIResponse('/api/words', { level: 'N5' });

    } catch (error) {
    }
  }

  /**
   * Demo: Words Database Management (IndexedDB only)
   */
  static async demoWordsDatabase(): Promise<void> {

    try {
      const sampleWords: JapaneseWord[] = [
        {
          id: 'word_database_1',
          kanji: '学習',
          kana: 'がくしゅう',
          romaji: 'gakushuu',
          meaning: 'learning, study',
          type: 'noun',
          jlpt: 'N4',
          tags: []
        },
        {
          id: 'word_database_2',
          kanji: '練習',
          kana: 'れんしゅう',
          romaji: 'renshuu',
          meaning: 'practice, exercise',
          type: 'noun',
          jlpt: 'N4',
          tags: []
        }
      ];

      // Save words to database
      await WordsManager.saveWords(sampleWords);

      // Search words
      const searchResults = await WordsManager.searchWords('practice');

      // Get words by JLPT level
      const n4Words = await WordsManager.getWordsByJLPT('N4');

    } catch (error) {
    }
  }

  /**
   * Demo: Storage Cleanup and Maintenance
   */
  static async demoMaintenance(): Promise<void> {

    try {
      // Clear expired caches (IndexedDB only)
      await VocabularyCacheManager.clearExpiredCache();
      await APICacheManager.clearExpiredAPICache();

      // Get updated storage usage
      const usage = await getStorageUsage();

    } catch (error) {
    }
  }

  /**
   * Run complete demo
   */
  static async runCompleteDemo(): Promise<void> {

    try {
      await this.initializeAndShowInfo();
      await this.demoSettings();
      await this.demoProgress();
      await this.demoRecentlyViewed();
      await this.demoVocabularyCache();
      await this.demoStudySessions();
      await this.demoAPICache();
      await this.demoWordsDatabase();
      await this.demoMaintenance();


    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }

  /**
   * Clear all demo data
   */
  static async clearDemoData(): Promise<void> {

    try {
      await EnhancedStorageManager.clearAllData();
    } catch (error) {
      console.error('❌ Failed to clear demo data:', error);
    }
  }
}

// Export functions for easy access
export const {
  runCompleteDemo,
  clearDemoData,
  initializeAndShowInfo,
  demoSettings,
  demoProgress,
  demoRecentlyViewed,
  demoVocabularyCache,
  demoStudySessions,
  demoAPICache,
  demoWordsDatabase,
  demoMaintenance
} = StorageDemo;

export default StorageDemo;
