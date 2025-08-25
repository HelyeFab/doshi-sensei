/**
 * Video History Service
 * Tracks which YouTube videos a user has already accessed
 * to allow unlimited repeat practice without counting against limits
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'doshi_video_history';

interface VideoHistoryData {
  videoIds: string[];
  lastUpdated: string;
}

class VideoHistoryService {
  private memoryCache: Set<string> = new Set();
  private userId: string | null = null;

  /**
   * Initialize the service for a user
   */
  async initialize(userId?: string) {
    this.userId = userId || null;
    await this.loadHistory();
  }

  /**
   * Load video history from storage
   */
  private async loadHistory() {
    try {
      if (this.userId) {
        // Authenticated user - load from Firestore
        const docRef = doc(db, 'userVideoHistory', this.userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as VideoHistoryData;
          this.memoryCache = new Set(data.videoIds || []);
        }
      } else {
        // Guest user - load from localStorage
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const data: VideoHistoryData = JSON.parse(stored);
          this.memoryCache = new Set(data.videoIds || []);
        }
      }
    } catch (error) {
      console.error('Error loading video history:', error);
    }
  }

  /**
   * Check if a video has been used before
   */
  hasUsedVideo(videoId: string): boolean {
    return this.memoryCache.has(videoId);
  }

  /**
   * Add a video to the history
   */
  async addVideo(videoId: string) {
    if (this.memoryCache.has(videoId)) return;

    this.memoryCache.add(videoId);

    try {
      if (this.userId) {
        // Authenticated user - save to Firestore
        const docRef = doc(db, 'userVideoHistory', this.userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Update existing document
          await updateDoc(docRef, {
            videoIds: arrayUnion(videoId),
            lastUpdated: new Date().toISOString()
          });
        } else {
          // Create new document
          await setDoc(docRef, {
            videoIds: [videoId],
            lastUpdated: new Date().toISOString()
          });
        }
      } else {
        // Guest user - save to localStorage
        const data: VideoHistoryData = {
          videoIds: Array.from(this.memoryCache),
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving video to history:', error);
    }
  }

  /**
   * Get all video IDs in history
   */
  getHistory(): string[] {
    return Array.from(this.memoryCache);
  }

  /**
   * Get count of unique videos used
   */
  getUniqueVideoCount(): number {
    return this.memoryCache.size;
  }

  /**
   * Clear the video history (useful for testing)
   */
  async clearHistory() {
    this.memoryCache.clear();

    try {
      if (this.userId) {
        // Authenticated user - clear in Firestore
        const docRef = doc(db, 'userVideoHistory', this.userId);
        await setDoc(docRef, {
          videoIds: [],
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Guest user - clear localStorage
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error clearing video history:', error);
    }
  }

  /**
   * Migrate guest history to authenticated user
   * Called when a guest user signs in
   */
  async migrateGuestHistory(newUserId: string) {
    try {
      // Get guest history from localStorage
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return;

      const guestData: VideoHistoryData = JSON.parse(stored);
      const guestVideoIds = guestData.videoIds || [];

      if (guestVideoIds.length === 0) return;

      // Merge with existing user history in Firestore
      const docRef = doc(db, 'userVideoHistory', newUserId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Merge with existing videos
        await updateDoc(docRef, {
          videoIds: arrayUnion(...guestVideoIds),
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Create new document with guest videos
        await setDoc(docRef, {
          videoIds: guestVideoIds,
          lastUpdated: new Date().toISOString()
        });
      }

      // Clear guest history
      localStorage.removeItem(LOCAL_STORAGE_KEY);

      // Reinitialize with user ID
      await this.initialize(newUserId);
    } catch (error) {
      console.error('Error migrating guest history:', error);
    }
  }
}

// Create singleton instance
export const videoHistoryService = new VideoHistoryService();