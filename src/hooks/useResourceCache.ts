import { useCallback, useEffect, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { ResourceCacheManager, ResourceType } from '@/lib/cache/resourceCacheManager';
import { Kanji } from '@/lib/cache/kanjiCache';
import { Verb } from '@/lib/cache/verbCache';
import { Adjective } from '@/lib/cache/adjectiveCache';
import { AudioResource } from '@/lib/cache/audioCache';
import { UserType } from '@/utils/enhancedStorageManager2';

interface UseResourceCacheOptions {
  autoPreCache?: boolean;
  preCacheCommonSounds?: boolean;
}

export function useResourceCache(options: UseResourceCacheOptions = {}) {
  const { checkAndTrack } = useAccess();
  const { feature: resourceCaching } = useFeature('resource_caching');
  const { userType } = useSubscription2();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize cache system
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Pre-cache common sounds if enabled
        if (options.preCacheCommonSounds && resourceCaching?.status === 'active') {
          await ResourceCacheManager.preCacheCommonSounds(userType as UserType);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[useResourceCache] Failed to initialize cache:', error);
      }
    };

    if (resourceCaching?.status === 'active') {
      initializeCache();
    }
  }, [resourceCaching?.status, userType, options.preCacheCommonSounds]);

  // Cache kanji
  const cacheKanji = useCallback(async (kanji: Kanji): Promise<boolean> => {
    try {
      if (resourceCaching?.status !== 'active') {
        console.log('[useResourceCache] Resource caching not available');
        return false;
      }

      await ResourceCacheManager.cacheKanji(kanji, userType as UserType);
      return true;
    } catch (error) {
      console.error('[useResourceCache] Failed to cache kanji:', error);
      return false;
    }
  }, [resourceCaching?.status, userType]);

  // Get kanji
  const getKanji = useCallback(async (
    character: string,
    fetchFn?: () => Promise<Kanji>
  ): Promise<Kanji | null> => {
    try {
      return await ResourceCacheManager.getKanji(character, fetchFn, userType as UserType);
    } catch (error) {
      console.error('[useResourceCache] Failed to get kanji:', error);
      return null;
    }
  }, [userType]);

  // Cache verb
  const cacheVerb = useCallback(async (verb: Verb): Promise<boolean> => {
    try {
      if (resourceCaching?.status !== 'active') {
        console.log('[useResourceCache] Resource caching not available');
        return false;
      }

      await ResourceCacheManager.cacheVerb(verb, userType as UserType);
      return true;
    } catch (error) {
      console.error('[useResourceCache] Failed to cache verb:', error);
      return false;
    }
  }, [resourceCaching?.status, userType]);

  // Get verb
  const getVerb = useCallback(async (
    word: string,
    fetchFn?: () => Promise<Verb>
  ): Promise<Verb | null> => {
    try {
      return await ResourceCacheManager.getVerb(word, fetchFn, userType as UserType);
    } catch (error) {
      console.error('[useResourceCache] Failed to get verb:', error);
      return null;
    }
  }, [userType]);

  // Cache adjective
  const cacheAdjective = useCallback(async (adjective: Adjective): Promise<boolean> => {
    try {
      if (resourceCaching?.status !== 'active') {
        console.log('[useResourceCache] Resource caching not available');
        return false;
      }

      await ResourceCacheManager.cacheAdjective(adjective, userType as UserType);
      return true;
    } catch (error) {
      console.error('[useResourceCache] Failed to cache adjective:', error);
      return false;
    }
  }, [resourceCaching?.status, userType]);

  // Get adjective
  const getAdjective = useCallback(async (
    word: string,
    fetchFn?: () => Promise<Adjective>
  ): Promise<Adjective | null> => {
    try {
      return await ResourceCacheManager.getAdjective(word, fetchFn, userType as UserType);
    } catch (error) {
      console.error('[useResourceCache] Failed to get adjective:', error);
      return null;
    }
  }, [userType]);

  // Cache audio
  const cacheAudio = useCallback(async (audioResource: AudioResource): Promise<boolean> => {
    try {
      if (resourceCaching?.status !== 'active') {
        console.log('[useResourceCache] Resource caching not available');
        return false;
      }

      await ResourceCacheManager.cacheAudio(audioResource, userType as UserType);
      return true;
    } catch (error) {
      console.error('[useResourceCache] Failed to cache audio:', error);
      return false;
    }
  }, [resourceCaching?.status, userType]);

  // Get audio
  const getAudio = useCallback(async (
    id: string,
    fetchFn?: () => Promise<AudioResource>
  ): Promise<AudioResource | null> => {
    try {
      return await ResourceCacheManager.getAudio(id, fetchFn, userType as UserType);
    } catch (error) {
      console.error('[useResourceCache] Failed to get audio:', error);
      return null;
    }
  }, [userType]);

  // Cache kana sound
  const cacheKanaSound = useCallback(async (kana: string): Promise<boolean> => {
    try {
      if (resourceCaching?.status !== 'active') {
        console.log('[useResourceCache] Resource caching not available');
        return false;
      }

      await ResourceCacheManager.cacheKanaSound(kana, userType as UserType);
      return true;
    } catch (error) {
      console.error('[useResourceCache] Failed to cache kana sound:', error);
      return false;
    }
  }, [resourceCaching?.status, userType]);

  // Get kana sound
  const getKanaSound = useCallback(async (kana: string): Promise<AudioResource | null> => {
    try {
      return await ResourceCacheManager.getKanaSound(kana);
    } catch (error) {
      console.error('[useResourceCache] Failed to get kana sound:', error);
      return null;
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(async () => {
    try {
      return await ResourceCacheManager.getCacheStats();
    } catch (error) {
      console.error('[useResourceCache] Failed to get cache stats:', error);
      return null;
    }
  }, []);

  // Clear cache by type
  const clearCache = useCallback(async (type?: ResourceType): Promise<void> => {
    try {
      await ResourceCacheManager.clearCache(type);
    } catch (error) {
      console.error('[useResourceCache] Failed to clear cache:', error);
    }
  }, []);

  // Pre-cache related resources
  const preCacheRelated = useCallback(async (
    currentResource: { type: ResourceType; id: string },
    relatedResources: { type: ResourceType; id: string }[]
  ): Promise<void> => {
    try {
      if (resourceCaching?.status !== 'active') {
        return;
      }

      // Group related resources by type for efficient caching
      const resourcesByType = relatedResources.reduce((acc, resource) => {
        if (resource.type === currentResource.type) {
          if (!acc[resource.type]) {
            acc[resource.type] = [];
          }
          acc[resource.type].push(resource.id);
        }
        return acc;
      }, {} as Record<ResourceType, string[]>);

      // Call preCacheRelated for each type
      for (const [type, ids] of Object.entries(resourcesByType)) {
        await ResourceCacheManager.preCacheRelated(
          type as ResourceType,
          currentResource.id,
          ids
        );
      }
    } catch (error) {
      console.error('[useResourceCache] Failed to pre-cache related resources:', error);
    }
  }, [resourceCaching?.status]);

  return {
    // State
    isInitialized,
    isAvailable: resourceCaching?.status === 'active',
    userType,

    // Kanji methods
    cacheKanji,
    getKanji,

    // Verb methods
    cacheVerb,
    getVerb,

    // Adjective methods
    cacheAdjective,
    getAdjective,

    // Audio methods
    cacheAudio,
    getAudio,
    cacheKanaSound,
    getKanaSound,

    // Utility methods
    getCacheStats,
    clearCache,
    preCacheRelated
  };
}
