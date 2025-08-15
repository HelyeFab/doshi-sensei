import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { UserBookmark } from '@/types/news';

export class BookmarkDebugger {
    static async testBookmarkCreation(userId: string): Promise<{ success: boolean; error?: string; data?: any }> {
        if (!db) {
            return { success: false, error: 'Firebase not initialized' };
        }

        try {
            // Create a test bookmark with the exact structure expected by Firestore rules
            const testBookmark: Omit<UserBookmark, 'id'> = {
                userId,
                contentType: 'article',
                contentId: 'test-article-' + Date.now(),
                contentTitle: 'Test Article',
                contentDifficulty: 'beginner',
                bookmarkedAt: new Date(),
                lastReadAt: new Date(),
                readingProgress: 0,
                notes: '',
                tags: [],
                isFavorite: false,
                syncStatus: 'local',
                originalContent: {
                    title: 'Test Article',
                    content: 'Test content',
                    summary: 'Test summary',
                    difficulty: 'beginner',
                    category: 'test',
                    tags: ['test'],
                    estimatedReadingTime: 5,
                    vocabulary: [],
                    kanji: [],
                    publishDate: new Date().toISOString(),
                    source: 'test'
                },
                updatedAt: new Date()
            };

            const bookmarksRef = collection(db, 'user_bookmarks');
            const docRef = await addDoc(bookmarksRef, {
                ...testBookmark,
                bookmarkedAt: Timestamp.fromDate(testBookmark.bookmarkedAt),
                lastReadAt: Timestamp.fromDate(testBookmark.lastReadAt),
                updatedAt: Timestamp.fromDate(testBookmark.updatedAt)
            });

            return {
                success: true,
                data: {
                    bookmarkId: docRef.id,
                    testData: testBookmark
                }
            };

        } catch (error) {
            console.error('❌ Test bookmark creation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    static async testStoryBookmarkCreation(userId: string): Promise<{ success: boolean; error?: string; data?: any }> {
        if (!db) {
            return { success: false, error: 'Firebase not initialized' };
        }

        try {
            // Create a test story bookmark
            const testBookmark: Omit<UserBookmark, 'id'> = {
                userId,
                contentType: 'story',
                contentId: 'test-story-' + Date.now(),
                contentTitle: 'Test Story',
                contentDifficulty: 'beginner',
                bookmarkedAt: new Date(),
                lastReadAt: new Date(),
                readingProgress: 0,
                notes: '',
                tags: [],
                isFavorite: false,
                syncStatus: 'local',
                originalContent: {
                    title: 'Test Story',
                    content: 'Test story content',
                    theme: 'test',
                    jlptLevel: 'N5',
                    difficulty: 'beginner'
                },
                updatedAt: new Date()
            };

            const bookmarksRef = collection(db, 'user_bookmarks');
            const docRef = await addDoc(bookmarksRef, {
                ...testBookmark,
                bookmarkedAt: Timestamp.fromDate(testBookmark.bookmarkedAt),
                lastReadAt: Timestamp.fromDate(testBookmark.lastReadAt),
                updatedAt: Timestamp.fromDate(testBookmark.updatedAt)
            });

            return {
                success: true,
                data: {
                    bookmarkId: docRef.id,
                    testData: testBookmark
                }
            };

        } catch (error) {
            console.error('❌ Test story bookmark creation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
