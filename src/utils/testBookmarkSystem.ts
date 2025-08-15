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

        try {
            // Ensure user is authenticated
            const userId = await this.ensureAuthenticated();

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

        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    static async ensureAuthenticated(): Promise<string> {
        return new Promise((resolve, reject) => {
            const auth = getAuth();

            // Check if user is already authenticated
            if (auth.currentUser) {

                resolve(auth.currentUser.uid);
                return;
            }

            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {

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

        try {
            // Test premium user (should succeed)
            const result = await ArticleManager.bookmarkArticle(userId, TEST_ARTICLE_ID, true);

            // Test free user (should also succeed for first bookmark)
            const result2 = await ArticleManager.bookmarkArticle(userId, 'test-article-456', false);

        } catch (error) {

        }
    }

    static async testStoryBookmarkCreation(userId: string) {

        try {
            // Test premium user (should succeed)
            const result = await StoryBookmarkManager.bookmarkStory(userId, TEST_STORY_ID, true);

            // Test free user (should also succeed for first bookmark)
            const result2 = await StoryBookmarkManager.bookmarkStory(userId, 'test-story-456', false);

        } catch (error) {

        }
    }

    static async testReadingProgressUpdates(userId: string) {

        try {
            // Update article reading progress
            await ArticleManager.updateBookmarkProgress(userId, TEST_ARTICLE_ID, 50, 'Halfway through!');

            // Update story reading progress
            await StoryBookmarkManager.updateBookmarkProgress(userId, TEST_STORY_ID, 75, 'Almost done!');

        } catch (error) {

        }
    }

    static async testBookmarkRetrieval(userId: string) {

        try {
            // Get all user bookmarks
            const allBookmarks = await ArticleManager.getUserBookmarks(userId);

            // Get story bookmarks only
            const storyBookmarks = await StoryBookmarkManager.getUserStoryBookmarks(userId);

            // Check if specific items are bookmarked
            const isArticleBookmarked = await ArticleManager.getUserBookmarks(userId)
                .then(bookmarks => bookmarks.some(b => b.contentId === TEST_ARTICLE_ID));

            const isStoryBookmarked = await StoryBookmarkManager.isStoryBookmarked(userId, TEST_STORY_ID);

        } catch (error) {

        }
    }

    static async testBookmarkStatistics(userId: string) {

        try {
            const stats = await StoryBookmarkManager.getBookmarkStats(userId);

        } catch (error) {

        }
    }

    static async testBookmarkRemoval(userId: string) {

        try {
            // Remove article bookmark
            await ArticleManager.removeBookmark(userId, TEST_ARTICLE_ID);

            // Remove story bookmark
            await StoryBookmarkManager.removeBookmark(userId, TEST_STORY_ID);

        } catch (error) {

        }
    }

    // Manual test functions for browser console
    static async testInBrowser() {

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
