import { JapaneseWord } from '@/types';
import EnhancedStorageManager from './storage';

export interface SearchHistoryEntry {
  id: string;
  searchTerm: string;
  results: JapaneseWord[];
  timestamp: number;
}

export const SEARCH_HISTORY_KEY = 'doshi_sensei_search_history';
export const MAX_SEARCH_HISTORY = 100;

export class SearchHistoryManager {
  /**
   * Add a search entry to history
   */
  static async addSearchEntry(searchTerm: string, results: JapaneseWord[]): Promise<void> {
    try {
      const history = await this.getSearchHistory();

      // Create new entry
      const newEntry: SearchHistoryEntry = {
        id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        searchTerm: searchTerm.trim(),
        results: results,
        timestamp: Date.now()
      };

      // Remove any existing entry with the same search term
      const filteredHistory = history.filter(entry =>
        entry.searchTerm.toLowerCase() !== searchTerm.toLowerCase()
      );

      // Add new entry at the beginning
      const updatedHistory = [newEntry, ...filteredHistory].slice(0, MAX_SEARCH_HISTORY);

      // Save to storage
      await this.saveSearchHistory(updatedHistory);
    } catch (error) {
      console.error('Error adding search entry:', error);
    }
  }

  /**
   * Get all search history entries
   */
  static async getSearchHistory(): Promise<SearchHistoryEntry[]> {
    try {
      if (typeof window === 'undefined') return [];

      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  }

  /**
   * Save search history to storage
   */
  private static async saveSearchHistory(history: SearchHistoryEntry[]): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  /**
   * Delete a specific search entry
   */
  static async deleteSearchEntry(entryId: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const filteredHistory = history.filter(entry => entry.id !== entryId);
      await this.saveSearchHistory(filteredHistory);
    } catch (error) {
      console.error('Error deleting search entry:', error);
    }
  }

  /**
   * Clear all search history
   */
  static async clearSearchHistory(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  /**
   * Get all unique words from search history
   */
  static async getAllSearchedWords(): Promise<JapaneseWord[]> {
    try {
      const history = await this.getSearchHistory();
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
}
