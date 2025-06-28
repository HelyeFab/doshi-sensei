/**
 * Article bookmark management system
 * Handles saving/removing bookmarks with user subscription limits
 */

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { NewsArticle } from '@/types/news';

export interface BookmarkedArticle {
  id: string;
  userId: string;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  articleSource: string;
  articleCategory: string;
  articleDifficulty: string;
  articleImageUrl?: string;
  bookmarkedAt: Timestamp;
  metadata?: {
    estimatedReadingTime?: number;
    publishDate?: string;
    [key: string]: any;
  };
}

export interface BookmarkStats {
  totalBookmarks: number;
  bookmarkLimit: number;
  canBookmark: boolean;
  remainingBookmarks: number;
}

export class BookmarkManager {
  private static COLLECTION_NAME = 'user_bookmarks';
  private static FREE_USER_LIMIT = 3;
  private static PREMIUM_USER_LIMIT = -1; // Unlimited

  /**
   * Get bookmark limit for user based on subscription
   */
  static getBookmarkLimit(isPremium: boolean): number {
    return isPremium ? this.PREMIUM_USER_LIMIT : this.FREE_USER_LIMIT;
  }

  /**
   * Get user's bookmark statistics
   */
  static async getBookmarkStats(userId: string, isPremium: boolean): Promise<BookmarkStats> {
    try {
      const bookmarksQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(bookmarksQuery);
      const totalBookmarks = snapshot.size;
      const bookmarkLimit = this.getBookmarkLimit(isPremium);
      
      return {
        totalBookmarks,
        bookmarkLimit,
        canBookmark: bookmarkLimit === -1 || totalBookmarks < bookmarkLimit,
        remainingBookmarks: bookmarkLimit === -1 ? -1 : Math.max(0, bookmarkLimit - totalBookmarks)
      };
    } catch (error) {
      console.error('Error getting bookmark stats:', error);
      // Important fix: When there's an error, we should still allow bookmarking if user is under limit
      // Default to 0 bookmarks and calculate canBookmark based on that
      const bookmarkLimit = this.getBookmarkLimit(isPremium);
      return {
        totalBookmarks: 0,
        bookmarkLimit,
        canBookmark: isPremium || bookmarkLimit > 0, // Allow bookmarking for premium users or free users under limit
        remainingBookmarks: bookmarkLimit === -1 ? -1 : bookmarkLimit
      };
    }
  }

  /**
   * Check if article is bookmarked by user
   */
  static async isArticleBookmarked(userId: string, articleId: string): Promise<boolean> {
    try {
      const bookmarkId = `${userId}_${articleId}`;
      const bookmarkRef = doc(db, this.COLLECTION_NAME, bookmarkId);
      const bookmarkQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('articleId', '==', articleId),
        limit(1)
      );
      
      const snapshot = await getDocs(bookmarkQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  /**
   * Bookmark an article
   */
  static async bookmarkArticle(
    userId: string, 
    article: NewsArticle, 
    isPremium: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user can bookmark more articles
      const stats = await this.getBookmarkStats(userId, isPremium);
      
      if (!stats.canBookmark) {
        return {
          success: false,
          error: isPremium 
            ? 'Bookmark limit reached. Contact support if you need assistance.' 
            : `You've reached your limit of ${this.FREE_USER_LIMIT} bookmarked articles. Upgrade to Premium for unlimited bookmarks!`
        };
      }

      // Check if already bookmarked
      const isBookmarked = await this.isArticleBookmarked(userId, article.id);
      if (isBookmarked) {
        return { success: false, error: 'Article is already bookmarked' };
      }

      // Create bookmark
      const bookmarkId = `${userId}_${article.id}`;
      const bookmarkData: BookmarkedArticle = {
        id: bookmarkId,
        userId,
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: article.url,
        articleSource: article.source || 'news',
        articleCategory: article.category || 'general',
        articleDifficulty: article.difficulty || 'unknown',
        articleImageUrl: article.imageUrl,
        bookmarkedAt: Timestamp.now(),
        metadata: {
          estimatedReadingTime: article.estimatedReadingTime,
          publishDate: article.publishDate,
          vocabulary: article.vocabulary
        }
      };

      await setDoc(doc(db, this.COLLECTION_NAME, bookmarkId), bookmarkData);
      
      console.log(`✅ Article bookmarked: ${article.title}`);
      return { success: true };
    } catch (error) {
      console.error('Error bookmarking article:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to bookmark article' 
      };
    }
  }

  /**
   * Remove bookmark
   */
  static async removeBookmark(userId: string, articleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bookmarkId = `${userId}_${articleId}`;
      await deleteDoc(doc(db, this.COLLECTION_NAME, bookmarkId));
      
      console.log(`🗑️ Bookmark removed for article: ${articleId}`);
      return { success: true };
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove bookmark' 
      };
    }
  }

  /**
   * Toggle bookmark status
   */
  static async toggleBookmark(
    userId: string, 
    article: NewsArticle, 
    isPremium: boolean
  ): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
    try {
      const isCurrentlyBookmarked = await this.isArticleBookmarked(userId, article.id);
      
      if (isCurrentlyBookmarked) {
        const result = await this.removeBookmark(userId, article.id);
        return { ...result, isBookmarked: false };
      } else {
        const result = await this.bookmarkArticle(userId, article, isPremium);
        return { ...result, isBookmarked: result.success };
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return { 
        success: false, 
        isBookmarked: false,
        error: error instanceof Error ? error.message : 'Failed to toggle bookmark' 
      };
    }
  }

  /**
   * Get all bookmarks for a user
   */
  static async getUserBookmarks(userId: string): Promise<BookmarkedArticle[]> {
    try {
      const bookmarksQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('bookmarkedAt', 'desc')
      );
      
      const snapshot = await getDocs(bookmarksQuery);
      return snapshot.docs.map(doc => doc.data() as BookmarkedArticle);
    } catch (error) {
      console.error('Error getting user bookmarks:', error);
      
      // If there's an index error, try without ordering
      if (error instanceof Error && error.message.includes('index')) {
        try {
          const fallbackQuery = query(
            collection(db, this.COLLECTION_NAME),
            where('userId', '==', userId)
          );
          
          const snapshot = await getDocs(fallbackQuery);
          const bookmarks = snapshot.docs.map(doc => doc.data() as BookmarkedArticle);
          
          // Sort manually
          return bookmarks.sort((a, b) => b.bookmarkedAt.toMillis() - a.bookmarkedAt.toMillis());
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
      }
      
      return [];
    }
  }

  /**
   * Get bookmarks with pagination
   */
  static async getUserBookmarksPaginated(
    userId: string, 
    pageSize: number = 10,
    lastBookmarkDate?: Timestamp
  ): Promise<{ bookmarks: BookmarkedArticle[]; hasMore: boolean }> {
    try {
      let bookmarksQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('bookmarkedAt', 'desc'),
        limit(pageSize + 1) // Get one extra to check if there are more
      );

      if (lastBookmarkDate) {
        // Continue from where we left off
        bookmarksQuery = query(
          collection(db, this.COLLECTION_NAME),
          where('userId', '==', userId),
          orderBy('bookmarkedAt', 'desc'),
          where('bookmarkedAt', '<', lastBookmarkDate),
          limit(pageSize + 1)
        );
      }
      
      const snapshot = await getDocs(bookmarksQuery);
      const bookmarks = snapshot.docs.slice(0, pageSize).map(doc => doc.data() as BookmarkedArticle);
      const hasMore = snapshot.docs.length > pageSize;
      
      return { bookmarks, hasMore };
    } catch (error) {
      console.error('Error getting paginated bookmarks:', error);
      return { bookmarks: [], hasMore: false };
    }
  }

  /**
   * Search bookmarks by title or content
   */
  static async searchBookmarks(userId: string, searchTerm: string): Promise<BookmarkedArticle[]> {
    try {
      // Note: Firestore doesn't support full-text search, so this is a basic implementation
      // For production, consider using Algolia or similar for better search
      const bookmarks = await this.getUserBookmarks(userId);
      
      const searchLower = searchTerm.toLowerCase();
      return bookmarks.filter(bookmark => 
        bookmark.articleTitle.toLowerCase().includes(searchLower) ||
        bookmark.articleCategory.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      return [];
    }
  }

  /**
   * Get bookmarks by category
   */
  static async getBookmarksByCategory(userId: string, category: string): Promise<BookmarkedArticle[]> {
    try {
      const bookmarksQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('articleCategory', '==', category),
        orderBy('bookmarkedAt', 'desc')
      );
      
      const snapshot = await getDocs(bookmarksQuery);
      return snapshot.docs.map(doc => doc.data() as BookmarkedArticle);
    } catch (error) {
      console.error('Error getting bookmarks by category:', error);
      return [];
    }
  }

  /**
   * Clear all bookmarks for a user (admin function)
   */
  static async clearAllBookmarks(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bookmarks = await this.getUserBookmarks(userId);
      
      const deletePromises = bookmarks.map(bookmark => 
        deleteDoc(doc(db, this.COLLECTION_NAME, bookmark.id))
      );
      
      await Promise.all(deletePromises);
      
      console.log(`🗑️ Cleared all bookmarks for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error clearing all bookmarks:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear bookmarks' 
      };
    }
  }

  /**
   * Debug bookmark counts across collections
   */
  static async debugBookmarkCounts(userId: string): Promise<void> {
    console.log(`\n🔍 Debugging bookmarks for user: ${userId}\n`);
    
    try {
      // Check current collection
      const stats = await this.getBookmarkStats(userId, false);
      console.log(`📚 BookmarkManager stats:`, stats);
      
      // Check for bookmarks in old ArticleManager collection
      const oldCollectionQuery = query(
        collection(db, 'userBookmarks'), // ArticleManager uses this
        where('userId', '==', userId)
      );
      const oldSnapshot = await getDocs(oldCollectionQuery);
      
      if (oldSnapshot.size > 0) {
        console.log(`\n⚠️  WARNING: Found ${oldSnapshot.size} bookmarks in old 'userBookmarks' collection!`);
        console.log('This might be interfering with bookmark limits.');
        oldSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${data.articleTitle || 'Unknown'} (ID: ${doc.id})`);
        });
      }
      
      // Get actual bookmarks from current system
      const currentBookmarks = await this.getUserBookmarks(userId);
      console.log(`\n📋 Current bookmarks (${currentBookmarks.length}):`);
      currentBookmarks.forEach(bookmark => {
        console.log(`  - ${bookmark.articleTitle} (ID: ${bookmark.articleId})`);
      });
      
    } catch (error) {
      console.error('❌ Error debugging bookmarks:', error);
    }
  }
}

export default BookmarkManager;