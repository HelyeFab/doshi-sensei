import { db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';

export interface ReadingProgress {
  userId: string;
  contentId: string;
  contentType: 'article' | 'story';
  progress: number; // 0-100
  updatedAt: Timestamp;
  // Optional fields for additional tracking
  currentPage?: number;
  totalPages?: number;
  lastReadSection?: string;
  timeSpent?: number; // in seconds
  completed?: boolean;
  completedAt?: Timestamp;
}

export interface LegacyStoryProgress {
  storyId: string;
  userId: string;
  progress: number;
  completed: boolean;
  lastReadAt: any;
  quizScore?: number;
}

class ReadingProgressManager {
  private readonly COLLECTION_NAME = 'reading_progress';
  private readonly LEGACY_COLLECTION = 'storyProgress';

  /**
   * Get the document ID for reading progress
   */
  private getProgressId(userId: string, contentId: string, contentType: 'article' | 'story'): string {
    return `${userId}_${contentType}_${contentId}`;
  }

  /**
   * Save or update reading progress
   */
  async saveProgress(
    userId: string,
    contentId: string,
    contentType: 'article' | 'story',
    progress: number,
    additionalData?: {
      currentPage?: number;
      totalPages?: number;
      lastReadSection?: string;
      timeSpent?: number;
    }
  ): Promise<void> {
    try {
      const progressId = this.getProgressId(userId, contentId, contentType);
      const progressRef = doc(db, this.COLLECTION_NAME, progressId);

      const progressData: ReadingProgress = {
        userId,
        contentId,
        contentType,
        progress: Math.min(100, Math.max(0, progress)), // Ensure 0-100
        updatedAt: Timestamp.now(),
        ...additionalData
      };

      // Mark as completed if progress is 100
      if (progress >= 100) {
        progressData.completed = true;
        progressData.completedAt = Timestamp.now();
      }

      await setDoc(progressRef, progressData, { merge: true });
    } catch (error) {
      console.error('Error saving reading progress:', error);
      throw error;
    }
  }

  /**
   * Get reading progress for a specific content
   */
  async getProgress(
    userId: string,
    contentId: string,
    contentType: 'article' | 'story'
  ): Promise<ReadingProgress | null> {
    try {
      const progressId = this.getProgressId(userId, contentId, contentType);
      const progressRef = doc(db, this.COLLECTION_NAME, progressId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        return null;
      }

      return progressDoc.data() as ReadingProgress;
    } catch (error) {
      console.error('Error getting reading progress:', error);
      return null;
    }
  }

  /**
   * Get all reading progress for a user
   */
  async getUserProgress(
    userId: string,
    contentType?: 'article' | 'story'
  ): Promise<ReadingProgress[]> {
    try {
      const progressRef = collection(db, this.COLLECTION_NAME);
      let q = query(progressRef, where('userId', '==', userId));

      if (contentType) {
        q = query(q, where('contentType', '==', contentType));
      }

      q = query(q, orderBy('updatedAt', 'desc'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ReadingProgress);
    } catch (error) {
      console.error('Error getting user progress:', error);
      return [];
    }
  }

  /**
   * Mark content as completed
   */
  async markCompleted(
    userId: string,
    contentId: string,
    contentType: 'article' | 'story',
    additionalData?: {
      timeSpent?: number;
      quizScore?: number;
    }
  ): Promise<void> {
    await this.saveProgress(userId, contentId, contentType, 100, {
      ...additionalData,
      timeSpent: additionalData?.timeSpent
    });
  }

  /**
   * Delete reading progress
   */
  async deleteProgress(
    userId: string,
    contentId: string,
    contentType: 'article' | 'story'
  ): Promise<void> {
    try {
      const progressId = this.getProgressId(userId, contentId, contentType);
      const progressRef = doc(db, this.COLLECTION_NAME, progressId);
      await deleteDoc(progressRef);
    } catch (error) {
      console.error('Error deleting reading progress:', error);
      throw error;
    }
  }

  /**
   * Get recently read content
   */
  async getRecentlyRead(
    userId: string,
    limitCount: number = 10,
    contentType?: 'article' | 'story'
  ): Promise<ReadingProgress[]> {
    try {
      const progressRef = collection(db, this.COLLECTION_NAME);
      let q = query(
        progressRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      if (contentType) {
        q = query(
          progressRef,
          where('userId', '==', userId),
          where('contentType', '==', contentType),
          orderBy('updatedAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ReadingProgress);
    } catch (error) {
      console.error('Error getting recently read:', error);
      return [];
    }
  }

  /**
   * Migrate from legacy storyProgress to new reading_progress
   */
  async migrateLegacyProgress(userId: string): Promise<{
    migrated: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      migrated: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get all legacy story progress for user
      const legacyRef = collection(db, this.LEGACY_COLLECTION);
      const q = query(legacyRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      for (const doc of snapshot.docs) {
        try {
          const legacyData = doc.data() as LegacyStoryProgress;
          
          // Migrate to new format
          await this.saveProgress(
            legacyData.userId,
            legacyData.storyId,
            'story',
            legacyData.progress,
            {
              timeSpent: 0, // Legacy doesn't track this
            }
          );

          // If completed, mark it
          if (legacyData.completed) {
            await this.markCompleted(
              legacyData.userId,
              legacyData.storyId,
              'story',
              {
                quizScore: legacyData.quizScore
              }
            );
          }

          results.migrated++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to migrate ${doc.id}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error during migration:', error);
      results.errors.push(`Migration failed: ${error}`);
      return results;
    }
  }

  /**
   * Get progress statistics for a user
   */
  async getProgressStats(userId: string): Promise<{
    totalStarted: number;
    totalCompleted: number;
    articlesStarted: number;
    articlesCompleted: number;
    storiesStarted: number;
    storiesCompleted: number;
    averageProgress: number;
  }> {
    try {
      const allProgress = await this.getUserProgress(userId);

      const stats = {
        totalStarted: allProgress.length,
        totalCompleted: allProgress.filter(p => p.completed).length,
        articlesStarted: allProgress.filter(p => p.contentType === 'article').length,
        articlesCompleted: allProgress.filter(p => p.contentType === 'article' && p.completed).length,
        storiesStarted: allProgress.filter(p => p.contentType === 'story').length,
        storiesCompleted: allProgress.filter(p => p.contentType === 'story' && p.completed).length,
        averageProgress: 0
      };

      if (allProgress.length > 0) {
        const totalProgress = allProgress.reduce((sum, p) => sum + p.progress, 0);
        stats.averageProgress = Math.round(totalProgress / allProgress.length);
      }

      return stats;
    } catch (error) {
      console.error('Error getting progress stats:', error);
      return {
        totalStarted: 0,
        totalCompleted: 0,
        articlesStarted: 0,
        articlesCompleted: 0,
        storiesStarted: 0,
        storiesCompleted: 0,
        averageProgress: 0
      };
    }
  }
}

// Export singleton instance
export const readingProgressManager = new ReadingProgressManager();