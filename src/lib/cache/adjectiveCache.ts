import { CachedResource } from '@/types/cache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { UserType } from '@/utils/enhancedStorageManager2';

export interface Adjective {
  word: string;
  reading: string;
  meaning: string;
  type: 'i-adjective' | 'na-adjective';
  jlptLevel?: string;
  conjugations: {
    [key: string]: {
      form: string;
      reading: string;
      meaning: string;
    };
  };
  examples?: {
    sentence: string;
    reading: string;
    meaning: string;
  }[];
  audioUrl?: string;
  version?: string;
}

export class AdjectiveCache {
  private static readonly CACHE_VERSION = '1.0';
  private static readonly STALE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days (adjective data changes less frequently)

  /**
   * Cache an adjective with all its conjugations
   */
  static async cacheAdjective(adjective: Adjective, userType: UserType): Promise<void> {
    try {

      // Download and cache audio if available
      const audioBlob = adjective.audioUrl
        ? await this.downloadAudio(adjective.audioUrl)
        : null;

      // Calculate total size
      const size = EnhancedStorageManager2.calculateResourceSize(
        adjective,
        undefined, // No images for adjectives
        audioBlob ? new Map([['main', audioBlob]]) : undefined
      );

      // Create cached adjective
      const cachedAdjective: CachedResource = {
        id: adjective.word,
        type: 'adjective',
        data: {
          word: adjective.word,
          reading: adjective.reading,
          meaning: adjective.meaning,
          type: adjective.type,
          jlptLevel: adjective.jlptLevel,
          conjugations: adjective.conjugations,
          examples: adjective.examples,
          audioUrl: adjective.audioUrl
        },
        metadata: {
          size,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: adjective.version || this.CACHE_VERSION,
          checksum: await EnhancedStorageManager2.generateChecksum(adjective),
          expiresAt: Date.now() + this.STALE_TIME
        },
        assets: {
          images: new Map(), // Adjectives don't have images
          audio: audioBlob ? new Map([['main', audioBlob]]) : new Map()
        }
      };

      // Store in cache
      await EnhancedStorageManager2.cacheResource(cachedAdjective, userType);

    } catch (error) {
      console.error(`[AdjectiveCache] Failed to cache adjective ${adjective.word}:`, error);
      throw error;
    }
  }

  /**
   * Get a cached adjective or fetch from network
   */
  static async getAdjective(
    word: string, 
    fetchFn?: () => Promise<Adjective>,
    userType?: UserType
  ): Promise<Adjective | null> {
    try {
      // Try cache first
      const cached = await EnhancedStorageManager2.getCachedResource('adjective', word);

      if (cached && !this.isStale(cached)) {

        return this.hydrateCachedAdjective(cached);
      }

      // Fall back to network if fetch function provided
      if (fetchFn) {

        const adjective = await fetchFn();

        // Cache in background only if userType is provided
        if (userType) {
          this.cacheAdjective(adjective, userType).catch(console.error);
        }

        return adjective;
      }

      // Return stale cache if no fetch function
      if (cached) {

        return this.hydrateCachedAdjective(cached);
      }

      return null;
    } catch (error) {
      console.error(`[AdjectiveCache] Failed to get adjective ${word}:`, error);
      return null;
    }
  }

  /**
   * Cache multiple adjectives at once (batch operation)
   */
  static async cacheAdjectiveSet(adjectiveList: Adjective[], userType: UserType): Promise<void> {

    // Process in batches to avoid overwhelming the storage
    const BATCH_SIZE = 10;

    for (let i = 0; i < adjectiveList.length; i += BATCH_SIZE) {
      const batch = adjectiveList.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(adjective =>
          this.cacheAdjective(adjective, userType).catch(error => {
            console.error(`[AdjectiveCache] Failed to cache adjective ${adjective.word}:`, error);
          })
        )
      );

      // Small delay between batches
      if (i + BATCH_SIZE < adjectiveList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

  }

  /**
   * Get adjectives by type (i-adjective, na-adjective)
   */
  static async getAdjectivesByType(type: 'i-adjective' | 'na-adjective'): Promise<Adjective[]> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('adjective');

      return resources
        .filter(resource => !this.isStale(resource))
        .map(resource => this.hydrateCachedAdjective(resource))
        .filter(adjective => adjective.type === type);
    } catch (error) {
      console.error(`[AdjectiveCache] Failed to get adjectives by type ${type}:`, error);
      return [];
    }
  }

  /**
   * Get adjectives by JLPT level
   */
  static async getAdjectivesByJLPTLevel(level: string): Promise<Adjective[]> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('adjective');

      return resources
        .filter(resource => !this.isStale(resource))
        .map(resource => this.hydrateCachedAdjective(resource))
        .filter(adjective => adjective.jlptLevel === level);
    } catch (error) {
      console.error(`[AdjectiveCache] Failed to get adjectives by JLPT level ${level}:`, error);
      return [];
    }
  }

  /**
   * Pre-cache related adjectives based on type or JLPT level
   */
  static async preCacheRelated(currentAdjective: string, relatedAdjectives: string[]): Promise<void> {

    // Use requestIdleCallback for non-blocking pre-caching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        for (const adjectiveWord of relatedAdjectives) {
          try {
            // Try to fetch and cache each related adjective
            // This would typically call an API to get adjective data
            // For now, we'll just log the intention

          } catch (error) {
            console.error(`[AdjectiveCache] Failed to pre-cache adjective ${adjectiveWord}:`, error);
          }
        }
      });
    }
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
      console.error(`[AdjectiveCache] Failed to download audio ${audioUrl}:`, error);
    }

    return null;
  }

  /**
   * Check if cached resource is stale
   */
  private static isStale(cached: CachedResource): boolean {
    if (!cached.metadata.expiresAt) return false;
    return Date.now() > cached.metadata.expiresAt;
  }

  /**
   * Convert cached adjective back to Adjective format
   */
  private static hydrateCachedAdjective(cached: CachedResource): Adjective {
    const adjective: Adjective = {
      word: cached.data.word,
      reading: cached.data.reading,
      meaning: cached.data.meaning,
      type: cached.data.type,
      conjugations: cached.data.conjugations,
      version: cached.metadata.version
    };

    // Add optional fields
    if (cached.data.jlptLevel) adjective.jlptLevel = cached.data.jlptLevel;
    if (cached.data.examples) adjective.examples = cached.data.examples;
    if (cached.data.audioUrl) adjective.audioUrl = cached.data.audioUrl;

    return adjective;
  }

  /**
   * Clear all cached adjectives
   */
  static async clearCache(): Promise<void> {
    try {
      await EnhancedStorageManager2.clearResourcesByType('adjective');

    } catch (error) {
      console.error('[AdjectiveCache] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    count: number;
    totalSize: number;
    oldestAdjective: Date | null;
    newestAdjective: Date | null;
    byType: { 'i-adjective': number; 'na-adjective': number };
  }> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('adjective');

      if (resources.length === 0) {
        return {
          count: 0,
          totalSize: 0,
          oldestAdjective: null,
          newestAdjective: null,
          byType: { 'i-adjective': 0, 'na-adjective': 0 }
        };
      }

      const totalSize = resources.reduce((sum, resource) => sum + resource.metadata.size, 0);
      const dates = resources.map(r => new Date(r.metadata.cachedAt));

      // Count by type
      const byType = resources.reduce((acc, resource) => {
        const type = resource.data.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, { 'i-adjective': 0, 'na-adjective': 0 });

      return {
        count: resources.length,
        totalSize,
        oldestAdjective: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestAdjective: new Date(Math.max(...dates.map(d => d.getTime()))),
        byType
      };
    } catch (error) {
      console.error('[AdjectiveCache] Failed to get cache stats:', error);
      throw error;
    }
  }
}
