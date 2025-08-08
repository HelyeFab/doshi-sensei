import { PracticeHistoryItem } from './types';
import { IndexedDBPracticeHistoryStorage } from './IndexedDBStorage';
import { FirebasePracticeHistoryStorage } from './FirebaseStorage';

export class PracticeHistoryService {
  private indexedDBStorage: IndexedDBPracticeHistoryStorage;
  private firebaseStorage: FirebasePracticeHistoryStorage | null = null;
  private isInitialized = false;
  private userType: 'guest' | 'free' | 'premium' = 'guest';

  constructor() {
    this.indexedDBStorage = new IndexedDBPracticeHistoryStorage();
  }

  async initialize(userId?: string, isPremium?: boolean): Promise<void> {
    // If already initialized with Firebase, don't reinitialize
    if (this.isInitialized && this.firebaseStorage) {
      console.log('PracticeHistoryService already initialized with Firebase');
      return;
    }
    
    // If initializing with a user after being initialized as guest, reinitialize
    if (this.isInitialized && !this.firebaseStorage && userId) {
      console.log('Reinitializing PracticeHistoryService with user after guest init');
      this.isInitialized = false;
    }
    
    if (this.isInitialized) return;

    // Initialize IndexedDB for all users
    await this.indexedDBStorage.init();

    // Initialize Firebase for all authenticated users (free and premium)
    if (userId) {
      console.log('🔥 Initializing Firebase storage for user:', userId);
      console.log('User type:', isPremium ? 'premium' : 'free');
      this.firebaseStorage = new FirebasePracticeHistoryStorage(userId);
      this.userType = isPremium ? 'premium' : 'free';
      console.log('Firebase storage created:', !!this.firebaseStorage);
      console.log('Firebase user ID stored:', (this.firebaseStorage as any).userId);
      // Sync local data to Firebase on first login
      await this.syncLocalToFirebase();
    } else {
      console.log('⚠️ No userId provided - initializing as guest');
      this.userType = 'guest';
      this.firebaseStorage = null;
    }

    this.isInitialized = true;
    
    console.log('PracticeHistoryService initialized', {
      userId,
      userType: this.userType,
      hasFirebase: !!this.firebaseStorage,
      isPremium
    });
  }

  async addOrUpdateItem(item: PracticeHistoryItem): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PracticeHistoryService not initialized');
    }

    console.log('=== PracticeHistoryService.addOrUpdateItem ===');
    console.log('Service status:', this.getStatus());
    console.log('Item to save:', item);

    // Always save to IndexedDB
    await this.indexedDBStorage.addOrUpdateItem(item);
    console.log('✅ Saved to IndexedDB');

    // Also save to Firebase for authenticated users
    if (this.firebaseStorage) {
      console.log('🔥 Firebase storage is available, attempting to save...');
      console.log('Firebase user ID:', (this.firebaseStorage as any).userId);
      try {
        await this.firebaseStorage.addOrUpdateItem(item);
        console.log('✅ Successfully saved to Firebase');
      } catch (error: any) {
        console.error('❌ Failed to save to Firebase, but local save succeeded:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
      }
    } else {
      console.log('⚠️ No Firebase storage available - saved locally only');
      console.log('Service details:', {
        isInitialized: this.isInitialized,
        userType: this.userType,
        hasFirebaseStorage: !!this.firebaseStorage
      });
    }
  }

  async getItem(videoId: string): Promise<PracticeHistoryItem | null> {
    if (!this.isInitialized) {
      throw new Error('PracticeHistoryService not initialized');
    }

    // Premium users: try Firebase first, fallback to local
    if (this.firebaseStorage) {
      try {
        const firebaseItem = await this.firebaseStorage.getItem(videoId);
        if (firebaseItem) return firebaseItem;
      } catch (error) {
        console.error('Failed to get from Firebase, falling back to local:', error);
      }
    }

    // All users: get from IndexedDB
    return this.indexedDBStorage.getItem(videoId);
  }

  async getAllItems(): Promise<PracticeHistoryItem[]> {
    if (!this.isInitialized) {
      throw new Error('PracticeHistoryService not initialized');
    }

    // Premium users: get from Firebase
    if (this.firebaseStorage) {
      try {
        return await this.firebaseStorage.getAllItems();
      } catch (error) {
        console.error('Failed to get from Firebase, falling back to local:', error);
      }
    }

    // Free/Guest users: get from IndexedDB
    return this.indexedDBStorage.getAllItems();
  }

  async deleteItem(videoId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PracticeHistoryService not initialized');
    }

    // Always delete from local
    await this.indexedDBStorage.deleteItem(videoId);

    // Also delete from Firebase for premium users
    if (this.firebaseStorage) {
      try {
        await this.firebaseStorage.deleteItem(videoId);
      } catch (error) {
        console.error('Failed to delete from Firebase:', error);
      }
    }

    // Also delete the cached transcript from Firestore
    try {
      const { TranscriptCacheManager } = await import('@/utils/transcriptCache');
      const contentId = `youtube_${videoId}`;
      console.log('🗑️ [CACHE] Deleting cached transcript for:', contentId);
      await TranscriptCacheManager.deleteCachedTranscript(contentId);
    } catch (error) {
      console.error('Failed to delete cached transcript:', error);
    }
  }

  async clearAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PracticeHistoryService not initialized');
    }

    // Always clear local
    await this.indexedDBStorage.clearAll();

    // Also clear Firebase for premium users
    if (this.firebaseStorage) {
      try {
        await this.firebaseStorage.clearAll();
      } catch (error) {
        console.error('Failed to clear Firebase:', error);
      }
    }
  }

  async getRecentItems(limit: number = 10): Promise<PracticeHistoryItem[]> {
    const allItems = await this.getAllItems();
    return allItems.slice(0, limit);
  }

  async getMostPracticed(limit: number = 10): Promise<PracticeHistoryItem[]> {
    if (this.firebaseStorage) {
      try {
        return await this.firebaseStorage.getMostPracticed(limit);
      } catch (error) {
        console.error('Failed to get from Firebase, falling back to local:', error);
      }
    }

    return this.indexedDBStorage.getMostPracticed(limit);
  }

  async getItemsByDateRange(startDate: Date, endDate: Date): Promise<PracticeHistoryItem[]> {
    if (this.firebaseStorage) {
      try {
        return await this.firebaseStorage.getItemsByDateRange(startDate, endDate);
      } catch (error) {
        console.error('Failed to get from Firebase, falling back to local:', error);
      }
    }

    return this.indexedDBStorage.getItemsByDateRange(startDate, endDate);
  }

  // Sync local data to Firebase when user upgrades to premium
  private async syncLocalToFirebase(): Promise<void> {
    if (!this.firebaseStorage) return;

    try {
      const localItems = await this.indexedDBStorage.getAllItems();
      if (localItems.length > 0) {
        console.log(`Syncing ${localItems.length} practice history items to Firebase...`);
        await this.firebaseStorage.syncFromLocal(localItems);
        console.log('Sync completed successfully');
      }
    } catch (error) {
      console.error('Failed to sync local data to Firebase:', error);
    }
  }

  // Get service status
  getStatus(): { initialized: boolean; userType: string; hasFirebase: boolean } {
    return {
      initialized: this.isInitialized,
      userType: this.userType,
      hasFirebase: !!this.firebaseStorage,
      firebaseUserId: this.firebaseStorage ? (this.firebaseStorage as any).userId : null
    };
  }
}

// Singleton instance
export const practiceHistoryService = new PracticeHistoryService();