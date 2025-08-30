/**
 * Firebase Sync for Textbook Vocabulary Review States
 * Syncs local IndexedDB progress to Firebase for cross-device access
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, State } from 'ts-fsrs';

interface ReviewStateSync {
  cardId: string;
  state: number;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview: Date;
  updatedAt: Date;
  localVersion: number;
  syncVersion: number;
}

export class TextbookVocabularyFirebaseSync {
  private userId: string;
  private collectionPath: string;
  private syncInProgress: boolean = false;
  private lastSyncTime: number = 0;
  private syncDebounceTime: number = 5000; // 5 seconds
  private unsubscribe: (() => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.collectionPath = `users/${userId}/textbookVocabularyProgress`;
  }

  /**
   * Initialize real-time sync listener
   */
  initRealtimeSync(onRemoteChange: (states: ReviewStateSync[]) => void): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const progressRef = collection(db, this.collectionPath);
    
    this.unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const changes = snapshot.docChanges()
        .filter(change => change.type === 'modified' || change.type === 'added')
        .map(change => ({
          ...change.doc.data(),
          cardId: change.doc.id,
          due: change.doc.data().due?.toDate(),
          lastReview: change.doc.data().lastReview?.toDate(),
          updatedAt: change.doc.data().updatedAt?.toDate()
        } as ReviewStateSync));

      if (changes.length > 0 && !this.syncInProgress) {
        onRemoteChange(changes);
      }
    });
  }

  /**
   * Sync local review state to Firebase
   */
  async syncToFirebase(states: State[]): Promise<void> {
    if (this.syncInProgress) return;
    
    // Debounce rapid changes
    const now = Date.now();
    if (now - this.lastSyncTime < this.syncDebounceTime) {
      return;
    }
    
    this.syncInProgress = true;
    this.lastSyncTime = now;

    try {
      const batch = writeBatch(db);
      const timestamp = Timestamp.now();

      for (const state of states) {
        const docRef = doc(db, this.collectionPath, state.card_id);
        
        const syncData: Partial<ReviewStateSync> = {
          cardId: state.card_id,
          state: state.state,
          due: state.due,
          stability: state.stability,
          difficulty: state.difficulty,
          elapsedDays: state.elapsed_days,
          scheduledDays: state.scheduled_days,
          reps: state.reps,
          lapses: state.lapses,
          lastReview: new Date(state.last_review),
          updatedAt: timestamp.toDate(),
          syncVersion: Date.now()
        };

        batch.set(docRef, {
          ...syncData,
          due: Timestamp.fromDate(state.due),
          lastReview: Timestamp.fromDate(new Date(state.last_review)),
          updatedAt: timestamp
        }, { merge: true });
      }

      await batch.commit();
      console.log(`✅ Synced ${states.length} review states to Firebase`);
      
    } catch (error) {
      console.error('❌ Firebase sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Load review states from Firebase
   */
  async loadFromFirebase(): Promise<Map<string, State>> {
    try {
      const progressRef = collection(db, this.collectionPath);
      const snapshot = await getDocs(progressRef);
      
      const states = new Map<string, State>();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const state = new State();
        
        state.card_id = doc.id;
        state.state = data.state || 0;
        state.due = data.due?.toDate() || new Date();
        state.stability = data.stability || 0;
        state.difficulty = data.difficulty || 0;
        state.elapsed_days = data.elapsedDays || 0;
        state.scheduled_days = data.scheduledDays || 0;
        state.reps = data.reps || 0;
        state.lapses = data.lapses || 0;
        state.last_review = data.lastReview?.toDate()?.getTime() || Date.now();
        
        states.set(doc.id, state);
      });

      console.log(`✅ Loaded ${states.size} review states from Firebase`);
      return states;
      
    } catch (error) {
      console.error('❌ Failed to load from Firebase:', error);
      return new Map();
    }
  }

  /**
   * Merge local and remote states with conflict resolution
   */
  mergeStates(local: State, remote: State): State {
    // Last Write Wins strategy based on last_review timestamp
    if (local.last_review > remote.last_review) {
      return local;
    } else if (remote.last_review > local.last_review) {
      return remote;
    }
    
    // If timestamps are equal, prefer the one with more reviews
    if (local.reps >= remote.reps) {
      return local;
    }
    
    return remote;
  }

  /**
   * Full sync: Upload all local states and download any missing ones
   */
  async fullSync(localStates: Map<string, State>): Promise<Map<string, State>> {
    console.log('🔄 Starting full sync with Firebase...');
    
    // 1. Load remote states
    const remoteStates = await this.loadFromFirebase();
    
    // 2. Merge states
    const mergedStates = new Map<string, State>();
    const toUpload: State[] = [];
    
    // Process local states
    for (const [cardId, localState] of localStates) {
      const remoteState = remoteStates.get(cardId);
      
      if (!remoteState) {
        // Local only - upload to Firebase
        mergedStates.set(cardId, localState);
        toUpload.push(localState);
      } else {
        // Both exist - merge
        const merged = this.mergeStates(localState, remoteState);
        mergedStates.set(cardId, merged);
        
        // Upload if local is newer
        if (merged === localState) {
          toUpload.push(localState);
        }
      }
    }
    
    // Process remote-only states
    for (const [cardId, remoteState] of remoteStates) {
      if (!localStates.has(cardId)) {
        mergedStates.set(cardId, remoteState);
      }
    }
    
    // 3. Upload changes
    if (toUpload.length > 0) {
      await this.syncToFirebase(toUpload);
    }
    
    console.log(`✅ Full sync complete: ${mergedStates.size} total states`);
    return mergedStates;
  }

  /**
   * Get sync status for UI
   */
  async getSyncStatus(): Promise<{
    localCount: number;
    remoteCount: number;
    lastSync: Date | null;
    syncEnabled: boolean;
  }> {
    try {
      const progressRef = collection(db, this.collectionPath);
      const snapshot = await getDocs(query(progressRef, where('syncVersion', '>', 0)));
      
      let lastSync: Date | null = null;
      
      snapshot.forEach(doc => {
        const updatedAt = doc.data().updatedAt?.toDate();
        if (updatedAt && (!lastSync || updatedAt > lastSync)) {
          lastSync = updatedAt;
        }
      });
      
      return {
        localCount: 0, // Will be set by the service
        remoteCount: snapshot.size,
        lastSync,
        syncEnabled: true
      };
      
    } catch (error) {
      return {
        localCount: 0,
        remoteCount: 0,
        lastSync: null,
        syncEnabled: false
      };
    }
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}