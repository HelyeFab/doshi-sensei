import {
    UserBookmark,
    BookmarkCreateRequest,
    BookmarkUpdateRequest,
    BookmarkFilters,
    BookmarkStats
} from '@/types/news';
import { Story, StoryBookmark } from '@/types/story';
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
    Timestamp,
    writeBatch
} from 'firebase/firestore';

// Story Bookmark Management Configuration
const STORY_BOOKMARK_CONFIG = {
    freeUserBookmarkLimit: 5, // Free users can bookmark 5 stories
    premiumUserBookmarkLimit: -1, // Premium users unlimited bookmarks (-1)
};

export class StoryBookmarkManager {

    // Bookmark story for user
    static async bookmarkStory(
        userId: string,
        storyId: string,
        isPremium: boolean
    ): Promise<boolean> {
        if (!db) throw new Error('Firebase not initialized');

        try {
            // Check bookmark limit for free users
            if (!isPremium) {
                const userBookmarks = await this.getUserStoryBookmarks(userId);
                if (userBookmarks.length >= STORY_BOOKMARK_CONFIG.freeUserBookmarkLimit) {
                    throw new Error(`Free users can only bookmark ${STORY_BOOKMARK_CONFIG.freeUserBookmarkLimit} stories. Upgrade to premium for unlimited bookmarks.`);
                }
            }

            const bookmarksRef = collection(db, 'user_bookmarks');
            const storyRef = doc(db, 'stories', storyId);

            // Get story details
            const storyDoc = await getDoc(storyRef);
            if (!storyDoc.exists()) {
                throw new Error('Story not found');
            }

            const story = storyDoc.data() as Story;

            // Create enhanced bookmark
            const bookmark: Omit<UserBookmark, 'id'> = {
                userId,
                contentType: 'story',
                contentId: storyId,
                contentTitle: story.title,
                contentDifficulty: story.jlptLevel,
                bookmarkedAt: new Date(),
                lastReadAt: new Date(),
                readingProgress: 0,
                notes: '',
                tags: [],
                isFavorite: false,
                syncStatus: 'local',
                originalContent: {
                    title: story.title,
                    titleJa: story.titleJa,
                    description: story.description,
                    jlptLevel: story.jlptLevel,
                    theme: story.theme,
                    tags: story.tags,
                    pages: story.pages,
                    quiz: story.quiz,
                    coverImageUrl: story.coverImageUrl,
                    slug: story.slug,
                    publishedAt: story.publishedAt
                },
                updatedAt: new Date()
            };

            const bookmarkDoc = await addDoc(bookmarksRef, {
                ...bookmark,
                bookmarkedAt: Timestamp.fromDate(bookmark.bookmarkedAt),
                lastReadAt: Timestamp.fromDate(bookmark.lastReadAt),
                updatedAt: Timestamp.fromDate(bookmark.updatedAt)
            });

            console.log(`📖 User ${userId} bookmarked story: ${story.title}`);
            return true;

        } catch (error) {
            console.error('Error bookmarking story:', error);
            throw error;
        }
    }

    // Remove story bookmark
    static async removeBookmark(userId: string, storyId: string): Promise<void> {
        if (!db) throw new Error('Firebase not initialized');

        const bookmarksRef = collection(db, 'user_bookmarks');
        const q = query(
            bookmarksRef,
            where('userId', '==', userId),
            where('contentType', '==', 'story'),
            where('contentId', '==', storyId)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`📖 User ${userId} removed bookmark for story: ${storyId}`);
    }

    // Get user's story bookmarks
    static async getUserStoryBookmarks(userId: string): Promise<UserBookmark[]> {
        if (!db) throw new Error('Firebase not initialized');

        const bookmarksRef = collection(db, 'user_bookmarks');
        const q = query(
            bookmarksRef,
            where('userId', '==', userId),
            where('contentType', '==', 'story'),
            orderBy('bookmarkedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                bookmarkedAt: data.bookmarkedAt.toDate(),
                lastReadAt: data.lastReadAt?.toDate(),
                updatedAt: data.updatedAt?.toDate()
            } as UserBookmark;
        });
    }

    // Update story bookmark reading progress
    static async updateBookmarkProgress(
        userId: string,
        storyId: string,
        progress: number,
        notes?: string
    ): Promise<void> {
        if (!db) throw new Error('Firebase not initialized');

        const bookmarksRef = collection(db, 'user_bookmarks');
        const q = query(
            bookmarksRef,
            where('userId', '==', userId),
            where('contentType', '==', 'story'),
            where('contentId', '==', storyId)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error('Story bookmark not found');
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
        console.log(`📖 Updated reading progress for story ${storyId}: ${progress}%`);
    }

    // Update bookmark metadata (notes, tags, favorite status)
    static async updateBookmark(
        userId: string,
        storyId: string,
        updates: BookmarkUpdateRequest
    ): Promise<void> {
        if (!db) throw new Error('Firebase not initialized');

        const bookmarksRef = collection(db, 'user_bookmarks');
        const q = query(
            bookmarksRef,
            where('userId', '==', userId),
            where('contentType', '==', 'story'),
            where('contentId', '==', storyId)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error('Story bookmark not found');
        }

        const bookmarkDoc = snapshot.docs[0];
        const updateData: any = {
            updatedAt: Timestamp.now()
        };

        if (updates.notes !== undefined) {
            updateData.notes = updates.notes;
        }

        if (updates.tags !== undefined) {
            updateData.tags = updates.tags;
        }

        if (updates.isFavorite !== undefined) {
            updateData.isFavorite = updates.isFavorite;
        }

        if (updates.readingProgress !== undefined) {
            updateData.readingProgress = Math.max(0, Math.min(100, updates.readingProgress));
        }

        await updateDoc(bookmarkDoc.ref, updateData);
        console.log(`📖 Updated bookmark metadata for story ${storyId}`);
    }

    // Get bookmark statistics for user
    static async getBookmarkStats(userId: string): Promise<BookmarkStats> {
        if (!db) throw new Error('Firebase not initialized');

        const bookmarksRef = collection(db, 'user_bookmarks');
        const q = query(bookmarksRef, where('userId', '==', userId));

        const snapshot = await getDocs(q);
        const bookmarks = snapshot.docs.map(doc => doc.data());

        const storyBookmarks = bookmarks.filter(b => b.contentType === 'story');
        const favoriteBookmarks = storyBookmarks.filter(b => b.isFavorite);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentlyAdded = storyBookmarks.filter(b =>
            b.bookmarkedAt.toDate() >= sevenDaysAgo
        ).length;

        const totalProgress = storyBookmarks.reduce((sum, b) => sum + (b.readingProgress || 0), 0);
        const averageProgress = storyBookmarks.length > 0 ? totalProgress / storyBookmarks.length : 0;

        // Count tags usage
        const tagsUsed: Record<string, number> = {};
        storyBookmarks.forEach(bookmark => {
            if (bookmark.tags) {
                bookmark.tags.forEach(tag => {
                    tagsUsed[tag] = (tagsUsed[tag] || 0) + 1;
                });
            }
        });

        return {
            totalBookmarks: bookmarks.length,
            articlesBookmarked: bookmarks.filter(b => b.contentType === 'article').length,
            storiesBookmarked: storyBookmarks.length,
            favoriteBookmarks: favoriteBookmarks.length,
            averageReadingProgress: Math.round(averageProgress),
            recentlyAdded,
            tagsUsed
        };
    }

    // Check if story is bookmarked by user
    static async isStoryBookmarked(userId: string, storyId: string): Promise<boolean> {
        if (!db) throw new Error('Firebase not initialized');

        const bookmarksRef = collection(db, 'user_bookmarks');
        const q = query(
            bookmarksRef,
            where('userId', '==', userId),
            where('contentType', '==', 'story'),
            where('contentId', '==', storyId)
        );

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }

    // Get bookmark by ID
    static async getBookmarkById(bookmarkId: string): Promise<UserBookmark | null> {
        if (!db) throw new Error('Firebase not initialized');

        const bookmarkRef = doc(db, 'user_bookmarks', bookmarkId);
        const bookmarkDoc = await getDoc(bookmarkRef);

        if (!bookmarkDoc.exists()) {
            return null;
        }

        const data = bookmarkDoc.data();
        return {
            ...data,
            id: bookmarkDoc.id,
            bookmarkedAt: data.bookmarkedAt.toDate(),
            lastReadAt: data.lastReadAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        } as UserBookmark;
    }
}

export default StoryBookmarkManager;
