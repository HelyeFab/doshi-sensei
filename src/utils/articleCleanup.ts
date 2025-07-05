// Article Cleanup Utilities for Doshi Sensei
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  writeBatch,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NewsArticle } from '@/types/news';

// Test article patterns to identify and delete
export const TEST_PATTERNS = {
  titles: [
    'NHK Easy Scraping Test',
    'Todaii Scraping Test',
    'Test Article - Netlify Functions Working',
    'Watanoc Scraping Test',
    'Test Article',
    'Fallback Article'
  ],
  categories: ['test', 'fallback'],
  tags: ['test', 'debug', 'fallback'],
  sourceIds: ['test', 'fallback'],
  contentPatterns: [
    'This is a test article',
    'This is a fallback article',
    'Test article for',
    'Fallback content'
  ]
};

export interface ArticleCleanupResult {
  success: boolean;
  testArticles: NewsArticle[];
  deletedCount?: number;
  error?: string;
}

/**
 * Find all test articles in the database
 */
export async function findTestArticles(): Promise<NewsArticle[]> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const articlesRef = collection(db, 'articles');
    const snapshot = await getDocs(articlesRef);
    
    const testArticles: NewsArticle[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const article: NewsArticle = {
        id: doc.id,
        title: data.title,
        content: data.content,
        summary: data.summary,
        url: data.url,
        imageUrl: data.imageUrl,
        publishDate: data.publishDate instanceof Timestamp ? data.publishDate.toDate() : new Date(data.publishDate),
        scrapedAt: data.scrapedAt instanceof Timestamp ? data.scrapedAt.toDate() : new Date(data.scrapedAt),
        source: data.source,
        category: data.category,
        tags: data.tags || [],
        difficulty: data.difficulty,
        estimatedReadingTime: data.estimatedReadingTime,
        vocabulary: data.vocabulary || [],
        kanji: data.kanji || [],
        hasVideo: data.hasVideo || false,
        hasAudio: data.hasAudio || false,
        isBookmarked: false,
        readingProgress: 0
      };
      
      let isTest = false;
      
      // Check title patterns
      for (const pattern of TEST_PATTERNS.titles) {
        if (article.title && article.title.includes(pattern)) {
          isTest = true;
          break;
        }
      }
      
      // Check category
      if (!isTest && TEST_PATTERNS.categories.includes(article.category)) {
        isTest = true;
      }
      
      // Check tags
      if (!isTest && article.tags && Array.isArray(article.tags)) {
        for (const tag of article.tags) {
          if (TEST_PATTERNS.tags.includes(tag)) {
            isTest = true;
            break;
          }
        }
      }
      
      // Check source ID
      if (!isTest && article.source?.id && TEST_PATTERNS.sourceIds.includes(article.source.id)) {
        isTest = true;
      }
      
      // Check content patterns
      if (!isTest && article.content) {
        for (const pattern of TEST_PATTERNS.contentPatterns) {
          if (article.content.includes(pattern)) {
            isTest = true;
            break;
          }
        }
      }
      
      // Check if it's a fallback article (contains 'fallback' in ID)
      if (!isTest && article.id.includes('fallback')) {
        isTest = true;
      }
      
      if (isTest) {
        testArticles.push(article);
      }
    });
    
    // Sort by date (newest first)
    testArticles.sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
    
    return testArticles;
  } catch (error) {
    console.error('Error finding test articles:', error);
    throw error;
  }
}

/**
 * Delete test articles
 */
export async function deleteTestArticles(articleIds: string[]): Promise<ArticleCleanupResult> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    if (articleIds.length === 0) {
      return { success: true, testArticles: [], deletedCount: 0 };
    }

    const batch = writeBatch(db);
    let deletedCount = 0;

    // Add deletion operations to batch
    for (const articleId of articleIds) {
      try {
        const articleRef = doc(db, 'articles', articleId);
        batch.delete(articleRef);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to queue deletion for ${articleId}:`, error);
      }
    }

    // Execute batch deletion
    await batch.commit();

    return {
      success: true,
      testArticles: [],
      deletedCount
    };
  } catch (error) {
    console.error('Error deleting test articles:', error);
    return {
      success: false,
      testArticles: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get article statistics specifically for test articles
 */
export async function getTestArticleStats(): Promise<{
  totalTestArticles: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  oldestDate?: Date;
  newestDate?: Date;
}> {
  try {
    const testArticles = await findTestArticles();
    
    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    testArticles.forEach(article => {
      // Count by source
      const sourceId = article.source?.id || 'unknown';
      bySource[sourceId] = (bySource[sourceId] || 0) + 1;
      
      // Count by category
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
    });
    
    // Find date range
    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;
    
    if (testArticles.length > 0) {
      oldestDate = testArticles[testArticles.length - 1].scrapedAt;
      newestDate = testArticles[0].scrapedAt;
    }
    
    return {
      totalTestArticles: testArticles.length,
      bySource,
      byCategory,
      oldestDate,
      newestDate
    };
  } catch (error) {
    console.error('Error getting test article stats:', error);
    return {
      totalTestArticles: 0,
      bySource: {},
      byCategory: {}
    };
  }
}

/**
 * Find duplicate articles (same title and source)
 */
export async function findDuplicateArticles(): Promise<Array<{
  title: string;
  source: string;
  articles: NewsArticle[];
}>> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const articlesRef = collection(db, 'articles');
    const snapshot = await getDocs(articlesRef);
    
    const articleMap = new Map<string, NewsArticle[]>();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const article: NewsArticle = {
        id: doc.id,
        title: data.title,
        content: data.content,
        summary: data.summary,
        url: data.url,
        imageUrl: data.imageUrl,
        publishDate: data.publishDate instanceof Timestamp ? data.publishDate.toDate() : new Date(data.publishDate),
        scrapedAt: data.scrapedAt instanceof Timestamp ? data.scrapedAt.toDate() : new Date(data.scrapedAt),
        source: data.source,
        category: data.category,
        tags: data.tags || [],
        difficulty: data.difficulty,
        estimatedReadingTime: data.estimatedReadingTime,
        vocabulary: data.vocabulary || [],
        kanji: data.kanji || [],
        hasVideo: data.hasVideo || false,
        hasAudio: data.hasAudio || false,
        isBookmarked: false,
        readingProgress: 0
      };
      
      const key = `${article.title}|${article.source?.id || 'unknown'}`;
      if (!articleMap.has(key)) {
        articleMap.set(key, []);
      }
      articleMap.get(key)!.push(article);
    });
    
    // Filter to only duplicates
    const duplicates: Array<{ title: string; source: string; articles: NewsArticle[] }> = [];
    
    articleMap.forEach((articles, key) => {
      if (articles.length > 1) {
        const [title, source] = key.split('|');
        duplicates.push({
          title,
          source,
          articles: articles.sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime())
        });
      }
    });
    
    return duplicates;
  } catch (error) {
    console.error('Error finding duplicate articles:', error);
    return [];
  }
}