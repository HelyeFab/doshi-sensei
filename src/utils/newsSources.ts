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
    displayName: 'Watanoc Real Japanese News',
    netlifyFunction: 'scrape-watanoc-modern',
    emoji: '🌐',
    description: 'Real Japanese news with JLPT level estimation'
  },
  todaii: {
    id: 'todaii',
    name: 'Todaii',
    displayName: 'Todaii Japanese News - Learning Platform',
    netlifyFunction: 'scrape-todaii-modern',
    emoji: '📚',
    description: 'Japanese learning content with vocabulary focus'
  },
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
 * Trigger all sources sequentially
 */
export async function triggerAllSourcesScraping(): Promise<{
  watanoc: ScrapingResult;
  todaii: ScrapingResult;
  overall: {
    totalArticles: number;
    successfulSources: number;
    failedSources: number;
    totalTimeElapsed: number;
  };
}> {
  console.log('🚀 Triggering all news sources scraping...');

  const startTime = Date.now();

  // Run all scrapers in parallel for faster execution
  const [watanoc, todaii] = await Promise.allSettled([
    triggerWatanocScraping(),
    triggerTodaiiScraping()
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

  const totalTimeElapsed = Math.round((Date.now() - startTime) / 1000);
  const totalArticles = watanocResult.articlesScraped + todaiiResult.articlesScraped;
  const successfulSources = [watanocResult, todaiiResult].filter(r => r.success).length;
  const failedSources = 2 - successfulSources;

  console.log(`✅ All sources scraping completed. Total: ${totalArticles} articles from ${successfulSources}/2 sources`);

  return {
    watanoc: watanocResult,
    todaii: todaiiResult,
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
  triggerAllSourcesScraping,
  NEWS_SOURCES,
  formatScrapingResult,
  getResultEmoji
};
