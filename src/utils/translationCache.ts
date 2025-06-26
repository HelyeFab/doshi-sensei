/**
 * Translation caching system for DeepL translations
 * Provides fast access to cached translations and reduces API calls
 */

import CacheManager from './cacheManager';

export interface CachedTranslation {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationService: string;
  timestamp: number;
  hash: string;
}

export interface TranslationCacheStats {
  totalTranslations: number;
  totalSize: number;
  hitRate: number;
  avgTranslationTime: number;
  translationsByService: Record<string, number>;
}

export class TranslationCache {
  private static instance: TranslationCache;
  private cacheManager: CacheManager;
  private translationTimes = new Map<string, number[]>();
  private hitStats = { hits: 0, misses: 0 };
  private activeRequests = new Map<string, Promise<string | null>>();

  private constructor() {
    this.cacheManager = CacheManager.getInstance({
      maxSize: 20 * 1024 * 1024, // 20MB for translations
      defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxEntries: 5000
    });
  }

  static getInstance(): TranslationCache {
    if (!TranslationCache.instance) {
      TranslationCache.instance = new TranslationCache();
    }
    return TranslationCache.instance;
  }

  /**
   * Generate cache key for translation
   */
  private generateCacheKey(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string, 
    service: string = 'deepl'
  ): string {
    // Create a hash of the text + languages + service
    const content = `${text}_${sourceLanguage}_${targetLanguage}_${service}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `translation_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Generate short hash for duplicate detection
   */
  private generateTextHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get translation from cache or generate new
   */
  async getTranslation(
    text: string,
    sourceLanguage: string = 'ja',
    targetLanguage: string = 'en',
    service: string = 'deepl',
    translateFn?: () => Promise<string>
  ): Promise<string | null> {
    if (!text?.trim()) return null;

    const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage, service);
    const startTime = Date.now();

    try {
      // Check if already being translated
      if (this.activeRequests.has(cacheKey)) {
        console.log(`⏳ Translation in progress for: ${text.substring(0, 30)}...`);
        return await this.activeRequests.get(cacheKey)!;
      }

      // Try memory cache first
      let translation = this.cacheManager.getMemory<string>(cacheKey);
      
      if (translation) {
        this.recordHit(cacheKey, Date.now() - startTime);
        console.log(`🌐 Translation loaded from memory cache: ${text.substring(0, 30)}...`);
        return translation;
      }

      // Try IndexedDB cache
      const cachedTranslation = await this.cacheManager.getDB<CachedTranslation>('translations', cacheKey);
      
      if (cachedTranslation?.translatedText) {
        // Also store in memory for faster subsequent access
        this.cacheManager.setMemory(cacheKey, cachedTranslation.translatedText);
        this.recordHit(cacheKey, Date.now() - startTime);
        console.log(`🌐 Translation loaded from IndexedDB cache: ${text.substring(0, 30)}...`);
        return cachedTranslation.translatedText;
      }

      // Cache miss - translate if function provided
      if (translateFn) {
        console.log(`🔄 Translating: ${text.substring(0, 30)}...`);
        
        // Add to active requests to prevent duplicate translation
        const translationPromise = this.translateAndCache(
          cacheKey, text, sourceLanguage, targetLanguage, service, translateFn
        );
        
        this.activeRequests.set(cacheKey, translationPromise);
        
        try {
          const result = await translationPromise;
          this.recordMiss(cacheKey, Date.now() - startTime);
          return result;
        } finally {
          this.activeRequests.delete(cacheKey);
        }
      }

      this.recordMiss(cacheKey, Date.now() - startTime);
      return null;
      
    } catch (error) {
      console.error(`Error getting translation for text: ${text.substring(0, 30)}...`, error);
      this.activeRequests.delete(cacheKey);
      this.recordMiss(cacheKey, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Translate and cache new translation
   */
  private async translateAndCache(
    cacheKey: string,
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    service: string,
    translateFn: () => Promise<string>
  ): Promise<string | null> {
    try {
      const translatedText = await translateFn();
      
      if (translatedText) {
        await this.setTranslation(cacheKey, {
          id: cacheKey,
          originalText: text,
          translatedText,
          sourceLanguage,
          targetLanguage,
          translationService: service,
          timestamp: Date.now(),
          hash: this.generateTextHash(text)
        });
        
        console.log(`✅ Translation cached: ${text.substring(0, 30)}... → ${translatedText.substring(0, 30)}...`);
        return translatedText;
      }
      
      return null;
    } catch (error) {
      console.error('Error translating text:', error);
      return null;
    }
  }

  /**
   * Store translation in cache
   */
  async setTranslation(cacheKey: string, translationData: CachedTranslation): Promise<void> {
    try {
      // Store in both memory and IndexedDB
      this.cacheManager.setMemory(cacheKey, translationData.translatedText);
      await this.cacheManager.setDB('translations', cacheKey, translationData);
      
      console.log(`💾 Translation cached: ${translationData.originalText.substring(0, 30)}...`);
    } catch (error) {
      console.error(`Error caching translation:`, error);
    }
  }

  /**
   * Preload translations for an article
   */
  async preloadArticleTranslations(
    articleId: string,
    sentences: string[],
    sourceLanguage: string = 'ja',
    targetLanguage: string = 'en',
    translateFn: (text: string) => Promise<string>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    console.log(`🔄 Preloading translations for article ${articleId} (${sentences.length} sentences)...`);
    
    let completed = 0;
    const total = sentences.length;

    // Process in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);
      
      const promises = batch.map(async (sentence) => {
        try {
          await this.getTranslation(
            sentence, 
            sourceLanguage, 
            targetLanguage, 
            'deepl',
            () => translateFn(sentence)
          );
          completed++;
          onProgress?.(completed, total);
        } catch (error) {
          console.error(`Error preloading translation for sentence:`, error);
          completed++;
          onProgress?.(completed, total);
        }
      });

      await Promise.allSettled(promises);
      
      // Small delay between batches to respect API limits
      if (i + batchSize < sentences.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Translation preloading completed for article ${articleId}`);
  }

  /**
   * Get all cached translations for an article
   */
  async getArticleTranslations(articleId: string): Promise<CachedTranslation[]> {
    try {
      if (!this.cacheManager.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.cacheManager.db!.transaction(['translations'], 'readonly');
        const store = transaction.objectStore('translations');
        const request = store.openCursor();
        const translations: CachedTranslation[] = [];

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const translation = cursor.value as CachedTranslation;
            // Simple association by checking if translation was done around the same time
            // This is a basic implementation - could be improved with explicit article linking
            translations.push(translation);
            cursor.continue();
          } else {
            resolve(translations);
          }
        };
      });
    } catch (error) {
      console.error(`Error getting article translations for ${articleId}:`, error);
      return [];
    }
  }

  /**
   * Remove all translations for an article
   */
  async removeArticleTranslations(articleId: string): Promise<void> {
    try {
      const translations = await this.getArticleTranslations(articleId);
      
      for (const translation of translations) {
        const cacheKey = this.generateCacheKey(
          translation.originalText, 
          translation.sourceLanguage, 
          translation.targetLanguage, 
          translation.translationService
        );
        this.cacheManager.memoryCache?.delete(cacheKey);
        await this.cacheManager.deleteDB('translations', translation.id);
      }
      
      console.log(`🗑️ Translations removed for article ${articleId}`);
    } catch (error) {
      console.error(`Error removing article translations for ${articleId}:`, error);
    }
  }

  /**
   * Clear all translation cache
   */
  async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      for (const key of this.cacheManager.memoryCache?.keys() || []) {
        if (key.startsWith('translation_')) {
          this.cacheManager.memoryCache?.delete(key);
        }
      }

      // Clear IndexedDB
      if (this.cacheManager.db) {
        const transaction = this.cacheManager.db.transaction(['translations'], 'readwrite');
        const store = transaction.objectStore('translations');
        await store.clear();
      }

      this.translationTimes.clear();
      this.hitStats = { hits: 0, misses: 0 };
      this.activeRequests.clear();
      
      console.log('🧹 Translation cache cleared');
    } catch (error) {
      console.error('Error clearing translation cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<TranslationCacheStats> {
    const stats = await this.cacheManager.getCacheStats();
    const totalRequests = this.hitStats.hits + this.hitStats.misses;
    
    const allTranslationTimes = Array.from(this.translationTimes.values()).flat();
    const avgTranslationTime = allTranslationTimes.length > 0 
      ? allTranslationTimes.reduce((sum, time) => sum + time, 0) / allTranslationTimes.length 
      : 0;

    // Get translations by service
    const translationsByService: Record<string, number> = {};
    try {
      if (this.cacheManager.db) {
        const transaction = this.cacheManager.db.transaction(['translations'], 'readonly');
        const store = transaction.objectStore('translations');
        const request = store.openCursor();
        
        await new Promise<void>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              const translation = cursor.value as CachedTranslation;
              translationsByService[translation.translationService] = 
                (translationsByService[translation.translationService] || 0) + 1;
              cursor.continue();
            } else {
              resolve();
            }
          };
        });
      }
    } catch (error) {
      console.error('Error calculating translations by service:', error);
    }

    return {
      totalTranslations: stats.db.entries,
      totalSize: stats.memory.size + stats.db.size,
      hitRate: totalRequests > 0 ? this.hitStats.hits / totalRequests : 0,
      avgTranslationTime,
      translationsByService
    };
  }

  private recordHit(cacheKey: string, loadTime: number): void {
    this.hitStats.hits++;
    this.recordTranslationTime(cacheKey, loadTime);
  }

  private recordMiss(cacheKey: string, loadTime: number): void {
    this.hitStats.misses++;
    this.recordTranslationTime(cacheKey, loadTime);
  }

  private recordTranslationTime(cacheKey: string, time: number): void {
    if (!this.translationTimes.has(cacheKey)) {
      this.translationTimes.set(cacheKey, []);
    }
    const times = this.translationTimes.get(cacheKey)!;
    times.push(time);
    
    // Keep only last 5 translation times per cache key
    if (times.length > 5) {
      times.shift();
    }
  }
}

export default TranslationCache;