/**
 * Kanji Preloader Service
 * Handles background preloading and caching of kanji data for better performance
 */

import { KanjiByLevel, JLPTLevel } from '@/types';

class KanjiPreloader {
  private static instance: KanjiPreloader;
  private cache: KanjiByLevel = {};
  private loadingPromises: Map<JLPTLevel, Promise<any>> = new Map();
  private preloadTimeout: NodeJS.Timeout | null = null;

  // JLPT level mapping for file paths
  private JLPT_FILES = {
    'N5': '/api/kanji/jlpt_5',
    'N4': '/api/kanji/jlpt_4',
    'N3': '/api/kanji/jlpt_3',
    'N2': '/api/kanji/jlpt_2',
    'N1': '/api/kanji/jlpt_1'
  };

  private constructor() {}

  static getInstance(): KanjiPreloader {
    if (!KanjiPreloader.instance) {
      KanjiPreloader.instance = new KanjiPreloader();
    }
    return KanjiPreloader.instance;
  }

  /**
   * Start preloading kanji data in the background
   * Called from app layout on initial load
   */
  startPreloading(delay: number = 2000) {
    // Cancel any existing preload
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout);
    }

    // Start preloading after a delay to not interfere with initial page load
    this.preloadTimeout = setTimeout(() => {
      this.preloadInBackground();
    }, delay);
  }

  /**
   * Preload kanji data in priority order
   */
  private async preloadInBackground() {
    // Load in priority order: N5, N4, N3, N2, N1
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
    
    for (const level of levels) {
      // Check if already loaded
      if (this.cache[level]) continue;

      try {
        await this.loadLevel(level);
        // Small delay between levels to avoid blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to preload ${level}:`, error);
      }
    }
  }

  /**
   * Load a specific JLPT level
   */
  async loadLevel(level: JLPTLevel): Promise<any> {
    // Return cached data if available
    if (this.cache[level]) {
      return this.cache[level];
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(level)) {
      return this.loadingPromises.get(level);
    }

    // Create new loading promise
    const loadingPromise = this.fetchLevel(level);
    this.loadingPromises.set(level, loadingPromise);

    try {
      const data = await loadingPromise;
      this.cache[level] = data;
      this.loadingPromises.delete(level);
      return data;
    } catch (error) {
      this.loadingPromises.delete(level);
      throw error;
    }
  }

  /**
   * Fetch kanji data for a level
   */
  private async fetchLevel(level: JLPTLevel): Promise<any[]> {
    const filePath = this.JLPT_FILES[level];
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Failed to load ${level} kanji data`);
    }

    const rawKanji = await response.json();

    // Transform raw data to include JLPT level
    return rawKanji.map((item: any) => ({
      ...item,
      jlpt: level
    }));
  }

  /**
   * Get all cached levels
   */
  getCachedLevels(): JLPTLevel[] {
    return Object.keys(this.cache) as JLPTLevel[];
  }

  /**
   * Get cached data for a level (sync)
   */
  getCached(level: JLPTLevel): any[] | null {
    return this.cache[level] || null;
  }

  /**
   * Check if a level is cached
   */
  isCached(level: JLPTLevel): boolean {
    return !!this.cache[level];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {};
    this.loadingPromises.clear();
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    cached: JLPTLevel[];
    loading: JLPTLevel[];
    total: number;
  } {
    return {
      cached: this.getCachedLevels(),
      loading: Array.from(this.loadingPromises.keys()),
      total: Object.keys(this.JLPT_FILES).length
    };
  }
}

export default KanjiPreloader.getInstance();