import { KanjiCache, Kanji } from './kanjiCache';
import { VerbCache, Verb } from './verbCache';
import { AdjectiveCache, Adjective } from './adjectiveCache';
import { AudioCache, AudioResource } from './audioCache';
import { UserType } from '@/utils/enhancedStorageManager2';

export type ResourceType = 'kanji' | 'verb' | 'adjective' | 'audio';

export interface CacheStats {
  kanji: {
    count: number;
    totalSize: number;
    oldest: Date | null;
    newest: Date | null;
    byType?: any;
  };
  verb: {
    count: number;
    totalSize: number;
    oldest: Date | null;
    newest: Date | null;
    byType: { ichidan: number; godan: number; irregular: number };
  };
  adjective: {
    count: number;
    totalSize: number;
    oldest: Date | null;
    newest: Date | null;
    byType: { 'i-adjective': number; 'na-adjective': number };
  };
  audio: {
    count: number;
    totalSize: number;
    oldest: Date | null;
    newest: Date | null;
    byType: { kana: number; word: number; sentence: number; kanji: number };
  };
}

export class ResourceCacheManager {
  /**
   * Cache a kanji
   */
  static async cacheKanji(kanji: Kanji, userType: UserType): Promise<void> {
    return KanjiCache.cacheKanji(kanji, userType);
  }

  /**
   * Get a cached kanji
   */
  static async getKanji(character: string, fetchFn?: () => Promise<Kanji>, userType?: UserType): Promise<Kanji | null> {
    return KanjiCache.getKanji(character, fetchFn, userType);
  }

  /**
   * Cache multiple kanji
   */
  static async cacheKanjiSet(kanjiList: Kanji[], userType: UserType): Promise<void> {
    return KanjiCache.cacheKanjiSet(kanjiList, userType);
  }

  /**
   * Cache a verb
   */
  static async cacheVerb(verb: Verb, userType: UserType): Promise<void> {
    return VerbCache.cacheVerb(verb, userType);
  }

  /**
   * Get a cached verb
   */
  static async getVerb(word: string, fetchFn?: () => Promise<Verb>, userType?: UserType): Promise<Verb | null> {
    return VerbCache.getVerb(word, fetchFn, userType);
  }

  /**
   * Cache multiple verbs
   */
  static async cacheVerbSet(verbList: Verb[], userType: UserType): Promise<void> {
    return VerbCache.cacheVerbSet(verbList, userType);
  }

  /**
   * Get verbs by type
   */
  static async getVerbsByType(type: 'ichidan' | 'godan' | 'irregular'): Promise<Verb[]> {
    return VerbCache.getVerbsByType(type);
  }

  /**
   * Get verbs by JLPT level
   */
  static async getVerbsByJLPTLevel(level: string): Promise<Verb[]> {
    return VerbCache.getVerbsByJLPTLevel(level);
  }

  /**
   * Cache an adjective
   */
  static async cacheAdjective(adjective: Adjective, userType: UserType): Promise<void> {
    return AdjectiveCache.cacheAdjective(adjective, userType);
  }

  /**
   * Get a cached adjective
   */
  static async getAdjective(word: string, fetchFn?: () => Promise<Adjective>, userType?: UserType): Promise<Adjective | null> {
    return AdjectiveCache.getAdjective(word, fetchFn, userType);
  }

  /**
   * Cache multiple adjectives
   */
  static async cacheAdjectiveSet(adjectiveList: Adjective[], userType: UserType): Promise<void> {
    return AdjectiveCache.cacheAdjectiveSet(adjectiveList, userType);
  }

  /**
   * Get adjectives by type
   */
  static async getAdjectivesByType(type: 'i-adjective' | 'na-adjective'): Promise<Adjective[]> {
    return AdjectiveCache.getAdjectivesByType(type);
  }

  /**
   * Get adjectives by JLPT level
   */
  static async getAdjectivesByJLPTLevel(level: string): Promise<Adjective[]> {
    return AdjectiveCache.getAdjectivesByJLPTLevel(level);
  }

  /**
   * Cache an audio resource
   */
  static async cacheAudio(audioResource: AudioResource, userType: UserType): Promise<void> {
    return AudioCache.cacheAudio(audioResource, userType);
  }

  /**
   * Get a cached audio resource
   */
  static async getAudio(id: string, fetchFn?: () => Promise<AudioResource>, userType?: UserType): Promise<AudioResource | null> {
    return AudioCache.getAudio(id, fetchFn, userType);
  }

  /**
   * Cache kana sound
   */
  static async cacheKanaSound(kana: string, userType: UserType): Promise<void> {
    return AudioCache.cacheKanaSound(kana, userType);
  }

  /**
   * Get cached kana sound
   */
  static async getKanaSound(kana: string): Promise<AudioResource | null> {
    return AudioCache.getKanaSound(kana);
  }

  /**
   * Pre-cache common kana sounds
   */
  static async preCacheCommonSounds(userType: UserType): Promise<void> {
    return AudioCache.preCacheCommonSounds(userType);
  }

  /**
   * Get audio by type
   */
  static async getAudioByType(type: 'kana' | 'word' | 'sentence' | 'kanji'): Promise<AudioResource[]> {
    return AudioCache.getAudioByType(type);
  }

  /**
   * Clear all caches
   */
  static async clearAllCaches(): Promise<void> {
    await Promise.all([
      KanjiCache.clearCache(),
      VerbCache.clearCache(),
      AdjectiveCache.clearCache(),
      AudioCache.clearCache()
    ]);
    console.log('[ResourceCacheManager] Cleared all caches');
  }

  /**
   * Cache a resource by type
   */
  static async cacheResource(type: ResourceType, resource: any, userType: UserType): Promise<void> {
    switch (type) {
      case 'kanji':
        return this.cacheKanji(resource, userType);
      case 'verb':
        return this.cacheVerb(resource, userType);
      case 'adjective':
        return this.cacheAdjective(resource, userType);
      case 'audio':
        return this.cacheAudio(resource, userType);
      default:
        throw new Error(`Unsupported resource type: ${type}`);
    }
  }

  /**
   * Get a resource by type
   */
  static async getResource(type: ResourceType, id: string, fetchFn?: () => Promise<any>, userType?: UserType): Promise<any | null> {
    switch (type) {
      case 'kanji':
        return this.getKanji(id, fetchFn, userType);
      case 'verb':
        return this.getVerb(id, fetchFn, userType);
      case 'adjective':
        return this.getAdjective(id, fetchFn, userType);
      case 'audio':
        return this.getAudio(id, fetchFn, userType);
      default:
        throw new Error(`Unsupported resource type: ${type}`);
    }
  }

  /**
   * Cache multiple resources by type
   */
  static async cacheResourceSet(type: ResourceType, resources: any[], userType: UserType): Promise<void> {
    switch (type) {
      case 'kanji':
        return this.cacheKanjiSet(resources, userType);
      case 'verb':
        return this.cacheVerbSet(resources, userType);
      case 'adjective':
        return this.cacheAdjectiveSet(resources, userType);
      case 'audio':
        return AudioCache.cacheAudioSet(resources, userType);
      default:
        throw new Error(`Unsupported resource type: ${type}`);
    }
  }

  /**
   * Pre-cache related resources
   */
  static async preCacheRelated(type: ResourceType, currentId: string, relatedIds: string[]): Promise<void> {
    switch (type) {
      case 'kanji':
        return KanjiCache.preCacheRelated(currentId, relatedIds);
      case 'verb':
        return VerbCache.preCacheRelated(currentId, relatedIds);
      case 'adjective':
        return AdjectiveCache.preCacheRelated(currentId, relatedIds);
      case 'audio':
        return AudioCache.preCacheRelated(currentId, relatedIds);
      default:
        throw new Error(`Unsupported resource type: ${type}`);
    }
  }

  /**
   * Clear cache by type
   */
  static async clearCache(type?: ResourceType): Promise<void> {
    if (type) {
      switch (type) {
        case 'kanji':
          return KanjiCache.clearCache();
        case 'verb':
          return VerbCache.clearCache();
        case 'adjective':
          return AdjectiveCache.clearCache();
        case 'audio':
          return AudioCache.clearCache();
        default:
          throw new Error(`Unsupported resource type: ${type}`);
      }
    } else {
      // Clear all caches
      return this.clearAllCaches();
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  static async getCacheStats(): Promise<CacheStats> {
    const [kanjiStats, verbStats, adjectiveStats, audioStats] = await Promise.all([
      KanjiCache.getCacheStats(),
      VerbCache.getCacheStats(),
      AdjectiveCache.getCacheStats(),
      AudioCache.getCacheStats()
    ]);

    return {
      kanji: {
        count: kanjiStats.count,
        totalSize: kanjiStats.totalSize,
        oldest: kanjiStats.oldestKanji,
        newest: kanjiStats.newestKanji
      },
      verb: {
        count: verbStats.count,
        totalSize: verbStats.totalSize,
        oldest: verbStats.oldestVerb,
        newest: verbStats.newestVerb,
        byType: verbStats.byType
      },
      adjective: {
        count: adjectiveStats.count,
        totalSize: adjectiveStats.totalSize,
        oldest: adjectiveStats.oldestAdjective,
        newest: adjectiveStats.newestAdjective,
        byType: adjectiveStats.byType
      },
      audio: {
        count: audioStats.count,
        totalSize: audioStats.totalSize,
        oldest: audioStats.oldestAudio,
        newest: audioStats.newestAudio,
        byType: audioStats.byType
      }
    };
  }

  /**
   * Get total cache statistics
   */
  static async getTotalCacheStats(): Promise<{
    totalItems: number;
    totalSize: number;
    breakdown: { [key in ResourceType]: number };
  }> {
    const stats = await this.getCacheStats();

    const totalItems = stats.kanji.count + stats.verb.count + stats.adjective.count + stats.audio.count;
    const totalSize = stats.kanji.totalSize + stats.verb.totalSize + stats.adjective.totalSize + stats.audio.totalSize;

    return {
      totalItems,
      totalSize,
      breakdown: {
        kanji: stats.kanji.count,
        verb: stats.verb.count,
        adjective: stats.adjective.count,
        audio: stats.audio.count
      }
    };
  }
}
