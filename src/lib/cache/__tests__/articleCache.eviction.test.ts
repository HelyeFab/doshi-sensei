import { ArticleCache } from '../articleCache';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { evictionEngine } from '../eviction/lruEvictionEngine';

// Mock dependencies
jest.mock('@/utils/enhancedStorageManager2');
jest.mock('../eviction/lruEvictionEngine');

// Mock fetch for downloading assets
global.fetch = jest.fn();

describe('ArticleCache with Eviction', () => {
  const mockStorageManager = EnhancedStorageManager2 as jest.Mocked<typeof EnhancedStorageManager2>;
  const mockEvictionEngine = evictionEngine as jest.Mocked<typeof evictionEngine>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockStorageManager.calculateResourceSize.mockReturnValue(1024);
    mockStorageManager.generateChecksum.mockResolvedValue('checksum123');
    mockStorageManager.cacheResource.mockResolvedValue();
    
    mockEvictionEngine.requiresEviction.mockResolvedValue(false);
    mockEvictionEngine.enforceLimit.mockResolvedValue({
      success: true,
      evictedCount: 0,
      freedBytes: 0,
      evictedIds: [],
      reason: 'count_limit_exceeded',
    });

    // Mock fetch for images and audio
    mockFetch.mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' })),
    } as any);
  });

  describe('cacheArticle with eviction', () => {
    const testArticle = {
      id: 'test-article-1',
      title: 'Test Article',
      content: 'Test content',
      slug: 'test-article',
      images: ['https://example.com/image1.jpg'],
      audioUrl: 'https://example.com/audio.mp3',
    };

    it('should check eviction before caching', async () => {
      await ArticleCache.cacheArticle(testArticle, 'free');

      expect(mockEvictionEngine.requiresEviction).toHaveBeenCalledWith('article', 'free', 1024);
    });

    it('should trigger eviction when needed', async () => {
      mockEvictionEngine.requiresEviction.mockResolvedValue(true);
      mockEvictionEngine.enforceLimit.mockResolvedValue({
        success: true,
        evictedCount: 2,
        freedBytes: 2048,
        evictedIds: ['old-article-1', 'old-article-2'],
        reason: 'count_limit_exceeded',
      });

      await ArticleCache.cacheArticle(testArticle, 'free');

      expect(mockEvictionEngine.enforceLimit).toHaveBeenCalledWith('article', 'free');
      expect(mockStorageManager.cacheResource).toHaveBeenCalled();
    });

    it('should still cache after successful eviction', async () => {
      mockEvictionEngine.requiresEviction.mockResolvedValue(true);

      await ArticleCache.cacheArticle(testArticle, 'free');

      expect(mockStorageManager.cacheResource).toHaveBeenCalled();
    });

    it('should handle eviction failures gracefully', async () => {
      mockEvictionEngine.requiresEviction.mockResolvedValue(true);
      mockEvictionEngine.enforceLimit.mockResolvedValue({
        success: false,
        evictedCount: 0,
        freedBytes: 0,
        evictedIds: [],
        reason: 'count_limit_exceeded',
        error: 'Eviction failed',
      });

      // Should still attempt to cache even if eviction fails
      await ArticleCache.cacheArticle(testArticle, 'free');

      expect(mockStorageManager.cacheResource).toHaveBeenCalled();
    });

    it('should not trigger eviction for premium users', async () => {
      await ArticleCache.cacheArticle(testArticle, 'monthly');

      expect(mockEvictionEngine.requiresEviction).toHaveBeenCalledWith('article', 'monthly', 1024);
      expect(mockEvictionEngine.enforceLimit).not.toHaveBeenCalled();
    });

    it('should calculate correct size including assets', async () => {
      const largeArticle = {
        ...testArticle,
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg',
        ],
      };

      mockStorageManager.calculateResourceSize.mockReturnValue(5 * 1024 * 1024); // 5MB

      await ArticleCache.cacheArticle(largeArticle, 'free');

      expect(mockEvictionEngine.requiresEviction).toHaveBeenCalledWith('article', 'free', 5 * 1024 * 1024);
    });
  });

  describe('Eviction scenarios', () => {
    it('should handle count-based eviction for free users', async () => {
      mockEvictionEngine.requiresEviction.mockResolvedValue(true);
      mockEvictionEngine.enforceLimit.mockResolvedValue({
        success: true,
        evictedCount: 1,
        freedBytes: 1024,
        evictedIds: ['oldest-article'],
        reason: 'count_limit_exceeded',
      });

      const articles = [
        { id: 'article-1', title: 'Article 1', content: 'Content 1', slug: 'article-1' },
        { id: 'article-2', title: 'Article 2', content: 'Content 2', slug: 'article-2' },
        { id: 'article-3', title: 'Article 3', content: 'Content 3', slug: 'article-3' },
        { id: 'article-4', title: 'Article 4', content: 'Content 4', slug: 'article-4' }, // This triggers eviction
      ];

      for (const article of articles) {
        await ArticleCache.cacheArticle(article, 'free');
      }

      // Eviction should have been triggered for the 4th article
      expect(mockEvictionEngine.enforceLimit).toHaveBeenCalledTimes(1);
    });

    it('should handle size-based eviction', async () => {
      mockStorageManager.calculateResourceSize.mockReturnValue(6 * 1024 * 1024); // 6MB per article
      mockEvictionEngine.requiresEviction.mockResolvedValue(true);
      mockEvictionEngine.enforceLimit.mockResolvedValue({
        success: true,
        evictedCount: 1,
        freedBytes: 6 * 1024 * 1024,
        evictedIds: ['large-old-article'],
        reason: 'size_limit_exceeded',
      });

      const largeArticle = {
        id: 'large-article',
        title: 'Large Article',
        content: 'x'.repeat(6 * 1024 * 1024), // 6MB content
        slug: 'large-article',
      };

      await ArticleCache.cacheArticle(largeArticle, 'free');

      expect(mockEvictionEngine.enforceLimit).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle download failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const article = {
        id: 'article-with-assets',
        title: 'Article',
        content: 'Content',
        slug: 'article',
        images: ['https://example.com/image.jpg'],
      };

      // Should still cache article even if image download fails
      await expect(ArticleCache.cacheArticle(article, 'free')).resolves.not.toThrow();
    });

    it('should handle eviction engine errors', async () => {
      mockEvictionEngine.requiresEviction.mockRejectedValue(new Error('Eviction check failed'));

      const article = {
        id: 'test-article',
        title: 'Test',
        content: 'Content',
        slug: 'test',
      };

      // Should still attempt to cache even if eviction check fails
      await expect(ArticleCache.cacheArticle(article, 'free')).resolves.not.toThrow();
    });
  });
});