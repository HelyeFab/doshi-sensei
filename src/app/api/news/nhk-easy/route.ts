// API Route for NHK Easy News Scraping
import { NextRequest, NextResponse } from 'next/server';
import { JapaneseNewsScraper } from '@/utils/newsScraper';
import { NewsAPIResponse } from '@/types/news';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxArticles = parseInt(searchParams.get('limit') || '10');
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(`📰 API: Fetching NHK Easy articles (limit: ${maxArticles}, refresh: ${forceRefresh})`);

    // Initialize scraper
    await JapaneseNewsScraper.initialize();

    // Get articles from cache or scrape
    const articles = await JapaneseNewsScraper.getArticles('nhk-easy', maxArticles, forceRefresh);

    const response: NewsAPIResponse = {
      success: true,
      data: articles,
      pagination: {
        page: 1,
        limit: maxArticles,
        total: articles.length,
        hasNext: false,
        hasPrev: false
      },
      meta: {
        scrapedAt: new Date(),
        source: 'nhk-easy',
        cached: !forceRefresh
      }
    };

    console.log(`✅ API: Successfully returned ${articles.length} NHK Easy articles`);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ API: Error fetching NHK Easy articles:', error);

    const errorResponse: NewsAPIResponse = {
      success: false,
      error: {
        code: 'SCRAPING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch articles'
      }
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { maxArticles = 10 } = await request.json();

    console.log(`📰 API: Manual scraping request for NHK Easy (limit: ${maxArticles})`);

    // Initialize scraper
    await JapaneseNewsScraper.initialize();

    // Force fresh scraping
    const scrapingResult = await JapaneseNewsScraper.scrapeNHKEasy(maxArticles);

    if (scrapingResult.success) {
      const articles = await JapaneseNewsScraper.getCachedArticles('nhk-easy');

      const response: NewsAPIResponse = {
        success: true,
        data: articles,
        meta: {
          scrapedAt: new Date(),
          source: 'nhk-easy',
          cached: false
        }
      };

      console.log(`✅ API: Successfully scraped ${scrapingResult.articlesScraped} new articles`);

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      const errorResponse: NewsAPIResponse = {
        success: false,
        error: {
          code: 'SCRAPING_FAILED',
          message: scrapingResult.errors.map(e => e.message).join(', ')
        }
      };

      return NextResponse.json(errorResponse, {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

  } catch (error) {
    console.error('❌ API: Error in manual scraping:', error);

    const errorResponse: NewsAPIResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
