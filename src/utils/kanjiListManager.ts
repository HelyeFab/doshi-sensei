import { Kanji, KanjiList, SavedKanji } from '@/types';
import { DatabaseManager } from './indexedDB';
import CloudSync, { SyncResult } from './cloudSync';
import { User } from 'firebase/auth';

const KANJI_LISTS_KEY = 'doshi_sensei_kanji_lists';
const SAVED_KANJI_KEY = 'doshi_sensei_saved_kanji';

// Color palette for kanji lists
const KANJI_LIST_COLORS = [
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#F97316', // Orange
  '#8B5A2B', // Brown
];

export class KanjiListManager {
  private static dbManager: DatabaseManager = new DatabaseManager();

  /**
   * Get all kanji lists from localStorage
   */
  static async getAllKanjiLists(): Promise<KanjiList[]> {
    try {
      const savedData = localStorage.getItem(KANJI_LISTS_KEY);
      if (!savedData) return [];

      const lists = JSON.parse(savedData) as KanjiList[];
      // Convert date strings back to Date objects
      return lists.map(list => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading kanji lists:', error);
      return [];
    }
  }

  /**
   * Create a new kanji list
   */
  static async createKanjiList(
    name: string,
    description?: string,
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<KanjiList> {
    try {
      const existingLists = await this.getAllKanjiLists();

      // Generate a random color
      const colorIndex = existingLists.length % KANJI_LIST_COLORS.length;
      const color = KANJI_LIST_COLORS[colorIndex];

      const newList: KanjiList = {
        id: `kanji_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description?.trim(),
        kanjiIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        color
      };

      const updatedLists = [...existingLists, newList];
      await this.saveKanjiListsToStorage(updatedLists);

      // Also save to IndexedDB
      await this.dbManager.add('kanjiLists', newList);

      // Auto-sync for premium users
      await this.autoSyncLists(user, subscriptionStatus);

      console.log('🎯 Created kanji list:', newList.name);
      return newList;
    } catch (error) {
      console.error('Error creating kanji list:', error);
      throw error;
    }
  }

  /**
   * Get kanji in a specific list
   */
  static async getKanjiInList(listId: string): Promise<Kanji[]> {
    try {
      const savedKanji = await this.getSavedKanji();
      return savedKanji
        .filter(saved => saved.listIds.includes(listId))
        .map(saved => saved.kanji);
    } catch (error) {
      console.error('Error getting kanji in list:', error);
      return [];
    }
  }

  /**
   * Save a kanji to multiple lists
   */
  static async saveKanjiToLists(
    kanji: Kanji,
    listIds: string[],
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<void> {
    try {
      const savedKanji = await this.getSavedKanji();
      const kanjiId = kanji.kanji; // Use the kanji character as ID

      // Find existing saved kanji
      const existingIndex = savedKanji.findIndex(saved => saved.kanji.kanji === kanjiId);

      if (existingIndex >= 0) {
        // Update existing kanji's list associations
        const existingSaved = savedKanji[existingIndex];
        const newListIds = Array.from(new Set([...existingSaved.listIds, ...listIds]));
        savedKanji[existingIndex] = {
          ...existingSaved,
          listIds: newListIds
        };
      } else {
        // Create new saved kanji
        const newSavedKanji: SavedKanji = {
          id: `saved_kanji_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          kanji,
          savedAt: new Date(),
          listIds
        };
        savedKanji.push(newSavedKanji);
      }

      await this.saveSavedKanjiToStorage(savedKanji);

      // Update kanji lists to include the new kanji IDs
      const kanjiLists = await this.getAllKanjiLists();
      let listsUpdated = false;

      for (const listId of listIds) {
        const listIndex = kanjiLists.findIndex(list => list.id === listId);
        if (listIndex >= 0) {
          const list = kanjiLists[listIndex];
          if (!list.kanjiIds.includes(kanjiId)) {
            list.kanjiIds.push(kanjiId);
            list.updatedAt = new Date();
            listsUpdated = true;
          }
        }
      }

      if (listsUpdated) {
        await this.saveKanjiListsToStorage(kanjiLists);
      }

      // Also save to IndexedDB
      const savedKanjiItem = savedKanji.find(saved => saved.kanji.kanji === kanjiId);
      if (savedKanjiItem) {
        await this.dbManager.put('savedKanji', savedKanjiItem);
      }

      // Auto-sync for premium users
      await this.autoSyncKanji(user, subscriptionStatus);
      await this.autoSyncLists(user, subscriptionStatus);

      console.log('🎯 Saved kanji to lists:', { kanji: kanjiId, listIds });
    } catch (error) {
      console.error('Error saving kanji to lists:', error);
      throw error;
    }
  }

  /**
   * Remove a kanji from a specific list
   */
  static async removeKanjiFromList(
    kanjiId: string,
    listId: string,
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<void> {
    try {
      // Update saved kanji
      const savedKanji = await this.getSavedKanji();
      const kanjiIndex = savedKanji.findIndex(saved => saved.kanji.kanji === kanjiId);

      if (kanjiIndex >= 0) {
        const saved = savedKanji[kanjiIndex];
        saved.listIds = saved.listIds.filter(id => id !== listId);

        // If no lists remain, remove the saved kanji entirely
        if (saved.listIds.length === 0) {
          savedKanji.splice(kanjiIndex, 1);
          await this.dbManager.delete('savedKanji', saved.id);
        } else {
          await this.dbManager.put('savedKanji', saved);
        }
      }

      await this.saveSavedKanjiToStorage(savedKanji);

      // Update kanji list
      const kanjiLists = await this.getAllKanjiLists();
      const listIndex = kanjiLists.findIndex(list => list.id === listId);

      if (listIndex >= 0) {
        const list = kanjiLists[listIndex];
        list.kanjiIds = list.kanjiIds.filter(id => id !== kanjiId);
        list.updatedAt = new Date();
        await this.saveKanjiListsToStorage(kanjiLists);
      }

      // Auto-sync for premium users
      await this.autoSyncKanji(user, subscriptionStatus);
      await this.autoSyncLists(user, subscriptionStatus);

      console.log('🗑️ Removed kanji from list:', { kanjiId, listId });
    } catch (error) {
      console.error('Error removing kanji from list:', error);
      throw error;
    }
  }

  /**
   * Delete a kanji list and remove all associations
   */
  static async deleteKanjiList(
    listId: string,
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<void> {
    try {
      // Remove from kanji lists
      const kanjiLists = await this.getAllKanjiLists();
      const filteredLists = kanjiLists.filter(list => list.id !== listId);
      await this.saveKanjiListsToStorage(filteredLists);

      // Remove list associations from saved kanji
      const savedKanji = await this.getSavedKanji();
      const updatedSavedKanji = savedKanji
        .map(saved => ({
          ...saved,
          listIds: saved.listIds.filter(id => id !== listId)
        }))
        .filter(saved => saved.listIds.length > 0); // Remove kanji with no list associations

      await this.saveSavedKanjiToStorage(updatedSavedKanji);

      // Update IndexedDB
      try {
        await this.dbManager.delete('kanjiLists', listId);
      } catch (error) {
        console.warn('List not found in IndexedDB:', listId);
      }

      // Auto-sync for premium users
      await this.autoSyncKanji(user, subscriptionStatus);
      await this.autoSyncLists(user, subscriptionStatus);

      console.log('🗑️ Deleted kanji list:', listId);
    } catch (error) {
      console.error('Error deleting kanji list:', error);
      throw error;
    }
  }

  /**
   * Check which lists a kanji belongs to
   */
  static async getKanjiListMembership(kanjiId: string): Promise<string[]> {
    try {
      const savedKanji = await this.getSavedKanji();
      const saved = savedKanji.find(s => s.kanji.kanji === kanjiId);
      return saved ? saved.listIds : [];
    } catch (error) {
      console.error('Error getting kanji list membership:', error);
      return [];
    }
  }

  /**
   * Get all saved kanji from localStorage
   */
  static async getSavedKanji(): Promise<SavedKanji[]> {
    try {
      const savedData = localStorage.getItem(SAVED_KANJI_KEY);
      if (!savedData) return [];

      const savedKanji = JSON.parse(savedData) as SavedKanji[];
      // Convert date strings back to Date objects and ensure listIds exists
      return savedKanji.map(saved => ({
        ...saved,
        savedAt: new Date(saved.savedAt),
        listIds: saved.listIds || [] // Ensure backward compatibility
      }));
    } catch (error) {
      console.error('Error loading saved kanji:', error);
      return [];
    }
  }

  // ===== CLOUD SYNC METHODS =====

  /**
   * Sync kanji lists to cloud (premium users only)
   */
  static async syncListsToCloud(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      const kanjiLists = await this.getAllKanjiLists();

      const result = await CloudSync.uploadData(user, 'kanjiLists', 'data', {
        kanjiLists,
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
   * Download kanji lists from cloud (premium users only)
   */
  static async syncListsFromCloud(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      const download = await CloudSync.downloadData<{
        kanjiLists: KanjiList[];
        updatedAt: any;
      }>(user, 'kanjiLists', 'data');

      if (!download.result.success) {
        return download.result;
      }

      if (download.data) {
        const localLists = await this.getAllKanjiLists();

        // Simple conflict resolution: cloud wins if it has newer timestamp
        const shouldUseCloud = this.shouldUseCloudListData(localLists, download.data);

        if (shouldUseCloud) {
          console.log('Using cloud kanji lists data (newer)');

          // Convert Firestore timestamps back to Date objects
          const cloudLists = download.data.kanjiLists.map(list => ({
            ...list,
            createdAt: new Date(list.createdAt),
            updatedAt: new Date(list.updatedAt)
          }));

          await this.saveKanjiListsToStorage(cloudLists);

          // Also update IndexedDB
          for (const list of cloudLists) {
            await this.dbManager.put('kanjiLists', list);
          }
        } else {
          console.log('Using local kanji lists data (newer or equal)');
          // Upload local data to cloud since it's newer
          return await this.syncListsToCloud(user, subscriptionStatus);
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
   * Sync saved kanji to cloud (premium users only)
   */
  static async syncKanjiToCloud(user: User, subscriptionStatus?: string): Promise<SyncResult> {
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
   * Auto-sync kanji lists after local changes (for premium users)
   */
  static async autoSyncLists(user: User | null, subscriptionStatus?: string): Promise<void> {
    if (!user || !CloudSync.canSync(user, subscriptionStatus)) {
      return; // Silent fail for free users
    }

    try {
      await this.syncListsToCloud(user, subscriptionStatus);
      console.log('🔄 Kanji lists auto-sync completed');
    } catch (error) {
      console.error('Kanji lists auto-sync failed:', error);
      // Don't throw - auto-sync should be silent
    }
  }

  /**
   * Auto-sync saved kanji after local changes (for premium users)
   */
  static async autoSyncKanji(user: User | null, subscriptionStatus?: string): Promise<void> {
    if (!user || !CloudSync.canSync(user, subscriptionStatus)) {
      return; // Silent fail for free users
    }

    try {
      await this.syncKanjiToCloud(user, subscriptionStatus);
      console.log('🔄 Saved kanji auto-sync completed');
    } catch (error) {
      console.error('Saved kanji auto-sync failed:', error);
      // Don't throw - auto-sync should be silent
    }
  }

  /**
   * Check if cloud list data is newer than local data
   */
  private static shouldUseCloudListData(
    localLists: KanjiList[],
    cloudData: { kanjiLists: KanjiList[]; updatedAt: any }
  ): boolean {
    // If no local data, use cloud
    if (localLists.length === 0) {
      return true;
    }

    // If no cloud data, use local
    if (!cloudData.updatedAt) {
      return false;
    }

    // Find the most recent local update
    const latestLocalUpdate = Math.max(
      ...localLists.map(list => list.updatedAt.getTime()),
      0
    );

    // Convert Firestore timestamp to Date
    const cloudTime = cloudData.updatedAt.toDate?.() || new Date(cloudData.updatedAt);
    const latestCloudUpdate = cloudTime.getTime();

    // Use cloud data if it's newer
    return latestCloudUpdate > latestLocalUpdate;
  }

  /**
   * Private method to save kanji lists to storage
   */
  private static async saveKanjiListsToStorage(kanjiLists: KanjiList[]): Promise<void> {
    try {
      localStorage.setItem(KANJI_LISTS_KEY, JSON.stringify(kanjiLists));
    } catch (error) {
      console.error('Error saving kanji lists to storage:', error);
      throw error;
    }
  }

  /**
   * Private method to save saved kanji to storage
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

export default KanjiListManager;
