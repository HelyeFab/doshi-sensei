import {
  NewsArticle,
  ArticleStats
} from '@/types/news';
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
  private static getDb(admin: any) {
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
  static async getArticleStats(admin: any): Promise<ArticleStats> {
    try {

      const db = this.getDb(admin);
      const articlesRef = db.collection('articles');

      // Get all active articles
      const now = Timestamp.now();

      // First try to get all articles to see if the collection exists
      let snapshot;
      try {
        snapshot = await articlesRef
          .where('isArchived', '==', false)
          .where('expiresAt', '>', now)
          .get();
      } catch (queryError) {

        // If the complex query fails, try to get all articles without filters
        try {
          snapshot = await articlesRef.get();
        } catch (fallbackError) {

          // Return empty snapshot if all queries fail
          snapshot = {
            size: 0,
            docs: [],
            empty: true
          } as any;
        }
      }

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

    return stats;
    } catch (error) {
      console.error('Error in getArticleStats:', error);
      throw error;
    }
  }

  // Cleanup expired articles
  static async cleanupExpiredArticles(admin: any): Promise<number> {
    const db = this.getDb(admin);
    const articlesRef = db.collection('articles');

    const now = Timestamp.now();
    let snapshot;
    try {
      snapshot = await articlesRef
        .where('expiresAt', '<=', now)
        .where('isArchived', '==', false)
        .get();
    } catch (queryError) {

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

      } else {
        batch.delete(docSnapshot.ref);
        deletedCount++;

      }
    });

    await batch.commit();

    return deletedCount;
  }

  // Refresh articles (placeholder for future implementation)
  static async refreshArticles(admin: any): Promise<{ success: boolean; message: string; stats?: ArticleStats }> {
    try {
      // This would trigger re-scraping of articles
      // For now, just return current stats
      const stats = await this.getArticleStats(admin);

      return {
        success: true,
        message: 'Article refresh completed',
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
