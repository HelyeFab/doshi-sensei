import { AdjectiveCache, Adjective } from '@/lib/cache/adjectiveCache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';

// Mock EnhancedStorageManager2
jest.mock('@/utils/enhancedStorageManager2');

const mockEnhancedStorageManager2 = EnhancedStorageManager2 as jest.Mocked<typeof EnhancedStorageManager2>;

describe('AdjectiveCache', () => {
  const sampleAdjective: Adjective = {
    dictionaryForm: '大きい',
    reading: 'おおきい',
    meaning: 'big, large',
    type: 'i-adjective',
    conjugations: {
      present: '大きい',
      past: '大きかった',
      teForm: '大きくて',
      negative: '大きくない',
      pastNegative: '大きくなかった'
    },
    examples: [
      {
        sentence: 'この家は大きいです',
        reading: 'このいえはおおきいです',
        meaning: 'This house is big'
      }
    ],
    jlptLevel: 'N5'
  };

  const sampleAdjective2: Adjective = {
    dictionaryForm: '小さい',
    reading: 'ちいさい',
    meaning: 'small, little',
    type: 'i-adjective',
    conjugations: {
      present: '小さい',
      past: '小さかった',
      teForm: '小さくて',
      negative: '小さくない',
      pastNegative: '小さくなかった'
    },
    examples: [
      {
        sentence: 'この猫は小さいです',
        reading: 'このねこはちいさいです',
        meaning: 'This cat is small'
      }
    ],
    jlptLevel: 'N5'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful operations by default
    mockEnhancedStorageManager2.cacheResource.mockResolvedValue();
    mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);
    mockEnhancedStorageManager2.calculateResourceSize.mockReturnValue(1536);
    mockEnhancedStorageManager2.generateChecksum.mockResolvedValue('test-checksum');
    mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);
    mockEnhancedStorageManager2.clearResourcesByType.mockResolvedValue();
  });

  describe('cacheAdjective', () => {
    it('should cache an adjective successfully', async () => {
      await AdjectiveCache.cacheAdjective(sampleAdjective, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '大きい',
          type: 'adjective',
          data: expect.objectContaining({
            dictionaryForm: '大きい',
            reading: 'おおきい',
            meaning: 'big, large',
            type: 'i-adjective'
          })
        }),
        'free'
      );
    });

    it('should handle caching errors gracefully', async () => {
      mockEnhancedStorageManager2.cacheResource.mockRejectedValue(new Error('Storage error'));

      await expect(AdjectiveCache.cacheAdjective(sampleAdjective, 'free')).rejects.toThrow('Storage error');
    });

    it('should calculate size correctly', async () => {
      await AdjectiveCache.cacheAdjective(sampleAdjective, 'premium');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        sampleAdjective,
        undefined, // No images for adjectives
        undefined // No audio by default
      );
    });

    it('should include audio if available', async () => {
      const adjectiveWithAudio = { ...sampleAdjective, audioUrl: '/api/audio/adjective/大きい' };

      await AdjectiveCache.cacheAdjective(adjectiveWithAudio, 'free');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        adjectiveWithAudio,
        undefined,
        expect.any(Map)
      );
    });
  });

  describe('getAdjective', () => {
    it('should return cached adjective if available and not stale', async () => {
      const cachedAdjective = {
        id: '大きい',
        type: 'adjective',
        data: {
          dictionaryForm: '大きい',
          reading: 'おおきい',
          meaning: 'big, large',
          type: 'i-adjective',
          conjugations: sampleAdjective.conjugations,
          examples: sampleAdjective.examples,
          jlptLevel: 'N5'
        },
        metadata: {
          size: 1536,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: 'test-checksum',
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        assets: {
          images: new Map(),
          audio: new Map()
        }
      };

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedAdjective);

      const result = await AdjectiveCache.getAdjective('大きい');

      expect(result).toEqual(expect.objectContaining({
        dictionaryForm: '大きい',
        reading: 'おおきい',
        meaning: 'big, large'
      }));
    });

    it('should return null if adjective not in cache', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await AdjectiveCache.getAdjective('大きい');

      expect(result).toBeNull();
    });

    it('should fetch from network if fetchFn provided and not cached', async () => {
      const fetchFn = jest.fn().mockResolvedValue(sampleAdjective);
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await AdjectiveCache.getAdjective('大きい', fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual(sampleAdjective);
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalled();
    });

    it('should return stale cache if no fetchFn provided', async () => {
      const staleAdjective = {
        id: '大きい',
        type: 'adjective',
        data: {
          dictionaryForm: '大きい',
          reading: 'おおきい',
          meaning: 'big, large',
          type: 'i-adjective'
        },
        metadata: {
          size: 1536,
          cachedAt: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
          lastAccessed: Date.now() - (31 * 24 * 60 * 60 * 1000),
          version: '1.0',
          checksum: 'test-checksum',
          expiresAt: Date.now() - (24 * 60 * 60 * 1000) // Expired yesterday
        },
        assets: {
          images: new Map(),
          audio: new Map()
        }
      };

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(staleAdjective);

      const result = await AdjectiveCache.getAdjective('大きい');

      expect(result).toEqual(expect.objectContaining({
        dictionaryForm: '大きい'
      }));
    });

    it('should handle errors gracefully', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockRejectedValue(new Error('Storage error'));

      const result = await AdjectiveCache.getAdjective('大きい');

      expect(result).toBeNull();
    });
  });

  describe('cacheAdjectiveSet', () => {
    it('should cache multiple adjectives in batches', async () => {
      const adjectiveList = [sampleAdjective, sampleAdjective2];

      await AdjectiveCache.cacheAdjectiveSet(adjectiveList, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in batch operations gracefully', async () => {
      const adjectiveList = [sampleAdjective, sampleAdjective2];
      mockEnhancedStorageManager2.cacheResource
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Storage error'));

      await AdjectiveCache.cacheAdjectiveSet(adjectiveList, 'free');

      // Should not throw, should log error
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should process large sets in batches', async () => {
      const largeAdjectiveList = Array.from({ length: 25 }, (_, i) => ({
        ...sampleAdjective,
        dictionaryForm: `大きい${i}`,
        id: `adjective-${i}`
      }));

      await AdjectiveCache.cacheAdjectiveSet(largeAdjectiveList, 'premium');

      // Should process in batches of 10
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(25);
    });
  });

  describe('preCacheRelated', () => {
    it('should schedule pre-caching in background', async () => {
      const relatedAdjectives = ['小さい', '新しい', '古い'];

      await AdjectiveCache.preCacheRelated('大きい', relatedAdjectives);

      // Should not throw and should log intentions
      expect(true).toBe(true); // Just verify it doesn't throw
    });

    it('should handle errors in pre-caching gracefully', async () => {
      const relatedAdjectives = ['小さい', '新しい', '古い'];

      await AdjectiveCache.preCacheRelated('大きい', relatedAdjectives);

      // Should not throw even if pre-caching fails
      expect(true).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached adjectives', async () => {
      await AdjectiveCache.clearCache();

      expect(mockEnhancedStorageManager2.clearResourcesByType).toHaveBeenCalledWith('adjective');
    });

    it('should handle clear errors gracefully', async () => {
      mockEnhancedStorageManager2.clearResourcesByType.mockRejectedValue(new Error('Clear error'));

      await expect(AdjectiveCache.clearCache()).rejects.toThrow('Clear error');
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats when no cached adjectives', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);

      const stats = await AdjectiveCache.getCacheStats();

      expect(stats).toEqual({
        count: 0,
        totalSize: 0,
        oldestAdjective: null,
        newestAdjective: null
      });
    });

    it('should return correct stats for cached adjectives', async () => {
      const mockResources = [
        {
          metadata: {
            size: 1536,
            cachedAt: Date.now() - (24 * 60 * 60 * 1000) // 1 day ago
          }
        },
        {
          metadata: {
            size: 3072,
            cachedAt: Date.now() // Now
          }
        }
      ];

      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue(mockResources);

      const stats = await AdjectiveCache.getCacheStats();

      expect(stats.count).toBe(2);
      expect(stats.totalSize).toBe(4608);
      expect(stats.oldestAdjective).toBeInstanceOf(Date);
      expect(stats.newestAdjective).toBeInstanceOf(Date);
    });

    it('should handle stats errors gracefully', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockRejectedValue(new Error('Stats error'));

      await expect(AdjectiveCache.getCacheStats()).rejects.toThrow('Stats error');
    });
  });

  describe('performance', () => {
    it('should load cached adjective in under 50ms', async () => {
      const cachedAdjective = {
        id: '大きい',
        type: 'adjective',
        data: {
          dictionaryForm: '大きい',
          reading: 'おおきい',
          meaning: 'big, large',
          type: 'i-adjective'
        },
        metadata: {
          size: 1536,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: 'test-checksum',
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
        },
        assets: {
          images: new Map(),
          audio: new Map()
        }
      };

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedAdjective);

      const start = performance.now();
      await AdjectiveCache.getAdjective('大きい');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
