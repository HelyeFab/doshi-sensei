import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Story, StoryProgress, StoryStats } from '@/types/story';
import { JLPTLevel } from '@/types/kanji';
import { trackStoryRead } from '@/lib/stats/trackingEvents';

class StoryManager {
  private readonly STORIES_COLLECTION = 'stories';
  private readonly PROGRESS_COLLECTION = 'storyProgress';
  private readonly STATS_COLLECTION = 'userStats';

  // Create or update a story (admin only)
  async saveStory(story: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const storyId = story.slug || doc(collection(db, this.STORIES_COLLECTION)).id;
      const storyRef = doc(db, this.STORIES_COLLECTION, storyId);

      const storyData = {
        ...story,
        id: storyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: story.viewCount || 0,
        completionCount: story.completionCount || 0
      };

      await setDoc(storyRef, storyData);
      return storyId;
    } catch (error) {
      console.error('Error saving story:', error);
      throw error;
    }
  }

  // Get a single story by ID
  async getStory(storyId: string): Promise<Story | null> {
    try {
      const storyRef = doc(db, this.STORIES_COLLECTION, storyId);
      const storyDoc = await getDoc(storyRef);

      if (!storyDoc.exists()) {
        return null;
      }

      const data = storyDoc.data();
      const safeDate = (d: any) => d ? (typeof d.toDate === 'function' ? d.toDate() : new Date(d)) : undefined;
      return {
        ...data,
        id: storyDoc.id,
        createdAt: safeDate(data.createdAt) || new Date(),
        updatedAt: safeDate(data.updatedAt) || new Date(),
        publishedAt: safeDate(data.publishedAt)
      } as Story;
    } catch (error) {
      console.error('Error getting story:', error);
      throw error;
    }
  }

  // Get a single story by slug
  async getStoryBySlug(slug: string): Promise<Story | null> {
    try {
      const q = query(
        collection(db, this.STORIES_COLLECTION),
        where('slug', '==', slug),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const safeDate = (d: any) => d ? (typeof d.toDate === 'function' ? d.toDate() : new Date(d)) : undefined;
      
      return {
        ...data,
        id: doc.id,
        createdAt: safeDate(data.createdAt) || new Date(),
        updatedAt: safeDate(data.updatedAt) || new Date(),
        publishedAt: safeDate(data.publishedAt)
      } as Story;
    } catch (error) {
      console.error('Error getting story by slug:', error);
      throw error;
    }
  }

  // Get stories by JLPT level
  async getStoriesByLevel(level: JLPTLevel, limitCount: number = 20): Promise<Story[]> {
    try {
      const q = query(
        collection(db, this.STORIES_COLLECTION),
        where('jlptLevel', '==', level),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Story;
      });
    } catch (error) {
      console.error('Error getting stories by level:', error);
      throw error;
    }
  }

  // Get all published stories
  async getAllStories(limitCount: number = 50): Promise<Story[]> {
    try {
      const q = query(
        collection(db, this.STORIES_COLLECTION),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Story;
      });
    } catch (error) {
      console.error('Error getting all stories:', error);
      throw error;
    }
  }

  // Get stories by theme
  async getStoriesByTheme(theme: string, limitCount: number = 20): Promise<Story[]> {
    try {
      const q = query(
        collection(db, this.STORIES_COLLECTION),
        where('theme', '==', theme),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Story;
      });
    } catch (error) {
      console.error('Error getting stories by theme:', error);
      throw error;
    }
  }

  // Track story view
  async trackStoryView(storyId: string): Promise<void> {
    try {
      const storyRef = doc(db, this.STORIES_COLLECTION, storyId);
      await updateDoc(storyRef, {
        viewCount: increment(1)
      });
    } catch (error) {
      console.error('Error tracking story view:', error);
    }
  }

  // Save user progress
  async saveProgress(userId: string, progress: Omit<StoryProgress, 'userId'>): Promise<void> {
    try {
      const progressId = `${userId}_${progress.storyId}`;
      const progressRef = doc(db, this.PROGRESS_COLLECTION, progressId);

      await setDoc(progressRef, {
        ...progress,
        userId,
        lastReadAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  }

  // Get user progress for a story
  async getUserProgress(userId: string, storyId: string): Promise<StoryProgress | null> {
    try {
      const progressId = `${userId}_${storyId}`;
      const progressRef = doc(db, this.PROGRESS_COLLECTION, progressId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        return null;
      }

      const data = progressDoc.data();
      return {
        ...data,
        lastReadAt: data.lastReadAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate()
      } as StoryProgress;
    } catch (error) {
      console.error('Error getting user progress:', error);
      return null;
    }
  }

  // Mark story as completed
  async markStoryCompleted(userId: string, storyId: string, quizScore?: number): Promise<void> {
    try {
      const progressId = `${userId}_${storyId}`;
      const progressRef = doc(db, this.PROGRESS_COLLECTION, progressId);

      // Get story details for tracking
      const story = await this.getStory(storyId);
      const storyTitle = story?.title || 'Unknown Story';

      await setDoc(progressRef, {
        storyId,
        userId,
        completed: true,
        completedAt: serverTimestamp(),
        quizScore,
        lastReadAt: serverTimestamp()
      }, { merge: true });

      // Update story completion count
      const storyRef = doc(db, this.STORIES_COLLECTION, storyId);
      await updateDoc(storyRef, {
        completionCount: increment(1)
      });

      // Track story completion in stats system
      await trackStoryRead(storyId, storyTitle);

      // Update user stats
      await this.updateUserStoryStats(userId);
    } catch (error) {
      console.error('Error marking story completed:', error);
      throw error;
    }
  }

  // Update user story stats
  private async updateUserStoryStats(userId: string): Promise<void> {
    try {
      const statsRef = doc(db, this.STATS_COLLECTION, userId);
      const today = new Date().toISOString().split('T')[0];

      const statsDoc = await getDoc(statsRef);
      const currentStats = statsDoc.exists() ? statsDoc.data() : {};

      const lastStoryDate = currentStats.storyStats?.lastStoryDate || '';
      const isToday = lastStoryDate === today;

      await setDoc(statsRef, {
        storyStats: {
          totalStoriesRead: increment(1),
          storiesReadToday: isToday ? increment(1) : 1,
          lastStoryDate: today,
          lastUpdated: serverTimestamp()
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error updating story stats:', error);
    }
  }

  // Get user story stats
  async getUserStoryStats(userId: string): Promise<StoryStats> {
    try {
      const statsRef = doc(db, this.STATS_COLLECTION, userId);
      const statsDoc = await getDoc(statsRef);

      if (!statsDoc.exists() || !statsDoc.data().storyStats) {
        return {
          totalStoriesRead: 0,
          storiesReadToday: 0,
          lastStoryDate: '',
          favoriteThemes: [],
          averageQuizScore: 0,
          savedWordsFromStories: 0
        };
      }

      const stats = statsDoc.data().storyStats;
      const today = new Date().toISOString().split('T')[0];
      const isToday = stats.lastStoryDate === today;

      return {
        totalStoriesRead: stats.totalStoriesRead || 0,
        storiesReadToday: isToday ? (stats.storiesReadToday || 0) : 0,
        lastStoryDate: stats.lastStoryDate || '',
        favoriteThemes: stats.favoriteThemes || [],
        averageQuizScore: stats.averageQuizScore || 0,
        savedWordsFromStories: stats.savedWordsFromStories || 0
      };
    } catch (error) {
      console.error('Error getting user story stats:', error);
      return {
        totalStoriesRead: 0,
        storiesReadToday: 0,
        lastStoryDate: '',
        favoriteThemes: [],
        averageQuizScore: 0,
        savedWordsFromStories: 0
      };
    }
  }

  /**
   * @deprecated Use useEntitlements hook instead
   * This function is kept for backward compatibility but should not be used
   * in new code. Use the entitlements system for checking story access.
   */
  async canReadStory(userId: string | null, isPremium: boolean): Promise<boolean> {
    // Always return true - actual checking is done via entitlements system
    console.warn('canReadStory is deprecated. Use useEntitlements hook instead.');
    return true;
  }

  // Generate slug from title
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  }

  // Get all stories (admin: includes drafts and published)
  async getAllStoriesAdmin(limitCount: number = 100): Promise<Story[]> {
    try {
      const q = query(
        collection(db, this.STORIES_COLLECTION),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const safeDate = (d: any) => d ? (typeof d.toDate === 'function' ? d.toDate() : new Date(d)) : undefined;
        return {
          ...data,
          id: doc.id,
          createdAt: safeDate(data.createdAt) || new Date(),
          updatedAt: safeDate(data.updatedAt) || new Date(),
          publishedAt: safeDate(data.publishedAt)
        } as Story;
      });
    } catch (error) {
      console.error('Error getting all stories (admin):', error);
      throw error;
    }
  }

  // Delete a story by ID (admin only)
  async deleteStory(storyId: string): Promise<void> {
    try {
      const storyRef = doc(db, this.STORIES_COLLECTION, storyId);
      await deleteDoc(storyRef);
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storyManager = new StoryManager();
