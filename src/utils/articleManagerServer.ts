import { 
  NewsArticle, 
  ArticleStats
} from '@/types/news';
import admin from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Article Management Configuration
const ARTICLE_CONFIG = {
  maxArticlesPerSource: 50,
  expirationDays: 60,
  freeUserBookmarkLimit: 5,
  premiumUserBookmarkLimit: -1,
  archiveAfterDays: 30,
  cleanupIntervalHours: 24
};

export class ArticleManagerServer {
  private static getDb() {
    try {
      if (!admin.apps.length) {
        throw new Error('Firebase Admin not initialized - no apps found');
      }
      const db = admin.firestore();
      if (!db) {
        throw new Error('Failed to get Firestore instance from Firebase Admin');
      }
      return db;
    } catch (error) {
      console.error('Error getting Firestore database:', error);
      throw error;
    }
  }

  // Get article statistics
  static async getArticleStats(): Promise<ArticleStats> {
    try {
      console.log('Getting article stats from Firebase Admin...');
      const db = this.getDb();
      const articlesRef = db.collection('articles');
      
      // Get all active articles
      const now = Timestamp.now();
      console.log('Querying active articles with timestamp:', now);
      
      // First try to get all articles to see if the collection exists
      let snapshot;
      try {
        snapshot = await articlesRef
          .where('isArchived', '==', false)
          .where('expiresAt', '>', now)
          .get();
      } catch (queryError) {
        console.log('Complex query failed, trying simpler query:', queryError);
        // If the complex query fails, try just getting all articles
        snapshot = await articlesRef.limit(100).get();
      }
      
      console.log(`Found ${snapshot.size} active articles`);
      const articles = snapshot.docs.map(doc => doc.data() as NewsArticle);
    
    // Calculate statistics
    const stats: ArticleStats = {
      totalArticles: articles.length,
      articlesByDifficulty: {
        'N5': 0, 'N4': 0, 'N3': 0, 'N2': 0, 'N1': 0
      },
      articlesBySource: {},
      articlesByCategory: {},
      averageReadingTime: 0,
      totalBookmarks: 0,
      expiringSoon: 0
    };
    
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
    let totalReadingTime = 0;
    
    articles.forEach(article => {
      try {
        // JLPT distribution
        if (article.difficulty && stats.articlesByDifficulty.hasOwnProperty(article.difficulty)) {
          stats.articlesByDifficulty[article.difficulty]++;
        }
        
        // Source distribution
        const sourceName = article.source?.name || 'Unknown';
        stats.articlesBySource[sourceName] = (stats.articlesBySource[sourceName] || 0) + 1;
        
        // Category distribution
        if (article.category) {
          stats.articlesByCategory[article.category] = (stats.articlesByCategory[article.category] || 0) + 1;
        }
        
        // Reading time
        totalReadingTime += article.estimatedReadingTime || 0;
        
        // Bookmarks
        stats.totalBookmarks += (article.bookmarkedBy?.length || 0);
      } catch (articleError) {
        console.error('Error processing article in stats:', articleError, article);
      }
      
      // Expiring soon - handle Firebase Admin Timestamp
      if (article.expiresAt) {
        let expiresAtTime: number;
        
        // Handle Firebase Admin Timestamp
        if (article.expiresAt && typeof article.expiresAt === 'object') {
          if ('toDate' in article.expiresAt && typeof article.expiresAt.toDate === 'function') {
            expiresAtTime = article.expiresAt.toDate().getTime();
          } else if ('_seconds' in article.expiresAt) {
            // Firebase Admin Timestamp has _seconds property
            expiresAtTime = (article.expiresAt as any)._seconds * 1000;
          } else {
            expiresAtTime = new Date(article.expiresAt as any).getTime();
          }
        } else {
          expiresAtTime = new Date(article.expiresAt as any).getTime();
        }
        
        if (expiresAtTime <= sevenDaysFromNow) {
          stats.expiringSoon++;
        }
      }
    });
    
    stats.averageReadingTime = articles.length > 0 ? Math.round(totalReadingTime / articles.length) : 0;
    
    console.log('Article stats calculated successfully:', stats);
    return stats;
    } catch (error) {
      console.error('Error in getArticleStats:', error);
      throw error;
    }
  }
  
  // Cleanup expired articles
  static async cleanupExpiredArticles(): Promise<number> {
    const db = this.getDb();
    const articlesRef = db.collection('articles');
    
    console.log('🧹 Starting cleanup of expired articles...');
    
    const now = Timestamp.now();
    let snapshot;
    try {
      snapshot = await articlesRef
        .where('expiresAt', '<=', now)
        .where('isArchived', '==', false)
        .get();
    } catch (queryError) {
      console.log('Complex query failed in cleanup, trying simpler query:', queryError);
      // If the complex query fails, return 0
      return 0;
    }
    
    const batch = db.batch();
    let deletedCount = 0;
    
    snapshot.docs.forEach(docSnapshot => {
      const article = docSnapshot.data() as NewsArticle;
      
      // If article is bookmarked, move to archive instead of deleting
      if (article.bookmarkedBy && article.bookmarkedBy.length > 0) {
        batch.update(docSnapshot.ref, { isArchived: true });
        console.log(`📦 Archived bookmarked article: ${article.title}`);
      } else {
        batch.delete(docSnapshot.ref);
        deletedCount++;
        console.log(`🗑️ Deleted expired article: ${article.title}`);
      }
    });
    
    await batch.commit();
    console.log(`✅ Cleanup complete: ${deletedCount} articles deleted, ${snapshot.size - deletedCount} archived`);
    
    return deletedCount;
  }
  
  // Refresh articles by calling the scraping functions
  static async refreshArticles(): Promise<{ success: boolean; message: string; stats?: ArticleStats }> {
    try {
      console.log('🔄 Starting article refresh...');
      
      // Call the Netlify scraping functions
      const scrapingFunctions = [
        'https://doshisensei.com/.netlify/functions/scrape-watanoc-real',
        'https://doshisensei.com/.netlify/functions/scrape-todaii-news',
        'https://doshisensei.com/.netlify/functions/scrape-nhk-easy'
      ];
      
      const results = await Promise.allSettled(
        scrapingFunctions.map(async (url) => {
          const response = await fetch(url, { method: 'GET' });
          if (!response.ok) {
            throw new Error(`Scraper returned ${response.status}`);
          }
          return response.json();
        })
      );
      
      // Count successes
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Scraping complete: ${successCount}/${scrapingFunctions.length} scrapers succeeded`);
      
      // Get updated stats
      const stats = await this.getArticleStats();
      
      return {
        success: true,
        message: `Triggered ${successCount} scrapers. Found ${stats.totalArticles} articles total.`,
        stats
      };
    } catch (error) {
      console.error('Error refreshing articles:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to refresh articles'
      };
    }
  }
}

export default ArticleManagerServer;