// Watanoc Articles Manager for Doshi Sensei
import { NewsArticle, NewsSource, ScrapingResult } from '@/types/news';
import { JLPTLevel } from '@/types';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  deleteDoc,
  writeBatch,
  documentId,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Watanoc Article Data Interface
export interface WatanocArticleData {
  lastUpdated: string;
  source: string;
  totalArticles: number;
  metadata: {
    scrapedAt: string;
    source: string;
    articleCount: number;
    nextScrapeTime?: string;
    error?: string;
  };
  articles: NewsArticle[];
}

// Cache for articles to avoid repeated fetches
let articlesCache: NewsArticle[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear any existing cache on module load
articlesCache = null;
cacheTimestamp = 0;

/**
 * Fetch articles from Firebase Firestore
 * Articles are stored by the Netlify function
 * Supports pagination: pass page (1-based) and pageSize for paginated results
 */
export async function getWatanocArticles(forceRefresh: boolean = false, page?: number, pageSize?: number): Promise<NewsArticle[]> {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh && articlesCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      if (page && pageSize) {
        const start = (page - 1) * pageSize;
        return articlesCache.slice(start, start + pageSize);
      }
      return articlesCache;
    }

    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // Query articles from Firestore, ordered by scrapedAt descending
    const articlesCollection = collection(db, 'articles');
    let articlesQuery;
    if (page && pageSize) {
      // Paginated query
      articlesQuery = query(
        articlesCollection,
        orderBy('scrapedAt', 'desc'),
        limit(page * pageSize)
      );
    } else {
      // No limit: fetch all articles
      articlesQuery = query(
        articlesCollection,
        orderBy('scrapedAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(articlesQuery);

    if (querySnapshot.empty) {
      return [];
    }

    // Process articles from Firestore
    const processedArticles: NewsArticle[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        publishDate: data.publishDate instanceof Timestamp ? data.publishDate.toDate() : new Date(data.publishDate),
        scrapedAt: data.scrapedAt instanceof Timestamp ? data.scrapedAt.toDate() : new Date(data.scrapedAt),
        vocabulary: data.vocabulary || [],
        kanji: data.kanji || [],
        isBookmarked: false,
        readingProgress: 0
      } as NewsArticle;
    });

    // Update cache
    articlesCache = processedArticles;
    cacheTimestamp = Date.now();

    if (page && pageSize) {
      const start = (page - 1) * pageSize;
      return processedArticles.slice(start, start + pageSize);
    }
    return processedArticles;

  } catch (error) {
    console.error('❌ Error fetching Watanoc articles from Firebase:', error);
    // Return empty array if main fetch fails
    return [];
  }
}

/**
 * Trigger the Netlify function to scrape new articles
 * This can be called manually or scheduled
 */
export async function triggerArticleScraping(): Promise<ScrapingResult> {
  try {

    const response = await fetch('/.netlify/functions/scrape-watanoc-real', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'manual',
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Scraping failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Clear cache to force refresh on next request
      articlesCache = null;
      cacheTimestamp = 0;

      return {
        success: true,
        articlesScraped: result.articlesCount || 0,
        errors: [],
        timeElapsed: 0,
        source: 'watanoc',
        nextScrapingTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
      };
    } else {
      return {
        success: false,
        articlesScraped: 0,
        errors: [{
          type: 'unknown',
          message: result.error || 'Unknown scraping error',
          timestamp: new Date(),
          retry: true
        }],
        timeElapsed: 0,
        source: 'watanoc'
      };
    }

  } catch (error) {
    console.error('❌ Error triggering article scraping:', error);

    return {
      success: false,
      articlesScraped: 0,
      errors: [{
        type: 'network',
        message: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date(),
        retry: true
      }],
      timeElapsed: 0,
      source: 'watanoc'
    };
  }
}

/**
 * Get articles by JLPT level
 */
export async function getArticlesByJLPTLevel(level: JLPTLevel, limit?: number): Promise<NewsArticle[]> {
  const articles = await getWatanocArticles();
  const filtered = articles.filter(article => article.difficulty === level);

  return limit ? filtered.slice(0, limit) : filtered;
}

/**
 * Get a single article by ID
 */
export async function getArticleById(articleId: string): Promise<NewsArticle | null> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // Try to get from cache first
    if (articlesCache) {
      const cachedArticle = articlesCache.find(article => article.id === articleId);
      if (cachedArticle) {
        return cachedArticle;
      }
    }

    // If not in cache, fetch from Firestore
    const articleDoc = await getDoc(doc(db, 'articles', articleId));

    if (!articleDoc.exists()) {
      return null;
    }

    const data = articleDoc.data();
    const article: NewsArticle = {
      ...data,
      id: articleDoc.id,
      publishDate: data.publishDate instanceof Timestamp ? data.publishDate.toDate() : new Date(data.publishDate),
      scrapedAt: data.scrapedAt instanceof Timestamp ? data.scrapedAt.toDate() : new Date(data.scrapedAt),
      vocabulary: data.vocabulary || [],
      kanji: data.kanji || [],
      isBookmarked: false,
      readingProgress: 0
    } as NewsArticle;

    return article;

  } catch (error) {
    console.error('❌ Error fetching article by ID:', error);
    return null;
  }
}

/**
 * Get articles by category
 */
export async function getArticlesByCategory(category: string, limit?: number): Promise<NewsArticle[]> {
  const articles = await getWatanocArticles();
  const filtered = articles.filter(article => article.category === category);

  return limit ? filtered.slice(0, limit) : filtered;
}

/**
 * Search articles by title or content
 */
export async function searchWatanocArticles(query: string): Promise<NewsArticle[]> {
  const articles = await getWatanocArticles();
  const searchTerm = query.toLowerCase();

  return articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm) ||
    article.content.toLowerCase().includes(searchTerm) ||
    article.summary?.toLowerCase().includes(searchTerm) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}


/**
 * Get cache status and metadata
 */
export function getCacheInfo(): {
  isCached: boolean;
  cacheAge: number;
  lastUpdated?: string;
  articleCount?: number;
} {
  return {
    isCached: articlesCache !== null,
    cacheAge: articlesCache ? Date.now() - cacheTimestamp : 0,
    lastUpdated: undefined, // No longer available in simplified cache
    articleCount: articlesCache?.length
  };
}

/**
 * Clear the articles cache and force refresh
 */
export function clearCache(): void {
  articlesCache = null;
  cacheTimestamp = 0;

  // Also clear any potential browser storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('watanoc_articles_cache');
      localStorage.removeItem('articles_cache');
      sessionStorage.removeItem('watanoc_articles_cache');
      sessionStorage.removeItem('articles_cache');
    } catch (e) {
      // Ignore storage errors
    }
  }

}

/**
 * Get article statistics from Firebase
 */
export async function getArticleStats(): Promise<{
  totalArticles: number;
  articlesByLevel: Record<JLPTLevel, number>;
  articlesByCategory: Record<string, number>;
  lastUpdated: string;
}> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // Always calculate fresh stats from articles (skip cached stats)
    // Note: Previously cached stats can be stale after manual deletions
    const articles = await getWatanocArticles();

    const articlesByLevel: Record<JLPTLevel, number> = {
      'N5': 0,
      'N4': 0,
      'N3': 0,
      'N2': 0,
      'N1': 0
    };

    const articlesByCategory: Record<string, number> = {};

    articles.forEach(article => {
      // Count by JLPT level
      if (article.difficulty in articlesByLevel) {
        articlesByLevel[article.difficulty as JLPTLevel]++;
      }

      // Count by category
      articlesByCategory[article.category] = (articlesByCategory[article.category] || 0) + 1;
    });

    return {
      totalArticles: articles.length,
      articlesByLevel,
      articlesByCategory,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error fetching article stats:', error);

    // Return default stats on error
    return {
      totalArticles: 0,
      articlesByLevel: {
        'N5': 0, 'N4': 0, 'N3': 0, 'N2': 0, 'N1': 0
      },
      articlesByCategory: {},
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Delete a single article by ID
 */
export async function deleteArticle(articleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }


    // Delete the article document
    await deleteDoc(doc(db, 'articles', articleId));

    // Clear cache to force refresh
    articlesCache = null;
    cacheTimestamp = 0;


    return { success: true };

  } catch (error) {
    console.error('❌ Error deleting article:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete multiple articles by IDs
 */
export async function deleteArticles(articleIds: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  failedCount: number;
  errors: string[]
}> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    if (articleIds.length === 0) {
      return { success: true, deletedCount: 0, failedCount: 0, errors: [] };
    }


    const batch = writeBatch(db);
    const errors: string[] = [];
    let deletedCount = 0;

    // Add deletion operations to batch
    for (const articleId of articleIds) {
      try {
        const articleRef = doc(db, 'articles', articleId);
        batch.delete(articleRef);
        deletedCount++;
      } catch (error) {
        errors.push(`Failed to queue deletion for ${articleId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Execute batch deletion
    await batch.commit();

    // Clear cache to force refresh
    articlesCache = null;
    cacheTimestamp = 0;

    // Recalculate and update statistics
    try {
      await updateArticleStatistics();
    } catch (error) {
      console.warn('Failed to update statistics after deletion:', error);
    }

    const failedCount = articleIds.length - deletedCount;


    return {
      success: failedCount === 0,
      deletedCount,
      failedCount,
      errors
    };

  } catch (error) {
    console.error('❌ Error in bulk deletion:', error);
    return {
      success: false,
      deletedCount: 0,
      failedCount: articleIds.length,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Delete all articles (with confirmation)
 */
export async function deleteAllArticles(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string
}> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }


    // Get all article IDs
    const articlesQuery = query(collection(db, 'articles'));
    const querySnapshot = await getDocs(articlesQuery);

    if (querySnapshot.empty) {
      return { success: true, deletedCount: 0 };
    }

    const articleIds = querySnapshot.docs.map(doc => doc.id);

    // Use bulk deletion
    const result = await deleteArticles(articleIds);

    if (result.success) {
      return { success: true, deletedCount: result.deletedCount };
    } else {
      return {
        success: false,
        deletedCount: result.deletedCount,
        error: `Failed to delete ${result.failedCount} articles`
      };
    }

  } catch (error) {
    console.error('❌ Error deleting all articles:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update article statistics after deletion
 */
async function updateArticleStatistics(): Promise<void> {
  try {
    if (!db) return;

    // Get current articles
    const articles = await getWatanocArticles(true); // Force refresh

    // Calculate new stats
    const stats = calculateArticleStats(articles);

    // Update metadata document
    const metadataRef = doc(db, 'articlesMetadata', 'stats');
    await setDoc(metadataRef, {
      ...stats,
      lastUpdated: Timestamp.fromDate(new Date())
    }, { merge: true });


  } catch (error) {
    console.error('❌ Error updating article statistics:', error);
    throw error;
  }
}

/**
 * Calculate article statistics for metadata
 */
function calculateArticleStats(articles: NewsArticle[]) {
  const stats = {
    totalArticles: articles.length,
    articlesByLevel: { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 } as Record<JLPTLevel, number>,
    articlesByCategory: {} as Record<string, number>
  };

  articles.forEach(article => {
    // Count by JLPT level
    if (article.difficulty in stats.articlesByLevel) {
      stats.articlesByLevel[article.difficulty as JLPTLevel]++;
    }

    // Count by category
    stats.articlesByCategory[article.category] = (stats.articlesByCategory[article.category] || 0) + 1;
  });

  return stats;
}
