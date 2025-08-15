import { JapaneseWord } from '@/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

interface PracticeCacheData {
  commonWords: JapaneseWord[];
  verbs: JapaneseWord[];
  adjectives: JapaneseWord[];
}

export class PracticeCache {
  private static readonly CACHE_KEY = 'doshi_sensei_practice_cache';
  private static readonly DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CACHE_VERSION = '1.0';

  /**
   * Get cached data if available and not expired
   */
  static get<T>(key: keyof PracticeCacheData): T | null {
    try {
      const cacheString = localStorage.getItem(this.CACHE_KEY);
      if (!cacheString) return null;

      const cache = JSON.parse(cacheString);

      // Check cache version
      if (cache.version !== this.CACHE_VERSION) {
        this.clear();
        return null;
      }

      const entry: CacheEntry<T> = cache.data[key];
      if (!entry) return null;

      // Check if expired
      if (Date.now() > entry.expires) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      // Error reading from practice cache
      this.clear(); // Clear corrupted cache
      return null;
    }
  }

  /**
   * Set cached data with expiration
   */
  static set<T>(key: keyof PracticeCacheData, data: T, duration: number = this.DEFAULT_CACHE_DURATION): void {
    try {
      const cacheString = localStorage.getItem(this.CACHE_KEY);
      let cache: {
        version: string;
        data: { [K in keyof PracticeCacheData]?: CacheEntry<PracticeCacheData[K]> };
      } = {
        version: this.CACHE_VERSION,
        data: {}
      };

      if (cacheString) {
        try {
          cache = JSON.parse(cacheString);
          if (cache.version !== this.CACHE_VERSION) {
            cache = {
              version: this.CACHE_VERSION,
              data: {}
            };
          }
        } catch (parseError) {
          // Error parsing cache, creating new cache
        }
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expires: Date.now() + duration
      };

      (cache.data as any)[key] = entry;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));

    } catch (error) {
      // Error writing to practice cache
    }
  }

  /**
   * Delete specific cache entry
   */
  static delete(key: keyof PracticeCacheData): void {
    try {
      const cacheString = localStorage.getItem(this.CACHE_KEY);
      if (!cacheString) return;

      const cache = JSON.parse(cacheString);
      if (cache.data && cache.data[key]) {
        delete cache.data[key];
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      // Error deleting from practice cache
    }
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      // Error clearing practice cache
    }
  }

  /**
   * Get cache info for debugging
   */
  static getCacheInfo(): any {
    try {
      const cacheString = localStorage.getItem(this.CACHE_KEY);
      if (!cacheString) return null;

      const cache = JSON.parse(cacheString);
      const info: any = {
        version: cache.version,
        entries: {}
      };

      for (const [key, entry] of Object.entries(cache.data || {})) {
        const typedEntry = entry as CacheEntry<any>;
        info.entries[key] = {
          itemCount: Array.isArray(typedEntry.data) ? typedEntry.data.length : 'N/A',
          cachedAt: new Date(typedEntry.timestamp).toLocaleString(),
          expiresAt: new Date(typedEntry.expires).toLocaleString(),
          isExpired: Date.now() > typedEntry.expires,
          sizeKB: Math.round(JSON.stringify(typedEntry.data).length / 1024)
        };
      }

      return info;
    } catch (error) {
      // Error getting cache info
      return null;
    }
  }

  /**
   * Check if cache entry exists and is valid
   */
  static isValid(key: keyof PracticeCacheData): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache size in KB
   */
  static getCacheSize(): number {
    try {
      const cacheString = localStorage.getItem(this.CACHE_KEY);
      if (!cacheString) return 0;
      return Math.round(cacheString.length / 1024);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Preload cache in background
   */
  static async preloadCache(): Promise<void> {
    // Import the JMDict functions dynamically to avoid circular dependencies
    const { getJMdictPracticeWords } = await import('./jmdictPractice');

    try {

      // Check if we already have valid cache
      if (this.isValid('commonWords')) {
        return;
      }

      // Load fresh data from JMDict (already sorted by commonality)
      const [verbs, adjectives] = await Promise.all([
        getJMdictPracticeWords('verbs', 200),
        getJMdictPracticeWords('adjectives', 200)
      ]);

      // Combine, keeping the most common words
      // Interleave verbs and adjectives to have variety
      const commonWords: JapaneseWord[] = [];
      const maxLength = Math.max(verbs.length, adjectives.length);
      
      for (let i = 0; i < Math.min(100, maxLength); i++) {
        if (i < verbs.length) commonWords.push(verbs[i]);
        if (i < adjectives.length) commonWords.push(adjectives[i]);
      }

      if (commonWords.length > 0) {
        // Cache all categories
        this.set('commonWords', commonWords);
        this.set('verbs', verbs);
        this.set('adjectives', adjectives);

      } else {
        // No words loaded from JMDict for cache preload
      }
    } catch (error) {
      // Error preloading practice cache
    }
  }

  /**
   * Get common words for practice (wrapper for getCachedCommonWordsForPractice)
   */
  static async getCommonWordsForPractice(limit: number = 50): Promise<JapaneseWord[]> {
    return getCachedCommonWordsForPractice(limit);
  }

  /**
   * Get filtered words (wrapper for getCachedFilteredWords)
   */
  static async getFilteredWords(filter: 'all' | 'verbs' | 'adjectives', limit: number = 50): Promise<JapaneseWord[]> {
    return getCachedFilteredWords(filter, limit);
  }
}

/**
 * Get common words with caching
 */
export async function getCachedCommonWordsForPractice(limit: number = 50): Promise<JapaneseWord[]> {
  // Try to get from cache first
  const cached = PracticeCache.get<JapaneseWord[]>('commonWords');
  if (cached && cached.length > 0) {
    // Return the same order for consistency (already pre-sorted by commonality)
    // Only shuffle if explicitly requested
    return cached.slice(0, Math.min(limit, cached.length));
  }

  // If no cache, load fresh data from JMDict
  const { getJMdictPracticeWords } = await import('./jmdictPractice');

  const words = await getJMdictPracticeWords('all', Math.max(limit, 100)); // Get more for caching

  // Cache the results for future use
  if (words.length > 0) {
    PracticeCache.set('commonWords', words);

    // Also cache filtered subsets
    const verbs = words.filter(word =>
      word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular'
    );
    const adjectives = words.filter(word =>
      word.type === 'i-adjective' || word.type === 'na-adjective'
    );

    PracticeCache.set('verbs', verbs);
    PracticeCache.set('adjectives', adjectives);
  }

  return words.slice(0, limit);
}

/**
 * Get filtered words with caching
 */
export async function getCachedFilteredWords(filter: 'all' | 'verbs' | 'adjectives', limit: number = 50): Promise<JapaneseWord[]> {
  if (filter === 'all') {
    return getCachedCommonWordsForPractice(limit);
  }

  // Try to get filtered words from cache
  const cacheKey = filter === 'verbs' ? 'verbs' : 'adjectives';
  const cached = PracticeCache.get<JapaneseWord[]>(cacheKey);

  if (cached && cached.length > 0) {
    // Return consistent order (already sorted by commonality)
    return cached.slice(0, Math.min(limit, cached.length));
  }

  // Fallback to loading all words and filtering
  const allWords = await getCachedCommonWordsForPractice(100);
  const filteredWords = allWords.filter(word => {
    if (filter === 'verbs') {
      return word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular';
    } else if (filter === 'adjectives') {
      return word.type === 'i-adjective' || word.type === 'na-adjective';
    }
    return true;
  });

  return filteredWords.slice(0, limit);
}

export default PracticeCache;
