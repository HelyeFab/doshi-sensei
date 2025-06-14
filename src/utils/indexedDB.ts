import {
  DatabaseConfig,
  DatabaseSchema,
  AppSettings,
  UserProgress,
  StudySession,
  RecentlyViewedWord,
  CachedVocabularyData,
  CachedAPIResponse,
  JapaneseWord,
  DrillSession,
  JLPTLevel
} from '@/types';

// Database configuration
const DB_CONFIG: DatabaseConfig = {
  name: 'DoshiSenseiDB',
  version: 1,
  stores: {
    settings: {
      keyPath: 'id',
      indexes: [
        { name: 'updatedAt', keyPath: 'updatedAt' }
      ]
    },
    progress: {
      keyPath: 'id',
      indexes: [
        { name: 'wordId', keyPath: 'wordId' },
        { name: 'lastReviewed', keyPath: 'lastReviewed' },
        { name: 'nextReviewDate', keyPath: 'nextReviewDate' },
        { name: 'masteryLevel', keyPath: 'masteryLevel' },
        { name: 'difficulty', keyPath: 'difficulty' }
      ]
    },
    studySessions: {
      keyPath: 'id',
      indexes: [
        { name: 'userId', keyPath: 'userId' },
        { name: 'startTime', keyPath: 'startTime' },
        { name: 'sessionType', keyPath: 'sessionType' }
      ]
    },
    recentlyViewed: {
      keyPath: 'id',
      indexes: [
        { name: 'wordId', keyPath: 'wordId' },
        { name: 'viewedAt', keyPath: 'viewedAt' },
        { name: 'context', keyPath: 'context' }
      ]
    },
    vocabularyCache: {
      keyPath: 'id',
      indexes: [
        { name: 'jlptLevel', keyPath: 'jlptLevel' },
        { name: 'cacheDate', keyPath: 'cacheDate' },
        { name: 'expiryDate', keyPath: 'expiryDate' }
      ]
    },
    apiCache: {
      keyPath: 'id',
      indexes: [
        { name: 'endpoint', keyPath: 'endpoint' },
        { name: 'cacheDate', keyPath: 'cacheDate' },
        { name: 'expiryDate', keyPath: 'expiryDate' }
      ]
    },
    words: {
      keyPath: 'id',
      indexes: [
        { name: 'jlpt', keyPath: 'jlpt' },
        { name: 'type', keyPath: 'type' },
        { name: 'kanji', keyPath: 'kanji' },
        { name: 'kana', keyPath: 'kana' }
      ]
    },
    drillSessions: {
      keyPath: 'id',
      indexes: [
        { name: 'completed', keyPath: 'completed' },
        { name: 'startTime', keyPath: 'startTime' }
      ]
    }
  }
};

// Database connection
let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initializeDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available in server-side environment'));
      return;
    }

    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      Object.entries(DB_CONFIG.stores).forEach(([storeName, config]) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: config.keyPath,
            autoIncrement: config.autoIncrement || false
          });

          // Create indexes
          config.indexes?.forEach(index => {
            store.createIndex(index.name, index.keyPath, {
              unique: index.unique || false
            });
          });
        }
      });
    };
  });
}

/**
 * Generic function to perform database operations
 */
async function performDBOperation<T>(
  storeName: keyof DatabaseSchema,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await initializeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Settings Management
class SettingsManager {
  private static readonly SETTINGS_ID = 'user_settings';

  static async saveSettings(settings: AppSettings): Promise<void> {
    const settingsWithMetadata = {
      ...settings,
      id: this.SETTINGS_ID,
      updatedAt: new Date()
    };

    await performDBOperation('settings', 'readwrite', (store) =>
      store.put(settingsWithMetadata)
    );
  }

  static async loadSettings(): Promise<AppSettings | null> {
    try {
      const settings = await performDBOperation('settings', 'readonly', (store) =>
        store.get(this.SETTINGS_ID)
      );

      if (!settings) return null;

      // Remove metadata before returning
      const { id, updatedAt, ...appSettings } = settings;
      return appSettings as AppSettings;
    } catch (error) {
      console.error('Error loading settings from IndexedDB:', error);
      return null;
    }
  }

  static async clearSettings(): Promise<void> {
    await performDBOperation('settings', 'readwrite', (store) =>
      store.delete(this.SETTINGS_ID)
    );
  }
}

// Progress Management
class ProgressManager {
  static async saveProgress(progress: UserProgress): Promise<void> {
    await performDBOperation('progress', 'readwrite', (store) =>
      store.put(progress)
    );
  }

  static async getProgress(wordId: string): Promise<UserProgress | null> {
    const progressRecords = await performDBOperation('progress', 'readonly', (store) =>
      store.index('wordId').getAll(wordId)
    );

    return progressRecords.length > 0 ? progressRecords[0] : null;
  }

  static async getAllProgress(): Promise<UserProgress[]> {
    return await performDBOperation('progress', 'readonly', (store) =>
      store.getAll()
    );
  }

  static async getProgressByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<UserProgress[]> {
    return await performDBOperation('progress', 'readonly', (store) =>
      store.index('difficulty').getAll(difficulty)
    );
  }

  static async getWordsForReview(): Promise<UserProgress[]> {
    const now = new Date();
    const allProgress = await this.getAllProgress();

    return allProgress.filter(progress =>
      progress.nextReviewDate <= now
    );
  }

  static async updateMasteryLevel(wordId: string, newLevel: number): Promise<void> {
    const progress = await this.getProgress(wordId);
    if (progress) {
      progress.masteryLevel = newLevel;
      progress.lastReviewed = new Date();
      // Calculate next review date based on mastery level
      const daysUntilReview = Math.floor(newLevel / 10) + 1;
      progress.nextReviewDate = new Date(Date.now() + daysUntilReview * 24 * 60 * 60 * 1000);

      await this.saveProgress(progress);
    }
  }

  static async clearProgress(): Promise<void> {
    await performDBOperation('progress', 'readwrite', (store) =>
      store.clear()
    );
  }
}

// Recently Viewed Words Management
class RecentlyViewedManager {
  private static readonly MAX_RECENT_ITEMS = 100;

  static async addRecentlyViewed(wordId: string, context?: string): Promise<void> {
    const recentItem: RecentlyViewedWord = {
      id: `${wordId}_${Date.now()}`,
      wordId,
      viewedAt: new Date(),
      context
    };

    await performDBOperation('recentlyViewed', 'readwrite', (store) =>
      store.put(recentItem)
    );

    // Clean up old items
    await this.cleanupOldItems();
  }

  static async getRecentlyViewed(limit: number = 20): Promise<RecentlyViewedWord[]> {
    const allItems = await performDBOperation('recentlyViewed', 'readonly', (store) =>
      store.index('viewedAt').getAll()
    );

    // Sort by viewedAt descending and return limited results
    return allItems
      .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())
      .slice(0, limit);
  }

  static async getRecentlyViewedWordIds(limit: number = 20): Promise<string[]> {
    const recentItems = await this.getRecentlyViewed(limit);
    return [...new Set(recentItems.map(item => item.wordId))];
  }

  private static async cleanupOldItems(): Promise<void> {
    const allItems = await performDBOperation('recentlyViewed', 'readonly', (store) =>
      store.getAll()
    );

    if (allItems.length > this.MAX_RECENT_ITEMS) {
      const sortedItems = allItems.sort((a, b) =>
        b.viewedAt.getTime() - a.viewedAt.getTime()
      );

      const itemsToDelete = sortedItems.slice(this.MAX_RECENT_ITEMS);

      for (const item of itemsToDelete) {
        await performDBOperation('recentlyViewed', 'readwrite', (store) =>
          store.delete(item.id)
        );
      }
    }
  }

  static async clearRecentlyViewed(): Promise<void> {
    await performDBOperation('recentlyViewed', 'readwrite', (store) =>
      store.clear()
    );
  }
}

// Vocabulary Cache Management
class VocabularyCacheManager {
  private static readonly CACHE_DURATION_DAYS = 7;

  static async cacheVocabularyData(jlptLevel: JLPTLevel, words: JapaneseWord[]): Promise<void> {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const cacheData: CachedVocabularyData = {
      id: `vocab_${jlptLevel}`,
      jlptLevel,
      words,
      cacheDate: now,
      expiryDate
    };

    await performDBOperation('vocabularyCache', 'readwrite', (store) =>
      store.put(cacheData)
    );
  }

  static async getCachedVocabularyData(jlptLevel: JLPTLevel): Promise<JapaneseWord[] | null> {
    try {
      const cached = await performDBOperation('vocabularyCache', 'readonly', (store) =>
        store.get(`vocab_${jlptLevel}`)
      );

      if (!cached) return null;

      // Check if cache is still valid
      if (new Date() > cached.expiryDate) {
        await this.clearCachedVocabularyData(jlptLevel);
        return null;
      }

      return cached.words;
    } catch (error) {
      console.error('Error getting cached vocabulary data:', error);
      return null;
    }
  }

  static async clearCachedVocabularyData(jlptLevel?: JLPTLevel): Promise<void> {
    if (jlptLevel) {
      await performDBOperation('vocabularyCache', 'readwrite', (store) =>
        store.delete(`vocab_${jlptLevel}`)
      );
    } else {
      await performDBOperation('vocabularyCache', 'readwrite', (store) =>
        store.clear()
      );
    }
  }

  static async clearExpiredCache(): Promise<void> {
    const allCached = await performDBOperation('vocabularyCache', 'readonly', (store) =>
      store.getAll()
    );

    const now = new Date();
    const expiredItems = allCached.filter(item => now > item.expiryDate);

    for (const item of expiredItems) {
      await performDBOperation('vocabularyCache', 'readwrite', (store) =>
        store.delete(item.id)
      );
    }
  }
}

// API Cache Management
class APICacheManager {
  private static readonly CACHE_DURATION_HOURS = 1;

  static async cacheAPIResponse(
    endpoint: string,
    params: Record<string, any>,
    response: any
  ): Promise<void> {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000);
    const cacheKey = this.generateCacheKey(endpoint, params);

    const cacheData: CachedAPIResponse = {
      id: cacheKey,
      endpoint,
      params,
      response,
      cacheDate: now,
      expiryDate
    };

    await performDBOperation('apiCache', 'readwrite', (store) =>
      store.put(cacheData)
    );
  }

  static async getCachedAPIResponse(
    endpoint: string,
    params: Record<string, any>
  ): Promise<any | null> {
    try {
      const cacheKey = this.generateCacheKey(endpoint, params);
      const cached = await performDBOperation('apiCache', 'readonly', (store) =>
        store.get(cacheKey)
      );

      if (!cached) return null;

      // Check if cache is still valid
      if (new Date() > cached.expiryDate) {
        await performDBOperation('apiCache', 'readwrite', (store) =>
          store.delete(cacheKey)
        );
        return null;
      }

      return cached.response;
    } catch (error) {
      console.error('Error getting cached API response:', error);
      return null;
    }
  }

  private static generateCacheKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as Record<string, any>);

    return `${endpoint}_${JSON.stringify(sortedParams)}`;
  }

  static async clearAPICache(): Promise<void> {
    await performDBOperation('apiCache', 'readwrite', (store) =>
      store.clear()
    );
  }

  static async clearExpiredAPICache(): Promise<void> {
    const allCached = await performDBOperation('apiCache', 'readonly', (store) =>
      store.getAll()
    );

    const now = new Date();
    const expiredItems = allCached.filter(item => now > item.expiryDate);

    for (const item of expiredItems) {
      await performDBOperation('apiCache', 'readwrite', (store) =>
        store.delete(item.id)
      );
    }
  }
}

// Words Management
class WordsManager {
  static async saveWord(word: JapaneseWord): Promise<void> {
    await performDBOperation('words', 'readwrite', (store) =>
      store.put(word)
    );
  }

  static async saveWords(words: JapaneseWord[]): Promise<void> {
    const db = await initializeDB();
    const transaction = db.transaction(['words'], 'readwrite');
    const store = transaction.objectStore('words');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      words.forEach(word => store.put(word));
    });
  }

  static async getWord(id: string): Promise<JapaneseWord | null> {
    return await performDBOperation('words', 'readonly', (store) =>
      store.get(id)
    );
  }

  static async getWordsByJLPT(jlptLevel: JLPTLevel): Promise<JapaneseWord[]> {
    return await performDBOperation('words', 'readonly', (store) =>
      store.index('jlpt').getAll(jlptLevel)
    );
  }

  static async searchWords(searchTerm: string): Promise<JapaneseWord[]> {
    const allWords = await performDBOperation('words', 'readonly', (store) =>
      store.getAll()
    );

    const lowerSearchTerm = searchTerm.toLowerCase();
    return allWords.filter(word =>
      word.kanji.toLowerCase().includes(lowerSearchTerm) ||
      word.kana.toLowerCase().includes(lowerSearchTerm) ||
      word.romaji.toLowerCase().includes(lowerSearchTerm) ||
      word.meaning.toLowerCase().includes(lowerSearchTerm)
    );
  }

  static async getAllWords(): Promise<JapaneseWord[]> {
    return await performDBOperation('words', 'readonly', (store) =>
      store.getAll()
    );
  }
}

// Study Sessions Management
class StudySessionManager {
  static async saveSession(session: StudySession): Promise<void> {
    await performDBOperation('studySessions', 'readwrite', (store) =>
      store.put(session)
    );
  }

  static async getRecentSessions(limit: number = 10): Promise<StudySession[]> {
    const allSessions = await performDBOperation('studySessions', 'readonly', (store) =>
      store.index('startTime').getAll()
    );

    return allSessions
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  static async getSessionsByType(sessionType: 'drill' | 'practice' | 'review'): Promise<StudySession[]> {
    return await performDBOperation('studySessions', 'readonly', (store) =>
      store.index('sessionType').getAll(sessionType)
    );
  }

  static async getSessionStats(days: number = 7): Promise<{
    totalSessions: number;
    totalWordsStudied: number;
    averageAccuracy: number;
    sessionsByType: Record<string, number>;
  }> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const allSessions = await this.getRecentSessions(1000); // Get a large number

    const recentSessions = allSessions.filter(session =>
      session.startTime >= cutoffDate
    );

    const totalSessions = recentSessions.length;
    const totalWordsStudied = recentSessions.reduce((sum, session) =>
      sum + session.wordsStudied.length, 0
    );
    const averageAccuracy = totalSessions > 0
      ? recentSessions.reduce((sum, session) => sum + session.accuracy, 0) / totalSessions
      : 0;

    const sessionsByType = recentSessions.reduce((acc, session) => {
      acc[session.sessionType] = (acc[session.sessionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSessions,
      totalWordsStudied,
      averageAccuracy,
      sessionsByType
    };
  }
}

// Drill Sessions Management
class DrillSessionManager {
  static async saveSession(session: DrillSession): Promise<void> {
    await performDBOperation('drillSessions', 'readwrite', (store) =>
      store.put(session)
    );
  }

  static async getSession(id: string): Promise<DrillSession | null> {
    return await performDBOperation('drillSessions', 'readonly', (store) =>
      store.get(id)
    );
  }

  static async getIncompleteSessions(): Promise<DrillSession[]> {
    const allSessions = await performDBOperation('drillSessions', 'readonly', (store) =>
      store.getAll()
    );
    return allSessions.filter(session => !session.completed);
  }

  static async getCompletedSessions(): Promise<DrillSession[]> {
    const allSessions = await performDBOperation('drillSessions', 'readonly', (store) =>
      store.getAll()
    );
    return allSessions.filter(session => session.completed);
  }
}

// Utility functions
export async function isIndexedDBAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    await initializeDB();
    return true;
  } catch (error) {
    console.error('IndexedDB not available:', error);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await initializeDB();
  const storeNames = Object.keys(DB_CONFIG.stores) as (keyof DatabaseSchema)[];

  const transaction = db.transaction(storeNames, 'readwrite');

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    storeNames.forEach(storeName => {
      transaction.objectStore(storeName).clear();
    });
  });
}

export async function getStorageUsage(): Promise<{
  estimate?: StorageEstimate;
  usage: { [key: string]: number };
}> {
  const result: { estimate?: StorageEstimate; usage: { [key: string]: number } } = {
    usage: {}
  };

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    result.estimate = await navigator.storage.estimate();
  }

  // Get usage per store
  const db = await initializeDB();
  const storeNames = Object.keys(DB_CONFIG.stores) as (keyof DatabaseSchema)[];

  for (const storeName of storeNames) {
    try {
      const count = await performDBOperation(storeName, 'readonly', (store) =>
        store.count()
      );
      result.usage[storeName] = count;
    } catch (error) {
      console.error(`Error getting count for ${storeName}:`, error);
      result.usage[storeName] = 0;
    }
  }

  return result;
}

// Export all managers
export {
  SettingsManager,
  ProgressManager,
  RecentlyViewedManager,
  VocabularyCacheManager,
  APICacheManager,
  WordsManager,
  StudySessionManager,
  DrillSessionManager
};
