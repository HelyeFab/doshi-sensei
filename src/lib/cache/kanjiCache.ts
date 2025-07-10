import { CachedResource } from '@/types/cache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { UserType } from '@/utils/enhancedStorageManager2';
import { evictionEngine } from '@/lib/cache/eviction/lruEvictionEngine';

export interface Kanji {
  character: string;
  readings: {
    onyomi: string[];
    kunyomi: string[];
  };
  meanings: string[];
  strokeCount: number;
  jlptLevel?: string;
  grade?: string;
  frequency?: number;
  strokeOrder?: string[];
  examples?: {
    word: string;
    reading: string;
    meaning: string;
  }[];
  audioUrl?: string;
  version?: string;
}

export class KanjiCache {
  private static readonly CACHE_VERSION = '1.0';
  private static readonly STALE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days (kanji data changes less frequently)

  /**
   * Cache a kanji with all its data
   */
  static async cacheKanji(kanji: Kanji, userType: UserType): Promise<void> {
    try {
      console.log(`[KanjiCache] Caching kanji: ${kanji.character}`);

      // Download and cache audio if available
      const audioBlob = kanji.audioUrl
        ? await this.downloadAudio(kanji.audioUrl)
        : null;

      // Calculate total size
      const size = EnhancedStorageManager2.calculateResourceSize(
        kanji,
        undefined, // No images for kanji
        audioBlob ? new Map([['main', audioBlob]]) : undefined
      );
      
      // Check if eviction is needed (kanji has unlimited storage for free/premium)
      const needsEviction = await evictionEngine.requiresEviction('kanji', userType, size);
      if (needsEviction) {
        console.log(`[KanjiCache] Eviction needed for user type: ${userType}`);
        const evictionResult = await evictionEngine.enforceLimit('kanji', userType);
        console.log(`[KanjiCache] Evicted ${evictionResult.evictedCount} kanji, freed ${evictionResult.freedBytes} bytes`);
      }

      // Create cached kanji
      const cachedKanji: CachedResource = {
        id: kanji.character,
        type: 'kanji',
        data: {
          character: kanji.character,
          readings: kanji.readings,
          meanings: kanji.meanings,
          strokeCount: kanji.strokeCount,
          jlptLevel: kanji.jlptLevel,
          grade: kanji.grade,
          frequency: kanji.frequency,
          strokeOrder: kanji.strokeOrder,
          examples: kanji.examples,
          audioUrl: kanji.audioUrl
        },
        metadata: {
          size,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: kanji.version || this.CACHE_VERSION,
          checksum: await EnhancedStorageManager2.generateChecksum(kanji),
          expiresAt: Date.now() + this.STALE_TIME
        },
        assets: {
          images: new Map(), // Kanji don't have images
          audio: audioBlob ? new Map([['main', audioBlob]]) : new Map()
        }
      };

      // Store in cache
      await EnhancedStorageManager2.cacheResource(cachedKanji, userType);

      console.log(`[KanjiCache] Successfully cached kanji: ${kanji.character}`);
    } catch (error) {
      console.error(`[KanjiCache] Failed to cache kanji ${kanji.character}:`, error);
      throw error;
    }
  }

  /**
   * Get a cached kanji or fetch from network
   */
  static async getKanji(
    character: string, 
    fetchFn?: () => Promise<Kanji>,
    userType?: UserType
  ): Promise<Kanji | null> {
    try {
      // Try cache first
      const cached = await EnhancedStorageManager2.getCachedResource('kanji', character);

      if (cached && !this.isStale(cached)) {
        console.log(`[KanjiCache] Serving kanji from cache: ${character}`);
        return this.hydrateCachedKanji(cached);
      }

      // Fall back to network if fetch function provided
      if (fetchFn) {
        console.log(`[KanjiCache] Fetching kanji from network: ${character}`);
        const kanji = await fetchFn();

        // Cache in background only if userType is provided
        if (userType) {
          this.cacheKanji(kanji, userType).catch(console.error);
        }

        return kanji;
      }

      // Return stale cache if no fetch function
      if (cached) {
        console.log(`[KanjiCache] Serving stale kanji from cache: ${character}`);
        return this.hydrateCachedKanji(cached);
      }

      return null;
    } catch (error) {
      console.error(`[KanjiCache] Failed to get kanji ${character}:`, error);
      return null;
    }
  }

  /**
   * Cache multiple kanji at once (batch operation)
   */
  static async cacheKanjiSet(kanjiList: Kanji[], userType: UserType): Promise<void> {
    console.log(`[KanjiCache] Caching ${kanjiList.length} kanji`);

    // Process in batches to avoid overwhelming the storage
    const BATCH_SIZE = 10;

    for (let i = 0; i < kanjiList.length; i += BATCH_SIZE) {
      const batch = kanjiList.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(kanji =>
          this.cacheKanji(kanji, userType).catch(error => {
            console.error(`[KanjiCache] Failed to cache kanji ${kanji.character}:`, error);
          })
        )
      );

      // Small delay between batches
      if (i + BATCH_SIZE < kanjiList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[KanjiCache] Successfully cached ${kanjiList.length} kanji`);
  }

  /**
   * Pre-cache related kanji based on JLPT level or frequency
   */
  static async preCacheRelated(currentKanji: string, relatedKanji: string[]): Promise<void> {
    console.log(`[KanjiCache] Pre-caching ${relatedKanji.length} related kanji`);

    // Use requestIdleCallback for non-blocking pre-caching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        for (const kanjiChar of relatedKanji) {
          try {
            // Try to fetch and cache each related kanji
            // This would typically call an API to get kanji data
            // For now, we'll just log the intention
            console.log(`[KanjiCache] Would pre-cache kanji: ${kanjiChar}`);
          } catch (error) {
            console.error(`[KanjiCache] Failed to pre-cache kanji ${kanjiChar}:`, error);
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
      console.error(`[KanjiCache] Failed to download audio ${audioUrl}:`, error);
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
   * Convert cached kanji back to Kanji format
   */
  private static hydrateCachedKanji(cached: CachedResource): Kanji {
    const kanji: Kanji = {
      character: cached.data.character,
      readings: cached.data.readings,
      meanings: cached.data.meanings,
      strokeCount: cached.data.strokeCount,
      version: cached.metadata.version
    };

    // Add optional fields
    if (cached.data.jlptLevel) kanji.jlptLevel = cached.data.jlptLevel;
    if (cached.data.grade) kanji.grade = cached.data.grade;
    if (cached.data.frequency) kanji.frequency = cached.data.frequency;
    if (cached.data.strokeOrder) kanji.strokeOrder = cached.data.strokeOrder;
    if (cached.data.examples) kanji.examples = cached.data.examples;
    if (cached.data.audioUrl) kanji.audioUrl = cached.data.audioUrl;

    return kanji;
  }

  /**
   * Clear all cached kanji
   */
  static async clearCache(): Promise<void> {
    try {
      await EnhancedStorageManager2.clearResourcesByType('kanji');
      console.log('[KanjiCache] Cleared all cached kanji');
    } catch (error) {
      console.error('[KanjiCache] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    count: number;
    totalSize: number;
    oldestKanji: Date | null;
    newestKanji: Date | null;
  }> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('kanji');

      if (resources.length === 0) {
        return {
          count: 0,
          totalSize: 0,
          oldestKanji: null,
          newestKanji: null
        };
      }

      const totalSize = resources.reduce((sum, resource) => sum + resource.metadata.size, 0);
      const dates = resources.map(r => new Date(r.metadata.cachedAt));

      return {
        count: resources.length,
        totalSize,
        oldestKanji: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestKanji: new Date(Math.max(...dates.map(d => d.getTime())))
      };
    } catch (error) {
      console.error('[KanjiCache] Failed to get cache stats:', error);
      throw error;
    }
  }
}
