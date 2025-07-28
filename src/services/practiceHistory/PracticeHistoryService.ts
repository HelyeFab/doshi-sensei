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
    if (this.isInitialized) return;

    // Initialize IndexedDB for all users
    await this.indexedDBStorage.init();

    // Initialize Firebase for premium users
    if (userId && isPremium) {
      this.firebaseStorage = new FirebasePracticeHistoryStorage(userId);
      this.userType = 'premium';
      // Sync local data to Firebase on first premium login
      await this.syncLocalToFirebase();
    } else if (userId) {
      this.userType = 'free';
    } else {
      this.userType = 'guest';
    }

    this.isInitialized = true;
  }

  async addOrUpdateItem(item: PracticeHistoryItem): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PracticeHistoryService not initialized');
    }

    // Always save to IndexedDB
    await this.indexedDBStorage.addOrUpdateItem(item);

    // Also save to Firebase for premium users
    if (this.firebaseStorage) {
      try {
        await this.firebaseStorage.addOrUpdateItem(item);
      } catch (error) {
        console.error('Failed to save to Firebase, but local save succeeded:', error);
      }
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
      hasFirebase: !!this.firebaseStorage
    };
  }
}

// Singleton instance
export const practiceHistoryService = new PracticeHistoryService();