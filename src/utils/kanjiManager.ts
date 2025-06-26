import { Kanji, SavedKanji, JLPTLevel, KanjiByLevel } from '@/types';
import { DatabaseManager } from './indexedDB';
import CloudSync, { SyncResult } from './cloudSync';
import { User } from 'firebase/auth';

const SAVED_KANJI_KEY = 'doshi_sensei_saved_kanji';

// JLPT level mapping for file paths
const JLPT_FILES = {
  'N5': '/api/kanji/jlpt_5',
  'N4': '/api/kanji/jlpt_4',
  'N3': '/api/kanji/jlpt_3',
  'N2': '/api/kanji/jlpt_2',
  'N1': '/api/kanji/jlpt_1'
};

export class KanjiManager {
  private static kanjiCache: KanjiByLevel = {};
  private static dbManager: DatabaseManager = new DatabaseManager();

  /**
   * Load kanji data for a specific JLPT level
   */
  static async loadKanjiByLevel(level: JLPTLevel): Promise<Kanji[]> {
    // Check cache first
    if (this.kanjiCache[level]) {
      return this.kanjiCache[level];
    }

    try {
      const filePath = JLPT_FILES[level];
      const response = await fetch(filePath);

      if (!response.ok) {
        throw new Error(`Failed to load ${level} kanji data`);
      }

      const rawKanji = await response.json();

      // Transform raw data to include JLPT level
      const kanji: Kanji[] = rawKanji.map((item: any) => ({
        ...item,
        jlpt: level
      }));

      // Cache the result
      this.kanjiCache[level] = kanji;

      return kanji;
    } catch (error) {
      console.error(`Error loading ${level} kanji:`, error);
      return [];
    }
  }

  /**
   * Load all kanji data grouped by JLPT level
   */
  static async loadAllKanji(): Promise<KanjiByLevel> {
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
    const kanjiByLevel: KanjiByLevel = {};

    await Promise.all(
      levels.map(async (level) => {
        kanjiByLevel[level] = await this.loadKanjiByLevel(level);
      })
    );

    return kanjiByLevel;
  }

  /**
   * Search kanji across all levels
   */
  static async searchKanji(query: string, levels?: JLPTLevel[]): Promise<Kanji[]> {
    const searchLevels = levels || ['N5', 'N4', 'N3', 'N2', 'N1'];
    const results: Kanji[] = [];

    for (const level of searchLevels) {
      const levelKanji = await this.loadKanjiByLevel(level);
      const matches = levelKanji.filter(kanji =>
        kanji.kanji.includes(query) ||
        kanji.meaning.toLowerCase().includes(query.toLowerCase()) ||
        kanji.onyomi.some(reading => reading.includes(query)) ||
        kanji.kunyomi.some(reading => reading.includes(query))
      );
      results.push(...matches);
    }

    return results;
  }

  /**
   * Get all saved kanji from localStorage
   */
  static async getSavedKanji(): Promise<SavedKanji[]> {
    try {
      const savedData = localStorage.getItem(SAVED_KANJI_KEY);
      if (!savedData) return [];

      const savedKanji = JSON.parse(savedData) as SavedKanji[];
      // Convert date strings back to Date objects
      return savedKanji.map(saved => ({
        ...saved,
        savedAt: new Date(saved.savedAt)
      }));
    } catch (error) {
      console.error('Error loading saved kanji:', error);
      return [];
    }
  }

  /**
   * Save a kanji to favorites
   */
  static async saveKanji(kanji: Kanji, user: User | null = null, subscriptionStatus?: string): Promise<void> {
    try {
      const savedKanji = await this.getSavedKanji();

      // Check if already saved
      const existingIndex = savedKanji.findIndex(saved => saved.kanji.kanji === kanji.kanji);

      if (existingIndex >= 0) {
        // Already saved, no need to add again
        return;
      }

      const newSavedKanji: SavedKanji = {
        id: `kanji_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        kanji,
        savedAt: new Date(),
        listIds: []
      };

      savedKanji.push(newSavedKanji);
      await this.saveSavedKanjiToStorage(savedKanji);

      // Also save to IndexedDB for consistency
      await this.dbManager.add('savedKanji', newSavedKanji);

      // Auto-sync for premium users
      await this.autoSync(user, subscriptionStatus);
    } catch (error) {
      console.error('Error saving kanji:', error);
      throw error;
    }
  }

  /**
   * Remove a kanji from favorites
   */
  static async removeSavedKanji(kanjiCharacter: string, user: User | null = null, subscriptionStatus?: string): Promise<void> {
    try {
      const savedKanji = await this.getSavedKanji();
      const filteredKanji = savedKanji.filter(saved => saved.kanji.kanji !== kanjiCharacter);

      await this.saveSavedKanjiToStorage(filteredKanji);

      // Also remove from IndexedDB
      const toRemove = savedKanji.find(saved => saved.kanji.kanji === kanjiCharacter);
      if (toRemove) {
        await this.dbManager.delete('savedKanji', toRemove.id);
      }

      // Auto-sync for premium users
      await this.autoSync(user, subscriptionStatus);
    } catch (error) {
      console.error('Error removing saved kanji:', error);
      throw error;
    }
  }

  /**
   * Check if a kanji is saved
   */
  static async isKanjiSaved(kanjiCharacter: string): Promise<boolean> {
    const savedKanji = await this.getSavedKanji();
    return savedKanji.some(saved => saved.kanji.kanji === kanjiCharacter);
  }

  /**
   * Get kanji statistics
   */
  static async getKanjiStats(): Promise<{
    totalSaved: number;
    byLevel: Record<JLPTLevel, number>;
  }> {
    const savedKanji = await this.getSavedKanji();
    const byLevel: Record<JLPTLevel, number> = {
      'N5': 0,
      'N4': 0,
      'N3': 0,
      'N2': 0,
      'N1': 0
    };

    savedKanji.forEach(saved => {
      byLevel[saved.kanji.jlpt]++;
    });

    return {
      totalSaved: savedKanji.length,
      byLevel
    };
  }

  /**
   * Clear all saved kanji
   */
  static async clearAllSavedKanji(): Promise<void> {
    localStorage.removeItem(SAVED_KANJI_KEY);

    // Also clear from IndexedDB
    try {
      const allSaved = await this.dbManager.getAll('savedKanji');
      for (const saved of allSaved) {
        await this.dbManager.delete('savedKanji', saved.id);
      }
    } catch (error) {
      console.error('Error clearing IndexedDB saved kanji:', error);
    }
  }

  /**
   * Export saved kanji as JSON
   */
  static async exportSavedKanji(): Promise<string> {
    const savedKanji = await this.getSavedKanji();

    return JSON.stringify({
      savedKanji,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Import saved kanji from JSON
   */
  static async importSavedKanji(jsonData: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = JSON.parse(jsonData);

      if (!data.savedKanji || !Array.isArray(data.savedKanji)) {
        return { success: false, error: 'Invalid data format: missing savedKanji array' };
      }

      // Validate and convert dates
      const savedKanji: SavedKanji[] = data.savedKanji.map((saved: any) => ({
        ...saved,
        savedAt: new Date(saved.savedAt)
      }));

      await this.saveSavedKanjiToStorage(savedKanji);

      // Also save to IndexedDB
      for (const saved of savedKanji) {
        await this.dbManager.put('savedKanji', saved);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // ===== CLOUD SYNC METHODS =====

  /**
   * Sync saved kanji to cloud (premium users only)
   */
  static async syncToCloud(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      const savedKanji = await this.getSavedKanji();

      const result = await CloudSync.uploadData(user, 'savedKanji', 'data', {
        savedKanji,
        updatedAt: new Date()
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync to cloud failed'
      };
    }
  }

  /**
   * Download saved kanji from cloud (premium users only)
   */
  static async syncFromCloud(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      const download = await CloudSync.downloadData<{
        savedKanji: SavedKanji[];
        updatedAt: any;
      }>(user, 'savedKanji', 'data');

      if (!download.result.success) {
        return download.result;
      }

      if (download.data) {
        const localKanji = await this.getSavedKanji();

        // Simple conflict resolution: cloud wins if it has newer timestamp
        const shouldUseCloud = this.shouldUseCloudData(localKanji, download.data);

        if (shouldUseCloud) {

          // Convert Firestore timestamps back to Date objects
          const cloudKanji = download.data.savedKanji.map(saved => ({
            ...saved,
            savedAt: new Date(saved.savedAt)
          }));

          await this.saveSavedKanjiToStorage(cloudKanji);

          // Also update IndexedDB
          for (const saved of cloudKanji) {
            await this.dbManager.put('savedKanji', saved);
          }
        } else {
          // Upload local data to cloud since it's newer
          return await this.syncToCloud(user, subscriptionStatus);
        }
      }

      return { success: true, synced: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync from cloud failed'
      };
    }
  }

  /**
   * Perform full bidirectional sync
   */
  static async performFullSync(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }


    // First, try to download from cloud
    const downloadResult = await this.syncFromCloud(user, subscriptionStatus);

    if (!downloadResult.success) {
      // If download fails, try to upload local data
      return await this.syncToCloud(user, subscriptionStatus);
    }

    return downloadResult;
  }

  /**
   * Auto-sync after local changes (for premium users)
   */
  static async autoSync(user: User | null, subscriptionStatus?: string): Promise<void> {
    if (!user || !CloudSync.canSync(user, subscriptionStatus)) {
      return; // Silent fail for free users
    }

    try {
      await this.syncToCloud(user, subscriptionStatus);
    } catch (error) {
      console.error('Kanji auto-sync failed:', error);
      // Don't throw - auto-sync should be silent
    }
  }

  /**
   * Check if cloud data is newer than local data
   */
  private static shouldUseCloudData(
    localKanji: SavedKanji[],
    cloudData: { savedKanji: SavedKanji[]; updatedAt: any }
  ): boolean {
    // If no local data, use cloud
    if (localKanji.length === 0) {
      return true;
    }

    // If no cloud data, use local
    if (!cloudData.updatedAt) {
      return false;
    }

    // Find the most recent local update
    const latestLocalUpdate = Math.max(
      ...localKanji.map(saved => saved.savedAt.getTime()),
      0
    );

    // Convert Firestore timestamp to Date
    const cloudTime = cloudData.updatedAt.toDate?.() || new Date(cloudData.updatedAt);
    const latestCloudUpdate = cloudTime.getTime();

    // Use cloud data if it's newer
    return latestCloudUpdate > latestLocalUpdate;
  }

  /**
   * Private method to save kanji to storage
   */
  private static async saveSavedKanjiToStorage(savedKanji: SavedKanji[]): Promise<void> {
    try {
      localStorage.setItem(SAVED_KANJI_KEY, JSON.stringify(savedKanji));
    } catch (error) {
      console.error('Error saving kanji to storage:', error);
      throw error;
    }
  }
}

export default KanjiManager;
