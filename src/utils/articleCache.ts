/**
 * Article-specific caching system with optimized storage and retrieval
 */

import { NewsArticle } from '@/types/news';
import CacheManager from './cacheManager';

export interface CachedArticle extends NewsArticle {
  cachedAt: number;
  furiganaGenerated?: boolean;
  processedContent?: string;
}

export interface ArticleCacheStats {
  totalArticles: number;
  cacheHitRate: number;
  totalSize: number;
  avgLoadTime: number;
}

export class ArticleCache {
  private static instance: ArticleCache;
  private cacheManager: CacheManager;
  private loadTimes = new Map<string, number[]>();
  private hitStats = { hits: 0, misses: 0 };

  private constructor() {
    this.cacheManager = CacheManager.getInstance({
      maxSize: 30 * 1024 * 1024, // 30MB for articles
      defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEntries: 500
    });
  }

  static getInstance(): ArticleCache {
    if (!ArticleCache.instance) {
      ArticleCache.instance = new ArticleCache();
    }
    return ArticleCache.instance;
  }

  /**
   * Get article from cache or fetch from API
   */
  async getArticle(articleId: string, fetchFn?: () => Promise<NewsArticle>): Promise<NewsArticle | null> {
    const startTime = Date.now();
    
    try {
      // Try memory cache first (fastest)
      let article = this.cacheManager.getMemory<CachedArticle>(`article:${articleId}`);
      
      if (article) {
        this.recordHit(articleId, Date.now() - startTime);
        console.log(`📄 Article ${articleId} loaded from memory cache`);
        return article;
      }

      // Try IndexedDB cache
      article = await this.cacheManager.getDB<CachedArticle>('articles', articleId);
      
      if (article) {
        // Also store in memory for faster subsequent access
        this.cacheManager.setMemory(`article:${articleId}`, article);
        this.recordHit(articleId, Date.now() - startTime);
        console.log(`📄 Article ${articleId} loaded from IndexedDB cache`);
        return article;
      }

      // Cache miss - fetch from API if function provided
      if (fetchFn) {
        console.log(`🔍 Fetching article ${articleId} from API`);
        const fetchedArticle = await fetchFn();
        
        if (fetchedArticle) {
          await this.setArticle(articleId, fetchedArticle);
          this.recordMiss(articleId, Date.now() - startTime);
          return fetchedArticle;
        }
      }

      this.recordMiss(articleId, Date.now() - startTime);
      return null;
      
    } catch (error) {
      console.error(`Error getting article ${articleId}:`, error);
      this.recordMiss(articleId, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Store article in cache
   */
  async setArticle(articleId: string, article: NewsArticle): Promise<void> {
    const cachedArticle: CachedArticle = {
      ...article,
      cachedAt: Date.now()
    };

    try {
      // Store in both memory and IndexedDB
      this.cacheManager.setMemory(`article:${articleId}`, cachedArticle);
      await this.cacheManager.setDB('articles', articleId, cachedArticle);
      
      console.log(`💾 Article ${articleId} cached successfully`);
    } catch (error) {
      console.error(`Error caching article ${articleId}:`, error);
    }
  }

  /**
   * Cache processed article content (with furigana, etc.)
   */
  async setProcessedContent(articleId: string, processedContent: string): Promise<void> {
    try {
      // Get existing cached article
      let article = this.cacheManager.getMemory<CachedArticle>(`article:${articleId}`) ||
                   await this.cacheManager.getDB<CachedArticle>('articles', articleId);

      if (article) {
        article.processedContent = processedContent;
        article.furiganaGenerated = true;
        
        // Update both caches
        this.cacheManager.setMemory(`article:${articleId}`, article);
        await this.cacheManager.setDB('articles', articleId, article);
        
        console.log(`✨ Processed content cached for article ${articleId}`);
      }
    } catch (error) {
      console.error(`Error caching processed content for ${articleId}:`, error);
    }
  }

  /**
   * Get processed content if available
   */
  async getProcessedContent(articleId: string): Promise<string | null> {
    try {
      let article = this.cacheManager.getMemory<CachedArticle>(`article:${articleId}`) ||
                   await this.cacheManager.getDB<CachedArticle>('articles', articleId);

      return article?.processedContent || null;
    } catch (error) {
      console.error(`Error getting processed content for ${articleId}:`, error);
      return null;
    }
  }

  /**
   * Preload articles for better UX
   */
  async preloadArticles(articleIds: string[], fetchFn: (id: string) => Promise<NewsArticle>): Promise<void> {
    console.log(`🔄 Preloading ${articleIds.length} articles...`);
    
    const promises = articleIds.map(async (articleId) => {
      try {
        // Check if already cached
        const cached = this.cacheManager.getMemory<CachedArticle>(`article:${articleId}`) ||
                      await this.cacheManager.getDB<CachedArticle>('articles', articleId);
        
        if (!cached) {
          const article = await fetchFn(articleId);
          if (article) {
            await this.setArticle(articleId, article);
          }
        }
      } catch (error) {
        console.error(`Error preloading article ${articleId}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`✅ Article preloading completed`);
  }

  /**
   * Get multiple articles efficiently
   */
  async getArticles(articleIds: string[], fetchFn?: (ids: string[]) => Promise<NewsArticle[]>): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];
    const uncachedIds: string[] = [];

    // Check cache for each article
    for (const articleId of articleIds) {
      const cached = this.cacheManager.getMemory<CachedArticle>(`article:${articleId}`) ||
                    await this.cacheManager.getDB<CachedArticle>('articles', articleId);
      
      if (cached) {
        results.push(cached);
      } else {
        uncachedIds.push(articleId);
      }
    }

    // Fetch uncached articles if function provided
    if (uncachedIds.length > 0 && fetchFn) {
      try {
        const fetchedArticles = await fetchFn(uncachedIds);
        
        // Cache the fetched articles
        for (const article of fetchedArticles) {
          await this.setArticle(article.id, article);
          results.push(article);
        }
      } catch (error) {
        console.error('Error fetching uncached articles:', error);
      }
    }

    return results;
  }

  /**
   * Remove article from cache
   */
  async removeArticle(articleId: string): Promise<void> {
    try {
      this.cacheManager.memoryCache?.delete(`article:${articleId}`);
      await this.cacheManager.deleteDB('articles', articleId);
      console.log(`🗑️ Article ${articleId} removed from cache`);
    } catch (error) {
      console.error(`Error removing article ${articleId}:`, error);
    }
  }

  /**
   * Clear all article cache
   */
  async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      for (const key of this.cacheManager.memoryCache?.keys() || []) {
        if (key.startsWith('article:')) {
          this.cacheManager.memoryCache?.delete(key);
        }
      }

      // Clear IndexedDB
      if (this.cacheManager.db) {
        const transaction = this.cacheManager.db.transaction(['articles'], 'readwrite');
        const store = transaction.objectStore('articles');
        await store.clear();
      }

      this.loadTimes.clear();
      this.hitStats = { hits: 0, misses: 0 };
      
      console.log('🧹 Article cache cleared');
    } catch (error) {
      console.error('Error clearing article cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<ArticleCacheStats> {
    const stats = await this.cacheManager.getCacheStats();
    const totalRequests = this.hitStats.hits + this.hitStats.misses;
    
    const allLoadTimes = Array.from(this.loadTimes.values()).flat();
    const avgLoadTime = allLoadTimes.length > 0 
      ? allLoadTimes.reduce((sum, time) => sum + time, 0) / allLoadTimes.length 
      : 0;

    return {
      totalArticles: stats.db.entries,
      cacheHitRate: totalRequests > 0 ? this.hitStats.hits / totalRequests : 0,
      totalSize: stats.memory.size + stats.db.size,
      avgLoadTime
    };
  }

  private recordHit(articleId: string, loadTime: number): void {
    this.hitStats.hits++;
    this.recordLoadTime(articleId, loadTime);
  }

  private recordMiss(articleId: string, loadTime: number): void {
    this.hitStats.misses++;
    this.recordLoadTime(articleId, loadTime);
  }

  private recordLoadTime(articleId: string, loadTime: number): void {
    if (!this.loadTimes.has(articleId)) {
      this.loadTimes.set(articleId, []);
    }
    const times = this.loadTimes.get(articleId)!;
    times.push(loadTime);
    
    // Keep only last 10 load times per article
    if (times.length > 10) {
      times.shift();
    }
  }
}

export default ArticleCache;