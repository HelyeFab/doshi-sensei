import { LRUEvictionEngine } from '../lruEvictionEngine';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { ArticleCache } from '../../articleCache';
import { CachedResource } from '@/types/cache';

// This is an integration test that uses minimal mocking
// to test the actual eviction flow

// We'll only mock the storage layer
jest.mock('@/utils/enhancedStorageManager2');
const mockStorageManager = EnhancedStorageManager2 as jest.Mocked<typeof EnhancedStorageManager2>;

// Mock fetch for article assets
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
  } as Response)
);

describe('LRU Eviction Integration Tests', () => {
  let evictionEngine: LRUEvictionEngine;
  let storedResources: Map<string, CachedResource>;

  beforeEach(() => {
    jest.clearAllMocks();
    evictionEngine = LRUEvictionEngine.getInstance();
    storedResources = new Map();

    // Mock storage operations to use in-memory map
    mockStorageManager.getResourcesByType.mockImplementation(async (type) => {
      return Array.from(storedResources.values()).filter(r => r.type === type);
    });

    mockStorageManager.cacheResource.mockImplementation(async (resource) => {
      storedResources.set(`${resource.type}:${resource.id}`, resource);
    });

    mockStorageManager.removeResource.mockImplementation(async (type, id) => {
      storedResources.delete(`${type}:${id}`);
    });

    mockStorageManager.calculateResourceSize.mockReturnValue(1024 * 1024); // 1MB default
    mockStorageManager.generateChecksum.mockResolvedValue('checksum');
    mockStorageManager.saveData.mockResolvedValue();
  });

  describe('Real-world eviction scenarios', () => {
    it('should handle progressive article caching with eviction', async () => {
      const createArticle = (id: number) => ({
        id: `article-${id}`,
        title: `Article ${id}`,
        content: `Content for article ${id}`,
        slug: `article-${id}`,
      });

      // Cache 3 articles as free user (at limit)
      await ArticleCache.cacheArticle(createArticle(1), 'free');
      await ArticleCache.cacheArticle(createArticle(2), 'free');
      await ArticleCache.cacheArticle(createArticle(3), 'free');

      expect(storedResources.size).toBe(3);

      // Mark article 2 as active (being read)
      evictionEngine.markActive('article-2');

      // Cache 4th article - should trigger eviction
      await ArticleCache.cacheArticle(createArticle(4), 'free');

      // Should have evicted article 1 (oldest and not active)
      expect(storedResources.has('article:article-1')).toBe(false);
      expect(storedResources.has('article:article-2')).toBe(true); // Protected
      expect(storedResources.has('article:article-3')).toBe(true);
      expect(storedResources.has('article:article-4')).toBe(true);
      expect(storedResources.size).toBe(3);

      // Unmark article 2
      evictionEngine.markInactive('article-2');

      // Cache 5th article - should evict article 2 now (oldest unprotected)
      await ArticleCache.cacheArticle(createArticle(5), 'free');

      expect(storedResources.has('article:article-2')).toBe(false);
      expect(storedResources.size).toBe(3);
    });

    it('should handle size-based eviction', async () => {
      // Simulate large articles
      mockStorageManager.calculateResourceSize
        .mockReturnValueOnce(3 * 1024 * 1024) // Article 1: 3MB
        .mockReturnValueOnce(3 * 1024 * 1024) // Article 2: 3MB
        .mockReturnValueOnce(5 * 1024 * 1024); // Article 3: 5MB (exceeds 10MB limit)

      await ArticleCache.cacheArticle({ id: 'small-1', title: 'Small 1', content: 'x', slug: 's1' }, 'free');
      await ArticleCache.cacheArticle({ id: 'small-2', title: 'Small 2', content: 'x', slug: 's2' }, 'free');

      expect(storedResources.size).toBe(2);

      // This large article should trigger size-based eviction
      await ArticleCache.cacheArticle({ id: 'large', title: 'Large', content: 'x'.repeat(5000000), slug: 'large' }, 'free');

      // Should have evicted at least one article to make room
      expect(storedResources.size).toBeLessThanOrEqual(3);
      expect(storedResources.has('article:large')).toBe(true);
    });

    it('should respect grace period', async () => {
      const now = Date.now();
      
      // Manually create resources with specific timestamps
      const oldResource: CachedResource = {
        id: 'old-article',
        type: 'article',
        data: { id: 'old-article' },
        metadata: {
          size: 1024 * 1024,
          cachedAt: now - 10 * 60 * 1000, // 10 minutes ago
          lastAccessed: now - 10 * 60 * 1000,
          version: '1.0',
          checksum: 'old',
        },
      };

      const recentResource: CachedResource = {
        id: 'recent-article',
        type: 'article',
        data: { id: 'recent-article' },
        metadata: {
          size: 1024 * 1024,
          cachedAt: now - 2 * 60 * 1000, // 2 minutes ago
          lastAccessed: now - 2 * 60 * 1000, // Within grace period
          version: '1.0',
          checksum: 'recent',
        },
      };

      storedResources.set('article:old-article', oldResource);
      storedResources.set('article:recent-article', recentResource);

      // Add a third article to be at limit
      await ArticleCache.cacheArticle({ id: 'third', title: 'Third', content: 'x', slug: 'third' }, 'free');

      // Now add fourth - should evict old, not recent
      await ArticleCache.cacheArticle({ id: 'fourth', title: 'Fourth', content: 'x', slug: 'fourth' }, 'free');

      expect(storedResources.has('article:old-article')).toBe(false); // Evicted
      expect(storedResources.has('article:recent-article')).toBe(true); // Protected by grace period
    });

    it('should handle mixed resource types', async () => {
      // Import other cache managers if they exist, or simulate
      // For now, we'll simulate by directly manipulating storage

      // Add some kanji (guest limit: 100)
      for (let i = 0; i < 100; i++) {
        storedResources.set(`kanji:kanji-${i}`, {
          id: `kanji-${i}`,
          type: 'kanji',
          data: { character: `漢${i}` },
          metadata: {
            size: 50 * 1024, // 50KB each
            cachedAt: Date.now() - i * 1000,
            lastAccessed: Date.now() - i * 1000,
            version: '1.0',
            checksum: `checksum-${i}`,
          },
        });
      }

      // Try to add one more kanji as guest - should trigger eviction
      const stats = await evictionEngine.getStorageStats('kanji', 'guest');
      expect(stats.currentCount).toBe(100);
      
      const needsEviction = await evictionEngine.requiresEviction('kanji', 'guest', 50 * 1024);
      expect(needsEviction).toBe(true);

      const result = await evictionEngine.enforceLimit('kanji', 'guest');
      expect(result.success).toBe(true);
      expect(result.evictedCount).toBeGreaterThan(0);
    });

    it('should handle user type transitions', async () => {
      // Start as premium user - cache many articles
      for (let i = 0; i < 10; i++) {
        await ArticleCache.cacheArticle({ 
          id: `premium-article-${i}`, 
          title: `Premium Article ${i}`, 
          content: 'x', 
          slug: `pa-${i}` 
        }, 'monthly');
      }

      expect(storedResources.size).toBe(10);

      // User downgrades to free - next cache should trigger massive eviction
      await ArticleCache.cacheArticle({ 
        id: 'downgraded-article', 
        title: 'After Downgrade', 
        content: 'x', 
        slug: 'downgraded' 
      }, 'free');

      // Should have evicted down to free limit (3)
      expect(storedResources.size).toBe(3);
      expect(storedResources.has('article:downgraded-article')).toBe(true);
    });
  });

  describe('Performance characteristics', () => {
    it('should handle batch eviction efficiently', async () => {
      // Add many resources
      for (let i = 0; i < 20; i++) {
        storedResources.set(`article:bulk-${i}`, {
          id: `bulk-${i}`,
          type: 'article',
          data: { id: `bulk-${i}` },
          metadata: {
            size: 512 * 1024, // 512KB each
            cachedAt: Date.now() - (20 - i) * 60000,
            lastAccessed: Date.now() - (20 - i) * 60000,
            version: '1.0',
            checksum: `bulk-${i}`,
          },
        });
      }

      const startTime = Date.now();
      const result = await evictionEngine.enforceLimit('article', 'free', { batchSize: 10 });
      const duration = Date.now() - startTime;

      expect(result.evictedCount).toBeLessThanOrEqual(10); // Respects batch size
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should provide accurate storage statistics', async () => {
      // Add resources with known sizes
      storedResources.set('article:stats-1', {
        id: 'stats-1',
        type: 'article',
        data: {},
        metadata: {
          size: 2 * 1024 * 1024, // 2MB
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: 'stats1',
        },
      });

      storedResources.set('article:stats-2', {
        id: 'stats-2',
        type: 'article',
        data: {},
        metadata: {
          size: 3 * 1024 * 1024, // 3MB
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: 'stats2',
        },
      });

      const stats = await evictionEngine.getStorageStats('article', 'free');

      expect(stats.currentCount).toBe(2);
      expect(stats.currentSizeBytes).toBe(5 * 1024 * 1024); // 5MB total
      expect(stats.limitCount).toBe(3);
      expect(stats.limitSizeBytes).toBe(10 * 1024 * 1024); // 10MB limit
      expect(stats.utilizationPercent).toBe(66.67); // max(2/3*100, 5/10*100)
    });
  });
});