import {
  NewsArticle,
  UserBookmark,
  ArticlePaginationOptions,
  ArticlePaginationResult,
  ArticleManagementConfig,
  ArticleStats
} from '@/types/news';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';

// Article Management Configuration
const ARTICLE_CONFIG: ArticleManagementConfig = {
  maxArticlesPerSource: 50, // Keep max 50 articles per source
  expirationDays: 60, // Delete articles after 60 days
  freeUserBookmarkLimit: 5, // Free users can bookmark 5 articles
  premiumUserBookmarkLimit: -1, // Premium users unlimited bookmarks (-1)
  archiveAfterDays: 30, // Archive articles after 30 days
  cleanupIntervalHours: 24 // Run cleanup every 24 hours
};

export class ArticleManager {

  // Save scraped articles with expiration date
  static async saveScrapedArticles(articles: NewsArticle[]): Promise<void> {
    if (!db) throw new Error('Firebase not initialized');

    const batch = writeBatch(db);
    const articlesRef = collection(db, 'articles');
    const expiresAt = new Date(Date.now() + ARTICLE_CONFIG.expirationDays * 24 * 60 * 60 * 1000);

    console.log(`💾 Saving ${articles.length} articles with expiration: ${expiresAt.toISOString()}`);

    for (const article of articles) {
      const articleWithExpiration = {
        ...article,
        expiresAt: Timestamp.fromDate(expiresAt),
        publishDate: Timestamp.fromDate(article.publishDate),
        scrapedAt: Timestamp.fromDate(article.scrapedAt),
        viewCount: 0,
        bookmarkedBy: [],
        isArchived: false
      };

      const docRef = doc(articlesRef, article.id);
      batch.set(docRef, articleWithExpiration);
    }

    await batch.commit();
    console.log(`✅ Successfully saved ${articles.length} articles with expiration management`);
  }

  // Get paginated articles with filtering
  static async getArticles(options: ArticlePaginationOptions): Promise<ArticlePaginationResult> {
    if (!db) throw new Error('Firebase not initialized');

    const articlesRef = collection(db, 'articles');
    let q = query(articlesRef);

    // Add filters
    q = query(q, where('isArchived', '==', false)); // Only active articles
    q = query(q, where('expiresAt', '>', Timestamp.now())); // Only non-expired articles

    if (options.difficulty && options.difficulty.length > 0) {
      q = query(q, where('difficulty', 'in', options.difficulty));
    }

    if (options.category && options.category.length > 0) {
      q = query(q, where('category', 'in', options.category));
    }

    if (options.source && options.source.length > 0) {
      q = query(q, where('source.id', 'in', options.source));
    }

    // Add sorting
    const sortField = options.sortBy || 'scrapedAt';
    const sortDirection = options.sortOrder || 'desc';
    q = query(q, orderBy(sortField, sortDirection));

    // Add pagination
    const pageSize = options.limit || 10;
    const offset = (options.page - 1) * pageSize;

    if (offset > 0) {
      // For pagination, we need to get the starting document
      const offsetQuery = query(articlesRef, orderBy(sortField, sortDirection), limit(offset));
      const offsetSnapshot = await getDocs(offsetQuery);
      const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
    }

    q = query(q, limit(pageSize));

    const snapshot = await getDocs(q);
    const articles = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      publishDate: doc.data().publishDate.toDate(),
      scrapedAt: doc.data().scrapedAt.toDate(),
      expiresAt: doc.data().expiresAt?.toDate()
    })) as NewsArticle[];

    // Get total count for pagination
    const totalQuery = query(
      articlesRef,
      where('isArchived', '==', false),
      where('expiresAt', '>', Timestamp.now())
    );
    const totalSnapshot = await getDocs(totalQuery);
    const totalCount = totalSnapshot.size;

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      articles,
      totalCount,
      currentPage: options.page,
      totalPages,
      hasNextPage: options.page < totalPages,
      hasPreviousPage: options.page > 1
    };
  }

  // Bookmark article for user
  static async bookmarkArticle(userId: string, articleId: string, isPremium: boolean): Promise<boolean> {
    if (!db) throw new Error('Firebase not initialized');

    try {
      // Check bookmark limit for free users
      if (!isPremium) {
        const userBookmarks = await this.getUserBookmarks(userId);
        if (userBookmarks.length >= ARTICLE_CONFIG.freeUserBookmarkLimit) {
          throw new Error(`Free users can only bookmark ${ARTICLE_CONFIG.freeUserBookmarkLimit} articles. Upgrade to premium for unlimited bookmarks.`);
        }
      }

      const bookmarksRef = collection(db, 'user_bookmarks');
      const articleRef = doc(db, 'articles', articleId);

      // Get article details
      const articleDoc = await getDoc(articleRef);
      if (!articleDoc.exists()) {
        throw new Error('Article not found');
      }

      const article = articleDoc.data() as NewsArticle;

      // Create enhanced bookmark
      const bookmark: Omit<UserBookmark, 'id'> = {
        userId,
        contentType: 'article',
        contentId: articleId,
        contentTitle: article.title,
        contentDifficulty: article.difficulty,
        bookmarkedAt: new Date(),
        lastReadAt: new Date(),
        readingProgress: 0,
        notes: '',
        tags: [],
        isFavorite: false,
        syncStatus: 'local',
        originalContent: {
          title: article.title,
          content: article.content,
          summary: article.summary,
          difficulty: article.difficulty,
          category: article.category,
          tags: article.tags,
          estimatedReadingTime: article.estimatedReadingTime,
          vocabulary: article.vocabulary,
          kanji: article.kanji,
          publishDate: article.publishDate,
          source: article.source
        },
        updatedAt: new Date()
      };

      const bookmarkDoc = await addDoc(bookmarksRef, {
        ...bookmark,
        bookmarkedAt: Timestamp.fromDate(bookmark.bookmarkedAt),
        lastReadAt: Timestamp.fromDate(bookmark.lastReadAt),
        updatedAt: Timestamp.fromDate(bookmark.updatedAt)
      });

      // Update article bookmarkedBy array
      const currentBookmarkedBy = article.bookmarkedBy || [];
      await updateDoc(articleRef, {
        bookmarkedBy: [...currentBookmarkedBy, userId]
      });

      console.log(`📖 User ${userId} bookmarked article: ${article.title}`);
      return true;

    } catch (error) {
      console.error('Error bookmarking article:', error);
      throw error;
    }
  }

  // Remove bookmark
  static async removeBookmark(userId: string, articleId: string): Promise<void> {
    if (!db) throw new Error('Firebase not initialized');

    const bookmarksRef = collection(db, 'user_bookmarks');
    const q = query(
      bookmarksRef,
      where('userId', '==', userId),
      where('contentType', '==', 'article'),
      where('contentId', '==', articleId)
    );

    console.log('[removeBookmark] userId:', userId, 'articleId:', articleId);

    const snapshot = await getDocs(q);
    console.log('[removeBookmark] Found', snapshot.docs.length, 'docs to delete');
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      console.log('[removeBookmark] Deleting doc id:', doc.id, doc.data());
      batch.delete(doc.ref);
    });

    // Update article bookmarkedBy array
    const articleRef = doc(db, 'articles', articleId);
    const articleDoc = await getDoc(articleRef);

    if (articleDoc.exists()) {
      const article = articleDoc.data() as NewsArticle;
      const updatedBookmarkedBy = (article.bookmarkedBy || []).filter(id => id !== userId);
      batch.update(articleRef, { bookmarkedBy: updatedBookmarkedBy });
    }

    await batch.commit();
    console.log(`📖 User ${userId} removed bookmark for article: ${articleId}`);
  }

  // Get user's bookmarks (with backward compatibility)
  static async getUserBookmarks(userId: string): Promise<UserBookmark[]> {
    if (!db) throw new Error('Firebase not initialized');

    const bookmarksRef = collection(db, 'user_bookmarks');
    const q = query(bookmarksRef, where('userId', '==', userId), orderBy('bookmarkedAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();

      // Handle backward compatibility for old bookmark format
      if (data.articleId) {
        // Convert old format to new format
        return {
          id: doc.id,
          userId: data.userId,
          contentType: 'article' as const,
          contentId: data.articleId,
          contentTitle: data.articleTitle,
          contentDifficulty: data.articleDifficulty,
          bookmarkedAt: data.bookmarkedAt.toDate(),
          lastReadAt: data.lastReadAt?.toDate(),
          readingProgress: data.readingProgress || 0,
          notes: data.notes || '',
          tags: data.tags || [],
          isFavorite: data.isFavorite || false,
          syncStatus: data.syncStatus || 'local',
          originalContent: data.originalContent,
          updatedAt: data.updatedAt?.toDate() || data.bookmarkedAt.toDate()
        } as UserBookmark;
      }

      // New format
      return {
        ...data,
        id: doc.id,
        bookmarkedAt: data.bookmarkedAt.toDate(),
        lastReadAt: data.lastReadAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as UserBookmark;
    });
  }

  // Track article view
  static async trackArticleView(articleId: string, userId?: string): Promise<void> {
    if (!db) throw new Error('Firebase not initialized');

    const articleRef = doc(db, 'articles', articleId);
    const articleDoc = await getDoc(articleRef);

    if (articleDoc.exists()) {
      const currentViewCount = articleDoc.data().viewCount || 0;
      await updateDoc(articleRef, {
        viewCount: currentViewCount + 1,
        lastViewedAt: Timestamp.now()
      });
    }
  }

  // Update bookmark reading progress
  static async updateBookmarkProgress(
    userId: string,
    articleId: string,
    progress: number,
    notes?: string
  ): Promise<void> {
    if (!db) throw new Error('Firebase not initialized');

    const bookmarksRef = collection(db, 'user_bookmarks');
    const q = query(
      bookmarksRef,
      where('userId', '==', userId),
      where('contentType', '==', 'article'),
      where('contentId', '==', articleId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      throw new Error('Bookmark not found');
    }

    const bookmarkDoc = snapshot.docs[0];
    const updateData: any = {
      readingProgress: Math.max(0, Math.min(100, progress)),
      lastReadAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    await updateDoc(bookmarkDoc.ref, updateData);
    console.log(`📖 Updated reading progress for article ${articleId}: ${progress}%`);
  }

  // Cleanup expired articles
  static async cleanupExpiredArticles(): Promise<number> {
    if (!db) throw new Error('Firebase not initialized');

    console.log('🧹 Starting cleanup of expired articles...');

    const articlesRef = collection(db, 'articles');
    const expiredQuery = query(
      articlesRef,
      where('expiresAt', '<=', Timestamp.now()),
      where('isArchived', '==', false)
    );

    const snapshot = await getDocs(expiredQuery);
    const batch = writeBatch(db);
    let deletedCount = 0;

    for (const docSnapshot of snapshot.docs) {
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
    }

    await batch.commit();
    console.log(`✅ Cleanup complete: ${deletedCount} articles deleted, ${snapshot.size - deletedCount} archived`);

    return deletedCount;
  }

  // Get article statistics
  static async getArticleStats(): Promise<ArticleStats> {
    if (!db) throw new Error('Firebase not initialized');

    const articlesRef = collection(db, 'articles');
    const activeQuery = query(
      articlesRef,
      where('isArchived', '==', false),
      where('expiresAt', '>', Timestamp.now())
    );

    const snapshot = await getDocs(activeQuery);
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
      // JLPT distribution
      if (article.difficulty) {
        stats.articlesByDifficulty[article.difficulty]++;
      }

      // Source distribution
      const sourceName = article.source?.name || 'Unknown';
      stats.articlesBySource[sourceName] = (stats.articlesBySource[sourceName] || 0) + 1;

      // Category distribution
      stats.articlesByCategory[article.category] = (stats.articlesByCategory[article.category] || 0) + 1;

      // Reading time
      totalReadingTime += article.estimatedReadingTime || 0;

      // Bookmarks
      stats.totalBookmarks += (article.bookmarkedBy?.length || 0);

      // Expiring soon
      if (article.expiresAt && article.expiresAt.getTime() <= sevenDaysFromNow) {
        stats.expiringSoon++;
      }
    });

    stats.averageReadingTime = articles.length > 0 ? Math.round(totalReadingTime / articles.length) : 0;

    return stats;
  }

  // Force refresh articles by calling scrapers
  static async refreshArticles(): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
      // Call the news scraper
      const { JapaneseNewsScraper } = await import('./newsScraper');
      const result = await JapaneseNewsScraper.scrapeNHKEasy(10);

      if (result.success) {
        // Get fresh articles and save them
        const freshArticles = await JapaneseNewsScraper.getCachedArticles('nhk-easy');
        if (freshArticles.length > 0) {
          await this.saveScrapedArticles(freshArticles);
        }

        const stats = await this.getArticleStats();
        return {
          success: true,
          message: `Successfully refreshed ${freshArticles.length} articles`,
          stats
        };
      } else {
        return {
          success: false,
          message: 'Failed to scrape new articles'
        };
      }
    } catch (error) {
      console.error('Error refreshing articles:', error);
      return {
        success: false,
        message: `Error refreshing articles: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export default ArticleManager;
