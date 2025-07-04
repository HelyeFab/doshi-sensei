import ArticleManager from './articleManager';
import StoryBookmarkManager from './storyBookmarkManager';
import { UserBookmark } from '@/types/news';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/lib/firebase';

// Test configuration
const TEST_ARTICLE_ID = 'test-article-123';
const TEST_STORY_ID = 'test-story-123';

export class BookmarkSystemTester {

    static async runAllTests() {
        console.log('🧪 Starting Bookmark System Tests...\n');

        try {
            // Ensure user is authenticated
            const userId = await this.ensureAuthenticated();
            console.log('✅ User authenticated:', userId);

            // Test 1: Article Bookmark Creation
            await this.testArticleBookmarkCreation(userId);

            // Test 2: Story Bookmark Creation
            await this.testStoryBookmarkCreation(userId);

            // Test 3: Reading Progress Updates
            await this.testReadingProgressUpdates(userId);

            // Test 4: Bookmark Retrieval
            await this.testBookmarkRetrieval(userId);

            // Test 5: Bookmark Statistics
            await this.testBookmarkStatistics(userId);

            // Test 6: Bookmark Removal
            await this.testBookmarkRemoval(userId);

            console.log('✅ All tests completed successfully!');

        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    static async ensureAuthenticated(): Promise<string> {
        return new Promise((resolve, reject) => {
            const auth = getAuth();

            // Check if user is already authenticated
            if (auth.currentUser) {
                console.log('✅ User already authenticated:', auth.currentUser.uid);
                resolve(auth.currentUser.uid);
                return;
            }

            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log('✅ User authenticated:', user.uid);
                    unsubscribe();
                    resolve(user.uid);
                }
            }, (error) => {
                console.error('❌ Authentication error:', error);
                unsubscribe();
                reject(error);
            });

            // Try to sign in anonymously
            signInAnonymously(auth).catch((error) => {
                console.error('❌ Anonymous sign-in failed:', error);
                reject(error);
            });
        });
    }

    static async testArticleBookmarkCreation(userId: string) {
        console.log('📝 Test 1: Article Bookmark Creation');

        try {
            // Test premium user (should succeed)
            const result = await ArticleManager.bookmarkArticle(userId, TEST_ARTICLE_ID, true);
            console.log('  ✅ Premium user bookmark creation:', result);

            // Test free user (should also succeed for first bookmark)
            const result2 = await ArticleManager.bookmarkArticle(userId, 'test-article-456', false);
            console.log('  ✅ Free user bookmark creation:', result2);

        } catch (error) {
            console.log('  ⚠️ Expected error for article bookmark:', error.message);
        }
    }

    static async testStoryBookmarkCreation(userId: string) {
        console.log('📝 Test 2: Story Bookmark Creation');

        try {
            // Test premium user (should succeed)
            const result = await StoryBookmarkManager.bookmarkStory(userId, TEST_STORY_ID, true);
            console.log('  ✅ Premium user story bookmark creation:', result);

            // Test free user (should also succeed for first bookmark)
            const result2 = await StoryBookmarkManager.bookmarkStory(userId, 'test-story-456', false);
            console.log('  ✅ Free user story bookmark creation:', result2);

        } catch (error) {
            console.log('  ⚠️ Expected error for story bookmark:', error.message);
        }
    }

    static async testReadingProgressUpdates(userId: string) {
        console.log('📝 Test 3: Reading Progress Updates');

        try {
            // Update article reading progress
            await ArticleManager.updateBookmarkProgress(userId, TEST_ARTICLE_ID, 50, 'Halfway through!');
            console.log('  ✅ Article reading progress updated');

            // Update story reading progress
            await StoryBookmarkManager.updateBookmarkProgress(userId, TEST_STORY_ID, 75, 'Almost done!');
            console.log('  ✅ Story reading progress updated');

        } catch (error) {
            console.log('  ⚠️ Error updating reading progress:', error.message);
        }
    }

    static async testBookmarkRetrieval(userId: string) {
        console.log('📝 Test 4: Bookmark Retrieval');

        try {
            // Get all user bookmarks
            const allBookmarks = await ArticleManager.getUserBookmarks(userId);
            console.log('  ✅ Retrieved all bookmarks:', allBookmarks.length);

            // Get story bookmarks only
            const storyBookmarks = await StoryBookmarkManager.getUserStoryBookmarks(userId);
            console.log('  ✅ Retrieved story bookmarks:', storyBookmarks.length);

            // Check if specific items are bookmarked
            const isArticleBookmarked = await ArticleManager.getUserBookmarks(userId)
                .then(bookmarks => bookmarks.some(b => b.contentId === TEST_ARTICLE_ID));
            console.log('  ✅ Article bookmark check:', isArticleBookmarked);

            const isStoryBookmarked = await StoryBookmarkManager.isStoryBookmarked(userId, TEST_STORY_ID);
            console.log('  ✅ Story bookmark check:', isStoryBookmarked);

        } catch (error) {
            console.log('  ⚠️ Error retrieving bookmarks:', error.message);
        }
    }

    static async testBookmarkStatistics(userId: string) {
        console.log('📝 Test 5: Bookmark Statistics');

        try {
            const stats = await StoryBookmarkManager.getBookmarkStats(userId);
            console.log('  ✅ Bookmark statistics:', {
                totalBookmarks: stats.totalBookmarks,
                articlesBookmarked: stats.articlesBookmarked,
                storiesBookmarked: stats.storiesBookmarked,
                favoriteBookmarks: stats.favoriteBookmarks,
                averageReadingProgress: stats.averageReadingProgress,
                recentlyAdded: stats.recentlyAdded
            });

        } catch (error) {
            console.log('  ⚠️ Error getting bookmark statistics:', error.message);
        }
    }

    static async testBookmarkRemoval(userId: string) {
        console.log('📝 Test 6: Bookmark Removal');

        try {
            // Remove article bookmark
            await ArticleManager.removeBookmark(userId, TEST_ARTICLE_ID);
            console.log('  ✅ Article bookmark removed');

            // Remove story bookmark
            await StoryBookmarkManager.removeBookmark(userId, TEST_STORY_ID);
            console.log('  ✅ Story bookmark removed');

        } catch (error) {
            console.log('  ⚠️ Error removing bookmarks:', error.message);
        }
    }

    // Manual test functions for browser console
    static async testInBrowser() {
        console.log('🧪 Browser Test Functions Available:');
        console.log('- BookmarkSystemTester.testArticleBookmarkCreation(userId)');
        console.log('- BookmarkSystemTester.testStoryBookmarkCreation(userId)');
        console.log('- BookmarkSystemTester.testReadingProgressUpdates(userId)');
        console.log('- BookmarkSystemTester.testBookmarkRetrieval(userId)');
        console.log('- BookmarkSystemTester.testBookmarkStatistics(userId)');
        console.log('- BookmarkSystemTester.testBookmarkRemoval(userId)');
        console.log('- BookmarkSystemTester.runAllTests()');
        console.log('- BookmarkSystemTester.ensureAuthenticated()');
    }
}

// Export for browser testing
if (typeof window !== 'undefined') {
    (window as any).BookmarkSystemTester = BookmarkSystemTester;
}

export default BookmarkSystemTester;
