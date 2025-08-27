import { JapaneseWord } from '@/types';
import { UserScopedStorage } from './userScopedStorage';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface SearchHistoryEntry {
  id: string;
  searchTerm: string;
  results: JapaneseWord[];
  timestamp: number;
  source?: 'wanikani' | 'jmdict';
  resultsCount?: number;
}

export const MAX_SEARCH_HISTORY = 100;
const STORE_NAME = 'searchHistory';
const FIREBASE_COLLECTION = 'searchHistory';

export class SearchHistoryManager2 {
  /**
   * Add a search entry to history
   * Stores in IndexedDB for all users, syncs to Firebase for premium users
   */
  static async addSearchEntry(
    searchTerm: string, 
    results: JapaneseWord[], 
    user: User | null,
    userType: 'guest' | 'free' | 'monthly' | 'yearly',
    source: 'wanikani' | 'jmdict' = 'wanikani'
  ): Promise<void> {
    try {
      const userId = user?.uid || null;
      const history = await this.getSearchHistory(user, userType);

      // Create new entry
      const newEntry: SearchHistoryEntry = {
        id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        searchTerm: searchTerm.trim(),
        results: results,
        timestamp: Date.now(),
        source: source,
        resultsCount: results.length
      };

      // Remove any existing entry with the same search term
      const filteredHistory = history.filter(entry =>
        entry.searchTerm.toLowerCase() !== searchTerm.toLowerCase()
      );

      // Add new entry at the beginning
      const updatedHistory = [newEntry, ...filteredHistory].slice(0, MAX_SEARCH_HISTORY);

      // Save to IndexedDB (for all users)
      await this.saveToIndexedDB(updatedHistory, userId);

      // Sync to Firebase for premium users
      if (userType === 'monthly' || userType === 'yearly') {
        await this.syncToFirebase(updatedHistory, user!);
      }
    } catch (error) {
      console.error('Error adding search entry:', error);
    }
  }

  /**
   * Get all search history entries
   * Merges Firebase and IndexedDB data for premium users to prevent data loss
   */
  static async getSearchHistory(
    user: User | null,
    userType: 'guest' | 'free' | 'monthly' | 'yearly'
  ): Promise<SearchHistoryEntry[]> {
    try {
      const userId = user?.uid || null;

      // For premium users, merge both sources
      if ((userType === 'monthly' || userType === 'yearly') && user) {
        // Load from both sources
        const [firebaseHistory, localHistory] = await Promise.all([
          this.loadFromFirebase(user),
          this.loadFromIndexedDB(userId)
        ]);

        // Merge histories (local takes precedence for same search terms)
        const mergedHistory = this.mergeHistories(localHistory, firebaseHistory);
        
        // Save merged history back to IndexedDB
        await this.saveToIndexedDB(mergedHistory, userId);
        
        // If we have more entries locally than in Firebase, sync the merged data
        if (localHistory.length > firebaseHistory.length || 
            this.hasNewEntries(localHistory, firebaseHistory)) {
          await this.syncToFirebase(mergedHistory, user);
        }
        
        return mergedHistory;
      }

      // For non-premium users, just load from IndexedDB
      return await this.loadFromIndexedDB(userId);
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  }

  /**
   * Delete a specific search entry
   */
  static async deleteSearchEntry(
    entryId: string,
    user: User | null,
    userType: 'guest' | 'free' | 'monthly' | 'yearly'
  ): Promise<void> {
    try {
      const history = await this.getSearchHistory(user, userType);
      const filteredHistory = history.filter(entry => entry.id !== entryId);
      
      const userId = user?.uid || null;
      await this.saveToIndexedDB(filteredHistory, userId);

      // Sync to Firebase for premium users
      if ((userType === 'monthly' || userType === 'yearly') && user) {
        await this.syncToFirebase(filteredHistory, user);
      }
    } catch (error) {
      console.error('Error deleting search entry:', error);
    }
  }

  /**
   * Clear all search history
   */
  static async clearSearchHistory(
    user: User | null,
    userType: 'guest' | 'free' | 'monthly' | 'yearly'
  ): Promise<void> {
    try {
      const userId = user?.uid || null;
      
      // Clear from IndexedDB
      await UserScopedStorage.deleteFromStore(STORE_NAME, 'history', userId);

      // Clear from Firebase for premium users
      if ((userType === 'monthly' || userType === 'yearly') && user) {
        await deleteDoc(doc(db, 'users', user.uid, FIREBASE_COLLECTION, 'data'));
      }
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  /**
   * Get all unique words from search history
   */
  static async getAllSearchedWords(
    user: User | null,
    userType: 'guest' | 'free' | 'monthly' | 'yearly'
  ): Promise<JapaneseWord[]> {
    try {
      const history = await this.getSearchHistory(user, userType);
      const allWords: JapaneseWord[] = [];
      const seenIds = new Set<string>();

      // Collect all unique words from all search results
      history.forEach(entry => {
        entry.results.forEach(word => {
          if (!seenIds.has(word.id)) {
            seenIds.add(word.id);
            allWords.push(word);
          }
        });
      });

      return allWords;
    } catch (error) {
      console.error('Error getting all searched words:', error);
      return [];
    }
  }

  /**
   * Save search history to IndexedDB
   */
  private static async saveToIndexedDB(
    history: SearchHistoryEntry[], 
    userId: string | null
  ): Promise<void> {
    await UserScopedStorage.setToStore(STORE_NAME, 'history', history, userId);
  }

  /**
   * Load search history from IndexedDB
   */
  private static async loadFromIndexedDB(userId: string | null): Promise<SearchHistoryEntry[]> {
    const history = await UserScopedStorage.getFromStore(STORE_NAME, 'history', userId);
    return history || [];
  }

  /**
   * Sync search history to Firebase (premium users only)
   */
  private static async syncToFirebase(
    history: SearchHistoryEntry[], 
    user: User
  ): Promise<void> {
    try {
      // Store in a single document for the user
      const docRef = doc(db, 'users', user.uid, FIREBASE_COLLECTION, 'data');
      
      // Convert to a format that's more efficient for Firestore
      const firebaseData = {
        history: history.map(entry => ({
          ...entry,
          // Store only essential data to save space
          results: entry.results.slice(0, 10).map(word => ({
            id: word.id,
            kanji: word.kanji,
            kana: word.kana,
            meaning: word.meaning,
            type: word.type
          }))
        })),
        lastUpdated: serverTimestamp(),
        count: history.length
      };

      await setDoc(docRef, firebaseData);
    } catch (error) {
      console.error('Error syncing to Firebase:', error);
      // Fail silently - IndexedDB is the primary storage
    }
  }

  /**
   * Load search history from Firebase (premium users only)
   */
  private static async loadFromFirebase(user: User): Promise<SearchHistoryEntry[]> {
    try {
      const docRef = doc(db, 'users', user.uid, FIREBASE_COLLECTION, 'data');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.history || [];
      }

      return [];
    } catch (error) {
      console.error('Error loading from Firebase:', error);
      return [];
    }
  }

  /**
   * Merge two history arrays, removing duplicates
   * Prioritizes entries from the first array (usually local) when duplicates exist
   */
  private static mergeHistories(
    primary: SearchHistoryEntry[], 
    secondary: SearchHistoryEntry[]
  ): SearchHistoryEntry[] {
    // Create a map to track unique entries by search term and timestamp
    const historyMap = new Map<string, SearchHistoryEntry>();
    
    // Add secondary (Firebase) entries first
    secondary.forEach(entry => {
      // Use a composite key of search term and rough timestamp (to handle minor differences)
      const key = `${entry.searchTerm.toLowerCase()}_${Math.floor(entry.timestamp / 60000)}`; // Group by minute
      historyMap.set(key, entry);
    });
    
    // Add primary (local) entries, which will override Firebase entries with same key
    primary.forEach(entry => {
      const key = `${entry.searchTerm.toLowerCase()}_${Math.floor(entry.timestamp / 60000)}`;
      historyMap.set(key, entry);
    });
    
    // Convert back to array and sort by timestamp (newest first)
    const merged = Array.from(historyMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SEARCH_HISTORY);
    
    return merged;
  }
  
  /**
   * Check if local history has entries not in Firebase
   */
  private static hasNewEntries(
    localHistory: SearchHistoryEntry[], 
    firebaseHistory: SearchHistoryEntry[]
  ): boolean {
    if (localHistory.length === 0) return false;
    if (firebaseHistory.length === 0) return localHistory.length > 0;
    
    // Check if the most recent local entry is newer than the most recent Firebase entry
    const mostRecentLocal = Math.max(...localHistory.map(e => e.timestamp));
    const mostRecentFirebase = Math.max(...firebaseHistory.map(e => e.timestamp));
    
    return mostRecentLocal > mostRecentFirebase;
  }

  /**
   * Migrate from old localStorage-based history
   */
  static async migrateFromOldHistory(
    user: User | null,
    userType: 'guest' | 'free' | 'monthly' | 'yearly'
  ): Promise<void> {
    try {
      // Check if old history exists
      const oldHistoryKey = 'doshi_sensei_search_history';
      const oldHistory = localStorage.getItem(oldHistoryKey);
      
      if (oldHistory) {
        const parsedHistory = JSON.parse(oldHistory) as SearchHistoryEntry[];
        
        // Save to new system
        const userId = user?.uid || null;
        await this.saveToIndexedDB(parsedHistory, userId);
        
        // Sync to Firebase for premium users
        if ((userType === 'monthly' || userType === 'yearly') && user) {
          await this.syncToFirebase(parsedHistory, user);
        }
        
        // Remove old history
        localStorage.removeItem(oldHistoryKey);

      }
    } catch (error) {
      console.error('Error migrating old search history:', error);
    }
  }
}