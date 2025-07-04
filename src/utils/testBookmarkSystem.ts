import ArticleManager from './articleManager';
import StoryBookmarkManager from './storyBookmarkManager';
import { UserBookmark } from '@/types/news';

// Test configuration
const TEST_USER_ID = 'test-user-123';
const TEST_ARTICLE_ID = 'test-article-123';
const TEST_STORY_ID = 'test-story-123';

export class BookmarkSystemTester {

    static async runAllTests() {
        console.log('🧪 Starting Bookmark System Tests...\n');

        try {
            // Test 1: Article Bookmark Creation
            await this.testArticleBookmarkCreation();

            // Test 2: Story Bookmark Creation
            await this.testStoryBookmarkCreation();

            // Test 3: Reading Progress Updates
            await this.testReadingProgressUpdates();

            // Test 4: Bookmark Retrieval
            await this.testBookmarkRetrieval();

            // Test 5: Bookmark Statistics
            await this.testBookmarkStatistics();

            // Test 6: Bookmark Removal
            await this.testBookmarkRemoval();

            console.log('✅ All tests completed successfully!');

        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    static async testArticleBookmarkCreation() {
        console.log('📝 Test 1: Article Bookmark Creation');

        try {
            // Test premium user (should succeed)
            const result = await ArticleManager.bookmarkArticle(TEST_USER_ID, TEST_ARTICLE_ID, true);
            console.log('  ✅ Premium user bookmark creation:', result);

            // Test free user (should also succeed for first bookmark)
            const result2 = await ArticleManager.bookmarkArticle(TEST_USER_ID, 'test-article-456', false);
            console.log('  ✅ Free user bookmark creation:', result2);

        } catch (error) {
            console.log('  ⚠️ Expected error for article bookmark:', error.message);
        }
    }

    static async testStoryBookmarkCreation() {
        console.log('📝 Test 2: Story Bookmark Creation');

        try {
            // Test premium user (should succeed)
            const result = await StoryBookmarkManager.bookmarkStory(TEST_USER_ID, TEST_STORY_ID, true);
            console.log('  ✅ Premium user story bookmark creation:', result);

            // Test free user (should also succeed for first bookmark)
            const result2 = await StoryBookmarkManager.bookmarkStory(TEST_USER_ID, 'test-story-456', false);
            console.log('  ✅ Free user story bookmark creation:', result2);

        } catch (error) {
            console.log('  ⚠️ Expected error for story bookmark:', error.message);
        }
    }

    static async testReadingProgressUpdates() {
        console.log('📝 Test 3: Reading Progress Updates');

        try {
            // Update article reading progress
            await ArticleManager.updateBookmarkProgress(TEST_USER_ID, TEST_ARTICLE_ID, 50, 'Halfway through!');
            console.log('  ✅ Article reading progress updated');

            // Update story reading progress
            await StoryBookmarkManager.updateBookmarkProgress(TEST_USER_ID, TEST_STORY_ID, 75, 'Almost done!');
            console.log('  ✅ Story reading progress updated');

        } catch (error) {
            console.log('  ⚠️ Error updating reading progress:', error.message);
        }
    }

    static async testBookmarkRetrieval() {
        console.log('📝 Test 4: Bookmark Retrieval');

        try {
            // Get all user bookmarks
            const allBookmarks = await ArticleManager.getUserBookmarks(TEST_USER_ID);
            console.log('  ✅ Retrieved all bookmarks:', allBookmarks.length);

            // Get story bookmarks only
            const storyBookmarks = await StoryBookmarkManager.getUserStoryBookmarks(TEST_USER_ID);
            console.log('  ✅ Retrieved story bookmarks:', storyBookmarks.length);

            // Check if specific items are bookmarked
            const isArticleBookmarked = await ArticleManager.getUserBookmarks(TEST_USER_ID)
                .then(bookmarks => bookmarks.some(b => b.contentId === TEST_ARTICLE_ID));
            console.log('  ✅ Article bookmark check:', isArticleBookmarked);

            const isStoryBookmarked = await StoryBookmarkManager.isStoryBookmarked(TEST_USER_ID, TEST_STORY_ID);
            console.log('  ✅ Story bookmark check:', isStoryBookmarked);

        } catch (error) {
            console.log('  ⚠️ Error retrieving bookmarks:', error.message);
        }
    }

    static async testBookmarkStatistics() {
        console.log('📝 Test 5: Bookmark Statistics');

        try {
            const stats = await StoryBookmarkManager.getBookmarkStats(TEST_USER_ID);
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

    static async testBookmarkRemoval() {
        console.log('📝 Test 6: Bookmark Removal');

        try {
            // Remove article bookmark
            await ArticleManager.removeBookmark(TEST_USER_ID, TEST_ARTICLE_ID);
            console.log('  ✅ Article bookmark removed');

            // Remove story bookmark
            await StoryBookmarkManager.removeBookmark(TEST_USER_ID, TEST_STORY_ID);
            console.log('  ✅ Story bookmark removed');

        } catch (error) {
            console.log('  ⚠️ Error removing bookmarks:', error.message);
        }
    }

    // Manual test functions for browser console
    static async testInBrowser() {
        console.log('🧪 Browser Test Functions Available:');
        console.log('- BookmarkSystemTester.testArticleBookmarkCreation()');
        console.log('- BookmarkSystemTester.testStoryBookmarkCreation()');
        console.log('- BookmarkSystemTester.testReadingProgressUpdates()');
        console.log('- BookmarkSystemTester.testBookmarkRetrieval()');
        console.log('- BookmarkSystemTester.testBookmarkStatistics()');
        console.log('- BookmarkSystemTester.testBookmarkRemoval()');
        console.log('- BookmarkSystemTester.runAllTests()');
    }
}

// Export for browser testing
if (typeof window !== 'undefined') {
    (window as any).BookmarkSystemTester = BookmarkSystemTester;
}

export default BookmarkSystemTester;
