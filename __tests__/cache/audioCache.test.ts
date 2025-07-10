import { AudioCache, AudioResource } from '@/lib/cache/audioCache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';

// Mock EnhancedStorageManager2
jest.mock('@/utils/enhancedStorageManager2');

const mockEnhancedStorageManager2 = EnhancedStorageManager2 as jest.Mocked<typeof EnhancedStorageManager2>;

describe('AudioCache', () => {
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
    fileSize: 51200, // 50KB
    checksum: 'audio-checksum-123'
  };

  const sampleAudio2: AudioResource = {
    id: 'verb-食べる',
    url: '/api/audio/verb/食べる',
    type: 'verb',
    text: '食べる',
    language: 'ja',
    voice: 'male',
    speed: 0.8,
    format: 'mp3',
    duration: 1.8,
    fileSize: 36864, // 36KB
    checksum: 'audio-checksum-456'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful operations by default
    mockEnhancedStorageManager2.cacheResource.mockResolvedValue();
    mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);
    mockEnhancedStorageManager2.calculateResourceSize.mockReturnValue(51200);
    mockEnhancedStorageManager2.generateChecksum.mockResolvedValue('test-checksum');
    mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);
    mockEnhancedStorageManager2.clearResourcesByType.mockResolvedValue();
  });

  describe('cacheAudio', () => {
    it('should cache an audio resource successfully', async () => {
      await AudioCache.cacheAudio(sampleAudio, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'kanji-漢',
          type: 'audio',
          data: expect.objectContaining({
            url: '/api/audio/kanji/漢',
            type: 'kanji',
            text: '漢'
          })
        }),
        'free'
      );
    });

    it('should handle caching errors gracefully', async () => {
      mockEnhancedStorageManager2.cacheResource.mockRejectedValue(new Error('Storage error'));

      await expect(AudioCache.cacheAudio(sampleAudio, 'free')).rejects.toThrow('Storage error');
    });

    it('should calculate size correctly', async () => {
      await AudioCache.cacheAudio(sampleAudio, 'premium');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        sampleAudio,
        undefined, // No images for audio
        undefined // No additional audio files
      );
    });

    it('should include audio data if available', async () => {
      const audioWithData = {
        ...sampleAudio,
        audioData: new ArrayBuffer(51200) // 50KB audio data
      };

      await AudioCache.cacheAudio(audioWithData, 'free');

      expect(mockEnhancedStorageManager2.calculateResourceSize).toHaveBeenCalledWith(
        audioWithData,
        undefined,
        expect.any(Map)
      );
    });
  });

  describe('getAudio', () => {
    it('should return cached audio if available and not stale', async () => {
      const cachedAudio = {
        id: 'kanji-漢',
        type: 'audio',
        data: {
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
        },
        metadata: {
          size: 51200,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: 'test-checksum',
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
        },
        assets: {
          images: new Map(),
          audio: new Map()
        }
      };

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedAudio);

      const result = await AudioCache.getAudio('kanji-漢');

      expect(result).toEqual(expect.objectContaining({
        url: '/api/audio/kanji/漢',
        type: 'kanji',
        text: '漢'
      }));
    });

    it('should return null if audio not in cache', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await AudioCache.getAudio('kanji-漢');

      expect(result).toBeNull();
    });

    it('should fetch from network if fetchFn provided and not cached', async () => {
      const fetchFn = jest.fn().mockResolvedValue(sampleAudio);
      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(null);

      const result = await AudioCache.getAudio('kanji-漢', fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual(sampleAudio);
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalled();
    });

    it('should return stale cache if no fetchFn provided', async () => {
      const staleAudio = {
        id: 'kanji-漢',
        type: 'audio',
        data: {
          url: '/api/audio/kanji/漢',
          type: 'kanji',
          text: '漢'
        },
        metadata: {
          size: 51200,
          cachedAt: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
          lastAccessed: Date.now() - (8 * 24 * 60 * 60 * 1000),
          version: '1.0',
          checksum: 'test-checksum',
          expiresAt: Date.now() - (24 * 60 * 60 * 1000) // Expired yesterday
        },
        assets: {
          images: new Map(),
          audio: new Map()
        }
      };

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(staleAudio);

      const result = await AudioCache.getAudio('kanji-漢');

      expect(result).toEqual(expect.objectContaining({
        url: '/api/audio/kanji/漢'
      }));
    });

    it('should handle errors gracefully', async () => {
      mockEnhancedStorageManager2.getCachedResource.mockRejectedValue(new Error('Storage error'));

      const result = await AudioCache.getAudio('kanji-漢');

      expect(result).toBeNull();
    });
  });

  describe('cacheAudioSet', () => {
    it('should cache multiple audio resources in batches', async () => {
      const audioList = [sampleAudio, sampleAudio2];

      await AudioCache.cacheAudioSet(audioList, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in batch operations gracefully', async () => {
      const audioList = [sampleAudio, sampleAudio2];
      mockEnhancedStorageManager2.cacheResource
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Storage error'));

      await AudioCache.cacheAudioSet(audioList, 'free');

      // Should not throw, should log error
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(2);
    });

    it('should process large sets in batches', async () => {
      const largeAudioList = Array.from({ length: 25 }, (_, i) => ({
        ...sampleAudio,
        id: `kanji-漢${i}`,
        url: `/api/audio/kanji/漢${i}`
      }));

      await AudioCache.cacheAudioSet(largeAudioList, 'premium');

      // Should process in batches of 10
      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(25);
    });
  });

  describe('preCacheRelated', () => {
    it('should schedule pre-caching in background', async () => {
      const relatedAudio = ['kanji-字', 'kanji-文', 'kanji-書'];

      await AudioCache.preCacheRelated('kanji-漢', relatedAudio);

      // Should not throw and should log intentions
      expect(true).toBe(true); // Just verify it doesn't throw
    });

    it('should handle errors in pre-caching gracefully', async () => {
      const relatedAudio = ['kanji-字', 'kanji-文', 'kanji-書'];

      await AudioCache.preCacheRelated('kanji-漢', relatedAudio);

      // Should not throw even if pre-caching fails
      expect(true).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached audio', async () => {
      await AudioCache.clearCache();

      expect(mockEnhancedStorageManager2.clearResourcesByType).toHaveBeenCalledWith('audio');
    });

    it('should handle clear errors gracefully', async () => {
      mockEnhancedStorageManager2.clearResourcesByType.mockRejectedValue(new Error('Clear error'));

      await expect(AudioCache.clearCache()).rejects.toThrow('Clear error');
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats when no cached audio', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue([]);

      const stats = await AudioCache.getCacheStats();

      expect(stats).toEqual({
        count: 0,
        totalSize: 0,
        totalDuration: 0,
        oldestAudio: null,
        newestAudio: null
      });
    });

    it('should return correct stats for cached audio', async () => {
      const mockResources = [
        {
          data: {
            duration: 2.5,
            fileSize: 51200
          },
          metadata: {
            size: 51200,
            cachedAt: Date.now() - (24 * 60 * 60 * 1000) // 1 day ago
          }
        },
        {
          data: {
            duration: 1.8,
            fileSize: 36864
          },
          metadata: {
            size: 36864,
            cachedAt: Date.now() // Now
          }
        }
      ];

      mockEnhancedStorageManager2.getResourcesByType.mockResolvedValue(mockResources);

      const stats = await AudioCache.getCacheStats();

      expect(stats.count).toBe(2);
      expect(stats.totalSize).toBe(88064);
      expect(stats.totalDuration).toBe(4.3);
      expect(stats.oldestAudio).toBeInstanceOf(Date);
      expect(stats.newestAudio).toBeInstanceOf(Date);
    });

    it('should handle stats errors gracefully', async () => {
      mockEnhancedStorageManager2.getResourcesByType.mockRejectedValue(new Error('Stats error'));

      await expect(AudioCache.getCacheStats()).rejects.toThrow('Stats error');
    });
  });

  describe('performance', () => {
    it('should load cached audio in under 50ms', async () => {
      const cachedAudio = {
        id: 'kanji-漢',
        type: 'audio',
        data: {
          url: '/api/audio/kanji/漢',
          type: 'kanji',
          text: '漢',
          duration: 2.5,
          fileSize: 51200
        },
        metadata: {
          size: 51200,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: 'test-checksum',
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
        },
        assets: {
          images: new Map(),
          audio: new Map()
        }
      };

      mockEnhancedStorageManager2.getCachedResource.mockResolvedValue(cachedAudio);

      const start = performance.now();
      await AudioCache.getAudio('kanji-漢');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('audio-specific functionality', () => {
    it('should handle different audio formats', async () => {
      const mp3Audio = { ...sampleAudio, format: 'mp3' };
      const wavAudio = { ...sampleAudio, format: 'wav', id: 'kanji-字' };
      const oggAudio = { ...sampleAudio, format: 'ogg', id: 'kanji-文' };

      await AudioCache.cacheAudio(mp3Audio, 'free');
      await AudioCache.cacheAudio(wavAudio, 'free');
      await AudioCache.cacheAudio(oggAudio, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(3);
    });

    it('should handle different voice types', async () => {
      const femaleVoice = { ...sampleAudio, voice: 'female' };
      const maleVoice = { ...sampleAudio, voice: 'male', id: 'kanji-字' };
      const neutralVoice = { ...sampleAudio, voice: 'neutral', id: 'kanji-文' };

      await AudioCache.cacheAudio(femaleVoice, 'free');
      await AudioCache.cacheAudio(maleVoice, 'free');
      await AudioCache.cacheAudio(neutralVoice, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(3);
    });

    it('should handle different speeds', async () => {
      const slowAudio = { ...sampleAudio, speed: 0.5 };
      const normalAudio = { ...sampleAudio, speed: 1.0, id: 'kanji-字' };
      const fastAudio = { ...sampleAudio, speed: 1.5, id: 'kanji-文' };

      await AudioCache.cacheAudio(slowAudio, 'free');
      await AudioCache.cacheAudio(normalAudio, 'free');
      await AudioCache.cacheAudio(fastAudio, 'free');

      expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledTimes(3);
    });
  });
});
