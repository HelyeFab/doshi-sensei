import { CachedResource } from '@/types/cache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { UserType } from '@/utils/enhancedStorageManager2';

export interface AudioResource {
  id: string;
  type: 'kana' | 'word' | 'sentence' | 'kanji';
  audioUrl: string;
  text?: string;
  reading?: string;
  meaning?: string;
  version?: string;
}

export class AudioCache {
  private static readonly CACHE_VERSION = '1.0';
  private static readonly STALE_TIME = 60 * 24 * 60 * 60 * 1000; // 60 days (audio files rarely change)

  /**
   * Cache an audio resource
   */
  static async cacheAudio(audioResource: AudioResource, userType: UserType): Promise<void> {
    try {

      // Download and cache audio
      const audioBlob = await this.downloadAudio(audioResource.audioUrl);

      if (!audioBlob) {
        // Don't throw error for missing audio files, just skip caching

        return;
      }

      // Calculate total size
      const size = EnhancedStorageManager2.calculateResourceSize(
        audioResource,
        undefined, // No images for audio
        new Map([['main', audioBlob]])
      );

      // Create cached audio resource
      const cachedAudio: CachedResource = {
        id: audioResource.id,
        type: 'audio',
        data: {
          id: audioResource.id,
          type: audioResource.type,
          audioUrl: audioResource.audioUrl,
          text: audioResource.text,
          reading: audioResource.reading,
          meaning: audioResource.meaning
        },
        metadata: {
          size,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: audioResource.version || this.CACHE_VERSION,
          checksum: await EnhancedStorageManager2.generateChecksum(audioResource),
          expiresAt: Date.now() + this.STALE_TIME
        },
        assets: {
          images: new Map(), // No images for audio
          audio: new Map([['main', audioBlob]])
        }
      };

      // Store in cache
      await EnhancedStorageManager2.cacheResource(cachedAudio, userType);

    } catch (error) {
      console.error(`[AudioCache] Failed to cache audio ${audioResource.id}:`, error);
      throw error;
    }
  }

  /**
   * Cache multiple audio resources at once (batch operation)
   */
  static async cacheAudioSet(audioList: AudioResource[], userType: UserType): Promise<void> {

    // Process in batches to avoid overwhelming the storage
    const BATCH_SIZE = 10;

    for (let i = 0; i < audioList.length; i += BATCH_SIZE) {
      const batch = audioList.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(audio =>
          this.cacheAudio(audio, userType).catch(error => {
            console.error(`[AudioCache] Failed to cache audio ${audio.id}:`, error);
          })
        )
      );

      // Small delay between batches
      if (i + BATCH_SIZE < audioList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

  }

  /**
   * Get a cached audio resource or fetch from network
   */
  static async getAudio(
    id: string, 
    fetchFn?: () => Promise<AudioResource>,
    userType?: UserType
  ): Promise<AudioResource | null> {
    try {
      // Try cache first
      const cached = await EnhancedStorageManager2.getCachedResource('audio', id);

      if (cached && !this.isStale(cached)) {

        return this.hydrateCachedAudio(cached);
      }

      // Fall back to network if fetch function provided
      if (fetchFn) {

        const audioResource = await fetchFn();

        // Cache in background only if userType is provided
        if (userType) {
          this.cacheAudio(audioResource, userType).catch(console.error);
        }

        return audioResource;
      }

      // Return stale cache if no fetch function
      if (cached) {

        return this.hydrateCachedAudio(cached);
      }

      return null;
    } catch (error) {
      console.error(`[AudioCache] Failed to get audio ${id}:`, error);
      return null;
    }
  }

  /**
   * Pre-cache related audio resources
   */
  static async preCacheRelated(currentAudio: string, relatedAudio: string[]): Promise<void> {

    // Use requestIdleCallback for non-blocking pre-caching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        for (const audioId of relatedAudio) {
          try {
            // Try to fetch and cache each related audio
            // This would typically call an API to get audio data
            // For now, we'll just log the intention

          } catch (error) {
            console.error(`[AudioCache] Failed to pre-cache audio ${audioId}:`, error);
          }
        }
      });
    }
  }

  /**
   * Cache kana sound
   */
  static async cacheKanaSound(kana: string, userType: UserType): Promise<void> {
    const audioUrl = `/api/audio/kana/${kana}`;
    const audioResource: AudioResource = {
      id: `kana-${kana}`,
      type: 'kana',
      audioUrl,
      text: kana
    };

    await this.cacheAudio(audioResource, userType);
  }

  /**
   * Get cached kana sound
   */
  static async getKanaSound(kana: string): Promise<AudioResource | null> {
    return this.getAudio(`kana-${kana}`);
  }

  /**
   * Pre-cache common kana sounds
   */
  static async preCacheCommonSounds(userType: UserType): Promise<void> {
    const commonKana = [
      'あ', 'い', 'う', 'え', 'お',
      'か', 'き', 'く', 'け', 'こ',
      'さ', 'し', 'す', 'せ', 'そ',
      'た', 'ち', 'つ', 'て', 'と',
      'な', 'に', 'ぬ', 'ね', 'の',
      'は', 'ひ', 'ふ', 'へ', 'ほ',
      'ま', 'み', 'む', 'め', 'も',
      'や', 'ゆ', 'よ',
      'ら', 'り', 'る', 'れ', 'ろ',
      'わ', 'を', 'ん'
    ];

    // Use requestIdleCallback for non-blocking pre-caching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async (deadline) => {
        for (const kana of commonKana) {
          if (deadline.timeRemaining() > 0) {
            try {
              await this.cacheKanaSound(kana, userType);
              // Small delay to avoid overwhelming the browser
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
              console.error(`[AudioCache] Failed to pre-cache kana ${kana}:`, error);
            }
          } else {
            // Schedule remaining kana for next idle period
            this.preCacheRemainingKana(commonKana.slice(commonKana.indexOf(kana)), userType);
            break;
          }
        }
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      for (const kana of commonKana) {
        try {
          await this.cacheKanaSound(kana, userType);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[AudioCache] Failed to pre-cache kana ${kana}:`, error);
        }
      }
    }
  }

  /**
   * Continue pre-caching remaining kana sounds
   */
  private static async preCacheRemainingKana(remainingKana: string[], userType: UserType): Promise<void> {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async (deadline) => {
        for (const kana of remainingKana) {
          if (deadline.timeRemaining() > 0) {
            try {
              await this.cacheKanaSound(kana, userType);
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
              console.error(`[AudioCache] Failed to pre-cache kana ${kana}:`, error);
            }
          } else {
            // Schedule remaining kana for next idle period
            this.preCacheRemainingKana(remainingKana.slice(remainingKana.indexOf(kana)), userType);
            break;
          }
        }
      });
    }
  }

  /**
   * Get audio by type (kana, word, sentence, kanji)
   */
  static async getAudioByType(type: 'kana' | 'word' | 'sentence' | 'kanji'): Promise<AudioResource[]> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('audio');

      return resources
        .filter(resource => !this.isStale(resource))
        .map(resource => this.hydrateCachedAudio(resource))
        .filter(audio => audio.type === type);
    } catch (error) {
      console.error(`[AudioCache] Failed to get audio by type ${type}:`, error);
      return [];
    }
  }

  /**
   * Download and cache audio
   */
  private static async downloadAudio(audioUrl: string): Promise<Blob | null> {
    try {
      const response = await fetch(audioUrl);
      
      if (!response.ok) {
        // Don't log 404 errors as they're expected when audio hasn't been generated yet
        if (response.status !== 404) {
          console.error(`[AudioCache] Failed to download audio ${audioUrl}: ${response.status} ${response.statusText}`);
        }
        return null;
      }
      
      return await response.blob();
    } catch (error) {
      console.error(`[AudioCache] Failed to download audio ${audioUrl}:`, error);
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
   * Convert cached audio back to AudioResource format
   */
  private static hydrateCachedAudio(cached: CachedResource): AudioResource {
    const audioResource: AudioResource = {
      id: cached.data.id,
      type: cached.data.type,
      audioUrl: cached.data.audioUrl,
      version: cached.metadata.version
    };

    // Add optional fields
    if (cached.data.text) audioResource.text = cached.data.text;
    if (cached.data.reading) audioResource.reading = cached.data.reading;
    if (cached.data.meaning) audioResource.meaning = cached.data.meaning;

    return audioResource;
  }

  /**
   * Clear all cached audio
   */
  static async clearCache(): Promise<void> {
    try {
      await EnhancedStorageManager2.clearResourcesByType('audio');

    } catch (error) {
      console.error('[AudioCache] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    count: number;
    totalSize: number;
    oldestAudio: Date | null;
    newestAudio: Date | null;
    byType: { kana: number; word: number; sentence: number; kanji: number };
  }> {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType('audio');

      if (resources.length === 0) {
        return {
          count: 0,
          totalSize: 0,
          oldestAudio: null,
          newestAudio: null,
          byType: { kana: 0, word: 0, sentence: 0, kanji: 0 }
        };
      }

      const totalSize = resources.reduce((sum, resource) => sum + resource.metadata.size, 0);
      const dates = resources.map(r => new Date(r.metadata.cachedAt));

      // Count by type
      const byType = resources.reduce((acc, resource) => {
        const type = resource.data.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, { kana: 0, word: 0, sentence: 0, kanji: 0 });

      return {
        count: resources.length,
        totalSize,
        oldestAudio: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestAudio: new Date(Math.max(...dates.map(d => d.getTime()))),
        byType
      };
    } catch (error) {
      console.error('[AudioCache] Failed to get cache stats:', error);
      throw error;
    }
  }
}
