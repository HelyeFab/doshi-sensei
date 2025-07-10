import { ResourceCacheManager } from '@/lib/cache/resourceCacheManager';
import { KanjiCache } from '@/lib/cache/kanjiCache';
import { VerbCache } from '@/lib/cache/verbCache';
import { AdjectiveCache } from '@/lib/cache/adjectiveCache';
import { AudioCache } from '@/lib/cache/audioCache';
import { Kanji, Verb, Adjective, AudioResource } from '@/types/cache';

// Mock all cache managers
jest.mock('@/lib/cache/kanjiCache');
jest.mock('@/lib/cache/verbCache');
jest.mock('@/lib/cache/adjectiveCache');
jest.mock('@/lib/cache/audioCache');

const mockKanjiCache = KanjiCache as jest.Mocked<typeof KanjiCache>;
const mockVerbCache = VerbCache as jest.Mocked<typeof VerbCache>;
const mockAdjectiveCache = AdjectiveCache as jest.Mocked<typeof AdjectiveCache>;
const mockAudioCache = AudioCache as jest.Mocked<typeof AudioCache>;

describe('ResourceCacheManager', () => {
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

  const sampleAudio: AudioResource = {
    id: 'kanji-漢',
    url: '/api/audio/kanji/漢',
    type: 'kanji',
    text: '漢',
    language: 'ja',
    voice: 'female',
    speed: 1.0,
    format: 'mp3',
    duration: 2.5,
    fileSize: 51200,
    checksum: 'audio-checksum-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful operations by default
    mockKanjiCache.cacheKanji.mockResolvedValue();
    mockKanjiCache.getKanji.mockResolvedValue(null);
    mockKanjiCache.cacheKanjiSet.mockResolvedValue();
    mockKanjiCache.clearCache.mockResolvedValue();
    mockKanjiCache.getCacheStats.mockResolvedValue({
      count: 0,
      totalSize: 0,
      oldestKanji: null,
      newestKanji: null
    });

    mockVerbCache.cacheVerb.mockResolvedValue();
    mockVerbCache.getVerb.mockResolvedValue(null);
    mockVerbCache.cacheVerbSet.mockResolvedValue();
    mockVerbCache.clearCache.mockResolvedValue();
    mockVerbCache.getCacheStats.mockResolvedValue({
      count: 0,
      totalSize: 0,
      oldestVerb: null,
      newestVerb: null
    });

    mockAdjectiveCache.cacheAdjective.mockResolvedValue();
    mockAdjectiveCache.getAdjective.mockResolvedValue(null);
    mockAdjectiveCache.cacheAdjectiveSet.mockResolvedValue();
    mockAdjectiveCache.clearCache.mockResolvedValue();
    mockAdjectiveCache.getCacheStats.mockResolvedValue({
      count: 0,
      totalSize: 0,
      oldestAdjective: null,
      newestAdjective: null
    });

    mockAudioCache.cacheAudio.mockResolvedValue();
    mockAudioCache.getAudio.mockResolvedValue(null);
    mockAudioCache.cacheAudioSet.mockResolvedValue();
    mockAudioCache.clearCache.mockResolvedValue();
    mockAudioCache.getCacheStats.mockResolvedValue({
      count: 0,
      totalSize: 0,
      totalDuration: 0,
      oldestAudio: null,
      newestAudio: null
    });
  });

  describe('cacheResource', () => {
    it('should cache kanji correctly', async () => {
      await ResourceCacheManager.cacheResource('kanji', sampleKanji, 'free');

      expect(mockKanjiCache.cacheKanji).toHaveBeenCalledWith(sampleKanji, 'free');
    });

    it('should cache verb correctly', async () => {
      await ResourceCacheManager.cacheResource('verb', sampleVerb, 'premium');

      expect(mockVerbCache.cacheVerb).toHaveBeenCalledWith(sampleVerb, 'premium');
    });

    it('should cache adjective correctly', async () => {
      await ResourceCacheManager.cacheResource('adjective', sampleAdjective, 'free');

      expect(mockAdjectiveCache.cacheAdjective).toHaveBeenCalledWith(sampleAdjective, 'free');
    });

    it('should cache audio correctly', async () => {
      await ResourceCacheManager.cacheResource('audio', sampleAudio, 'premium');

      expect(mockAudioCache.cacheAudio).toHaveBeenCalledWith(sampleAudio, 'premium');
    });

    it('should throw error for unknown resource type', async () => {
      await expect(
        ResourceCacheManager.cacheResource('unknown' as any, {}, 'free')
      ).rejects.toThrow('Unsupported resource type: unknown');
    });

    it('should handle caching errors gracefully', async () => {
      mockKanjiCache.cacheKanji.mockRejectedValue(new Error('Kanji cache error'));

      await expect(
        ResourceCacheManager.cacheResource('kanji', sampleKanji, 'free')
      ).rejects.toThrow('Kanji cache error');
    });
  });

  describe('getResource', () => {
    it('should get kanji correctly', async () => {
      mockKanjiCache.getKanji.mockResolvedValue(sampleKanji);

      const result = await ResourceCacheManager.getResource('kanji', '漢');

      expect(mockKanjiCache.getKanji).toHaveBeenCalledWith('漢', undefined);
      expect(result).toEqual(sampleKanji);
    });

    it('should get verb correctly', async () => {
      mockVerbCache.getVerb.mockResolvedValue(sampleVerb);

      const result = await ResourceCacheManager.getResource('verb', '食べる');

      expect(mockVerbCache.getVerb).toHaveBeenCalledWith('食べる', undefined);
      expect(result).toEqual(sampleVerb);
    });

    it('should get adjective correctly', async () => {
      mockAdjectiveCache.getAdjective.mockResolvedValue(sampleAdjective);

      const result = await ResourceCacheManager.getResource('adjective', '大きい');

      expect(mockAdjectiveCache.getAdjective).toHaveBeenCalledWith('大きい', undefined);
      expect(result).toEqual(sampleAdjective);
    });

    it('should get audio correctly', async () => {
      mockAudioCache.getAudio.mockResolvedValue(sampleAudio);

      const result = await ResourceCacheManager.getResource('audio', 'kanji-漢');

      expect(mockAudioCache.getAudio).toHaveBeenCalledWith('kanji-漢', undefined);
      expect(result).toEqual(sampleAudio);
    });

    it('should pass fetchFn to underlying cache', async () => {
      const fetchFn = jest.fn().mockResolvedValue(sampleKanji);
      mockKanjiCache.getKanji.mockResolvedValue(sampleKanji);

      await ResourceCacheManager.getResource('kanji', '漢', fetchFn);

      expect(mockKanjiCache.getKanji).toHaveBeenCalledWith('漢', fetchFn);
    });

    it('should throw error for unknown resource type', async () => {
      await expect(
        ResourceCacheManager.getResource('unknown' as any, 'test')
      ).rejects.toThrow('Unsupported resource type: unknown');
    });

    it('should handle retrieval errors gracefully', async () => {
      mockKanjiCache.getKanji.mockRejectedValue(new Error('Kanji retrieval error'));

      const result = await ResourceCacheManager.getResource('kanji', '漢');

      expect(result).toBeNull();
    });
  });

  describe('cacheResourceSet', () => {
    it('should cache kanji set correctly', async () => {
      const kanjiList = [sampleKanji];

      await ResourceCacheManager.cacheResourceSet('kanji', kanjiList, 'free');

      expect(mockKanjiCache.cacheKanjiSet).toHaveBeenCalledWith(kanjiList, 'free');
    });

    it('should cache verb set correctly', async () => {
      const verbList = [sampleVerb];

      await ResourceCacheManager.cacheResourceSet('verb', verbList, 'premium');

      expect(mockVerbCache.cacheVerbSet).toHaveBeenCalledWith(verbList, 'premium');
    });

    it('should cache adjective set correctly', async () => {
      const adjectiveList = [sampleAdjective];

      await ResourceCacheManager.cacheResourceSet('adjective', adjectiveList, 'free');

      expect(mockAdjectiveCache.cacheAdjectiveSet).toHaveBeenCalledWith(adjectiveList, 'free');
    });

    it('should cache audio set correctly', async () => {
      const audioList = [sampleAudio];

      await ResourceCacheManager.cacheResourceSet('audio', audioList, 'premium');

      expect(mockAudioCache.cacheAudioSet).toHaveBeenCalledWith(audioList, 'premium');
    });

    it('should throw error for unknown resource type', async () => {
      await expect(
        ResourceCacheManager.cacheResourceSet('unknown' as any, [], 'free')
      ).rejects.toThrow('Unsupported resource type: unknown');
    });

    it('should handle batch caching errors gracefully', async () => {
      mockKanjiCache.cacheKanjiSet.mockRejectedValue(new Error('Batch cache error'));

      await expect(
        ResourceCacheManager.cacheResourceSet('kanji', [sampleKanji], 'free')
      ).rejects.toThrow('Batch cache error');
    });
  });

  describe('clearCache', () => {
    it('should clear specific resource type cache', async () => {
      await ResourceCacheManager.clearCache('kanji');

      expect(mockKanjiCache.clearCache).toHaveBeenCalled();
    });

    it('should clear all caches when no type specified', async () => {
      await ResourceCacheManager.clearCache();

      expect(mockKanjiCache.clearCache).toHaveBeenCalled();
      expect(mockVerbCache.clearCache).toHaveBeenCalled();
      expect(mockAdjectiveCache.clearCache).toHaveBeenCalled();
      expect(mockAudioCache.clearCache).toHaveBeenCalled();
    });

    it('should throw error for unknown resource type', async () => {
      await expect(
        ResourceCacheManager.clearCache('unknown' as any)
      ).rejects.toThrow('Unsupported resource type: unknown');
    });

    it('should handle clear errors gracefully', async () => {
      mockKanjiCache.clearCache.mockRejectedValue(new Error('Clear error'));

      await expect(ResourceCacheManager.clearCache('kanji')).rejects.toThrow('Clear error');
    });
  });

  describe('getCacheStats', () => {
    it('should get stats for specific resource type', async () => {
      const mockStats = {
        count: 5,
        totalSize: 10240,
        oldestKanji: new Date(),
        newestKanji: new Date()
      };
      mockKanjiCache.getCacheStats.mockResolvedValue(mockStats);

      const result = await ResourceCacheManager.getCacheStats('kanji');

      expect(mockKanjiCache.getCacheStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should get combined stats for all resource types', async () => {
      const mockKanjiStats = {
        count: 5,
        totalSize: 10240,
        oldestKanji: new Date(),
        newestKanji: new Date()
      };
      const mockVerbStats = {
        count: 3,
        totalSize: 6144,
        oldestVerb: new Date(),
        newestVerb: new Date()
      };
      const mockAdjectiveStats = {
        count: 2,
        totalSize: 4096,
        oldestAdjective: new Date(),
        newestAdjective: new Date()
      };
      const mockAudioStats = {
        count: 10,
        totalSize: 512000,
        totalDuration: 25.5,
        oldestAudio: new Date(),
        newestAudio: new Date()
      };

      mockKanjiCache.getCacheStats.mockResolvedValue(mockKanjiStats);
      mockVerbCache.getCacheStats.mockResolvedValue(mockVerbStats);
      mockAdjectiveCache.getCacheStats.mockResolvedValue(mockAdjectiveStats);
      mockAudioCache.getCacheStats.mockResolvedValue(mockAudioStats);

      const result = await ResourceCacheManager.getCacheStats();

      expect(result).toEqual({
        kanji: mockKanjiStats,
        verb: mockVerbStats,
        adjective: mockAdjectiveStats,
        audio: mockAudioStats,
        total: {
          count: 20,
          totalSize: 580480,
          totalDuration: 25.5
        }
      });
    });

    it('should throw error for unknown resource type', async () => {
      await expect(
        ResourceCacheManager.getCacheStats('unknown' as any)
      ).rejects.toThrow('Unsupported resource type: unknown');
    });

    it('should handle stats errors gracefully', async () => {
      mockKanjiCache.getCacheStats.mockRejectedValue(new Error('Stats error'));

      await expect(ResourceCacheManager.getCacheStats('kanji')).rejects.toThrow('Stats error');
    });
  });

  describe('preCacheRelated', () => {
    it('should pre-cache related kanji', async () => {
      const relatedIds = ['字', '文', '書'];

      await ResourceCacheManager.preCacheRelated('kanji', '漢', relatedIds);

      expect(mockKanjiCache.preCacheRelated).toHaveBeenCalledWith('漢', relatedIds);
    });

    it('should pre-cache related verbs', async () => {
      const relatedIds = ['飲む', '見る', '聞く'];

      await ResourceCacheManager.preCacheRelated('verb', '食べる', relatedIds);

      expect(mockVerbCache.preCacheRelated).toHaveBeenCalledWith('食べる', relatedIds);
    });

    it('should pre-cache related adjectives', async () => {
      const relatedIds = ['小さい', '新しい', '古い'];

      await ResourceCacheManager.preCacheRelated('adjective', '大きい', relatedIds);

      expect(mockAdjectiveCache.preCacheRelated).toHaveBeenCalledWith('大きい', relatedIds);
    });

    it('should pre-cache related audio', async () => {
      const relatedIds = ['kanji-字', 'kanji-文', 'kanji-書'];

      await ResourceCacheManager.preCacheRelated('audio', 'kanji-漢', relatedIds);

      expect(mockAudioCache.preCacheRelated).toHaveBeenCalledWith('kanji-漢', relatedIds);
    });

    it('should throw error for unknown resource type', async () => {
      await expect(
        ResourceCacheManager.preCacheRelated('unknown' as any, 'test', [])
      ).rejects.toThrow('Unsupported resource type: unknown');
    });
  });

  describe('performance', () => {
    it('should cache resources quickly', async () => {
      const start = performance.now();
      await ResourceCacheManager.cacheResource('kanji', sampleKanji, 'free');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should retrieve resources quickly', async () => {
      mockKanjiCache.getKanji.mockResolvedValue(sampleKanji);

      const start = performance.now();
      await ResourceCacheManager.getResource('kanji', '漢');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('error handling', () => {
    it('should handle all cache manager errors gracefully', async () => {
      // Test that errors from individual cache managers don't crash the system
      mockKanjiCache.cacheKanji.mockRejectedValue(new Error('Kanji error'));
      mockVerbCache.getVerb.mockRejectedValue(new Error('Verb error'));
      mockAdjectiveCache.clearCache.mockRejectedValue(new Error('Adjective error'));
      mockAudioCache.getCacheStats.mockRejectedValue(new Error('Audio error'));

      // These should all throw their respective errors
      await expect(
        ResourceCacheManager.cacheResource('kanji', sampleKanji, 'free')
      ).rejects.toThrow('Kanji error');

      await expect(
        ResourceCacheManager.getResource('verb', '食べる')
      ).resolves.toBeNull();

      await expect(
        ResourceCacheManager.clearCache('adjective')
      ).rejects.toThrow('Adjective error');

      await expect(
        ResourceCacheManager.getCacheStats('audio')
      ).rejects.toThrow('Audio error');
    });
  });
});
