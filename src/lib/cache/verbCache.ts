import { CachedResource } from '@/types/cache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { UserType } from '@/utils/enhancedStorageManager2';

export interface Verb {
  word: string;
  reading: string;
  meaning: string;
  type: 'ichidan' | 'godan' | 'irregular';
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

export class VerbCache {
  private static readonly CACHE_VERSION = '1.0';
  private static readonly STALE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days (verb data changes less frequently)

  /**
   * Cache a verb with all its conjugations
   */
  static async cacheVerb(verb: Verb, userType: UserType): Promise<void> {
    try {

      // Download and cache audio if available
      const audioBlob = verb.audioUrl
        ? await this.downloadAudio(verb.audioUrl)
        : null;

      // Calculate total size
      const size = EnhancedStorageManager2.calculateResourceSize(
        verb,
        undefined, // No images for verbs
        audioBlob ? new Map([['main', audioBlob]]) : undefined
      );

      // Create cached verb
      const cachedVerb: CachedResource = {
        id: verb.word,
        type: 'verb',
        data: {
          word: verb.word,
          reading: verb.reading,
          meaning: verb.meaning,
          type: verb.type,
          jlptLevel: verb.jlptLevel,
          conjugations: verb.conjugations,
          examples: verb.examples,
          audioUrl: verb.audioUrl
        },
        metadata: {
          size,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: verb.version || this.CACHE_VERSION,
          checksum: await EnhancedStorageManager2.generateChecksum(verb),
          expiresAt: Date.now() + this.STALE_TIME
        },
        assets: {
          images: new Map(), // Verbs don't have images
          audio: audioBlob ? new Map([['main', audioBlob]]) : new Map()
        }
      };

      // Store in cache
      await EnhancedStorageManager2.cacheResource(cachedVerb, userType);

    } catch (error) {
      console.error(`[VerbCache] Failed to cache verb ${verb.word}:`, error);
      throw error;
    }
  }

  /**
   * Get a cached verb or fetch from network
   */
  static async getVerb(
    word: string, 
    fetchFn?: () => Promise<Verb>,
    userType?: UserType
  ): Promise<Verb | null> {
    try {
      // Try cache first
      const cached = await EnhancedStorageManager2.getCachedResource('verb', word);

      if (cached && !this.isStale(cached)) {

        return this.hydrateCachedVerb(cached);
      }

      // Fall back to network if fetch function provided
      if (fetchFn) {

        const verb = await fetchFn();

        // Cache in background only if userType is provided
        if (userType) {
          this.cacheVerb(verb, userType).catch(console.error);
        }

        return verb;
      }

      // Return stale cache if no fetch function
      if (cached) {

        return this.hydrateCachedVerb(cached);
      }

      return null;
    } catch (error) {
      console.error(`[VerbCache] Failed to get verb ${word}:`, error);
      return null;
    }
  }

  /**
   * Cache multiple verbs at once (batch operation)
   */
  static async cacheVerbSet(verbList: Verb[], userType: UserType): Promise<void> {

    // Process in batches to avoid overwhelming the storage
    const BATCH_SIZE = 10;

    for (let i = 0; i < verbList.length; i += BATCH_SIZE) {
      const batch = verbList.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(verb =>
          this.cacheVerb(verb, userType).catch(error => {
            console.error(`[VerbCache] Failed to cache verb ${verb.word}:`, error);
          })
        )
      );

      // Small delay between batches
      if (i + BATCH_SIZE < verbList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

  }

  /**
   * Get verbs by type (ichidan, godan, irregular)
   */
  static async getVerbsByType(type: 'ichidan' | 'godan' | 'irregular'): Promise<Verb[]> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('verb');

      return resources
        .filter(resource => !this.isStale(resource))
        .map(resource => this.hydrateCachedVerb(resource))
        .filter(verb => verb.type === type);
    } catch (error) {
      console.error(`[VerbCache] Failed to get verbs by type ${type}:`, error);
      return [];
    }
  }

  /**
   * Get verbs by JLPT level
   */
  static async getVerbsByJLPTLevel(level: string): Promise<Verb[]> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('verb');

      return resources
        .filter(resource => !this.isStale(resource))
        .map(resource => this.hydrateCachedVerb(resource))
        .filter(verb => verb.jlptLevel === level);
    } catch (error) {
      console.error(`[VerbCache] Failed to get verbs by JLPT level ${level}:`, error);
      return [];
    }
  }

  /**
   * Pre-cache related verbs based on type or JLPT level
   */
  static async preCacheRelated(currentVerb: string, relatedVerbs: string[]): Promise<void> {

    // Use requestIdleCallback for non-blocking pre-caching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        for (const verbWord of relatedVerbs) {
          try {
            // Try to fetch and cache each related verb
            // This would typically call an API to get verb data
            // For now, we'll just log the intention

          } catch (error) {
            console.error(`[VerbCache] Failed to pre-cache verb ${verbWord}:`, error);
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
      console.error(`[VerbCache] Failed to download audio ${audioUrl}:`, error);
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
   * Convert cached verb back to Verb format
   */
  private static hydrateCachedVerb(cached: CachedResource): Verb {
    const verb: Verb = {
      word: cached.data.word,
      reading: cached.data.reading,
      meaning: cached.data.meaning,
      type: cached.data.type,
      conjugations: cached.data.conjugations,
      version: cached.metadata.version
    };

    // Add optional fields
    if (cached.data.jlptLevel) verb.jlptLevel = cached.data.jlptLevel;
    if (cached.data.examples) verb.examples = cached.data.examples;
    if (cached.data.audioUrl) verb.audioUrl = cached.data.audioUrl;

    return verb;
  }

  /**
   * Clear all cached verbs
   */
  static async clearCache(): Promise<void> {
    try {
      await EnhancedStorageManager2.clearResourcesByType('verb');

    } catch (error) {
      console.error('[VerbCache] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    count: number;
    totalSize: number;
    oldestVerb: Date | null;
    newestVerb: Date | null;
    byType: { ichidan: number; godan: number; irregular: number };
  }> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('verb');

      if (resources.length === 0) {
        return {
          count: 0,
          totalSize: 0,
          oldestVerb: null,
          newestVerb: null,
          byType: { ichidan: 0, godan: 0, irregular: 0 }
        };
      }

      const totalSize = resources.reduce((sum, resource) => sum + resource.metadata.size, 0);
      const dates = resources.map(r => new Date(r.metadata.cachedAt));

      // Count by type
      const byType = resources.reduce((acc, resource) => {
        const type = resource.data.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, { ichidan: 0, godan: 0, irregular: 0 });

      return {
        count: resources.length,
        totalSize,
        oldestVerb: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestVerb: new Date(Math.max(...dates.map(d => d.getTime()))),
        byType
      };
    } catch (error) {
      console.error('[VerbCache] Failed to get cache stats:', error);
      throw error;
    }
  }
}