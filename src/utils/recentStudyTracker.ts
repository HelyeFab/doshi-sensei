import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

export interface StudyItem {
  id: string;
  type: 'kanji' | 'word' | 'story' | 'hiragana' | 'katakana';
  content: string;
  studiedAt: Date;
  nextReview?: Date;
  reviewCount?: number;
  contextPath?: string;
}

export interface RecentStudyData {
  userId: string;
  items: StudyItem[];
  lastUpdated: Date;
  syncedToCloud?: boolean;
}

/**
 * RecentStudyTracker - Tracks what users have been studying for review reminders
 * Option 2 implementation: Simple tracking of recent study items
 */
export class RecentStudyTracker {
  private static STORAGE_KEY = 'doshi_recent_study_items';
  private static MAX_ITEMS = 50;
  private static REVIEW_INTERVALS = [2, 3, 5, 8, 13, 21, 46]; // Days for spaced repetition

  /**
   * Add an item that was studied
   */
  static async addItem(item: {
    type: 'kanji' | 'word' | 'story' | 'hiragana' | 'katakana';
    content: string;
    contextPath?: string;
  }): Promise<void> {
    try {
      // Create study item
      const studyItem: StudyItem = {
        id: `${item.type}_${item.content}_${Date.now()}`,
        type: item.type,
        content: item.content,
        studiedAt: new Date(),
        nextReview: this.calculateNextReview(0),
        reviewCount: 0,
        contextPath: item.contextPath || window.location.pathname
      };

      // Save to local storage
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const data: RecentStudyData = stored ? JSON.parse(stored) : {
        userId: auth.currentUser?.uid || 'anonymous',
        items: [],
        lastUpdated: new Date()
      };

      // Add new item to beginning
      data.items.unshift(studyItem);
      
      // Keep only recent items
      data.items = data.items.slice(0, this.MAX_ITEMS);
      data.lastUpdated = new Date();

      // Save back to local storage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

      // If user is authenticated, sync to cloud
      if (auth.currentUser) {
        await this.syncToCloud(data);
      }

      // Also update userStats for the notification system
      await this.updateUserStats(item);
      
    } catch (error) {
      console.error('Failed to add study item:', error);
    }
  }

  /**
   * Calculate next review date based on interval index
   */
  static calculateNextReview(intervalIndex: number): Date {
    const days = this.REVIEW_INTERVALS[Math.min(intervalIndex, this.REVIEW_INTERVALS.length - 1)];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    nextDate.setHours(9, 0, 0, 0); // Set to 9 AM
    return nextDate;
  }

  /**
   * Get items that are due for review today
   */
  static async getItemsDueToday(): Promise<StudyItem[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const data: RecentStudyData = JSON.parse(stored);
      const today = new Date().toDateString();

      return data.items.filter(item => {
        if (!item.nextReview) return false;
        const reviewDate = new Date(item.nextReview);
        return reviewDate.toDateString() === today;
      });
    } catch (error) {
      console.error('Failed to get due items:', error);
      return [];
    }
  }

  /**
   * Get all recent study items
   */
  static async getRecentItems(limit: number = 10): Promise<StudyItem[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const data: RecentStudyData = JSON.parse(stored);
      return data.items.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent items:', error);
      return [];
    }
  }

  /**
   * Mark an item as reviewed and calculate next review
   */
  static async reviewItem(itemId: string, difficulty: 'easy' | 'good' | 'hard' | 'again'): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data: RecentStudyData = JSON.parse(stored);
      const itemIndex = data.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) return;

      const item = data.items[itemIndex];
      item.reviewCount = (item.reviewCount || 0) + 1;

      // Calculate next interval based on difficulty
      let nextIntervalIndex = item.reviewCount;
      if (difficulty === 'again') {
        nextIntervalIndex = 0; // Reset to beginning
      } else if (difficulty === 'hard') {
        nextIntervalIndex = Math.max(0, item.reviewCount - 1); // Go back one step
      } else if (difficulty === 'easy') {
        nextIntervalIndex = Math.min(item.reviewCount + 1, this.REVIEW_INTERVALS.length - 1); // Skip ahead
      }

      item.nextReview = this.calculateNextReview(nextIntervalIndex);
      
      // Save updated data
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

      // Sync to cloud if authenticated
      if (auth.currentUser) {
        await this.syncToCloud(data);
      }
    } catch (error) {
      console.error('Failed to review item:', error);
    }
  }

  /**
   * Sync local data to Firestore for premium users
   */
  private static async syncToCloud(data: RecentStudyData): Promise<void> {
    if (!auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, 'users', userId, 'recentStudyItems', 'current');
      
      await setDoc(docRef, {
        ...data,
        userId,
        lastUpdated: serverTimestamp(),
        syncedToCloud: true
      }, { merge: true });

    } catch (error) {
      console.error('Failed to sync to cloud:', error);
    }
  }

  /**
   * Update user stats for notification system compatibility
   */
  private static async updateUserStats(item: { type: string; content: string }): Promise<void> {
    if (!auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;
      const statsRef = doc(db, 'userStats', userId);
      
      // Get current stats
      const statsSnap = await getDoc(statsRef);
      const currentStats = statsSnap.exists() ? statsSnap.data() : {};

      // Prepare update based on item type
      const updates: any = {
        lastActiveDate: serverTimestamp(),
        hasStudiedToday: true
      };

      if (item.type === 'kanji') {
        const currentKanji = currentStats.learnedKanjiSet || [];
        if (!currentKanji.includes(item.content)) {
          updates.learnedKanjiSet = arrayUnion(item.content);
          updates.totalKanjiLearned = (currentStats.totalKanjiLearned || 0) + 1;
        }
      } else if (item.type === 'word') {
        const currentWords = currentStats.learnedWordsSet || [];
        if (!currentWords.includes(item.content)) {
          updates.learnedWordsSet = arrayUnion(item.content);
          updates.totalWordsLearned = (currentStats.totalWordsLearned || 0) + 1;
        }
      }

      // Update or create stats
      if (statsSnap.exists()) {
        await updateDoc(statsRef, updates);
      } else {
        await setDoc(statsRef, {
          ...updates,
          userId,
          currentStreak: 1,
          totalDaysActive: 1,
          createdAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Failed to update user stats:', error);
    }
  }

  /**
   * Load data from cloud for premium users
   */
  static async loadFromCloud(): Promise<void> {
    if (!auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, 'users', userId, 'recentStudyItems', 'current');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data() as RecentStudyData;
        
        // Check if cloud data is newer than local
        const localStored = localStorage.getItem(this.STORAGE_KEY);
        if (localStored) {
          const localData: RecentStudyData = JSON.parse(localStored);
          const localTime = new Date(localData.lastUpdated).getTime();
          const cloudTime = new Date(cloudData.lastUpdated).getTime();
          
          if (cloudTime > localTime) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cloudData));
          }
        } else {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cloudData));
        }
      }
    } catch (error) {
      console.error('Failed to load from cloud:', error);
    }
  }

  /**
   * Clear all study items
   */
  static async clearAll(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
    
    if (auth.currentUser) {
      try {
        const userId = auth.currentUser.uid;
        const docRef = doc(db, 'users', userId, 'recentStudyItems', 'current');
        await setDoc(docRef, {
          userId,
          items: [],
          lastUpdated: serverTimestamp(),
          cleared: true
        });
      } catch (error) {
        console.error('Failed to clear cloud data:', error);
      }
    }
  }

  /**
   * Get summary statistics
   */
  static async getStats(): Promise<{
    totalItems: number;
    dueTodayCount: number;
    overdueCount: number;
    recentlyStudiedCount: number;
    typeBreakdown: Record<string, number>;
  }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return {
          totalItems: 0,
          dueTodayCount: 0,
          overdueCount: 0,
          recentlyStudiedCount: 0,
          typeBreakdown: {}
        };
      }

      const data: RecentStudyData = JSON.parse(stored);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const stats = {
        totalItems: data.items.length,
        dueTodayCount: 0,
        overdueCount: 0,
        recentlyStudiedCount: 0,
        typeBreakdown: {} as Record<string, number>
      };

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      data.items.forEach(item => {
        // Type breakdown
        stats.typeBreakdown[item.type] = (stats.typeBreakdown[item.type] || 0) + 1;

        // Recently studied (last 24 hours)
        if (new Date(item.studiedAt) > oneDayAgo) {
          stats.recentlyStudiedCount++;
        }

        // Due status
        if (item.nextReview) {
          const reviewDate = new Date(item.nextReview);
          reviewDate.setHours(0, 0, 0, 0);
          
          if (reviewDate.getTime() === today.getTime()) {
            stats.dueTodayCount++;
          } else if (reviewDate < today) {
            stats.overdueCount++;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalItems: 0,
        dueTodayCount: 0,
        overdueCount: 0,
        recentlyStudiedCount: 0,
        typeBreakdown: {}
      };
    }
  }
}

// Auto-load from cloud on initialization for logged-in users
if (typeof window !== 'undefined') {
  auth.onAuthStateChanged(user => {
    if (user) {
      RecentStudyTracker.loadFromCloud();
    }
  });
}