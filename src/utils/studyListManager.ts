import { StudyList, StudyListType, SavedStudyItem, StudyItemType, JapaneseWord, Kanji, Sentence, WordType } from '@/types';
import { DatabaseManager } from './indexedDB';
import CloudSync, { SyncResult } from './cloudSync';
import { User } from 'firebase/auth';

// Color palette for study lists
const STUDY_LIST_COLORS = [
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

const STUDY_LISTS_KEY = 'doshi_sensei_study_lists';
const SAVED_STUDY_ITEMS_KEY = 'doshi_sensei_saved_study_items';

// Legacy keys to clear
const LEGACY_KEYS = [
  'doshi_sensei_word_lists',
  'doshi_sensei_saved_words',
  'doshi_sensei_kanji_lists',
  'doshi_sensei_saved_kanji'
];

export class StudyListManager {
  private static dbManager: DatabaseManager = new DatabaseManager();

  /**
   * Initialize the new system and clear legacy data
   */
  static async initializeNewSystem(): Promise<void> {

    // Clear all legacy localStorage data
    LEGACY_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear legacy IndexedDB data
    try {
      // Clear legacy stores if they exist
      await this.dbManager.clear('wordLists');
      await this.dbManager.clear('savedWords');
      await this.dbManager.clear('kanjiLists');
      await this.dbManager.clear('savedKanji');
    } catch (error) {
      console.warn('Legacy data cleanup warning:', error);
    }

  }

  /**
   * Get all study lists
   */
  static async getAllStudyLists(): Promise<StudyList[]> {
    try {
      const listsData = localStorage.getItem(STUDY_LISTS_KEY);
      if (!listsData) return [];

      const lists = JSON.parse(listsData) as StudyList[];
      // Convert date strings back to Date objects
      return lists.map(list => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading study lists:', error);
      return [];
    }
  }

  /**
   * Get drillable lists only (for conjugation practice)
   */
  static async getDrillableLists(): Promise<StudyList[]> {
    const allLists = await this.getAllStudyLists();
    return allLists.filter(list => list.type === 'drillable');
  }

  /**
   * Get flashcard lists only (for flashcard review)
   */
  static async getFlashcardLists(): Promise<StudyList[]> {
    const allLists = await this.getAllStudyLists();
    return allLists.filter(list => list.type === 'flashcard');
  }

  /**
   * Get sentence lists only (for shadowing practice)
   */
  static async getSentenceLists(): Promise<StudyList[]> {
    const allLists = await this.getAllStudyLists();
    return allLists.filter(list => list.type === 'sentence');
  }

  /**
   * Create a new study list with explicit type selection
   */
  static async createStudyList(
    name: string,
    type: StudyListType,
    description?: string,
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<StudyList> {
    try {
      const existingLists = await this.getAllStudyLists();

      // Generate a random color
      const colorIndex = existingLists.length % STUDY_LIST_COLORS.length;
      const color = STUDY_LIST_COLORS[colorIndex];

      const newList: StudyList = {
        id: `study_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description?.trim(),
        type,
        itemIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        color
      };

      const updatedLists = [...existingLists, newList];
      await this.saveStudyListsToStorage(updatedLists);

      // Also save to IndexedDB
      await this.dbManager.add('studyLists', newList);

      // Auto-sync for premium users
      await this.autoSyncLists(user, subscriptionStatus);

      return newList;
    } catch (error) {
      console.error('Error creating study list:', error);
      throw error;
    }
  }

  /**
   * Validate if an item can be added to a specific list type
   */
  static canAddToList(itemType: StudyItemType, item: JapaneseWord | Kanji | Sentence, listType: StudyListType): boolean {

    if (listType === 'flashcard') {
      // Flashcard lists accept any content
      return true;
    }

    if (listType === 'sentence') {
      // Sentence lists only accept sentences
      return itemType === 'sentence';
    }

    if (listType === 'drillable') {
      // Drillable lists only accept conjugable words
      if (itemType === 'kanji' || itemType === 'sentence') {
        return false; // Kanji and sentences cannot be conjugated
      }

      if (itemType === 'word') {
        const word = item as JapaneseWord;

        // Check for explicit conjugable types
        const conjugableTypes: WordType[] = ['Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'];
        if (conjugableTypes.includes(word.type)) {
          return true;
        }

        // For words that might be classified as 'other' but are actually verbs/adjectives
        // Check if the word has detailed part of speech information
        if (word.detailedMeaning && word.detailedMeaning.length > 0) {
          const hasConjugablePOS = word.detailedMeaning.some(meaning =>
            meaning.partOfSpeech.some(pos => {
              const lowerPos = pos.toLowerCase();
              const isConjugable = lowerPos.includes('verb') ||
                     lowerPos.includes('adjective') ||
                     lowerPos.includes('ichidan') ||
                     lowerPos.includes('godan') ||
                     lowerPos.includes('i-adjective') ||
                     lowerPos.includes('na-adjective');
              if (isConjugable) {
              }
              return isConjugable;
            })
          );
          if (hasConjugablePOS) {
            return true;
          }
        }

        // Enhanced fallback: check verb ending patterns for any word type
        const kana = word.kana;

        // Common verb endings that suggest conjugability
        const verbEndings = ['る', 'す', 'く', 'ぐ', 'む', 'ぬ', 'ぶ', 'つ', 'う'];
        const endsWithVerbPattern = verbEndings.some(ending => kana.endsWith(ending));

        if (endsWithVerbPattern) {
          return true;
        }

        return false;
      }
    }

    return false;
  }

  /**
   * Check if an item already exists in a list
   */
  static async isItemInList(itemId: string, listId: string): Promise<boolean> {
    try {
      const lists = await this.getAllStudyLists();
      const list = lists.find(l => l.id === listId);
      return list ? list.itemIds.includes(itemId) : false;
    } catch (error) {
      console.error('Error checking item in list:', error);
      return false;
    }
  }

  /**
   * Add an item to study lists with validation
   */
  static async addItemToLists(
    item: JapaneseWord | Kanji | Sentence,
    itemType: StudyItemType,
    listIds: string[],
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];
      const validListIds: string[] = [];

      // Get all lists and validate each one
      const allLists = await this.getAllStudyLists();

      for (const listId of listIds) {
        const list = allLists.find(l => l.id === listId);
        if (!list) {
          errors.push(`List not found: ${listId}`);
          continue;
        }

        // Check if item can be added to this list type
        if (!this.canAddToList(itemType, item, list.type)) {
          const itemTypeName = itemType === 'word' ? 'word' : itemType === 'kanji' ? 'kanji' : 'sentence';
          const reason = list.type === 'drillable'
            ? (itemType === 'kanji' ? 'kanji cannot be conjugated' : itemType === 'sentence' ? 'sentences cannot be conjugated' : 'only verbs and adjectives allowed')
            : list.type === 'sentence'
            ? 'only sentences allowed'
            : 'invalid item type';
          errors.push(`Cannot add ${itemTypeName} to ${list.type} list "${list.name}": ${reason}`);
          continue;
        }

        // Generate item ID
        const itemId = itemType === 'word'
          ? (item as JapaneseWord).id
          : itemType === 'kanji'
          ? `kanji_${(item as Kanji).kanji}`
          : (item as Sentence).id;

        // Check for duplicates
        if (await this.isItemInList(itemId, listId)) {
          errors.push(`Item already exists in list "${list.name}"`);
          continue;
        }

        validListIds.push(listId);
      }

      if (validListIds.length === 0) {
        return { success: false, errors };
      }

      // Save the item
      const savedItems = await this.getSavedStudyItems();
      const itemId = itemType === 'word'
        ? (item as JapaneseWord).id
        : itemType === 'kanji'
        ? `kanji_${(item as Kanji).kanji}`
        : (item as Sentence).id;

      // Find existing saved item
      const existingIndex = savedItems.findIndex(saved =>
        saved.itemType === itemType && (
          (itemType === 'word' && saved.word?.id === itemId) ||
          (itemType === 'kanji' && saved.kanji?.kanji === (item as Kanji).kanji) ||
          (itemType === 'sentence' && saved.sentence?.id === (item as Sentence).id)
        )
      );

      if (existingIndex >= 0) {
        // Update existing item's list associations
        const existingSaved = savedItems[existingIndex];
        const newListIds = Array.from(new Set([...existingSaved.listIds, ...validListIds]));
        savedItems[existingIndex] = {
          ...existingSaved,
          listIds: newListIds
        };
      } else {
        // Create new saved item
        const newSavedItem: SavedStudyItem = {
          id: `saved_${itemType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemType,
          ...(itemType === 'word' 
            ? { word: item as JapaneseWord } 
            : itemType === 'kanji' 
            ? { kanji: item as Kanji }
            : { sentence: item as Sentence }),
          savedAt: new Date(),
          listIds: validListIds
        };
        savedItems.push(newSavedItem);
      }

      await this.saveSavedStudyItemsToStorage(savedItems);

      // Update study lists to include the new item IDs
      let listsUpdated = false;
      for (const listId of validListIds) {
        const listIndex = allLists.findIndex(list => list.id === listId);
        if (listIndex >= 0) {
          const list = allLists[listIndex];
          if (!list.itemIds.includes(itemId)) {
            list.itemIds.push(itemId);
            list.updatedAt = new Date();
            listsUpdated = true;
          }
        }
      }

      if (listsUpdated) {
        await this.saveStudyListsToStorage(allLists);
      }

      // Auto-sync for premium users
      await this.autoSyncItems(user, subscriptionStatus);
      await this.autoSyncLists(user, subscriptionStatus);

      return { success: true, errors };
    } catch (error) {
      console.error('Error adding item to lists:', error);
      return { success: false, errors: ['Failed to save item'] };
    }
  }

  /**
   * Remove an item from a specific list
   */
  static async removeItemFromList(
    itemId: string,
    listId: string,
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<void> {
    try {
      // Update the study list
      const lists = await this.getAllStudyLists();
      const listIndex = lists.findIndex(list => list.id === listId);

      if (listIndex >= 0) {
        lists[listIndex].itemIds = lists[listIndex].itemIds.filter(id => id !== itemId);
        lists[listIndex].updatedAt = new Date();
        await this.saveStudyListsToStorage(lists);
      }

      // Update the saved item
      const savedItems = await this.getSavedStudyItems();
      const savedItemIndex = savedItems.findIndex(saved =>
        (saved.word?.id === itemId) || 
        (saved.kanji && `kanji_${saved.kanji.kanji}` === itemId) ||
        (saved.sentence?.id === itemId)
      );

      if (savedItemIndex >= 0) {
        savedItems[savedItemIndex].listIds = savedItems[savedItemIndex].listIds.filter(id => id !== listId);

        // If the item is no longer in any lists, remove it completely
        if (savedItems[savedItemIndex].listIds.length === 0) {
          savedItems.splice(savedItemIndex, 1);
        }

        await this.saveSavedStudyItemsToStorage(savedItems);
      }

      // Auto-sync for premium users
      await this.autoSyncItems(user, subscriptionStatus);
      await this.autoSyncLists(user, subscriptionStatus);

    } catch (error) {
      console.error('Error removing item from list:', error);
      throw error;
    }
  }

  /**
   * Delete a study list and remove all associations
   */
  static async deleteStudyList(
    listId: string,
    user: User | null = null,
    subscriptionStatus?: string
  ): Promise<void> {
    try {
      // Remove from study lists
      const studyLists = await this.getAllStudyLists();
      const filteredLists = studyLists.filter(list => list.id !== listId);
      await this.saveStudyListsToStorage(filteredLists);

      // Remove list associations from saved items
      const savedItems = await this.getSavedStudyItems();
      const updatedSavedItems = savedItems
        .map(saved => ({
          ...saved,
          listIds: saved.listIds.filter(id => id !== listId)
        }))
        .filter(saved => saved.listIds.length > 0); // Remove items with no list associations

      await this.saveSavedStudyItemsToStorage(updatedSavedItems);

      // Update IndexedDB
      try {
        await this.dbManager.delete('studyLists', listId);
      } catch (error) {
        console.warn('List not found in IndexedDB:', listId);
      }

      // Auto-sync for premium users
      await this.autoSyncItems(user, subscriptionStatus);
      await this.autoSyncLists(user, subscriptionStatus);

    } catch (error) {
      console.error('Error deleting study list:', error);
      throw error;
    }
  }

  /**
   * Get all items in a specific list
   */
  static async getItemsInList(listId: string): Promise<{ words: JapaneseWord[]; kanji: Kanji[]; sentences: Sentence[] }> {
    try {
      const savedItems = await this.getSavedStudyItems();
      const listItems = savedItems.filter(saved => saved.listIds.includes(listId));

      const words: JapaneseWord[] = [];
      const kanji: Kanji[] = [];
      const sentences: Sentence[] = [];

      listItems.forEach(item => {
        if (item.itemType === 'word' && item.word) {
          words.push(item.word);
        } else if (item.itemType === 'kanji' && item.kanji) {
          kanji.push(item.kanji);
        } else if (item.itemType === 'sentence' && item.sentence) {
          sentences.push(item.sentence);
        }
      });

      return { words, kanji, sentences };
    } catch (error) {
      console.error('Error getting items in list:', error);
      return { words: [], kanji: [], sentences: [] };
    }
  }

  /**
   * Get all saved study items
   */
  static async getSavedStudyItems(): Promise<SavedStudyItem[]> {
    try {
      const savedData = localStorage.getItem(SAVED_STUDY_ITEMS_KEY);
      if (!savedData) return [];

      const savedItems = JSON.parse(savedData) as SavedStudyItem[];
      // Convert date strings back to Date objects
      return savedItems.map(saved => ({
        ...saved,
        savedAt: new Date(saved.savedAt)
      }));
    } catch (error) {
      console.error('Error loading saved study items:', error);
      return [];
    }
  }

  /**
   * Get lists that contain a specific item
   */
  static async getListsContainingItem(itemId: string): Promise<StudyList[]> {
    try {
      const savedItems = await this.getSavedStudyItems();
      const savedItem = savedItems.find(saved =>
        (saved.word?.id === itemId) || 
        (saved.kanji && `kanji_${saved.kanji.kanji}` === itemId) ||
        (saved.sentence?.id === itemId)
      );

      if (!savedItem) return [];

      const allLists = await this.getAllStudyLists();
      return allLists.filter(list => savedItem.listIds.includes(list.id));
    } catch (error) {
      console.error('Error getting lists containing item:', error);
      return [];
    }
  }

  // ===== CLOUD SYNC METHODS =====

  /**
   * Auto-sync study lists after local changes (for premium users)
   */
  static async autoSyncLists(user: User | null, subscriptionStatus?: string): Promise<void> {
    if (!user || !CloudSync.canSync(user, subscriptionStatus)) {
      return; // Silent fail for free users
    }

    try {
      const lists = await this.getAllStudyLists();
      
      // Sync to Firebase
      await CloudSync.uploadData(user, 'studyLists', 'data', {
        studyLists: lists,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Study lists auto-sync failed:', error);
      // Don't throw - auto-sync should be silent
    }
  }

  /**
   * Auto-sync saved items after local changes (for premium users)
   */
  static async autoSyncItems(user: User | null, subscriptionStatus?: string): Promise<void> {
    if (!user || !CloudSync.canSync(user, subscriptionStatus)) {
      return; // Silent fail for free users
    }

    try {
      const items = await this.getSavedStudyItems();
      
      // Sync to Firebase
      await CloudSync.uploadData(user, 'savedStudyItems', 'data', {
        savedStudyItems: items,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Saved study items auto-sync failed:', error);
      // Don't throw - auto-sync should be silent
    }
  }

  /**
   * Download and sync study lists from Firebase (for premium users)
   */
  static async syncFromCloud(user: User | null, subscriptionStatus?: string): Promise<boolean> {
    if (!user || !CloudSync.canSync(user, subscriptionStatus)) {
      return false;
    }

    try {
      // Download study lists
      const listsResult = await CloudSync.downloadData<{
        studyLists: StudyList[];
        updatedAt: Date;
      }>(user, 'studyLists', 'data');

      // Download saved items
      const itemsResult = await CloudSync.downloadData<{
        savedStudyItems: SavedStudyItem[];
        updatedAt: Date;
      }>(user, 'savedStudyItems', 'data');

      if (listsResult.data?.studyLists) {
        // Convert date strings back to Date objects
        const lists = listsResult.data.studyLists.map(list => ({
          ...list,
          createdAt: new Date(list.createdAt),
          updatedAt: new Date(list.updatedAt)
        }));
        await this.saveStudyListsToStorage(lists);
      }

      if (itemsResult.data?.savedStudyItems) {
        // Convert date strings back to Date objects
        const items = itemsResult.data.savedStudyItems.map(item => ({
          ...item,
          savedAt: new Date(item.savedAt)
        }));
        await this.saveSavedStudyItemsToStorage(items);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync from cloud:', error);
      return false;
    }
  }

  /**
   * Clear all study lists and saved items
   */
  static async clearAllStudyLists(): Promise<void> {
    localStorage.removeItem(STUDY_LISTS_KEY);
    localStorage.removeItem(SAVED_STUDY_ITEMS_KEY);
  }

  /**
   * Private method to save study lists to storage
   */
  private static async saveStudyListsToStorage(studyLists: StudyList[]): Promise<void> {
    try {
      localStorage.setItem(STUDY_LISTS_KEY, JSON.stringify(studyLists));
    } catch (error) {
      console.error('Error saving study lists to storage:', error);
      throw error;
    }
  }

  /**
   * Private method to save saved study items to storage
   */
  private static async saveSavedStudyItemsToStorage(savedItems: SavedStudyItem[]): Promise<void> {
    try {
      localStorage.setItem(SAVED_STUDY_ITEMS_KEY, JSON.stringify(savedItems));
    } catch (error) {
      console.error('Error saving study items to storage:', error);
      throw error;
    }
  }
}

export default StudyListManager;
