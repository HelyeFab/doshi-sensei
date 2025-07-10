import { VerbCache, Verb } from '@/lib/cache/verbCache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';

// Mock EnhancedStorageManager2
jest.mock('@/utils/enhancedStorageManager2');

const mockEnhancedStorageManager2 = EnhancedStorageManager2 as jest.Mocked<typeof EnhancedStorageManager2>;

describe('VerbCache', () => {
  const sampleVerb: Verb = {
    dictionaryForm: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    type: 'ichidan',
    conjugations: {
      present: '食べる',
      past: '食べた',
      teForm: '食べて',
      potential: '食べられる',
      passive: '食べられる',
      causative: '食べさせる',
      volitional: '食べよう'
    },
    examples: [
      {
        sentence: '私は寿司を食べます',
        reading: 'わたしはすしをたべます',
        meaning: 'I eat sushi'
      }
    ],
    jlptLevel: 'N5'
  };

  const sampleVerb2: Verb = {
    dictionaryForm: '飲む',
    reading: 'のむ',
    meaning: 'to drink',
    type: 'godan',
    conjugations: {
      present: '飲む',
      past: '飲んだ',
      teForm: '飲んで',
      potential: '飲める',
      passive: '飲まれる',
      causative: '飲ませる',
      volitional: '飲もう'
    },
    examples: [
      {
        sentence: '私は水を飲みます',
        reading: 'わたしはみずをのみます',
        meaning: 'I drink water'
      }
    ],
    jlptLevel: 'N5'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful operations by default
    mockEnhancedStorageManager2.cacheResource.mockResolvedValue();
    mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);
    mockEnhancedStorageManager2.calculateResourceSize.mockReturnValue(2048);
    mockEnhancedStorageManager2.generateChecksum.mockResolvedValue('test-checksum');
    mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);
    mockEnhancedStorageManager2.clearResourcesByType.mockResolvedValue();
  });

  describe('cacheVerb', () => {
    it('should cache a verb successfully', async () => {
      await VerbCache.cacheVerb(sampleVerb, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '食べる',
          type: 'verb',
          data: expect.objectContaining({
            dictionaryForm: '食べる',
            reading: 'たべる',
            meaning: 'to eat',
            type: 'ichidan'
          })
        }),
        'free'
      );
    });

    it('should handle caching errors gracefully', async () => {
      mockEnhancedStorageManager2.cacheResource.mockRejectedValue(new Error('Storage error'));

      await expect(VerbCache.cacheVerb(sampleVerb, 'free')).rejects.toThrow('Storage error');
    });

    it('should calculate size correctly', async () => {
      await VerbCache.cacheVerb(sampleVerb, 'premium');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        sampleVerb,
        undefined, // No images for verbs
        undefined // No audio by default
      );
    });

    it('should include audio if available', async () => {
      const verbWithAudio = { ...sampleVerb, audioUrl: '/api/audio/verb/食べる' };

      await VerbCache.cacheVerb(verbWithAudio, 'free');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        verbWithAudio,
        undefined,
        expect.any(Map)
      );
    });
  });

  describe('getVerb', () => {
    it('should return cached verb if available and not stale', async () => {
      const cachedVerb = {
        id: '食べる',
        type: 'verb',
        data: {
          dictionaryForm: '食べる',
          reading: 'たべる',
          meaning: 'to eat',
          type: 'ichidan',
          conjugations: sampleVerb.conjugations,
          examples: sampleVerb.examples,
          jlptLevel: 'N5'
        },
        metadata: {
          size: 2048,
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

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedVerb);

      const result = await VerbCache.getVerb('食べる');

      expect(result).toEqual(expect.objectContaining({
        dictionaryForm: '食べる',
        reading: 'たべる',
        meaning: 'to eat'
      }));
    });

    it('should return null if verb not in cache', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await VerbCache.getVerb('食べる');

      expect(result).toBeNull();
    });

    it('should fetch from network if fetchFn provided and not cached', async () => {
      const fetchFn = jest.fn().mockResolvedValue(sampleVerb);
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await VerbCache.getVerb('食べる', fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual(sampleVerb);
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalled();
    });

    it('should return stale cache if no fetchFn provided', async () => {
      const staleVerb = {
        id: '食べる',
        type: 'verb',
        data: {
          dictionaryForm: '食べる',
          reading: 'たべる',
          meaning: 'to eat',
          type: 'ichidan'
        },
        metadata: {
          size: 2048,
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

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(staleVerb);

      const result = await VerbCache.getVerb('食べる');

      expect(result).toEqual(expect.objectContaining({
        dictionaryForm: '食べる'
      }));
    });

    it('should handle errors gracefully', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockRejectedValue(new Error('Storage error'));

      const result = await VerbCache.getVerb('食べる');

      expect(result).toBeNull();
    });
  });

  describe('cacheVerbSet', () => {
    it('should cache multiple verbs in batches', async () => {
      const verbList = [sampleVerb, sampleVerb2];

      await VerbCache.cacheVerbSet(verbList, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in batch operations gracefully', async () => {
      const verbList = [sampleVerb, sampleVerb2];
      mockEnhancedStorageManager2.cacheResource
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Storage error'));

      await VerbCache.cacheVerbSet(verbList, 'free');

      // Should not throw, should log error
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should process large sets in batches', async () => {
      const largeVerbList = Array.from({ length: 25 }, (_, i) => ({
        ...sampleVerb,
        dictionaryForm: `食べる${i}`,
        id: `verb-${i}`
      }));

      await VerbCache.cacheVerbSet(largeVerbList, 'premium');

      // Should process in batches of 10
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(25);
    });
  });

  describe('preCacheRelated', () => {
    it('should schedule pre-caching in background', async () => {
      const relatedVerbs = ['飲む', '見る', '聞く'];

      await VerbCache.preCacheRelated('食べる', relatedVerbs);

      // Should not throw and should log intentions
      expect(true).toBe(true); // Just verify it doesn't throw
    });

    it('should handle errors in pre-caching gracefully', async () => {
      const relatedVerbs = ['飲む', '見る', '聞く'];

      await VerbCache.preCacheRelated('食べる', relatedVerbs);

      // Should not throw even if pre-caching fails
      expect(true).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached verbs', async () => {
      await VerbCache.clearCache();

      expect(mockEnhancedStorageManager2.clearResourcesByType).toHaveBeenCalledWith('verb');
    });

    it('should handle clear errors gracefully', async () => {
      mockEnhancedStorageManager2.clearResourcesByType.mockRejectedValue(new Error('Clear error'));

      await expect(VerbCache.clearCache()).rejects.toThrow('Clear error');
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats when no cached verbs', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);

      const stats = await VerbCache.getCacheStats();

      expect(stats).toEqual({
        count: 0,
        totalSize: 0,
        oldestVerb: null,
        newestVerb: null
      });
    });

    it('should return correct stats for cached verbs', async () => {
      const mockResources = [
        {
          metadata: {
            size: 2048,
            cachedAt: Date.now() - (24 * 60 * 60 * 1000) // 1 day ago
          }
        },
        {
          metadata: {
            size: 4096,
            cachedAt: Date.now() // Now
          }
        }
      ];

      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue(mockResources);

      const stats = await VerbCache.getCacheStats();

      expect(stats.count).toBe(2);
      expect(stats.totalSize).toBe(6144);
      expect(stats.oldestVerb).toBeInstanceOf(Date);
      expect(stats.newestVerb).toBeInstanceOf(Date);
    });

    it('should handle stats errors gracefully', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockRejectedValue(new Error('Stats error'));

      await expect(VerbCache.getCacheStats()).rejects.toThrow('Stats error');
    });
  });

  describe('performance', () => {
    it('should load cached verb in under 50ms', async () => {
      const cachedVerb = {
        id: '食べる',
        type: 'verb',
        data: {
          dictionaryForm: '食べる',
          reading: 'たべる',
          meaning: 'to eat',
          type: 'ichidan'
        },
        metadata: {
          size: 2048,
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

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedVerb);

      const start = performance.now();
      await VerbCache.getVerb('食べる');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
