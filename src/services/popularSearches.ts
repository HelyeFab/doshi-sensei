/**
 * Popular Searches Cache Service
 * 
 * Tracks what users search for and what they click on,
 * then uses this data to provide instant, high-quality results
 * for common searches.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { JapaneseWord } from '@/types';

interface PopularSearch {
  term: string;
  normalizedTerm: string; // lowercase, trimmed
  topResult: JapaneseWord;
  clickCount: number;
  lastClicked: Date;
  lastUpdated: Date;
  // Track multiple top results for variety
  alternativeResults?: JapaneseWord[];
}

interface SearchClick {
  userId?: string;
  searchTerm: string;
  selectedWord: JapaneseWord;
  position: number; // Which position in results was clicked
  timestamp: Date;
}

class PopularSearchesService {
  private readonly COLLECTION_NAME = 'popularSearches';
  private readonly CLICKS_COLLECTION = 'searchClicks';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // In-memory cache for ultra-fast lookups
  private memoryCache = new Map<string, PopularSearch>();
  private lastCacheRefresh = 0;
  
  /**
   * Track when a user clicks on a search result
   * This data helps us learn what the best results are
   */
  async trackSearchClick(data: {
    searchTerm: string;
    selectedWord: JapaneseWord;
    position: number;
    userId?: string;
  }): Promise<void> {
    try {
      const normalizedTerm = this.normalizeTerm(data.searchTerm);
      
      // Don't await this - fire and forget for performance
      this.updatePopularSearch(normalizedTerm, data.selectedWord).catch(console.error);
      
      // Also track individual click for analytics (optional)
      if (data.userId) {
        const clickData: SearchClick = {
          userId: data.userId,
          searchTerm: data.searchTerm,
          selectedWord: data.selectedWord,
          position: data.position,
          timestamp: new Date()
        };
        
        // Fire and forget
        this.saveClickData(clickData).catch(console.error);
      }
    } catch (error) {
      console.error('[PopularSearches] Error tracking click:', error);
      // Don't throw - this is non-critical
    }
  }
  
  /**
   * Get popular result for a search term (if exists)
   * Returns null if no popular result found
   */
  async getPopularResult(searchTerm: string): Promise<JapaneseWord | null> {
    try {
      const normalizedTerm = this.normalizeTerm(searchTerm);
      
      // Check memory cache first (instant)
      if (this.memoryCache.has(normalizedTerm)) {
        const cached = this.memoryCache.get(normalizedTerm)!;
        // Check if cache is still fresh
        if (Date.now() - cached.lastUpdated.getTime() < this.CACHE_DURATION) {
          return cached.topResult;
        }
      }
      
      // Check Firestore
      const docRef = doc(db, this.COLLECTION_NAME, normalizedTerm);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as PopularSearch;
        
        // Update memory cache
        this.memoryCache.set(normalizedTerm, data);
        
        // Return top result if it has enough clicks
        if (data.clickCount >= 3) { // Minimum 3 clicks to be considered popular
          return data.topResult;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[PopularSearches] Error getting popular result:', error);
      return null; // Fail gracefully
    }
  }
  
  /**
   * Get multiple popular searches (for suggestions)
   */
  async getTopSearches(limit: number = 10): Promise<PopularSearch[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('clickCount', 'desc'),
        where('clickCount', '>=', 5), // Only well-established searches
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as PopularSearch);
    } catch (error) {
      console.error('[PopularSearches] Error getting top searches:', error);
      return [];
    }
  }
  
  /**
   * Private: Update or create popular search entry
   */
  private async updatePopularSearch(
    normalizedTerm: string, 
    selectedWord: JapaneseWord
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, normalizedTerm);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Update existing
      await updateDoc(docRef, {
        clickCount: increment(1),
        lastClicked: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        // Update top result if this word is clicked more often
        // (This is simplified - in production you'd track per-word clicks)
      });
    } else {
      // Create new
      const newEntry: Omit<PopularSearch, 'lastUpdated'> = {
        term: normalizedTerm,
        normalizedTerm,
        topResult: selectedWord,
        clickCount: 1,
        lastClicked: new Date(),
      };
      
      await setDoc(docRef, {
        ...newEntry,
        lastUpdated: serverTimestamp()
      });
    }
    
    // Update memory cache
    this.memoryCache.set(normalizedTerm, {
      term: normalizedTerm,
      normalizedTerm,
      topResult: selectedWord,
      clickCount: (this.memoryCache.get(normalizedTerm)?.clickCount || 0) + 1,
      lastClicked: new Date(),
      lastUpdated: new Date()
    });
  }
  
  /**
   * Private: Save individual click data for analytics
   */
  private async saveClickData(clickData: SearchClick): Promise<void> {
    const clicksRef = collection(db, this.CLICKS_COLLECTION);
    await setDoc(doc(clicksRef), clickData);
  }
  
  /**
   * Normalize search terms for consistency
   */
  private normalizeTerm(term: string): string {
    return term.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  /**
   * Preload popular searches into memory cache
   * Call this on app startup for best performance
   */
  async preloadCache(): Promise<void> {
    try {
      const searches = await this.getTopSearches(50);
      searches.forEach(search => {
        this.memoryCache.set(search.normalizedTerm, search);
      });
      this.lastCacheRefresh = Date.now();
    } catch (error) {
      console.error('[PopularSearches] Error preloading cache:', error);
    }
  }
}

// Export singleton instance
export const popularSearches = new PopularSearchesService();