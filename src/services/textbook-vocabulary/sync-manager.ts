/**
 * Sync Manager for Textbook Vocabulary Feature
 * Handles Firebase sync initialization on login for premium users
 */

import { auth } from '@/lib/firebase';
import { vocabStorage } from './storage';

class TextbookVocabularySyncManager {
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;

  /**
   * Initialize sync on user login
   * Called from AuthContext when user logs in
   */
  async initializeSync(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    // Avoid duplicate syncs
    if (this.syncInProgress) {
      console.log('Textbook vocabulary sync already in progress');
      return;
    }

    // Check if we've synced recently (within last 5 minutes)
    if (this.lastSyncTime && 
        new Date().getTime() - this.lastSyncTime.getTime() < 5 * 60 * 1000) {
      console.log('Textbook vocabulary synced recently, skipping');
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('Starting textbook vocabulary sync for user:', user.uid);

      // Load data from Firebase for premium users
      await vocabStorage.loadFromFirebase();
      
      this.lastSyncTime = new Date();
      console.log('Textbook vocabulary sync completed successfully');
    } catch (error) {
      console.error('Error during textbook vocabulary sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Force sync all local data to Firebase
   * Useful for manual sync or before logout
   */
  async forceSyncToFirebase(): Promise<void> {
    try {
      await vocabStorage.syncAllToFirebase();
    } catch (error) {
      console.error('Error forcing sync to Firebase:', error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      inProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime
    };
  }
}

// Export singleton instance
export const textbookVocabularySyncManager = new TextbookVocabularySyncManager();