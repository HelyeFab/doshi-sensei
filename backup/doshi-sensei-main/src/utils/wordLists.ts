import { WordList, SavedWord, JapaneseWord } from '@/types';
import EnhancedStorageManager from './storage';
import CloudSync, { SyncResult } from './cloudSync';
import { User } from 'firebase/auth';

// Pastel colors for list pills (mobile-friendly high contrast)
const PASTEL_COLORS = [
  '#FFB3BA', // Light Pink
  '#FFDFBA', // Light Orange
  '#FFFFBA', // Light Yellow
  '#BAFFC9', // Light Green
  '#BAE1FF', // Light Blue
  '#E0BAFF', // Light Purple
  '#FFB3E6', // Light Magenta
  '#C7CEEA', // Light Lavender
  '#B5EAD7', // Light Mint
  '#FFDAC1', // Light Peach
  '#E2F0CB', // Light Lime
  '#D4A4A4', // Light Rose
];

const WORD_LISTS_KEY = 'doshi_sensei_word_lists';
const SAVED_WORDS_KEY = 'doshi_sensei_saved_words';

export class WordListManager {
  /**
   * Get all word lists
   */
  static async getAllWordLists(): Promise<WordList[]> {
    try {
      const listsData = localStorage.getItem(WORD_LISTS_KEY);
      if (!listsData) return [];

      const lists = JSON.parse(listsData) as WordList[];
      // Convert date strings back to Date objects
      return lists.map(list => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading word lists:', error);
      return [];
    }
  }

  /**
   * Create a new word list
   */
  static async createWordList(
    name: string,
    description?: string,
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<WordList> {
    const lists = await this.getAllWordLists();

    // Generate a random pastel color
    const color = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];

    const newList: WordList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description?.trim(),
      wordIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      color
    };

    lists.push(newList);
    await this.saveWordLists(lists);

    // Auto-sync for paid users
    await this.autoSync(user, subscriptionStatus);

    return newList;
  }

  /**
   * Update an existing word list
   */
  static async updateWordList(listId: string, updates: Partial<Pick<WordList, 'name' | 'description'>>): Promise<WordList | null> {
    const lists = await this.getAllWordLists();
    const listIndex = lists.findIndex(list => list.id === listId);

    if (listIndex === -1) return null;

    lists[listIndex] = {
      ...lists[listIndex],
      ...updates,
      name: updates.name?.trim() || lists[listIndex].name,
      description: updates.description?.trim(),
      updatedAt: new Date()
    };

    await this.saveWordLists(lists);
    return lists[listIndex];
  }

  /**
   * Delete a word list
   */
  static async deleteWordList(listId: string): Promise<void> {
    const lists = await this.getAllWordLists();
    const filteredLists = lists.filter(list => list.id !== listId);
    await this.saveWordLists(filteredLists);

    // Also remove this list from all saved words
    const savedWords = await this.getAllSavedWords();
    const updatedSavedWords = savedWords.map(savedWord => ({
      ...savedWord,
      listIds: savedWord.listIds.filter(id => id !== listId)
    })).filter(savedWord => savedWord.listIds.length > 0); // Remove words with no lists

    await this.saveSavedWords(updatedSavedWords);
  }

  /**
   * Get a specific word list by ID
   */
  static async getWordList(listId: string): Promise<WordList | null> {
    const lists = await this.getAllWordLists();
    return lists.find(list => list.id === listId) || null;
  }

  /**
   * Save a word to lists
   */
  static async saveWordToLists(word: JapaneseWord, listIds: string[]): Promise<void> {
    if (listIds.length === 0) return;

    const savedWords = await this.getAllSavedWords();
    const existingIndex = savedWords.findIndex(saved => saved.word.id === word.id);

    if (existingIndex >= 0) {
      // Update existing saved word
      const existingListIds = savedWords[existingIndex].listIds;
      const newListIds = [...new Set([...existingListIds, ...listIds])];
      savedWords[existingIndex] = {
        ...savedWords[existingIndex],
        listIds: newListIds
      };
    } else {
      // Create new saved word
      const savedWord: SavedWord = {
        id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        word,
        savedAt: new Date(),
        listIds
      };
      savedWords.push(savedWord);
    }

    await this.saveSavedWords(savedWords);

    // Update word lists to include this word
    const lists = await this.getAllWordLists();
    let listsUpdated = false;

    for (const listId of listIds) {
      const listIndex = lists.findIndex(list => list.id === listId);
      if (listIndex >= 0 && !lists[listIndex].wordIds.includes(word.id)) {
        lists[listIndex].wordIds.push(word.id);
        lists[listIndex].updatedAt = new Date();
        listsUpdated = true;
      }
    }

    if (listsUpdated) {
      await this.saveWordLists(lists);
    }
  }

  /**
   * Remove a word from a specific list
   */
  static async removeWordFromList(wordId: string, listId: string): Promise<void> {
    // Update the word list
    const lists = await this.getAllWordLists();
    const listIndex = lists.findIndex(list => list.id === listId);

    if (listIndex >= 0) {
      lists[listIndex].wordIds = lists[listIndex].wordIds.filter(id => id !== wordId);
      lists[listIndex].updatedAt = new Date();
      await this.saveWordLists(lists);
    }

    // Update the saved word
    const savedWords = await this.getAllSavedWords();
    const savedWordIndex = savedWords.findIndex(saved => saved.word.id === wordId);

    if (savedWordIndex >= 0) {
      savedWords[savedWordIndex].listIds = savedWords[savedWordIndex].listIds.filter(id => id !== listId);

      // If the word is no longer in any lists, remove it completely
      if (savedWords[savedWordIndex].listIds.length === 0) {
        savedWords.splice(savedWordIndex, 1);
      }

      await this.saveSavedWords(savedWords);
    }
  }

  /**
   * Get all words in a specific list
   */
  static async getWordsInList(listId: string): Promise<JapaneseWord[]> {
    const savedWords = await this.getAllSavedWords();
    return savedWords
      .filter(saved => saved.listIds.includes(listId))
      .map(saved => saved.word);
  }

  /**
   * Get words from multiple lists
   */
  static async getWordsFromLists(listIds: string[]): Promise<JapaneseWord[]> {
    if (listIds.length === 0) return [];

    const savedWords = await this.getAllSavedWords();
    const wordMap = new Map<string, JapaneseWord>();

    savedWords
      .filter(saved => saved.listIds.some(listId => listIds.includes(listId)))
      .forEach(saved => {
        wordMap.set(saved.word.id, saved.word);
      });

    return Array.from(wordMap.values());
  }

  /**
   * Get lists that contain a specific word
   */
  static async getListsContainingWord(wordId: string): Promise<WordList[]> {
    const savedWords = await this.getAllSavedWords();
    const savedWord = savedWords.find(saved => saved.word.id === wordId);

    if (!savedWord) return [];

    const allLists = await this.getAllWordLists();
    return allLists.filter(list => savedWord.listIds.includes(list.id));
  }

  /**
   * Check if a word is saved in any list
   */
  static async isWordSaved(wordId: string): Promise<boolean> {
    const savedWords = await this.getAllSavedWords();
    return savedWords.some(saved => saved.word.id === wordId);
  }

  /**
   * Get all saved words
   */
  static async getAllSavedWords(): Promise<SavedWord[]> {
    try {
      const savedWordsData = localStorage.getItem(SAVED_WORDS_KEY);
      if (!savedWordsData) return [];

      const savedWords = JSON.parse(savedWordsData) as SavedWord[];
      // Convert date strings back to Date objects
      return savedWords.map(saved => ({
        ...saved,
        savedAt: new Date(saved.savedAt)
      }));
    } catch (error) {
      console.error('Error loading saved words:', error);
      return [];
    }
  }

  /**
   * Get word list statistics
   */
  static async getWordListStats(): Promise<{
    totalLists: number;
    totalWords: number;
    averageWordsPerList: number;
  }> {
    const lists = await this.getAllWordLists();
    const savedWords = await this.getAllSavedWords();

    const totalLists = lists.length;
    const totalWords = savedWords.length;
    const averageWordsPerList = totalLists > 0 ? totalWords / totalLists : 0;

    return {
      totalLists,
      totalWords,
      averageWordsPerList: Math.round(averageWordsPerList * 100) / 100
    };
  }

  /**
   * Clear all word lists and saved words
   */
  static async clearAllWordLists(): Promise<void> {
    localStorage.removeItem(WORD_LISTS_KEY);
    localStorage.removeItem(SAVED_WORDS_KEY);
  }

  /**
   * Export word lists as JSON
   */
  static async exportWordLists(): Promise<string> {
    const lists = await this.getAllWordLists();
    const savedWords = await this.getAllSavedWords();

    return JSON.stringify({
      lists,
      savedWords,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Import word lists from JSON
   */
  static async importWordLists(jsonData: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = JSON.parse(jsonData);

      if (!data.lists || !Array.isArray(data.lists)) {
        return { success: false, error: 'Invalid data format: missing lists array' };
      }

      if (!data.savedWords || !Array.isArray(data.savedWords)) {
        return { success: false, error: 'Invalid data format: missing savedWords array' };
      }

      // Validate and convert dates
      const lists: WordList[] = data.lists.map((list: any) => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt)
      }));

      const savedWords: SavedWord[] = data.savedWords.map((saved: any) => ({
        ...saved,
        savedAt: new Date(saved.savedAt)
      }));

      await this.saveWordLists(lists);
      await this.saveSavedWords(savedWords);

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
   * Sync all word lists to cloud (paid users only)
   */
  static async syncToCloud(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      const lists = await this.getAllWordLists();
      const savedWords = await this.getAllSavedWords();

      // Upload lists collection
      const listsResult = await CloudSync.uploadData(user, 'wordLists', 'data', {
        lists,
        updatedAt: new Date()
      });

      if (!listsResult.success) {
        return listsResult;
      }

      // Upload saved words collection
      const wordsResult = await CloudSync.uploadData(user, 'savedWords', 'data', {
        savedWords,
        updatedAt: new Date()
      });

      return wordsResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync to cloud failed'
      };
    }
  }

  /**
   * Download word lists from cloud (paid users only)
   */
  static async syncFromCloud(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      // Download lists
      const listsDownload = await CloudSync.downloadData<{
        lists: WordList[];
        updatedAt: any;
      }>(user, 'wordLists', 'data');

      // Download saved words
      const wordsDownload = await CloudSync.downloadData<{
        savedWords: SavedWord[];
        updatedAt: any;
      }>(user, 'savedWords', 'data');

      if (!listsDownload.result.success || !wordsDownload.result.success) {
        return {
          success: false,
          error: 'Failed to download from cloud'
        };
      }

      // If cloud data exists, merge with local data
      if (listsDownload.data && wordsDownload.data) {
        const localLists = await this.getAllWordLists();
        const localWords = await this.getAllSavedWords();

        // Simple conflict resolution: cloud wins if it has newer timestamp
        const shouldUseCloud = this.shouldUseCloudData(
          localLists,
          localWords,
          listsDownload.data,
          wordsDownload.data
        );

        if (shouldUseCloud) {
          console.log('Using cloud data (newer)');

          // Convert Firestore timestamps back to Date objects
          const cloudLists = listsDownload.data.lists.map(list => ({
            ...list,
            createdAt: new Date(list.createdAt),
            updatedAt: new Date(list.updatedAt)
          }));

          const cloudWords = wordsDownload.data.savedWords.map(word => ({
            ...word,
            savedAt: new Date(word.savedAt)
          }));

          await this.saveWordLists(cloudLists);
          await this.saveSavedWords(cloudWords);
        } else {
          console.log('Using local data (newer or equal)');
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
   * Perform bidirectional sync (download then upload if needed)
   */
  static async performFullSync(user: User, subscriptionStatus?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    console.log('🔄 Starting full sync...');

    // First, try to download from cloud
    const downloadResult = await this.syncFromCloud(user, subscriptionStatus);

    if (!downloadResult.success) {
      // If download fails, try to upload local data
      console.log('📤 Download failed, trying upload...');
      return await this.syncToCloud(user, subscriptionStatus);
    }

    console.log('✅ Full sync completed');
    return downloadResult;
  }

  /**
   * Auto-sync after local changes (for paid users)
   */
  static async autoSync(user: User | null, subscriptionStatus?: string): Promise<void> {
    if (!user || !CloudSync.canSync(user, subscriptionStatus)) {
      return; // Silent fail for free users
    }

    try {
      await this.syncToCloud(user, subscriptionStatus);
      console.log('🔄 Auto-sync completed');
    } catch (error) {
      console.error('Auto-sync failed:', error);
      // Don't throw - auto-sync should be silent
    }
  }

  /**
   * Check if cloud data is newer than local data
   */
  private static shouldUseCloudData(
    localLists: WordList[],
    localWords: SavedWord[],
    cloudListsData: { lists: WordList[]; updatedAt: any },
    cloudWordsData: { savedWords: SavedWord[]; updatedAt: any }
  ): boolean {
    // If no local data, use cloud
    if (localLists.length === 0 && localWords.length === 0) {
      return true;
    }

    // If no cloud data, use local
    if (!cloudListsData.updatedAt || !cloudWordsData.updatedAt) {
      return false;
    }

    // Find the most recent local update
    const latestLocalUpdate = Math.max(
      ...localLists.map(list => list.updatedAt.getTime()),
      ...localWords.map(word => word.savedAt.getTime()),
      0
    );

    // Convert Firestore timestamp to Date
    const cloudListsTime = cloudListsData.updatedAt.toDate?.() || new Date(cloudListsData.updatedAt);
    const cloudWordsTime = cloudWordsData.updatedAt.toDate?.() || new Date(cloudWordsData.updatedAt);

    const latestCloudUpdate = Math.max(
      cloudListsTime.getTime(),
      cloudWordsTime.getTime()
    );

    // Use cloud data if it's newer
    return latestCloudUpdate > latestLocalUpdate;
  }

  /**
   * Private method to save word lists to storage
   */
  private static async saveWordLists(lists: WordList[]): Promise<void> {
    try {
      localStorage.setItem(WORD_LISTS_KEY, JSON.stringify(lists));
    } catch (error) {
      console.error('Error saving word lists:', error);
      throw error;
    }
  }

  /**
   * Private method to save saved words to storage
   */
  private static async saveSavedWords(savedWords: SavedWord[]): Promise<void> {
    try {
      localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(savedWords));
    } catch (error) {
      console.error('Error saving saved words:', error);
      throw error;
    }
  }
}

export default WordListManager;
