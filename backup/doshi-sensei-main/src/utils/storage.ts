import { AppSettings, UserProgress, RecentlyViewedWord, JLPTLevel, JapaneseWord } from '@/types';
import {
  SettingsManager,
  ProgressManager,
  RecentlyViewedManager,
  VocabularyCacheManager,
  isIndexedDBAvailable,
  initializeDB
} from './indexedDB';

// Local storage keys for fallback
export const SETTINGS_KEY = 'doshi_sensei_settings';
export const PROGRESS_KEY = 'doshi_sensei_progress';
export const RECENT_WORDS_KEY = 'doshi_sensei_recent_words';

// Enhanced Storage Manager with IndexedDB + localStorage fallback
export class EnhancedStorageManager {
  private static useIndexedDB: boolean | null = null;

  /**
   * Initialize storage and determine the best available option
   */
  static async initialize(): Promise<void> {
    try {
      this.useIndexedDB = await isIndexedDBAvailable();
      if (this.useIndexedDB) {
        await initializeDB();
        console.log('IndexedDB initialized successfully');
        // Migrate data from localStorage to IndexedDB if needed
        await this.migrateFromLocalStorage();
      } else {
        console.log('IndexedDB not available, falling back to localStorage');
      }
    } catch (error) {
      console.error('Storage initialization failed:', error);
      this.useIndexedDB = false;
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    type: 'IndexedDB' | 'localStorage';
    available: boolean;
    usage?: any;
  }> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      const { getStorageUsage } = await import('./indexedDB');
      const usage = await getStorageUsage();
      return {
        type: 'IndexedDB',
        available: true,
        usage
      };
    } else {
      return {
        type: 'localStorage',
        available: isLocalStorageAvailable(),
      };
    }
  }

  /**
   * Migrate existing localStorage data to IndexedDB
   */
  private static async migrateFromLocalStorage(): Promise<void> {
    try {
      // Migrate settings
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings) as AppSettings;
        await SettingsManager.saveSettings(settings);
        localStorage.removeItem(SETTINGS_KEY);
        console.log('Settings migrated from localStorage to IndexedDB');
      }

      // Migrate recent words
      const savedRecentWords = localStorage.getItem(RECENT_WORDS_KEY);
      if (savedRecentWords) {
        const recentWords = JSON.parse(savedRecentWords) as string[];
        for (const wordId of recentWords) {
          await RecentlyViewedManager.addRecentlyViewed(wordId, 'migrated');
        }
        localStorage.removeItem(RECENT_WORDS_KEY);
        console.log('Recent words migrated from localStorage to IndexedDB');
      }
    } catch (error) {
      console.error('Error migrating data from localStorage:', error);
    }
  }

  // Settings methods
  static async loadSettings(): Promise<AppSettings | null> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      return await SettingsManager.loadSettings();
    } else {
      return loadSettingsFromLocalStorage();
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await SettingsManager.saveSettings(settings);
    } else {
      saveSettingsToLocalStorage(settings);
    }
  }

  static async clearSettings(): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await SettingsManager.clearSettings();
    } else {
      localStorage.removeItem(SETTINGS_KEY);
    }
  }

  // Progress methods
  static async saveProgress(progress: UserProgress): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await ProgressManager.saveProgress(progress);
    } else {
      // Fallback: save to localStorage (simplified)
      const allProgress = await this.getAllProgress();
      const existingIndex = allProgress.findIndex(p => p.wordId === progress.wordId);

      if (existingIndex >= 0) {
        allProgress[existingIndex] = progress;
      } else {
        allProgress.push(progress);
      }

      localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
    }
  }

  static async getProgress(wordId: string): Promise<UserProgress | null> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      return await ProgressManager.getProgress(wordId);
    } else {
      // Fallback: get from localStorage
      const allProgress = await this.getAllProgress();
      return allProgress.find(p => p.wordId === wordId) || null;
    }
  }

  static async getAllProgress(): Promise<UserProgress[]> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      return await ProgressManager.getAllProgress();
    } else {
      // Fallback: get from localStorage
      try {
        const saved = localStorage.getItem(PROGRESS_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.error('Error loading progress from localStorage:', error);
        return [];
      }
    }
  }

  static async clearProgress(): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await ProgressManager.clearProgress();
    } else {
      localStorage.removeItem(PROGRESS_KEY);
    }
  }

  // Recently viewed words methods
  static async addRecentlyViewed(wordId: string, context?: string): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await RecentlyViewedManager.addRecentlyViewed(wordId, context);
    } else {
      // Fallback: save to localStorage
      const recent = await this.getRecentlyViewedWordIds(19); // Get 19, add 1 new
      const newRecent = [wordId, ...recent.filter(id => id !== wordId)].slice(0, 20);
      localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(newRecent));
    }
  }

  static async getRecentlyViewedWordIds(limit: number = 20): Promise<string[]> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      return await RecentlyViewedManager.getRecentlyViewedWordIds(limit);
    } else {
      // Fallback: get from localStorage
      try {
        const saved = localStorage.getItem(RECENT_WORDS_KEY);
        const recent = saved ? JSON.parse(saved) : [];
        return recent.slice(0, limit);
      } catch (error) {
        console.error('Error loading recent words from localStorage:', error);
        return [];
      }
    }
  }

  static async clearRecentlyViewed(): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await RecentlyViewedManager.clearRecentlyViewed();
    } else {
      localStorage.removeItem(RECENT_WORDS_KEY);
    }
  }

  // Vocabulary cache methods (only available with IndexedDB)
  static async cacheVocabularyData(jlptLevel: JLPTLevel, words: JapaneseWord[]): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await VocabularyCacheManager.cacheVocabularyData(jlptLevel, words);
    }
    // No localStorage fallback for large vocabulary data
  }

  static async getCachedVocabularyData(jlptLevel: JLPTLevel): Promise<JapaneseWord[] | null> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      return await VocabularyCacheManager.getCachedVocabularyData(jlptLevel);
    }

    return null; // No localStorage fallback for large vocabulary data
  }

  static async clearVocabularyCache(jlptLevel?: JLPTLevel): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      await VocabularyCacheManager.clearCachedVocabularyData(jlptLevel);
    }
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    if (this.useIndexedDB === null) {
      await this.initialize();
    }

    if (this.useIndexedDB) {
      const { clearAllData } = await import('./indexedDB');
      await clearAllData();
    } else {
      // Clear localStorage
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(RECENT_WORDS_KEY);
    }
  }
}

// Legacy localStorage functions for fallback
function loadSettingsFromLocalStorage(): AppSettings | null {
  if (typeof window === 'undefined') return null;

  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : null;
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
    return null;
  }
}

function saveSettingsToLocalStorage(settings: AppSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
}

/**
 * Check if localStorage is available
 * @returns True if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

// Legacy functions for backward compatibility
export function loadSettings(): AppSettings | null {
  return loadSettingsFromLocalStorage();
}

export function saveSettings(settings: AppSettings): void {
  saveSettingsToLocalStorage(settings);
}

export function clearProgress(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch (error) {
    console.error('Error clearing progress:', error);
  }
}

export function isStorageAvailable(): boolean {
  return isLocalStorageAvailable();
}

// Export the enhanced storage manager as default
export default EnhancedStorageManager;
