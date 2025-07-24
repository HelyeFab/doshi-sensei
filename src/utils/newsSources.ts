/**
 * News source scraping utilities for all three sources
 * Handles manual triggering of Watanoc, Todaii, and NHK Easy scrapers
 */

import { ScrapingResult } from '@/types/news';

export interface NewsSourceConfig {
  id: string;
  name: string;
  displayName: string;
  netlifyFunction: string;
  emoji: string;
  description: string;
}

export const NEWS_SOURCES: Record<string, NewsSourceConfig> = {
  watanoc: {
    id: 'watanoc',
    name: 'Watanoc',
    displayName: 'Watanoc Japanese Learning Articles',
    netlifyFunction: 'scrape-watanoc-next',
    emoji: '🏯',
    description: 'Japanese learning articles with proper content extraction'
  },
  todaii: {
    id: 'todaii',
    name: 'Todaii',
    displayName: 'Todaii Japanese News',
    netlifyFunction: 'scrape-todaii-next',
    emoji: '📚',
    description: 'JLPT-graded news articles for learners'
  },
  nhkEasy: {
    id: 'nhkEasy',
    name: 'NHK Easy',
    displayName: 'NHK NEWS WEB EASY',
    netlifyFunction: 'scrape-nhk-easy',
    emoji: '📺',
    description: 'Simplified Japanese news from NHK'
  },
  nhkNews: {
    id: 'nhkNews',
    name: 'NHK News',
    displayName: 'NHK Regular News',
    netlifyFunction: 'scrape-nhk-improved',
    emoji: '📰',
    description: 'Regular NHK news articles (N3 level)'
  },
  yahooNews: {
    id: 'yahooNews',
    name: 'Yahoo News',
    displayName: 'Yahoo! News Japan',
    netlifyFunction: 'scrape-yahoo-news',
    emoji: '🌸',
    description: 'Popular Japanese news portal (N3-N2 level)'
  },
  mainichiShogakusei: {
    id: 'mainichiShogakusei',
    name: 'Mainichi Elementary',
    displayName: '毎日小学生新聞',
    netlifyFunction: 'scrape-mainichi-shogakusei',
    emoji: '🎒',
    description: 'Elementary school newspaper with furigana (N5-N4)'
  },
  mainichiNews: {
    id: 'mainichiNews',
    name: 'Mainichi Shimbun',
    displayName: '毎日新聞',
    netlifyFunction: 'scrape-mainichi-news',
    emoji: '📰',
    description: 'Major Japanese newspaper (N3 level)'
  }
};

/**
 * Base function to trigger any news source scraping
 */
async function triggerSourceScraping(source: NewsSourceConfig): Promise<ScrapingResult> {
  const startTime = Date.now();

  try {
    console.log(`🚀 Triggering ${source.name} scraping...`);

    // Use relative URL - Netlify Dev will proxy it correctly
    const functionsUrl = `/.netlify/functions/${source.netlifyFunction}`;

    console.log(`📡 Triggering ${source.name} scraping via: ${functionsUrl}`);

    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'manual',
        timestamp: new Date().toISOString(),
        source: source.id
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const timeElapsed = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ ${source.name} scraping completed successfully`);
      return {
        success: true,
        articlesScraped: result.articlesCount || 0,
        errors: [],
        timeElapsed: Math.round(timeElapsed / 1000), // Convert to seconds
        source: source.id,
        nextScrapingTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        fallbackUsed: result.fallbackUsed || false
      };
    } else {
      console.error(`❌ ${source.name} scraping failed:`, result.error);
      return {
        success: false,
        articlesScraped: 0,
        errors: [{
          message: result.error || 'Unknown scraping error',
          type: 'unknown' as const,
          timestamp: new Date()
        }],
        timeElapsed: Math.round(timeElapsed / 1000),
        source: source.id,
        nextScrapingTime: new Date(Date.now() + 60 * 60 * 1000) // Retry in 1 hour on failure
      };
    }
  } catch (error) {
    const timeElapsed = Date.now() - startTime;
    console.error(`❌ ${source.name} network error:`, error);

    return {
      success: false,
      articlesScraped: 0,
      errors: [{
        message: error instanceof Error ? error.message : 'Network error',
        type: 'network' as const,
        timestamp: new Date()
      }],
      timeElapsed: Math.round(timeElapsed / 1000),
      source: source.id,
      nextScrapingTime: new Date(Date.now() + 60 * 60 * 1000) // Retry in 1 hour on network error
    };
  }
}

/**
 * Trigger Watanoc article scraping
 */
export async function triggerWatanocScraping(): Promise<ScrapingResult> {
  return triggerSourceScraping(NEWS_SOURCES.watanoc);
}

/**
 * Trigger Todaii article scraping
 */
export async function triggerTodaiiScraping(): Promise<ScrapingResult> {
  return triggerSourceScraping(NEWS_SOURCES.todaii);
}

/**
 * Trigger NHK Easy article scraping
 */
export async function triggerNHKEasyScraping(): Promise<ScrapingResult> {
  return triggerSourceScraping(NEWS_SOURCES.nhkEasy);
}

/**
 * Trigger NHK News (regular) article scraping
 */
export async function triggerNHKNewsScraping(): Promise<ScrapingResult> {
  return triggerSourceScraping(NEWS_SOURCES.nhkNews);
}

/**
 * Trigger Yahoo News article scraping
 */
export async function triggerYahooNewsScraping(): Promise<ScrapingResult> {
  return triggerSourceScraping(NEWS_SOURCES.yahooNews);
}

/**
 * Trigger Mainichi Shogakusei article scraping
 */
export async function triggerMainichiShogakuseiScraping(): Promise<ScrapingResult> {
  return triggerSourceScraping(NEWS_SOURCES.mainichiShogakusei);
}

/**
 * Trigger Mainichi News (regular) article scraping
 */
export async function triggerMainichiNewsScraping(): Promise<ScrapingResult> {
  return triggerSourceScraping(NEWS_SOURCES.mainichiNews);
}


/**
 * Trigger all sources sequentially
 */
export async function triggerAllSourcesScraping(): Promise<{
  watanoc: ScrapingResult;
  todaii: ScrapingResult;
  nhkEasy: ScrapingResult;
  nhkNews: ScrapingResult;
  yahooNews: ScrapingResult;
  mainichiShogakusei: ScrapingResult;
  mainichiNews: ScrapingResult;
  overall: {
    totalArticles: number;
    successfulSources: number;
    failedSources: number;
    totalTimeElapsed: number;
  };
}> {
  console.log('🚀 Triggering all enhanced news sources scraping...');

  const startTime = Date.now();

  // Run all enhanced scrapers in parallel for faster execution
  const [watanoc, todaii, nhkEasy, nhkNews, yahooNews, mainichiShogakusei, mainichiNews] = await Promise.allSettled([
    triggerWatanocScraping(),
    triggerTodaiiScraping(),
    triggerNHKEasyScraping(),
    triggerNHKNewsScraping(),
    triggerYahooNewsScraping(),
    triggerMainichiShogakuseiScraping(),
    triggerMainichiNewsScraping()
  ]);

  // Extract results (handle promise rejections)
  const watanocResult = watanoc.status === 'fulfilled' ? watanoc.value : {
    success: false, articlesScraped: 0, errors: [{ message: 'Promise rejected', type: 'unknown' as const, timestamp: new Date() }],
    timeElapsed: 0, source: 'watanoc', nextScrapingTime: new Date()
  };

  const todaiiResult = todaii.status === 'fulfilled' ? todaii.value : {
    success: false, articlesScraped: 0, errors: [{ message: 'Promise rejected', type: 'unknown' as const, timestamp: new Date() }],
    timeElapsed: 0, source: 'todaii', nextScrapingTime: new Date()
  };

  const nhkEasyResult = nhkEasy.status === 'fulfilled' ? nhkEasy.value : {
    success: false, articlesScraped: 0, errors: [{ message: 'Promise rejected', type: 'unknown' as const, timestamp: new Date() }],
    timeElapsed: 0, source: 'nhkEasy', nextScrapingTime: new Date()
  };

  const nhkNewsResult = nhkNews.status === 'fulfilled' ? nhkNews.value : {
    success: false, articlesScraped: 0, errors: [{ message: 'Promise rejected', type: 'unknown' as const, timestamp: new Date() }],
    timeElapsed: 0, source: 'nhkNews', nextScrapingTime: new Date()
  };

  const yahooNewsResult = yahooNews.status === 'fulfilled' ? yahooNews.value : {
    success: false, articlesScraped: 0, errors: [{ message: 'Promise rejected', type: 'unknown' as const, timestamp: new Date() }],
    timeElapsed: 0, source: 'yahooNews', nextScrapingTime: new Date()
  };

  const mainichiShogakuseiResult = mainichiShogakusei.status === 'fulfilled' ? mainichiShogakusei.value : {
    success: false, articlesScraped: 0, errors: [{ message: 'Promise rejected', type: 'unknown' as const, timestamp: new Date() }],
    timeElapsed: 0, source: 'mainichiShogakusei', nextScrapingTime: new Date()
  };

  const mainichiNewsResult = mainichiNews.status === 'fulfilled' ? mainichiNews.value : {
    success: false, articlesScraped: 0, errors: [{ message: 'Promise rejected', type: 'unknown' as const, timestamp: new Date() }],
    timeElapsed: 0, source: 'mainichiNews', nextScrapingTime: new Date()
  };

  const totalTimeElapsed = Math.round((Date.now() - startTime) / 1000);
  const allResults = [watanocResult, todaiiResult, nhkEasyResult, nhkNewsResult, yahooNewsResult, mainichiShogakuseiResult, mainichiNewsResult];
  const totalArticles = allResults.reduce((sum, r) => sum + r.articlesScraped, 0);
  const successfulSources = allResults.filter(r => r.success).length;
  const failedSources = 7 - successfulSources;

  console.log(`✅ All enhanced sources scraping completed. Total: ${totalArticles} articles from ${successfulSources}/7 sources`);

  return {
    watanoc: watanocResult,
    todaii: todaiiResult,
    nhkEasy: nhkEasyResult,
    nhkNews: nhkNewsResult,
    yahooNews: yahooNewsResult,
    mainichiShogakusei: mainichiShogakuseiResult,
    mainichiNews: mainichiNewsResult,
    overall: {
      totalArticles,
      successfulSources,
      failedSources,
      totalTimeElapsed
    }
  };
}

/**
 * Get the status emoji for a scraping result
 */
export function getResultEmoji(result: ScrapingResult): string {
  if (result.success) {
    if (result.articlesScraped > 0) return '✅';
    return '⚠️'; // Success but no articles
  }
  return '❌'; // Failed
}

/**
 * Format scraping result for display
 */
export function formatScrapingResult(result: ScrapingResult, source: NewsSourceConfig): string {
  const emoji = getResultEmoji(result);
  const sourceName = source.name;

  if (result.success) {
    if (result.articlesScraped > 0) {
      return `${emoji} ${sourceName}: ${result.articlesScraped} articles scraped (${result.timeElapsed}s)`;
    } else {
      return `${emoji} ${sourceName}: No new articles found (${result.timeElapsed}s)`;
    }
  } else {
    const errorMsg = result.errors?.[0]?.message || 'Unknown error';
    return `${emoji} ${sourceName}: Failed - ${errorMsg} (${result.timeElapsed}s)`;
  }
}

export default {
  triggerWatanocScraping,
  triggerTodaiiScraping,
  triggerNHKEasyScraping,
  triggerNHKNewsScraping,
  triggerYahooNewsScraping,
  triggerMainichiShogakuseiScraping,
  triggerMainichiNewsScraping,
  triggerAllSourcesScraping,
  NEWS_SOURCES,
  formatScrapingResult,
  getResultEmoji
};
