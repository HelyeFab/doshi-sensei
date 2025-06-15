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
    console.log('🚀 Initializing Enhanced Storage System...');

    // Initialize the enhanced storage manager
    await EnhancedStorageManager.initialize();

    // Get storage information
    const storageInfo = await EnhancedStorageManager.getStorageInfo();
    console.log('📊 Storage Info:', storageInfo);

    if (storageInfo.type === 'IndexedDB') {
      const usage = await getStorageUsage();
      console.log('💾 Storage Usage Details:', usage);
    }
  }

  /**
   * Demo: Settings Management
   */
  static async demoSettings(): Promise<void> {
    console.log('\n🎛️ Settings Management Demo');

    // Create sample settings
    const sampleSettings: AppSettings = {
      theme: 'dark',
      showRomaji: true,
      dailyGoal: 50,
      practiceReminders: true
    };

    // Save settings
    await EnhancedStorageManager.saveSettings(sampleSettings);
    console.log('✅ Settings saved:', sampleSettings);

    // Load settings
    const loadedSettings = await EnhancedStorageManager.loadSettings();
    console.log('📖 Settings loaded:', loadedSettings);

    // Update settings
    const updatedSettings = { ...sampleSettings, dailyGoal: 100 };
    await EnhancedStorageManager.saveSettings(updatedSettings);
    console.log('🔄 Settings updated:', updatedSettings);
  }

  /**
   * Demo: Progress Tracking
   */
  static async demoProgress(): Promise<void> {
    console.log('\n📈 Progress Tracking Demo');

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
    console.log('✅ Progress data saved for', sampleProgress.length, 'words');

    // Get all progress
    const allProgress = await EnhancedStorageManager.getAllProgress();
    console.log('📊 All progress loaded:', allProgress.length, 'records');

    // Get specific word progress
    const specificProgress = await EnhancedStorageManager.getProgress('word_arigatou');
    console.log('🎯 Specific word progress:', specificProgress);

    // Update mastery level (only available with IndexedDB)
    try {
      await ProgressManager.updateMasteryLevel('word_arigatou', 90);
      console.log('⬆️ Updated mastery level for arigatou to 90');
    } catch (error) {
      console.log('⚠️ Mastery level update not available (using localStorage)');
    }
  }

  /**
   * Demo: Recently Viewed Words
   */
  static async demoRecentlyViewed(): Promise<void> {
    console.log('\n👀 Recently Viewed Words Demo');

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
    console.log('✅ Added', sampleWords.length, 'words to recently viewed');

    // Get recently viewed words
    const recentWords = await EnhancedStorageManager.getRecentlyViewedWordIds(10);
    console.log('📋 Recently viewed words:', recentWords);
  }

  /**
   * Demo: Vocabulary Caching (IndexedDB only)
   */
  static async demoVocabularyCache(): Promise<void> {
    console.log('\n📚 Vocabulary Caching Demo (IndexedDB only)');

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
      console.log('✅ Vocabulary cached for N5 and N4 levels');

      // Retrieve cached vocabulary
      const cachedN5 = await EnhancedStorageManager.getCachedVocabularyData('N5');
      const cachedN4 = await EnhancedStorageManager.getCachedVocabularyData('N4');

      console.log('📖 Cached N5 vocabulary:', cachedN5?.length || 0, 'words');
      console.log('📖 Cached N4 vocabulary:', cachedN4?.length || 0, 'words');

    } catch (error) {
      console.log('⚠️ Vocabulary caching not available (using localStorage fallback)');
    }
  }

  /**
   * Demo: Study Session Tracking (IndexedDB only)
   */
  static async demoStudySessions(): Promise<void> {
    console.log('\n📝 Study Session Tracking Demo (IndexedDB only)');

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
      console.log('✅ Study session saved:', sampleSession);

      // Get session stats
      const stats = await StudySessionManager.getSessionStats(7);
      console.log('📊 7-day session stats:', stats);

    } catch (error) {
      console.log('⚠️ Study session tracking not available (using localStorage fallback)');
    }
  }

  /**
   * Demo: API Response Caching (IndexedDB only)
   */
  static async demoAPICache(): Promise<void> {
    console.log('\n🌐 API Response Caching Demo (IndexedDB only)');

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
      console.log('✅ API response cached');

      // Retrieve cached response
      const cachedResponse = await APICacheManager.getCachedAPIResponse('/api/words', { level: 'N5' });
      console.log('📖 Retrieved cached API response:', cachedResponse);

    } catch (error) {
      console.log('⚠️ API caching not available (using localStorage fallback)');
    }
  }

  /**
   * Demo: Words Database Management (IndexedDB only)
   */
  static async demoWordsDatabase(): Promise<void> {
    console.log('\n🗄️ Words Database Demo (IndexedDB only)');

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
      console.log('✅ Words saved to database:', sampleWords.length);

      // Search words
      const searchResults = await WordsManager.searchWords('practice');
      console.log('🔍 Search results for "practice":', searchResults);

      // Get words by JLPT level
      const n4Words = await WordsManager.getWordsByJLPT('N4');
      console.log('📚 N4 words in database:', n4Words.length);

    } catch (error) {
      console.log('⚠️ Words database not available (using localStorage fallback)');
    }
  }

  /**
   * Demo: Storage Cleanup and Maintenance
   */
  static async demoMaintenance(): Promise<void> {
    console.log('\n🧹 Storage Maintenance Demo');

    try {
      // Clear expired caches (IndexedDB only)
      await VocabularyCacheManager.clearExpiredCache();
      await APICacheManager.clearExpiredAPICache();
      console.log('✅ Expired caches cleared');

      // Get updated storage usage
      const usage = await getStorageUsage();
      console.log('📊 Storage usage after cleanup:', usage);

    } catch (error) {
      console.log('⚠️ Some maintenance features not available (using localStorage fallback)');
    }
  }

  /**
   * Run complete demo
   */
  static async runCompleteDemo(): Promise<void> {
    console.log('🎭 Starting Complete Storage Demo\n');

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

      console.log('\n🎉 Demo completed successfully!');
      console.log('💡 Check the browser console for detailed logs');

    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }

  /**
   * Clear all demo data
   */
  static async clearDemoData(): Promise<void> {
    console.log('🗑️ Clearing all demo data...');

    try {
      await EnhancedStorageManager.clearAllData();
      console.log('✅ All demo data cleared');
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
