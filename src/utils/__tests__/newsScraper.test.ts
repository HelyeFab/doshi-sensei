// Tests for Japanese News Scraper
import { JapaneseNewsScraper } from '../newsScraper';
import { NEWS_SOURCES } from '@/types/news';

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Setup global mocks
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('JapaneseNewsScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(JapaneseNewsScraper.initialize()).resolves.not.toThrow();
    });

    test('should return available news sources', () => {
      const sources = JapaneseNewsScraper.getNewsSources();
      expect(sources).toBeInstanceOf(Array);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every(source => source.isActive)).toBe(true);
    });

    test('should get specific news source configuration', () => {
      const nhkSource = JapaneseNewsScraper.getNewsSource(NEWS_SOURCES.NHK_EASY);
      expect(nhkSource).toBeDefined();
      expect(nhkSource?.id).toBe(NEWS_SOURCES.NHK_EASY);
      expect(nhkSource?.name).toBe('NHK Easy');
      expect(nhkSource?.difficulty).toBe('beginner');
    });

    test('should return null for invalid source', () => {
      const invalidSource = JapaneseNewsScraper.getNewsSource('invalid-source');
      expect(invalidSource).toBeNull();
    });
  });

  describe('Article Scraping', () => {
    test('should scrape NHK Easy articles successfully', async () => {
      const result = await JapaneseNewsScraper.scrapeNHKEasy(3);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.articlesScraped).toBeGreaterThan(0);
      expect(result.articlesScraped).toBeLessThanOrEqual(3);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.timeElapsed).toBeGreaterThan(0);
      expect(result.source).toBe(NEWS_SOURCES.NHK_EASY);
    });

    test('should handle scraping errors gracefully', async () => {
      // This test verifies error handling structure
      const result = await JapaneseNewsScraper.scrapeNHKEasy(0);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.errors).toBeInstanceOf(Array);
    });

    test('should cache articles after scraping', async () => {
      await JapaneseNewsScraper.scrapeNHKEasy(2);

      // Verify localStorage.setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('doshi_news_cache_nhk-easy'),
        expect.any(String)
      );
    });
  });

  describe('Article Caching', () => {
    test('should cache and retrieve articles', async () => {
      const mockCacheData = {
        id: 'test-cache',
        sourceId: NEWS_SOURCES.NHK_EASY,
        articles: [
          {
            id: 'test-article-1',
            title: 'テスト記事',
            content: 'テストコンテンツです。',
            url: 'https://example.com/test',
            publishDate: new Date().toISOString(),
            scrapedAt: new Date().toISOString(),
            source: {
              id: NEWS_SOURCES.NHK_EASY,
              name: 'NHK Easy',
              displayName: 'NHK NEWS WEB EASY',
              difficulty: 'beginner' as const
            },
            category: 'general',
            tags: ['テスト'],
            difficulty: 'N4' as const,
            estimatedReadingTime: 1,
            vocabulary: [],
            kanji: []
          }
        ],
        cacheDate: new Date(),
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        totalArticles: 1
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCacheData));

      const cachedArticles = await JapaneseNewsScraper.getCachedArticles(NEWS_SOURCES.NHK_EASY);

      expect(cachedArticles).toBeInstanceOf(Array);
      expect(cachedArticles.length).toBe(1);
      expect(cachedArticles[0].title).toBe('テスト記事');
    });

    test('should return empty array for expired cache', async () => {
      const expiredCacheData = {
        id: 'expired-cache',
        sourceId: NEWS_SOURCES.NHK_EASY,
        articles: [],
        cacheDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago (expired)
        totalArticles: 0
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredCacheData));

      const cachedArticles = await JapaneseNewsScraper.getCachedArticles(NEWS_SOURCES.NHK_EASY);

      expect(cachedArticles).toBeInstanceOf(Array);
      expect(cachedArticles.length).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('doshi_news_cache_nhk-easy');
    });

    test('should clear cache for specific source', async () => {
      await JapaneseNewsScraper.clearCache(NEWS_SOURCES.NHK_EASY);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('doshi_news_cache_nhk-easy');
    });

    test('should clear all news caches', async () => {
      Object.defineProperty(localStorageMock, 'keys', {
        value: ['doshi_news_cache_nhk-easy', 'doshi_news_cache_yahoo-japan', 'other_key'],
        writable: true
      });

      // Mock Object.keys to return our test keys
      const originalKeys = Object.keys;
      Object.keys = jest.fn().mockReturnValue(['doshi_news_cache_nhk-easy', 'doshi_news_cache_yahoo-japan', 'other_key']);

      await JapaneseNewsScraper.clearCache();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('doshi_news_cache_nhk-easy');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('doshi_news_cache_yahoo-japan');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other_key');

      // Restore original Object.keys
      Object.keys = originalKeys;
    });
  });

  describe('Article Retrieval', () => {
    test('should get articles from cache when available', async () => {
      const mockCacheData = {
        id: 'test-cache',
        sourceId: NEWS_SOURCES.NHK_EASY,
        articles: [
          {
            id: 'cached-article',
            title: 'キャッシュ記事',
            content: 'キャッシュされたコンテンツ',
            url: 'https://example.com/cached',
            publishDate: new Date().toISOString(),
            scrapedAt: new Date().toISOString(),
            source: {
              id: NEWS_SOURCES.NHK_EASY,
              name: 'NHK Easy',
              displayName: 'NHK NEWS WEB EASY',
              difficulty: 'beginner' as const
            },
            category: 'general',
            tags: ['キャッシュ'],
            difficulty: 'N5' as const,
            estimatedReadingTime: 1,
            vocabulary: [],
            kanji: []
          }
        ],
        cacheDate: new Date(),
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        totalArticles: 1
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCacheData));

      const articles = await JapaneseNewsScraper.getArticles(NEWS_SOURCES.NHK_EASY, 5, false);

      expect(articles).toBeInstanceOf(Array);
      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe('キャッシュ記事');
    });

    test('should scrape new articles when cache is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const articles = await JapaneseNewsScraper.getArticles(NEWS_SOURCES.NHK_EASY, 2, false);

      expect(articles).toBeInstanceOf(Array);
      expect(articles.length).toBeGreaterThan(0);
    });

    test('should force refresh when requested', async () => {
      // First setup cache
      const mockCacheData = {
        id: 'test-cache',
        sourceId: NEWS_SOURCES.NHK_EASY,
        articles: [{ id: 'old-article' }],
        cacheDate: new Date(),
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        totalArticles: 1
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCacheData));

      // Force refresh should ignore cache and scrape new articles
      const articles = await JapaneseNewsScraper.getArticles(NEWS_SOURCES.NHK_EASY, 2, true);

      expect(articles).toBeInstanceOf(Array);
      // Should get fresh articles, not the cached one
    });
  });

  describe('Health Check', () => {
    test('should perform health check on all sources', async () => {
      const healthStatus = await JapaneseNewsScraper.healthCheck();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthStatus.sources).toBeDefined();
      expect(typeof healthStatus.sources).toBe('object');
    });
  });

  describe('Statistics', () => {
    test('should return scraping statistics', () => {
      const stats = JapaneseNewsScraper.getScrapingStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalSources).toBe('number');
      expect(typeof stats.activeSources).toBe('number');
      expect(typeof stats.cachedArticles).toBe('number');
      expect(stats.totalSources).toBeGreaterThanOrEqual(stats.activeSources);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid source gracefully', async () => {
      await expect(
        JapaneseNewsScraper.getArticles('invalid-source', 5, false)
      ).rejects.toThrow('Unsupported news source: invalid-source');
    });

    test('should handle JSON parsing errors in cache', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const articles = await JapaneseNewsScraper.getCachedArticles(NEWS_SOURCES.NHK_EASY);

      expect(articles).toBeInstanceOf(Array);
      expect(articles.length).toBe(0);
    });
  });
});

describe('Helper Functions', () => {
  // Import helper functions using dynamic import in tests
  let estimateReadingTime: any;
  let categorizeArticle: any;
  let extractDifficulty: any;

  beforeAll(async () => {
    const scraperModule = await import('../newsScraper');
    estimateReadingTime = scraperModule.estimateReadingTime;
    categorizeArticle = scraperModule.categorizeArticle;
    extractDifficulty = scraperModule.extractDifficulty;
  });

  describe('estimateReadingTime', () => {
    test('should estimate reading time for Japanese text', () => {
      const shortText = '今日は良い天気です。';
      const longText = '今日は良い天気です。'.repeat(50);

      const shortTime = estimateReadingTime(shortText);
      const longTime = estimateReadingTime(longText);

      expect(typeof shortTime).toBe('number');
      expect(typeof longTime).toBe('number');
      expect(longTime).toBeGreaterThan(shortTime);
    });
  });

  describe('categorizeArticle', () => {
    test('should categorize weather articles', () => {
      const category = categorizeArticle('雪の予報', '今日は雪が降ります。');
      expect(category).toBe('weather');
    });

    test('should categorize politics articles', () => {
      const category = categorizeArticle('選挙結果', '政府が新しい政策を発表しました。');
      expect(category).toBe('politics');
    });

    test('should default to general category', () => {
      const category = categorizeArticle('その他', 'その他のニュースです。');
      expect(category).toBe('general');
    });
  });

  describe('extractDifficulty', () => {
    test('should extract N5 difficulty for simple text', () => {
      const difficulty = extractDifficulty('これは簡単です。');
      expect(difficulty).toBe('N5');
    });

    test('should extract higher difficulty for complex text', () => {
      const complexText = '経済学的観点から分析すると、この現象は複雑な要因によって引き起こされている。'.repeat(10);
      const difficulty = extractDifficulty(complexText);
      expect(['N3', 'N2', 'N1']).toContain(difficulty);
    });
  });
});
