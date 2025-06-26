// Japanese News Scraper for Doshi Sensei
import {
  NewsArticle,
  NewsSource,
  ScrapingResult,
  ScrapingError,
  CachedNewsData,
  NEWS_SOURCES,
  NEWS_CATEGORIES,
  ExtractedVocabulary,
  ExtractedKanji
} from '@/types/news';
import { JLPTLevel } from '@/types';

// Rate limiting and request management
class RateLimiter {
  private requestTimes: Map<string, number[]> = new Map();

  async checkRateLimit(sourceId: string, requestsPerMinute: number): Promise<boolean> {
    const now = Date.now();
    const sourceRequests = this.requestTimes.get(sourceId) || [];

    // Remove requests older than 1 minute
    const recentRequests = sourceRequests.filter(time => now - time < 60000);

    if (recentRequests.length >= requestsPerMinute) {
      return false; // Rate limit exceeded
    }

    // Add current request
    recentRequests.push(now);
    this.requestTimes.set(sourceId, recentRequests);
    return true;
  }

  async waitForRateLimit(sourceId: string, requestsPerMinute: number): Promise<void> {
    while (!(await this.checkRateLimit(sourceId, requestsPerMinute))) {
      // Wait 30 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}

// News Source Configurations
const NEWS_SOURCE_CONFIGS: Record<string, NewsSource> = {
  [NEWS_SOURCES.NHK_EASY]: {
    id: NEWS_SOURCES.NHK_EASY,
    name: 'NHK Easy',
    displayName: 'NHK NEWS WEB EASY',
    baseUrl: 'https://www3.nhk.or.jp/news/easy/',
    difficulty: 'beginner',
    hasRuby: true,
    isActive: true,
    scrapingConfig: {
      listPageUrl: 'https://www3.nhk.or.jp/news/easy/',
      listItemSelector: '.color-box .content-box a',
      articleSelectors: {
        title: 'h1.article-title, .article-header h1',
        content: '.article-body p, .article-main p',
        date: '.article-date, .date',
        category: '.category-tag, .article-category',
        image: '.article-img img, .content-image img',
        tags: '.tag, .article-tag'
      },
      excludeSelectors: [
        '.ad', '.advertisement', '.related-articles',
        '.social-share', '.article-footer', '.navigation'
      ],
      waitForSelector: '.article-body, .article-main',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    rateLimit: {
      requestsPerMinute: 2,
      burstLimit: 1,
      cooldownSeconds: 30
    }
  },

  [NEWS_SOURCES.YAHOO_JAPAN]: {
    id: NEWS_SOURCES.YAHOO_JAPAN,
    name: 'Yahoo Japan',
    displayName: 'Yahoo!ニュース',
    baseUrl: 'https://news.yahoo.co.jp/',
    difficulty: 'intermediate',
    hasRuby: false,
    isActive: false, // Will implement in Phase 4
    scrapingConfig: {
      listPageUrl: 'https://news.yahoo.co.jp/',
      listItemSelector: '.newsFeed_item a',
      articleSelectors: {
        title: 'h1.title',
        content: '.article_body p',
        date: '.date',
        category: '.category',
        image: '.article_image img'
      }
    },
    rateLimit: {
      requestsPerMinute: 1,
      burstLimit: 1,
      cooldownSeconds: 60
    }
  }
};

// Main News Scraper Class
export class JapaneseNewsScraper {
  private static rateLimiter = new RateLimiter();
  private static isInitialized = false;

  // Initialize the scraper (for future browser setup)
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Future: Initialize Puppeteer browser
    this.isInitialized = true;
  }

  // Get available news sources
  static getNewsSources(): NewsSource[] {
    return Object.values(NEWS_SOURCE_CONFIGS).filter(source => source.isActive);
  }

  // Get specific news source configuration
  static getNewsSource(sourceId: string): NewsSource | null {
    return NEWS_SOURCE_CONFIGS[sourceId] || null;
  }

  // Main scraping function for NHK Easy
  static async scrapeNHKEasy(maxArticles: number = 10): Promise<ScrapingResult> {
    const startTime = Date.now();
    const sourceId = NEWS_SOURCES.NHK_EASY;
    const source = NEWS_SOURCE_CONFIGS[sourceId];
    const errors: ScrapingError[] = [];
    let articlesScraped = 0;

    try {

      // Check rate limiting
      await this.rateLimiter.waitForRateLimit(sourceId, source.rateLimit.requestsPerMinute);

      // Phase 2A: Use real scraping via Netlify Functions
      const scrapedArticles = await this.callNetlifyScrapingFunction(maxArticles);
      articlesScraped = scrapedArticles.length;

      // Cache the articles
      await this.cacheArticles(sourceId, scrapedArticles);


      return {
        success: true,
        articlesScraped,
        errors,
        timeElapsed: Date.now() - startTime,
        nextScrapingTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        source: sourceId
      };

    } catch (error) {
      const scrapingError: ScrapingError = {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        retry: true
      };
      errors.push(scrapingError);

      console.error(`❌ Failed to scrape ${source.displayName}:`, error);

      // Fallback to mock data if real scraping fails
      try {
        const mockArticles = await this.mockScrapeNHKEasy(maxArticles);
        await this.cacheArticles(sourceId, mockArticles);

        return {
          success: true,
          articlesScraped: mockArticles.length,
          errors,
          timeElapsed: Date.now() - startTime,
          nextScrapingTime: new Date(Date.now() + 10 * 60 * 1000), // Retry in 10 minutes
          source: sourceId,
          fallbackUsed: true
        };
      } catch (fallbackError) {
        return {
          success: false,
          articlesScraped,
          errors,
          timeElapsed: Date.now() - startTime,
          source: sourceId
        };
      }
    }
  }

  // Call Netlify Functions for balanced multi-source scraping
  private static async callNetlifyScrapingFunction(maxArticles: number): Promise<NewsArticle[]> {
    try {
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://doshi-sensei.netlify.app'; // Fallback for SSR

      // Split articles evenly between three sources
      const articlesPerSource = Math.ceil(maxArticles / 3);
      
      // Scraping functions to call
      const scrapingFunctions = [
        { url: `${baseUrl}/.netlify/functions/scrape-watanoc-real`, name: 'Watanoc' },
        { url: `${baseUrl}/.netlify/functions/scrape-todaii-news`, name: 'Todaii' },
        { url: `${baseUrl}/.netlify/functions/scrape-nhk-easy`, name: 'NHK Easy' }
      ];

      console.log(`🎯 Balanced scraping: ${articlesPerSource} articles per source (${scrapingFunctions.length} sources)`);

      const allArticles: NewsArticle[] = [];
      const scrapingResults: any[] = [];

      // Call both scraping functions in parallel
      for (const func of scrapingFunctions) {
        try {
          console.log(`📡 Calling ${func.name} scraper...`);
          
          const response = await fetch(`${func.url}?limit=${articlesPerSource}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            console.warn(`⚠️ ${func.name} scraper failed: HTTP ${response.status}`);
            continue;
          }

          const result = await response.json();
          scrapingResults.push({ source: func.name, result });

          if (result.success && result.articles) {
            // Transform articles to match our NewsArticle interface
            const transformedArticles = await Promise.all(
              result.articles.map(async (article: any) => ({
                ...article,
                publishDate: new Date(article.publishDate),
                scrapedAt: new Date(article.scrapedAt),
                // Keep original source info from scraper
                vocabulary: await this.extractVocabulary(article.content),
                kanji: await this.extractKanji(article.content)
              }))
            );

            allArticles.push(...transformedArticles);
            console.log(`✅ ${func.name}: ${transformedArticles.length} articles scraped`);
          } else {
            console.warn(`⚠️ ${func.name} returned no articles or failed`);
          }
        } catch (error) {
          console.error(`❌ ${func.name} scraping error:`, error);
        }
      }

      // Log distribution summary
      const sourceDistribution = allArticles.reduce((acc: any, article) => {
        const source = article.source?.name || 'Unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const jlptDistribution = allArticles.reduce((acc: any, article) => {
        const level = article.difficulty || 'Unknown';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});

      console.log(`📊 Source distribution:`, sourceDistribution);
      console.log(`📊 JLPT distribution:`, jlptDistribution);

      // Shuffle to mix sources and return requested amount
      const shuffledArticles = allArticles.sort(() => Math.random() - 0.5);
      return shuffledArticles.slice(0, maxArticles);

    } catch (error) {
      console.error('❌ Failed to call Netlify scraping functions:', error);
      throw error;
    }
  }

  // Mock scraper for development and testing (Phase 1)
  private static async mockScrapeNHKEasy(maxArticles: number): Promise<NewsArticle[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockArticles: NewsArticle[] = [
      {
        id: 'nhk-easy-1',
        title: '新しい年になって初めての雪が降りました',
        content: '今日、東京で新しい年になって初めての雪が降りました。雪は朝から降り始めて、午後まで続きました。道路や公園は白くなりました。気象庁は、明日も雪が降る可能性があると発表しました。車を運転する人は気をつけてください。',
        summary: '東京で今年初めての雪が降り、道路や公園が白くなった。',
        url: 'https://www3.nhk.or.jp/news/easy/k12345678901/k12345678901.html',
        imageUrl: 'https://www3.nhk.or.jp/news/easy/image/snow.jpg',
        publishDate: new Date('2025-01-15T10:00:00Z'),
        scrapedAt: new Date(),
        source: NEWS_SOURCE_CONFIGS[NEWS_SOURCES.NHK_EASY],
        category: NEWS_CATEGORIES.WEATHER,
        tags: ['雪', '天気', '東京'],
        difficulty: 'N4' as JLPTLevel,
        estimatedReadingTime: 2,
        vocabulary: this.extractMockVocabulary('今日、東京で新しい年になって初めての雪が降りました。'),
        kanji: this.extractMockKanji('今日、東京で新しい年になって初めての雪が降りました。')
      },
      {
        id: 'nhk-easy-2',
        title: '日本の人口が減っています',
        content: '日本の人口は毎年減っています。去年、日本の人口は約125万人減りました。これは今までで一番多い減少です。出生率が低くなっていることと、高齢化が進んでいることが原因です。政府は人口減少を止めるための対策を考えています。',
        summary: '日本の人口が過去最大の125万人減少した。',
        url: 'https://www3.nhk.or.jp/news/easy/k12345678902/k12345678902.html',
        publishDate: new Date('2025-01-14T15:30:00Z'),
        scrapedAt: new Date(),
        source: NEWS_SOURCE_CONFIGS[NEWS_SOURCES.NHK_EASY],
        category: NEWS_CATEGORIES.SOCIETY,
        tags: ['人口', '社会', '統計'],
        difficulty: 'N3' as JLPTLevel,
        estimatedReadingTime: 3,
        vocabulary: this.extractMockVocabulary('日本の人口は毎年減っています。'),
        kanji: this.extractMockKanji('日本の人口は毎年減っています。')
      },
      {
        id: 'nhk-easy-3',
        title: '新しい電車が運行を開始しました',
        content: 'JR東日本は、新しい電車の運行を開始しました。この電車は、従来の電車よりも速く走ることができます。また、車内はとても静かで、乗り心地が良いです。WiFiも使えるので、乗客は電車の中でインターネットを使うことができます。',
        summary: 'JR東日本が新しい高速電車の運行を開始した。',
        url: 'https://www3.nhk.or.jp/news/easy/k12345678903/k12345678903.html',
        publishDate: new Date('2025-01-13T08:45:00Z'),
        scrapedAt: new Date(),
        source: NEWS_SOURCE_CONFIGS[NEWS_SOURCES.NHK_EASY],
        category: NEWS_CATEGORIES.TECHNOLOGY,
        tags: ['電車', '交通', '技術'],
        difficulty: 'N5' as JLPTLevel,
        estimatedReadingTime: 2,
        vocabulary: this.extractMockVocabulary('新しい電車が運行を開始しました。'),
        kanji: this.extractMockKanji('新しい電車が運行を開始しました。')
      }
    ];

    return mockArticles.slice(0, maxArticles);
  }

  // Enhanced vocabulary extraction using WaniKani API
  private static async extractVocabulary(text: string): Promise<ExtractedVocabulary[]> {
    try {
      const { VocabularyAnalyzer } = await import('./vocabularyAnalyzer');
      return await VocabularyAnalyzer.analyzeVocabulary(text);
    } catch (error) {
      console.warn('Error in vocabulary analysis, using fallback:', error);
      return this.extractMockVocabulary(text);
    }
  }

  // Enhanced kanji extraction using WaniKani API
  private static async extractKanji(text: string): Promise<ExtractedKanji[]> {
    try {
      const { VocabularyAnalyzer } = await import('./vocabularyAnalyzer');
      return await VocabularyAnalyzer.analyzeKanji(text);
    } catch (error) {
      console.warn('Error in kanji analysis, using fallback:', error);
      return this.extractMockKanji(text);
    }
  }

  // Fallback vocabulary extraction (kept for compatibility)
  private static extractMockVocabulary(text: string): ExtractedVocabulary[] {
    const mockVocab: ExtractedVocabulary[] = [
      { word: '今日', reading: 'きょう', position: 0, length: 2, isKnown: true, jlptLevel: 'N5' as JLPTLevel },
      { word: '東京', reading: 'とうきょう', position: 3, length: 2, isKnown: true, jlptLevel: 'N5' as JLPTLevel },
      { word: '新しい', reading: 'あたらしい', position: 6, length: 3, isKnown: true, jlptLevel: 'N5' as JLPTLevel },
      { word: '降る', reading: 'ふる', position: 15, length: 2, isKnown: false, jlptLevel: 'N4' as JLPTLevel }
    ];

    return mockVocab;
  }

  // Fallback kanji extraction (kept for compatibility)
  private static extractMockKanji(text: string): ExtractedKanji[] {
    const mockKanji: ExtractedKanji[] = [
      { kanji: '今', position: 0, meaning: 'now', readings: ['こん', 'いま'], jlptLevel: 'N5' as JLPTLevel, isKnown: true },
      { kanji: '日', position: 1, meaning: 'day', readings: ['にち', 'ひ'], jlptLevel: 'N5' as JLPTLevel, isKnown: true },
      { kanji: '東', position: 3, meaning: 'east', readings: ['とう', 'ひがし'], jlptLevel: 'N5' as JLPTLevel, isKnown: true },
      { kanji: '京', position: 4, meaning: 'capital', readings: ['きょう', 'けい'], jlptLevel: 'N5' as JLPTLevel, isKnown: true }
    ];

    return mockKanji;
  }

  // Cache articles in storage system
  private static async cacheArticles(sourceId: string, articles: NewsArticle[]): Promise<void> {
    try {
      // Integration with existing storage system
      const cacheData: CachedNewsData = {
        id: `news-cache-${sourceId}-${Date.now()}`,
        sourceId,
        articles,
        cacheDate: new Date(),
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        totalArticles: articles.length
      };

      // Store in localStorage for now (will integrate with IndexedDB later)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`doshi_news_cache_${sourceId}`, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Failed to cache articles:', error);
    }
  }

  // Get cached articles
  static async getCachedArticles(sourceId: string): Promise<NewsArticle[]> {
    try {
      if (typeof window === 'undefined') return [];

      const cached = localStorage.getItem(`doshi_news_cache_${sourceId}`);
      if (!cached) {
        return [];
      }

      const cacheData: CachedNewsData = JSON.parse(cached);

      // Check if cache is expired
      const expiryDate = new Date(cacheData.expiryDate);
      if (new Date() > expiryDate) {
        localStorage.removeItem(`doshi_news_cache_${sourceId}`);
        return [];
      }

      // Parse dates back to Date objects for articles
      const articles: NewsArticle[] = cacheData.articles.map(article => ({
        ...article,
        publishDate: new Date(article.publishDate),
        scrapedAt: new Date(article.scrapedAt)
      }));

      return articles;
    } catch (error) {
      console.error('Failed to get cached articles:', error);
      return [];
    }
  }

  // Clear cache for a source
  static async clearCache(sourceId?: string): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      if (sourceId) {
        localStorage.removeItem(`doshi_news_cache_${sourceId}`);
      } else {
        // Clear all news caches
        const keys = Object.keys(localStorage).filter(key => key.startsWith('doshi_news_cache_'));
        keys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Get articles from cache or scrape if needed
  static async getArticles(sourceId: string, maxArticles: number = 10, forceRefresh: boolean = false): Promise<NewsArticle[]> {
    try {

      // Check cache first (unless forced refresh)
      if (!forceRefresh) {
        const cachedArticles = await this.getCachedArticles(sourceId);
        if (cachedArticles.length > 0) {
          return cachedArticles.slice(0, maxArticles);
        }
      }

      // Scrape fresh articles
      let scrapingResult: ScrapingResult;

      switch (sourceId) {
        case NEWS_SOURCES.NHK_EASY:
          scrapingResult = await this.scrapeNHKEasy(maxArticles);
          break;
        default:
          throw new Error(`Unsupported news source: ${sourceId}`);
      }


      if (scrapingResult.success) {
        // Get the articles from cache after scraping
        const freshArticles = await this.getCachedArticles(sourceId);
        return freshArticles.slice(0, maxArticles);
      } else {
        throw new Error(`Failed to scrape ${sourceId}: ${scrapingResult.errors.map(e => e.message).join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ Failed to get articles for ${sourceId}:`, error);
      throw error;
    }
  }

  // Health check for scraping system
  static async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; sources: Record<string, boolean> }> {
    const sources: Record<string, boolean> = {};
    let healthyCount = 0;

    for (const sourceId of Object.keys(NEWS_SOURCE_CONFIGS)) {
      const source = NEWS_SOURCE_CONFIGS[sourceId];
      if (!source.isActive) {
        sources[sourceId] = false;
        continue;
      }

      try {
        // Quick health check - try to get 1 cached article
        const articles = await this.getCachedArticles(sourceId);
        sources[sourceId] = articles.length > 0;
        if (sources[sourceId]) healthyCount++;
      } catch (error) {
        sources[sourceId] = false;
      }
    }

    const activeSourceCount = Object.values(NEWS_SOURCE_CONFIGS).filter(s => s.isActive).length;
    const status = healthyCount === activeSourceCount ? 'healthy' :
                   healthyCount > 0 ? 'degraded' : 'unhealthy';

    return { status, sources };
  }

  // Get scraping statistics
  static getScrapingStats(): { totalSources: number; activeSources: number; cachedArticles: number } {
    const totalSources = Object.keys(NEWS_SOURCE_CONFIGS).length;
    const activeSources = Object.values(NEWS_SOURCE_CONFIGS).filter(s => s.isActive).length;

    let cachedArticles = 0;
    if (typeof window !== 'undefined') {
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('doshi_news_cache_'));
      for (const key of cacheKeys) {
        try {
          const cacheData: CachedNewsData = JSON.parse(localStorage.getItem(key) || '{}');
          cachedArticles += cacheData.totalArticles || 0;
        } catch (error) {
          // Skip invalid cache entries
        }
      }
    }

    return { totalSources, activeSources, cachedArticles };
  }
}

// Export singleton instance
export default JapaneseNewsScraper;

// Helper functions for article processing
export function estimateReadingTime(content: string, wordsPerMinute: number = 200): number {
  // Japanese reading speed estimation
  const japaneseWPM = 150; // Slower for Japanese text
  const characterCount = content.length;
  const estimatedWords = characterCount / 2; // Rough estimate for Japanese
  return Math.ceil(estimatedWords / japaneseWPM);
}

export function categorizeArticle(title: string, content: string): string {
  const keywords = {
    [NEWS_CATEGORIES.WEATHER]: ['天気', '雨', '雪', '台風', '気温', '天候'],
    [NEWS_CATEGORIES.POLITICS]: ['政治', '選挙', '議員', '国会', '政府', '政策'],
    [NEWS_CATEGORIES.ECONOMICS]: ['経済', '株価', '円', '貿易', '企業', '市場'],
    [NEWS_CATEGORIES.SPORTS]: ['スポーツ', 'サッカー', '野球', 'オリンピック', '試合'],
    [NEWS_CATEGORIES.TECHNOLOGY]: ['技術', 'AI', 'ロボット', 'コンピューター', 'インターネット'],
    [NEWS_CATEGORIES.SOCIETY]: ['社会', '人口', '教育', '医療', '福祉', '事件']
  };

  const text = title + ' ' + content;

  for (const [category, terms] of Object.entries(keywords)) {
    if (terms.some(term => text.includes(term))) {
      return category;
    }
  }

  return NEWS_CATEGORIES.GENERAL;
}

export function extractDifficulty(content: string): JLPTLevel {
  // Simple heuristic based on content length and complexity
  const length = content.length;
  const kanjiCount = (content.match(/[\u4e00-\u9faf]/g) || []).length;
  const kanjiRatio = kanjiCount / length;

  if (length < 200 && kanjiRatio < 0.3) return 'N5';
  if (length < 400 && kanjiRatio < 0.4) return 'N4';
  if (length < 600 && kanjiRatio < 0.5) return 'N3';
  if (length < 800 && kanjiRatio < 0.6) return 'N2';
  return 'N1';
}
