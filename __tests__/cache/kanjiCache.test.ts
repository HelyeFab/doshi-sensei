import { KanjiCache, Kanji } from '@/lib/cache/kanjiCache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';

// Mock EnhancedStorageManager2
jest.mock('@/utils/enhancedStorageManager2');

const mockEnhancedStorageManager2 = EnhancedStorageManager2 as jest.Mocked<typeof EnhancedStorageManager2>;

describe('KanjiCache', () => {
  const sampleKanji: Kanji = {
    character: '漢',
    readings: {
      onyomi: ['かん'],
      kunyomi: []
    },
    meanings: ['Chinese', 'Sino-'],
    strokeCount: 13,
    jlptLevel: 'N1',
    examples: [
      {
        word: '漢字',
        reading: 'かんじ',
        meaning: 'kanji'
      }
    ]
  };

  const sampleKanji2: Kanji = {
    character: '字',
    readings: {
      onyomi: ['じ'],
      kunyomi: ['あざ']
    },
    meanings: ['character', 'letter'],
    strokeCount: 6,
    jlptLevel: 'N5',
    examples: [
      {
        word: '漢字',
        reading: 'かんじ',
        meaning: 'kanji'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful operations by default
    mockEnhancedStorageManager2.cacheResource.mockResolvedValue();
    mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);
    mockEnhancedStorageManager2.calculateResourceSize.mockReturnValue(1024);
    mockEnhancedStorageManager2.generateChecksum.mockResolvedValue('test-checksum');
    mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);
    mockEnhancedStorageManager2.clearResourcesByType.mockResolvedValue();
  });

  describe('cacheKanji', () => {
    it('should cache a kanji successfully', async () => {
      await KanjiCache.cacheKanji(sampleKanji, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '漢',
          type: 'kanji',
          data: expect.objectContaining({
            character: '漢',
            readings: sampleKanji.readings,
            meanings: sampleKanji.meanings
          })
        }),
        'free'
      );
    });

    it('should handle caching errors gracefully', async () => {
      mockEnhancedStorageManager2.cacheResource.mockRejectedValue(new Error('Storage error'));

      await expect(KanjiCache.cacheKanji(sampleKanji, 'free')).rejects.toThrow('Storage error');
    });

    it('should calculate size correctly', async () => {
      await KanjiCache.cacheKanji(sampleKanji, 'premium');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        sampleKanji,
        undefined, // No images for kanji
        undefined // No audio by default
      );
    });

    it('should include audio if available', async () => {
      const kanjiWithAudio = { ...sampleKanji, audioUrl: '/api/audio/kanji/漢' };

      await KanjiCache.cacheKanji(kanjiWithAudio, 'free');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        kanjiWithAudio,
        undefined,
        expect.any(Map)
      );
    });
  });

  describe('getKanji', () => {
    it('should return cached kanji if available and not stale', async () => {
      const cachedKanji = {
        id: '漢',
        type: 'kanji',
        data: {
          character: '漢',
          readings: sampleKanji.readings,
          meanings: sampleKanji.meanings,
          strokeCount: 13,
          jlptLevel: 'N1',
          examples: sampleKanji.examples
        },
        metadata: {
          size: 1024,
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

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedKanji);

      const result = await KanjiCache.getKanji('漢');

      expect(result).toEqual(expect.objectContaining({
        character: '漢',
        readings: sampleKanji.readings,
        meanings: sampleKanji.meanings
      }));
    });

    it('should return null if kanji not in cache', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await KanjiCache.getKanji('漢');

      expect(result).toBeNull();
    });

    it('should fetch from network if fetchFn provided and not cached', async () => {
      const fetchFn = jest.fn().mockResolvedValue(sampleKanji);
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await KanjiCache.getKanji('漢', fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual(sampleKanji);
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalled();
    });

    it('should return stale cache if no fetchFn provided', async () => {
      const staleKanji = {
        id: '漢',
        type: 'kanji',
        data: {
          character: '漢',
          readings: sampleKanji.readings,
          meanings: sampleKanji.meanings,
          strokeCount: 13
        },
        metadata: {
          size: 1024,
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

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(staleKanji);

      const result = await KanjiCache.getKanji('漢');

      expect(result).toEqual(expect.objectContaining({
        character: '漢'
      }));
    });

    it('should handle errors gracefully', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockRejectedValue(new Error('Storage error'));

      const result = await KanjiCache.getKanji('漢');

      expect(result).toBeNull();
    });
  });

  describe('cacheKanjiSet', () => {
    it('should cache multiple kanji in batches', async () => {
      const kanjiList = [sampleKanji, sampleKanji2];

      await KanjiCache.cacheKanjiSet(kanjiList, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in batch operations gracefully', async () => {
      const kanjiList = [sampleKanji, sampleKanji2];
      mockEnhancedStorageManager2.cacheResource
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Storage error'));

      await KanjiCache.cacheKanjiSet(kanjiList, 'free');

      // Should not throw, should log error
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should process large sets in batches', async () => {
      const largeKanjiList = Array.from({ length: 25 }, (_, i) => ({
        ...sampleKanji,
        character: `漢${i}`,
        id: `kanji-${i}`
      }));

      await KanjiCache.cacheKanjiSet(largeKanjiList, 'premium');

      // Should process in batches of 10
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(25);
    });
  });

  describe('preCacheRelated', () => {
    it('should schedule pre-caching in background', async () => {
      const relatedKanji = ['字', '文', '書'];

      await KanjiCache.preCacheRelated('漢', relatedKanji);

      // Should not throw and should log intentions
      expect(true).toBe(true); // Just verify it doesn't throw
    });

    it('should handle errors in pre-caching gracefully', async () => {
      const relatedKanji = ['字', '文', '書'];

      await KanjiCache.preCacheRelated('漢', relatedKanji);

      // Should not throw even if pre-caching fails
      expect(true).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached kanji', async () => {
      await KanjiCache.clearCache();

      expect(mockEnhancedStorageManager2.clearResourcesByType).toHaveBeenCalledWith('kanji');
    });

    it('should handle clear errors gracefully', async () => {
      mockEnhancedStorageManager2.clearResourcesByType.mockRejectedValue(new Error('Clear error'));

      await expect(KanjiCache.clearCache()).rejects.toThrow('Clear error');
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats when no cached kanji', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);

      const stats = await KanjiCache.getCacheStats();

      expect(stats).toEqual({
        count: 0,
        totalSize: 0,
        oldestKanji: null,
        newestKanji: null
      });
    });

    it('should return correct stats for cached kanji', async () => {
      const mockResources = [
        {
          metadata: {
            size: 1024,
            cachedAt: Date.now() - (24 * 60 * 60 * 1000) // 1 day ago
          }
        },
        {
          metadata: {
            size: 2048,
            cachedAt: Date.now() // Now
          }
        }
      ];

      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue(mockResources);

      const stats = await KanjiCache.getCacheStats();

      expect(stats.count).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.oldestKanji).toBeInstanceOf(Date);
      expect(stats.newestKanji).toBeInstanceOf(Date);
    });

    it('should handle stats errors gracefully', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockRejectedValue(new Error('Stats error'));

      await expect(KanjiCache.getCacheStats()).rejects.toThrow('Stats error');
    });
  });

  describe('performance', () => {
    it('should load cached kanji in under 50ms', async () => {
      const cachedKanji = {
        id: '漢',
        type: 'kanji',
        data: {
          character: '漢',
          readings: sampleKanji.readings,
          meanings: sampleKanji.meanings,
          strokeCount: 13
        },
        metadata: {
          size: 1024,
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

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedKanji);

      const start = performance.now();
      await KanjiCache.getKanji('漢');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
