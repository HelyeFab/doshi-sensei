import { StudyList, StudyListType, SavedStudyItem, StudyItemType, JapaneseWord, Kanji, Sentence, WordType } from '@/types';
import { DatabaseManager } from './indexedDB';
import CloudSync, { SyncResult } from './cloudSync';
import { User } from 'firebase/auth';
import { analyticsTracker } from '@/lib/analytics/analyticsTracker';
import { largeDataStorage } from './largeDataStorage';
import { AnkiMediaStore } from './ankiMediaStore';

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

      // Track list creation
      analyticsTracker.track('list_created', { 
        listType: type,
        listName: name,
        hasDescription: !!description
      });
      console.log('📊 [Analytics] Study list created:', { type, name });

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
          const itemToDelete = savedItems[savedItemIndex];
          
          // Clean up media if this is an Anki card
          if (itemToDelete.itemType === 'anki_card' && itemToDelete.ankiData?.media) {
            console.log(`Cleaning up media for deleted Anki card ${itemId}`);
            const mediaStore = AnkiMediaStore.getInstance();
            await mediaStore.deleteMedia(itemToDelete.ankiData.media);
          }
          
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
   * Save a pre-created SavedStudyItem (for Anki imports)
   */
  static async saveItem(item: SavedStudyItem): Promise<void> {
    try {
      const savedItems = await this.getSavedStudyItems();
      
      // Check if item already exists
      const existingIndex = savedItems.findIndex(si => si.id === item.id);
      
      if (existingIndex >= 0) {
        // Update existing item
        savedItems[existingIndex] = item;
      } else {
        // Add new item
        savedItems.push(item);
      }
      
      // Save to storage
      await this.saveSavedStudyItemsToStorage(savedItems);
      
      // Update the lists to include this item
      const lists = await this.getAllStudyLists();
      let listsUpdated = false;
      
      for (const listId of item.listIds) {
        const listIndex = lists.findIndex(l => l.id === listId);
        if (listIndex >= 0 && !lists[listIndex].itemIds.includes(item.id)) {
          lists[listIndex].itemIds.push(item.id);
          lists[listIndex].updatedAt = new Date();
          listsUpdated = true;
        }
      }
      
      if (listsUpdated) {
        await this.saveStudyListsToStorage(lists);
      }
      
      // Track the save
      analyticsTracker.track('list_used', {
        action: 'item_saved',
        itemType: item.itemType,
        listCount: item.listIds.length
      });
    } catch (error) {
      console.error('Error saving item:', error);
      throw error;
    }
  }

  /**
   * Update list metadata
   */
  static async updateListMetadata(
    listId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const lists = await this.getAllStudyLists();
      const listIndex = lists.findIndex(l => l.id === listId);
      
      if (listIndex === -1) {
        throw new Error(`List with ID ${listId} not found`);
      }
      
      // Update the metadata
      lists[listIndex].metadata = metadata;
      lists[listIndex].updatedAt = new Date();
      
      // Save the updated lists
      await this.saveStudyListsToStorage(lists);
      
      // Track the update
      analyticsTracker.track('list_used', {
        action: 'metadata_updated',
        listId,
        metadataKeys: Object.keys(metadata)
      });
    } catch (error) {
      console.error('Error updating list metadata:', error);
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
      
      // Before filtering, collect media files from Anki cards that will be deleted
      const itemsToDelete = savedItems.filter(saved => {
        // Item will be deleted if this is its only list
        const remainingLists = saved.listIds.filter(id => id !== listId);
        return remainingLists.length === 0;
      });
      
      // Collect media filenames from deleted Anki cards
      const mediaToDelete: string[] = [];
      for (const item of itemsToDelete) {
        if (item.itemType === 'anki_card' && item.ankiData?.media) {
          mediaToDelete.push(...item.ankiData.media);
        }
      }
      
      // Delete media files if any
      if (mediaToDelete.length > 0) {
        console.log(`Cleaning up ${mediaToDelete.length} media files from deleted Anki cards`);
        const mediaStore = AnkiMediaStore.getInstance();
        await mediaStore.deleteMedia(mediaToDelete);
      }
      
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
  static async getItemsInList(listId: string): Promise<{ 
    words: JapaneseWord[]; 
    kanji: Kanji[]; 
    sentences: Sentence[];
    ankiCards: SavedStudyItem[];
    allItems: SavedStudyItem[];
  }> {
    try {
      const savedItems = await this.getSavedStudyItems();
      const listItems = savedItems.filter(saved => saved.listIds.includes(listId));

      const words: JapaneseWord[] = [];
      const kanji: Kanji[] = [];
      const sentences: Sentence[] = [];
      const ankiCards: SavedStudyItem[] = [];

      listItems.forEach(item => {
        if (item.itemType === 'word' && item.word) {
          words.push(item.word);
        } else if (item.itemType === 'kanji' && item.kanji) {
          kanji.push(item.kanji);
        } else if (item.itemType === 'sentence' && item.sentence) {
          sentences.push(item.sentence);
        } else if (item.itemType === 'anki_card') {
          ankiCards.push(item);
        }
      });

      return { words, kanji, sentences, ankiCards, allItems: listItems };
    } catch (error) {
      console.error('Error getting items in list:', error);
      return { words: [], kanji: [], sentences: [], ankiCards: [], allItems: [] };
    }
  }

  /**
   * Get all saved study items
   */
  static async getSavedStudyItems(): Promise<SavedStudyItem[]> {
    try {
      // Try our simple IndexedDB storage first
      try {
        const indexedDBItems = await largeDataStorage.getAllItems();
        if (indexedDBItems && indexedDBItems.length > 0) {
          console.log(`Loaded ${indexedDBItems.length} items from IndexedDB`);
          return indexedDBItems.map(saved => ({
            ...saved,
            savedAt: new Date(saved.savedAt)
          }));
        }
      } catch (dbError) {
        console.log('IndexedDB not available, falling back to localStorage:', dbError);
      }
      
      // Fallback to localStorage
      const savedData = localStorage.getItem(SAVED_STUDY_ITEMS_KEY);
      if (!savedData) return [];

      const savedItems = JSON.parse(savedData) as SavedStudyItem[];
      
      // Migrate to IndexedDB if we have items
      if (savedItems.length > 0) {
        console.log(`Migrating ${savedItems.length} saved items from localStorage to IndexedDB`);
        try {
          await largeDataStorage.saveAllItems(savedItems);
          // Don't remove from localStorage yet, keep as backup
        } catch (migrationError) {
          console.error('Failed to migrate to IndexedDB:', migrationError);
        }
      }
      
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
      
      // Filter out Anki-imported lists - we don't sync those to Firebase
      const listsToSync = lists.filter(list => 
        !list.metadata?.source || list.metadata.source !== 'anki'
      );
      
      // Only sync if there are non-Anki lists
      if (listsToSync.length > 0) {
        // Sync to Firebase
        await CloudSync.uploadData(user, 'studyLists', 'data', {
          studyLists: listsToSync,
          updatedAt: new Date()
        });
      }
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
      
      // Filter out Anki cards - we don't sync those to Firebase
      const itemsToSync = items.filter(item => item.itemType !== 'anki_card');
      
      // Only sync if there are non-Anki items
      if (itemsToSync.length > 0) {
        // Sync to Firebase
        await CloudSync.uploadData(user, 'savedStudyItems', 'data', {
          savedStudyItems: itemsToSync,
          updatedAt: new Date()
        });
      }
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
      console.log('Cannot sync:', { user: !!user, subscriptionStatus });
      return false;
    }

    try {
      console.log('Starting sync from cloud for user:', user.uid);
      
      // Don't clear existing data - merge instead
      console.log('Starting cloud sync without clearing local data');
      
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

      // Get current local lists
      const currentLists = await this.getAllStudyLists();
      const currentListIds = new Set(currentLists.map(l => l.id));
      
      if (listsResult.data?.studyLists) {
        console.log('Downloaded study lists from Firebase:', listsResult.data.studyLists);
        // Convert date strings back to Date objects
        const cloudLists = listsResult.data.studyLists.map(list => ({
          ...list,
          createdAt: new Date(list.createdAt),
          updatedAt: new Date(list.updatedAt)
        }));
        
        // Merge cloud lists with local lists
        const mergedLists = [...currentLists];
        
        // Add or update lists from cloud (but never overwrite Anki lists)
        for (const cloudList of cloudLists) {
          const existingIndex = mergedLists.findIndex(l => l.id === cloudList.id);
          if (existingIndex >= 0) {
            // Skip if it's an existing Anki-imported list (preserve local Anki data)
            if (mergedLists[existingIndex].metadata?.source === 'anki') {
              continue;
            }
            // Update existing list if cloud version is newer
            if (new Date(cloudList.updatedAt) > new Date(mergedLists[existingIndex].updatedAt)) {
              mergedLists[existingIndex] = cloudList;
            }
          } else {
            // Add new list from cloud
            mergedLists.push(cloudList);
          }
        }
        
        await this.saveStudyListsToStorage(mergedLists);
        console.log('Merged and saved study lists to localStorage');
      } else {
        console.log('No study lists found in Firebase');
      }

      if (itemsResult.data?.savedStudyItems) {
        // Get current local items
        const currentItems = await this.getSavedStudyItems();
        
        // Convert date strings back to Date objects
        const cloudItems = itemsResult.data.savedStudyItems.map(item => ({
          ...item,
          savedAt: new Date(item.savedAt)
        }));
        
        // Merge cloud items with local items
        const itemMap = new Map<string, SavedStudyItem>();
        
        // Add all current local items
        for (const item of currentItems) {
          itemMap.set(item.id, item);
        }
        
        // Add or update items from cloud (but never overwrite Anki cards)
        for (const cloudItem of cloudItems) {
          const existing = itemMap.get(cloudItem.id);
          // Skip if it's an existing Anki card (preserve local Anki data)
          if (existing && existing.itemType === 'anki_card') {
            continue;
          }
          if (!existing || new Date(cloudItem.savedAt) > new Date(existing.savedAt)) {
            itemMap.set(cloudItem.id, cloudItem);
          }
        }
        
        const mergedItems = Array.from(itemMap.values());
        await this.saveSavedStudyItemsToStorage(mergedItems);
        console.log('Merged and saved study items to localStorage');
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
      // Calculate size for logging
      const data = JSON.stringify(savedItems);
      const sizeInBytes = new Blob([data]).size;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      console.log(`Saving ${savedItems.length} items, size: ${sizeInMB.toFixed(2)} MB`);
      
      // Save to IndexedDB (no size limits!)
      try {
        await largeDataStorage.saveAllItems(savedItems);
        console.log(`Successfully saved ${savedItems.length} items to IndexedDB`);
      } catch (dbError) {
        console.error('Failed to save to IndexedDB, falling back to localStorage:', dbError);
        
        // Fallback to localStorage if IndexedDB fails
        // Check localStorage quota
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          console.log(`Storage quota: ${estimate.quota} bytes, used: ${estimate.usage} bytes`);
        }
        
        localStorage.setItem(SAVED_STUDY_ITEMS_KEY, data);
        
        // Verify save
        const saved = localStorage.getItem(SAVED_STUDY_ITEMS_KEY);
        const parsedSaved = JSON.parse(saved || '[]');
        console.log(`Verified save: ${parsedSaved.length} items saved to localStorage`);
      }
    } catch (error) {
      console.error('Error saving study items to storage:', error);
      if (error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded! This is why we need IndexedDB.');
      }
      throw error;
    }
  }
}

export default StudyListManager;
