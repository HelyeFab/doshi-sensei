import { CachedArticle, ResourceAssets } from '@/types/cache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { UserType } from '@/utils/enhancedStorageManager2';
import { evictionEngine } from '@/lib/cache/eviction/lruEvictionEngine';

export interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  author?: string;
  publishedAt?: number;
  readingTime?: number;
  images?: string[];
  audioUrl?: string;
  tags?: string[];
  version?: string;
}

export class ArticleCache {
  private static readonly CACHE_VERSION = '1.0';
  private static readonly STALE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  /**
   * Cache an article with all its assets
   */
  static async cacheArticle(article: Article, userType: UserType): Promise<void> {
    try {

      // Download and cache all images
      const imageBlobs = await this.downloadImages(article.images || []);
      
      // Download and cache audio if available
      const audioBlob = article.audioUrl 
        ? await this.downloadAudio(article.audioUrl)
        : null;
      
      // Calculate total size
      const size = EnhancedStorageManager2.calculateResourceSize(
        article, 
        imageBlobs, 
        audioBlob ? new Map([['main', audioBlob]]) : undefined
      );
      
      // Check if eviction is needed before caching
      const needsEviction = await evictionEngine.requiresEviction('article', userType, size);
      if (needsEviction) {

        const evictionResult = await evictionEngine.enforceLimit('article', userType);

      }
      
      // Create cached article
      const cachedArticle: CachedArticle = {
        id: article.id,
        type: 'article',
        data: {
          id: article.id,
          title: article.title,
          content: article.content,
          slug: article.slug,
          author: article.author,
          publishedAt: article.publishedAt,
          readingTime: article.readingTime,
          imageUrls: article.images,
          audioUrl: article.audioUrl,
          tags: article.tags
        },
        metadata: {
          size,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: article.version || this.CACHE_VERSION,
          checksum: await EnhancedStorageManager2.generateChecksum(article),
          expiresAt: Date.now() + this.STALE_TIME
        },
        assets: {
          images: imageBlobs,
          audio: audioBlob ? new Map([['main', audioBlob]]) : new Map()
        }
      };
      
      // Store in ArticleIndexedDB
      await ArticleIndexedDB.saveArticle({
        ...article,
        size,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        version: article.version || this.CACHE_VERSION
      });
      
      // Save assets
      for (const [url, blob] of imageBlobs) {
        await ArticleIndexedDB.saveAsset(article.id, url, blob, 'image');
      }
      
      if (audioBlob) {
        await ArticleIndexedDB.saveAsset(article.id, article.audioUrl!, audioBlob, 'audio');
      }
      
      // Also store in EnhancedStorageManager2 for compatibility
      await EnhancedStorageManager2.cacheResource(cachedArticle, userType);

    } catch (error) {
      console.error(`[ArticleCache] Failed to cache article ${article.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a cached article or fetch from network
   */
  static async getArticle(id: string, fetchFn?: () => Promise<Article>): Promise<Article | null> {
    try {
      // Try ArticleIndexedDB first
      const articleData = await ArticleIndexedDB.getArticle(id);
      
      if (articleData && !this.isStaleData(articleData)) {

        const assets = await ArticleIndexedDB.getArticleAssets(id);
        return {
          ...articleData,
          images: Array.from(assets.images.keys())
        };
      }
      
      // Fall back to EnhancedStorageManager2 for backward compatibility
      const cached = await EnhancedStorageManager2.getCachedResource('article', id);
      
      if (cached && !this.isStale(cached)) {

        return this.hydrateCachedArticle(cached as CachedArticle);
      }
      
      // Fall back to network if fetch function provided
      if (fetchFn) {

        const article = await fetchFn();
        
        // Cache in background (don't wait)
        this.cacheArticle(article, 'free').catch(console.error);
        
        return article;
      }
      
      // Return stale cache if no fetch function
      if (cached) {

        return this.hydrateCachedArticle(cached as CachedArticle);
      }
      
      return null;
    } catch (error) {
      console.error(`[ArticleCache] Failed to get article ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Download and cache images
   */
  private static async downloadImages(imageUrls: string[]): Promise<Map<string, Blob>> {
    const imageBlobs = new Map<string, Blob>();
    
    for (const url of imageUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          imageBlobs.set(url, blob);
        }
      } catch (error) {
        console.error(`[ArticleCache] Failed to download image ${url}:`, error);
      }
    }
    
    return imageBlobs;
  }
  
  /**
   * Download and cache audio
   */
  private static async downloadAudio(audioUrl: string): Promise<Blob | null> {
    try {
      const response = await fetch(audioUrl);
      if (response.ok) {
        return await response.blob();
      }
    } catch (error) {
      console.error(`[ArticleCache] Failed to download audio ${audioUrl}:`, error);
    }
    
    return null;
  }
  
  /**
   * Check if cached resource is stale
   */
  private static isStale(cached: CachedArticle): boolean {
    if (!cached.metadata.expiresAt) return false;
    return Date.now() > cached.metadata.expiresAt;
  }
  
  /**
   * Convert cached article back to Article format
   */
  private static hydrateCachedArticle(cached: CachedArticle): Article {
    const article: Article = {
      id: cached.data.id,
      title: cached.data.title,
      content: cached.data.content,
      slug: cached.data.slug,
      version: cached.metadata.version
    };
    
    // Add optional fields
    if (cached.data.author) article.author = cached.data.author;
    if (cached.data.publishedAt) article.publishedAt = cached.data.publishedAt;
    if (cached.data.readingTime) article.readingTime = cached.data.readingTime;
    if (cached.data.tags) article.tags = cached.data.tags;
    
    // Convert blob URLs for assets if available
    if (cached.assets?.images.size) {
      article.images = Array.from(cached.assets.images.keys());
    }
    
    if (cached.assets?.audio.has('main')) {
      article.audioUrl = cached.data.audioUrl;
    }
    
    return article;
  }
  
  /**
   * Check if cached article data is stale
   */
  private static isStaleData(articleData: any): boolean {
    const now = Date.now();
    const expiresAt = articleData.cachedAt + this.STALE_TIME;
    return now > expiresAt;
  }
  
  /**
   * Pre-cache related articles
   */
  static async preCacheRelated(currentArticleId: string, relatedIds: string[]): Promise<void> {
    // Use requestIdleCallback for background caching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        relatedIds.forEach(id => {
          // Check if already cached before fetching
          EnhancedStorageManager2.getCachedResource('article', id)
            .then(cached => {
              if (!cached) {
                // Fetch and cache in background
                // This would call your API to get the article

              }
            })
            .catch(console.error);
        });
      });
    }
  }
  
  /**
   * Clear all cached articles
   */
  static async clearCache(): Promise<void> {
    const allArticles = await EnhancedStorageManager2.getResourcesByType('article');
    
    for (const article of allArticles) {
      await EnhancedStorageManager2.getCachedResource('article', article.id)
        .then(() => {
          // Remove from cache

        })
        .catch(console.error);
    }
  }
  
  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    count: number;
    totalSize: number;
    oldestArticle: Date | null;
    newestArticle: Date | null;
  }> {
    const allArticles = await EnhancedStorageManager2.getResourcesByType('article');
    
    if (allArticles.length === 0) {
      return {
        count: 0,
        totalSize: 0,
        oldestArticle: null,
        newestArticle: null
      };
    }
    
    const totalSize = allArticles.reduce((sum, article) => sum + article.metadata.size, 0);
    const timestamps = allArticles.map(a => a.metadata.cachedAt);
    
    return {
      count: allArticles.length,
      totalSize,
      oldestArticle: new Date(Math.min(...timestamps)),
      newestArticle: new Date(Math.max(...timestamps))
    };
  }
}