import { Sentence, SentenceList, SavedSentence, SentenceListStats } from '@/types/sentences';
import { User } from 'firebase/auth';
import CloudSync, { SyncResult } from './cloudSync';

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

const SENTENCE_LISTS_KEY = 'doshi_sensei_sentence_lists';
const SAVED_SENTENCES_KEY = 'doshi_sensei_saved_sentences';

export class SentenceListManager {
  /**
   * Get all sentence lists
   */
  static async getAllSentenceLists(): Promise<SentenceList[]> {
    try {
      if (typeof window === 'undefined') {
        return []; // No localStorage on server
      }
      const listsData = localStorage.getItem(SENTENCE_LISTS_KEY);
      if (!listsData) return [];

      const lists = JSON.parse(listsData) as SentenceList[];

      // Convert date strings back to Date objects
      return lists.map(list => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading sentence lists:', error);
      return [];
    }
  }

  /**
   * Save sentence lists to localStorage
   */
  private static async saveSentenceLists(lists: SentenceList[]): Promise<void> {
    if (typeof window === 'undefined') {
      return; // No localStorage on server
    }
    localStorage.setItem(SENTENCE_LISTS_KEY, JSON.stringify(lists));
  }

  /**
   * Save saved sentences to localStorage
   */
  private static async saveSavedSentences(savedSentences: SavedSentence[]): Promise<void> {
    if (typeof window === 'undefined') {
      return; // No localStorage on server
    }
    localStorage.setItem(SAVED_SENTENCES_KEY, JSON.stringify(savedSentences));
  }

  /**
   * Create a new sentence list
   */
  static async createSentenceList(name: string, description?: string): Promise<SentenceList> {
    const lists = await this.getAllSentenceLists();
    
    const newList: SentenceList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      sentenceIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      color: PASTEL_COLORS[lists.length % PASTEL_COLORS.length]
    };

    lists.push(newList);
    await this.saveSentenceLists(lists);
    
    return newList;
  }

  /**
   * Delete a sentence list
   */
  static async deleteSentenceList(listId: string): Promise<void> {
    const lists = await this.getAllSentenceLists();
    const filteredLists = lists.filter(list => list.id !== listId);
    await this.saveSentenceLists(filteredLists);

    // Also remove this list ID from all saved sentences
    const savedSentences = await this.getAllSavedSentences();
    const updatedSavedSentences = savedSentences.map(savedSentence => ({
      ...savedSentence,
      listIds: savedSentence.listIds.filter(id => id !== listId)
    })).filter(savedSentence => savedSentence.listIds.length > 0); // Remove sentences with no lists

    await this.saveSavedSentences(updatedSavedSentences);
  }

  /**
   * Get a specific sentence list by ID
   */
  static async getSentenceList(listId: string): Promise<SentenceList | null> {
    const lists = await this.getAllSentenceLists();
    return lists.find(list => list.id === listId) || null;
  }

  /**
   * Save a sentence to lists
   */
  static async saveSentenceToLists(sentence: Sentence, listIds: string[]): Promise<void> {
    if (listIds.length === 0) return;

    const savedSentences = await this.getAllSavedSentences();
    const existingIndex = savedSentences.findIndex(saved => saved.sentence.id === sentence.id);

    if (existingIndex >= 0) {
      // Update existing saved sentence
      const existingListIds = savedSentences[existingIndex].listIds;
      const newListIds = [...new Set([...existingListIds, ...listIds])];
      savedSentences[existingIndex] = {
        ...savedSentences[existingIndex],
        listIds: newListIds
      };
    } else {
      // Create new saved sentence
      const savedSentence: SavedSentence = {
        id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sentence,
        savedAt: new Date(),
        listIds
      };
      savedSentences.push(savedSentence);
    }

    await this.saveSavedSentences(savedSentences);

    // Update sentence lists to include this sentence
    const lists = await this.getAllSentenceLists();
    let listsUpdated = false;

    for (const listId of listIds) {
      const listIndex = lists.findIndex(list => list.id === listId);
      if (listIndex >= 0 && !lists[listIndex].sentenceIds.includes(sentence.id)) {
        lists[listIndex].sentenceIds.push(sentence.id);
        lists[listIndex].updatedAt = new Date();
        listsUpdated = true;
      }
    }

    if (listsUpdated) {
      await this.saveSentenceLists(lists);
    }
  }

  /**
   * Remove a sentence from a specific list
   */
  static async removeSentenceFromList(sentenceId: string, listId: string): Promise<void> {
    // Remove from the list
    const lists = await this.getAllSentenceLists();
    const listIndex = lists.findIndex(list => list.id === listId);
    
    if (listIndex >= 0) {
      lists[listIndex].sentenceIds = lists[listIndex].sentenceIds.filter(id => id !== sentenceId);
      lists[listIndex].updatedAt = new Date();
      await this.saveSentenceLists(lists);
    }

    // Remove the list ID from saved sentence
    const savedSentences = await this.getAllSavedSentences();
    const savedSentenceIndex = savedSentences.findIndex(saved => saved.sentence.id === sentenceId);
    
    if (savedSentenceIndex >= 0) {
      savedSentences[savedSentenceIndex].listIds = savedSentences[savedSentenceIndex].listIds.filter(id => id !== listId);
      
      // If sentence is not in any lists, remove it entirely
      if (savedSentences[savedSentenceIndex].listIds.length === 0) {
        savedSentences.splice(savedSentenceIndex, 1);
      }
      
      await this.saveSavedSentences(savedSentences);
    }
  }

  /**
   * Get sentences from multiple lists
   */
  static async getSentencesFromLists(listIds: string[]): Promise<Sentence[]> {
    if (listIds.length === 0) return [];

    const savedSentences = await this.getAllSavedSentences();
    const sentenceMap = new Map<string, Sentence>();

    savedSentences
      .filter(saved => saved.listIds.some(listId => listIds.includes(listId)))
      .forEach(saved => {
        sentenceMap.set(saved.sentence.id, saved.sentence);
      });

    return Array.from(sentenceMap.values());
  }

  /**
   * Get lists that contain a specific sentence
   */
  static async getListsContainingSentence(sentenceId: string): Promise<SentenceList[]> {
    const savedSentences = await this.getAllSavedSentences();
    const savedSentence = savedSentences.find(saved => saved.sentence.id === sentenceId);

    if (!savedSentence) return [];

    const allLists = await this.getAllSentenceLists();
    return allLists.filter(list => savedSentence.listIds.includes(list.id));
  }

  /**
   * Check if a sentence is saved in any list
   */
  static async isSentenceSaved(sentenceId: string): Promise<boolean> {
    const savedSentences = await this.getAllSavedSentences();
    return savedSentences.some(saved => saved.sentence.id === sentenceId);
  }

  /**
   * Get all saved sentences
   */
  static async getAllSavedSentences(): Promise<SavedSentence[]> {
    try {
      if (typeof window === 'undefined') {
        return []; // No localStorage on server
      }
      const savedSentencesData = localStorage.getItem(SAVED_SENTENCES_KEY);
      if (!savedSentencesData) return [];

      const savedSentences = JSON.parse(savedSentencesData) as SavedSentence[];
      // Convert date strings back to Date objects
      return savedSentences.map(saved => ({
        ...saved,
        savedAt: new Date(saved.savedAt)
      }));
    } catch (error) {
      console.error('Error loading saved sentences:', error);
      return [];
    }
  }

  /**
   * Get sentence list statistics
   */
  static async getSentenceListStats(): Promise<SentenceListStats> {
    const lists = await this.getAllSentenceLists();
    const savedSentences = await this.getAllSavedSentences();

    const totalLists = lists.length;
    const totalSentences = savedSentences.length;
    const averageSentencesPerList = totalLists > 0 ? totalSentences / totalLists : 0;

    return {
      totalLists,
      totalSentences,
      averageSentencesPerList: Math.round(averageSentencesPerList * 100) / 100
    };
  }

  /**
   * Clear all sentence lists and saved sentences
   */
  static async clearAllSentenceLists(): Promise<void> {
    if (typeof window === 'undefined') {
      return; // No localStorage on server
    }
    localStorage.removeItem(SENTENCE_LISTS_KEY);
    localStorage.removeItem(SAVED_SENTENCES_KEY);
  }

  // ===== CLOUD SYNC METHODS =====

  /**
   * Sync all sentence lists to cloud (paid users only)
   */
  static async syncToCloud(user: User, subscriptionStatus?: string, subscriptionPlan?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus, subscriptionPlan)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      const lists = await this.getAllSentenceLists();
      const savedSentences = await this.getAllSavedSentences();

      // Upload lists collection
      const listsResult = await CloudSync.uploadData(user, 'sentenceLists', 'data', {
        lists,
        updatedAt: new Date()
      });

      if (!listsResult.success) {
        return listsResult;
      }

      // Upload saved sentences collection
      const sentencesResult = await CloudSync.uploadData(user, 'savedSentences', 'data', {
        savedSentences,
        updatedAt: new Date()
      });

      return sentencesResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync to cloud failed'
      };
    }
  }

  /**
   * Download sentence lists from cloud (paid users only)
   */
  static async syncFromCloud(user: User, subscriptionStatus?: string, subscriptionPlan?: string): Promise<SyncResult> {
    if (!CloudSync.canSync(user, subscriptionStatus, subscriptionPlan)) {
      return { success: false, error: 'Sync not available - requires active subscription' };
    }

    try {
      // Download lists
      const listsDownload = await CloudSync.downloadData<{
        lists: SentenceList[];
        updatedAt: any;
      }>(user, 'sentenceLists', 'data');

      // Download saved sentences
      const sentencesDownload = await CloudSync.downloadData<{
        savedSentences: SavedSentence[];
        updatedAt: any;
      }>(user, 'savedSentences', 'data');

      if (!listsDownload.result.success || !sentencesDownload.result.success) {
        return {
          success: false,
          error: 'Failed to download from cloud'
        };
      }

      // If cloud data exists, use it (simple conflict resolution: cloud wins)
      if (listsDownload.data && sentencesDownload.data) {
        // Convert Firestore timestamps back to Date objects
        const cloudLists = listsDownload.data.lists.map(list => ({
          ...list,
          createdAt: new Date(list.createdAt),
          updatedAt: new Date(list.updatedAt)
        }));

        const cloudSentences = sentencesDownload.data.savedSentences.map(sentence => ({
          ...sentence,
          savedAt: new Date(sentence.savedAt)
        }));

        await this.saveSentenceLists(cloudLists);
        await this.saveSavedSentences(cloudSentences);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync from cloud failed'
      };
    }
  }
}

export default SentenceListManager;