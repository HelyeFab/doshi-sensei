import { DatabaseManager } from './indexedDB';
import { AnkiSRSData } from './ankiSRSImproved';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

interface SRSDataRecord {
  id: string;
  userId: string;
  cardId: string;
  srsData: AnkiSRSData;
  lastModified: Date;
}

interface UndoState {
  cardId: string;
  previousData: AnkiSRSData;
  timestamp: number;
}

export class FlashcardSRSManager {
  private dbManager: DatabaseManager;
  private userId: string | null = null;
  private isPremium: boolean = false;
  private undoStack: UndoState[] = [];
  private readonly MAX_UNDO_STACK = 10;
  private readonly CLEANUP_DAYS = 365; // Clean up cards not reviewed in a year

  constructor() {
    this.dbManager = new DatabaseManager();
  }

  setUser(userId: string, isPremium: boolean) {
    this.userId = userId;
    this.isPremium = isPremium;
  }

  /**
   * Save SRS data with undo support
   */
  async saveSRSData(cardId: string, srsData: AnkiSRSData, previousData?: AnkiSRSData): Promise<void> {
    if (!this.userId) throw new Error('User not set');

    // Add to undo stack if previous data exists
    if (previousData) {
      this.addToUndoStack(cardId, previousData);
    }

    const record: SRSDataRecord = {
      id: `${this.userId}_${cardId}`,
      userId: this.userId,
      cardId,
      srsData,
      lastModified: new Date()
    };

    // Always save to IndexedDB first
    await this.dbManager.put('flashcardProgress', record);

    // Sync to Firebase for premium users
    if (this.isPremium) {
      try {
        await this.syncToFirebase(cardId, srsData);
      } catch (error) {
        console.error('Failed to sync SRS data to Firebase:', error);
        // Don't throw - local save succeeded
      }
    }
  }

  /**
   * Load SRS data (with Firebase fallback for premium)
   */
  async loadSRSData(cardIds: string[]): Promise<Map<string, AnkiSRSData>> {
    if (!this.userId) throw new Error('User not set');

    const srsMap = new Map<string, AnkiSRSData>();

    // First, try to load from IndexedDB
    for (const cardId of cardIds) {
      try {
        const record = await this.dbManager.get('flashcardProgress', `${this.userId}_${cardId}`);
        if (record) {
          srsMap.set(cardId, record.srsData);
        }
      } catch (error) {
        console.error(`Failed to load SRS data for card ${cardId}:`, error);
      }
    }

    // For premium users, check Firebase for any missing data
    if (this.isPremium && cardIds.length > srsMap.size) {
      const missingCardIds = cardIds.filter(id => !srsMap.has(id));
      await this.loadFromFirebase(missingCardIds, srsMap);
    }

    return srsMap;
  }

  /**
   * Batch save multiple SRS records
   */
  async batchSaveSRSData(updates: Map<string, AnkiSRSData>): Promise<void> {
    if (!this.userId) throw new Error('User not set');

    const records: SRSDataRecord[] = [];
    
    for (const [cardId, srsData] of updates) {
      records.push({
        id: `${this.userId}_${cardId}`,
        userId: this.userId,
        cardId,
        srsData,
        lastModified: new Date()
      });
    }

    // Batch save to IndexedDB
    await Promise.all(records.map(record => 
      this.dbManager.put('flashcardProgress', record)
    ));

    // Batch sync to Firebase for premium users
    if (this.isPremium) {
      this.batchSyncToFirebase(updates).catch(error => {
        console.error('Failed to batch sync to Firebase:', error);
      });
    }
  }

  /**
   * Clean up old SRS data
   */
  async cleanupOldData(): Promise<number> {
    if (!this.userId) throw new Error('User not set');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.CLEANUP_DAYS);

    // Get all flashcard progress for this user
    const allProgress = await this.dbManager.getAll('flashcardProgress');
    const userProgress = allProgress.filter((record: SRSDataRecord) => 
      record.userId === this.userId
    );

    let deletedCount = 0;

    for (const record of userProgress) {
      const lastReview = record.srsData.lastReview;
      if (lastReview && lastReview < cutoffDate) {
        await this.dbManager.delete('flashcardProgress', record.id);
        deletedCount++;

        // Also delete from Firebase for premium users
        if (this.isPremium) {
          this.deleteFromFirebase(record.cardId).catch(console.error);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Undo last card rating
   */
  async undoLastRating(): Promise<{ cardId: string; srsData: AnkiSRSData } | null> {
    const undoState = this.undoStack.pop();
    if (!undoState) return null;

    // Restore previous state
    await this.saveSRSData(undoState.cardId, undoState.previousData);
    
    return {
      cardId: undoState.cardId,
      srsData: undoState.previousData
    };
  }

  /**
   * Get undo availability
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Private helper methods
   */
  private addToUndoStack(cardId: string, previousData: AnkiSRSData) {
    this.undoStack.push({
      cardId,
      previousData,
      timestamp: Date.now()
    });

    // Limit stack size
    if (this.undoStack.length > this.MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
  }

  private async syncToFirebase(cardId: string, srsData: AnkiSRSData): Promise<void> {
    if (!this.userId) return;

    const docRef = doc(db, 'users', this.userId, 'srsData', cardId);
    await setDoc(docRef, {
      ...srsData,
      due: srsData.due.toISOString(),
      lastReview: srsData.lastReview?.toISOString() || null,
      lastModified: new Date().toISOString(),
      // Include new fields
      reps: srsData.reps || 0,
      type: srsData.type || 2
    });
  }

  private async batchSyncToFirebase(updates: Map<string, AnkiSRSData>): Promise<void> {
    if (!this.userId) return;

    // Firebase batch writes are limited to 500 operations
    const BATCH_SIZE = 500;
    const entries = Array.from(updates.entries());
    
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(([cardId, srsData]) => 
        this.syncToFirebase(cardId, srsData)
      ));
    }
  }

  private async loadFromFirebase(cardIds: string[], srsMap: Map<string, AnkiSRSData>): Promise<void> {
    if (!this.userId) return;

    try {
      for (const cardId of cardIds) {
        const docRef = doc(db, 'users', this.userId, 'srsData', cardId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const srsData: AnkiSRSData = {
            ...data,
            due: new Date(data.due),
            lastReview: data.lastReview ? new Date(data.lastReview) : undefined,
            // Ensure new fields have defaults
            reps: data.reps || 0,
            type: data.type !== undefined ? data.type : 2
          } as AnkiSRSData;
          
          srsMap.set(cardId, srsData);
          
          // Also save to local IndexedDB for offline access
          await this.saveSRSData(cardId, srsData);
        }
      }
    } catch (error) {
      console.error('Failed to load from Firebase:', error);
    }
  }

  private async deleteFromFirebase(cardId: string): Promise<void> {
    if (!this.userId) return;

    const docRef = doc(db, 'users', this.userId, 'srsData', cardId);
    await deleteDoc(docRef);
  }

  /**
   * Get statistics for the user's flashcard progress
   */
  async getStatistics(): Promise<{
    totalCards: number;
    dueToday: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    averageEase: number;
    totalReviews: number;
  }> {
    if (!this.userId) throw new Error('User not set');

    const allProgress = await this.dbManager.getAll('flashcardProgress');
    const userProgress = allProgress.filter((record: SRSDataRecord) => 
      record.userId === this.userId
    );

    const now = new Date();
    let dueToday = 0;
    let newCards = 0;
    let learningCards = 0;
    let reviewCards = 0;
    let totalEase = 0;
    let totalReviews = 0;

    for (const record of userProgress) {
      const srs = record.srsData;
      
      if (srs.due <= now) dueToday++;
      
      switch (srs.status) {
        case 'new': newCards++; break;
        case 'learning': learningCards++; break;
        case 'review': reviewCards++; break;
      }

      totalEase += srs.ease;
      totalReviews += srs.reviews;
    }

    return {
      totalCards: userProgress.length,
      dueToday,
      newCards,
      learningCards,
      reviewCards,
      averageEase: userProgress.length > 0 ? totalEase / userProgress.length : 2.5,
      totalReviews
    };
  }
}

// Singleton instance
export const flashcardSRSManager = new FlashcardSRSManager();