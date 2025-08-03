/**
 * IndexedDB storage service for Textbook Vocabulary feature
 * Handles local progress persistence with Firebase sync for premium users
 */

import { auth } from '@/lib/firebase';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, writeBatch, Timestamp } from 'firebase/firestore';

export interface VocabularyProgress {
  id: string; // vocabulary item ID
  userId?: string;
  textbook: string;
  lesson: number;
  lastReviewed: Date;
  nextReview: Date;
  reviewCount: number;
  easeFactor: number; // For spaced repetition algorithm
  interval: number; // Days until next review
  quality: number; // Last review quality (1-5)
  masteryLevel: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface StudySession {
  id: string;
  userId?: string;
  textbook: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  cardsCorrect: number;
  avgQuality: number;
}

class TextbookVocabularyStorage {
  private dbName = 'doshi-sensei-textbook-vocab';
  private version = 1;
  private db: IDBDatabase | null = null;
  private firestore = getFirestore();

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Progress store
        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
          progressStore.createIndex('userId', 'userId', { unique: false });
          progressStore.createIndex('textbook', 'textbook', { unique: false });
          progressStore.createIndex('nextReview', 'nextReview', { unique: false });
          progressStore.createIndex('composite', ['userId', 'textbook'], { unique: false });
        }

        // Study sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('userId', 'userId', { unique: false });
          sessionsStore.createIndex('textbook', 'textbook', { unique: false });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
          settingsStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  private getUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  private async isPremiumUser(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
      // Check user's subscription status in Firestore
      const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      return userData.subscriptionStatus === 'active' && 
             (userData.subscriptionType === 'monthly' || userData.subscriptionType === 'yearly');
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  // Progress Management
  async saveProgress(progress: VocabularyProgress): Promise<void> {
    const db = await this.ensureDb();
    const userId = auth.currentUser?.uid;
    
    const progressWithUser = {
      ...progress,
      userId: userId || 'anonymous',
      updatedAt: new Date()
    };

    const transaction = db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');
    await store.put(progressWithUser);

    // TODO: Sync with Firebase for premium users
    if (userId && await this.isPremiumUser()) {
      this.syncProgressToFirebase(progressWithUser);
    }
  }

  async getProgress(vocabularyId: string): Promise<VocabularyProgress | null> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    
    return new Promise((resolve, reject) => {
      const request = store.get(vocabularyId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getProgressByTextbook(textbook: string): Promise<VocabularyProgress[]> {
    const db = await this.ensureDb();
    const userId = auth.currentUser?.uid || 'anonymous';
    
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const index = store.index('composite');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll([userId, textbook]);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getProgressIds(textbook: string): Promise<Set<string>> {
    const progress = await this.getProgressByTextbook(textbook);
    return new Set(progress.map(p => p.id));
  }

  async getDueCards(textbook?: string): Promise<VocabularyProgress[]> {
    const db = await this.ensureDb();
    const userId = auth.currentUser?.uid || 'anonymous';
    const now = new Date();
    
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const index = store.index('nextReview');
    
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(now);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        let results = request.result || [];
        
        // Filter by userId and optionally by textbook
        results = results.filter(p => 
          p.userId === userId && 
          (!textbook || p.textbook === textbook)
        );
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Study Sessions
  async startStudySession(textbook: string): Promise<string> {
    const db = await this.ensureDb();
    const userId = auth.currentUser?.uid || 'anonymous';
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: StudySession = {
      id: sessionId,
      userId,
      textbook,
      startTime: new Date(),
      cardsStudied: 0,
      cardsCorrect: 0,
      avgQuality: 0
    };
    
    const transaction = db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    await store.add(session);
    
    return sessionId;
  }

  async updateStudySession(sessionId: string, updates: Partial<StudySession>): Promise<void> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    
    const session = await new Promise<StudySession>((resolve, reject) => {
      const request = store.get(sessionId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (session) {
      const updatedSession = { ...session, ...updates };
      await store.put(updatedSession);
      
      // Sync with Firebase for premium users when session ends
      if (updates.endTime && await this.isPremiumUser()) {
        this.syncSessionToFirebase(updatedSession);
      }
    }
  }

  async getStudySessions(textbook?: string, limit = 10): Promise<StudySession[]> {
    const db = await this.ensureDb();
    const userId = auth.currentUser?.uid || 'anonymous';
    
    const transaction = db.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const index = store.index('startTime');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results: StudySession[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          const session = cursor.value;
          if (session.userId === userId && (!textbook || session.textbook === textbook)) {
            results.push(session);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Helper Methods
  private async isPremiumUser(): Promise<boolean> {
    // TODO: Implement premium check logic
    return false;
  }

  // Firebase Sync Methods
  private async syncProgressToFirebase(progress: VocabularyProgress): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;
    
    try {
      await setDoc(
        doc(this.firestore, 'users', userId, 'textbookVocabularyProgress', progress.id),
        {
          ...progress,
          lastReviewed: progress.lastReviewed.toISOString(),
          nextReview: progress.nextReview.toISOString(),
          createdAt: progress.createdAt.toISOString(),
          updatedAt: progress.updatedAt.toISOString()
        }
      );
    } catch (error) {
      console.error('Error syncing vocabulary progress to Firebase:', error);
    }
  }

  private async syncSessionToFirebase(session: StudySession): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;
    
    try {
      // Calculate time spent in seconds
      const timeSpent = session.endTime 
        ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000)
        : 0;
      
      const sessionData = {
        id: session.id,
        date: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
        cardsStudied: session.cardsStudied || 0,
        cardsCorrect: session.cardsCorrect || 0,
        averageQuality: session.avgQuality || 0,
        timeSpent: timeSpent,
        textbook: session.textbook,
        userId: session.userId,
        startTime: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
        endTime: session.endTime ? (session.endTime instanceof Date ? session.endTime.toISOString() : session.endTime) : null
      };
      
      await setDoc(
        doc(this.firestore, 'users', userId, 'textbookVocabularyStudySessions', session.id),
        sessionData
      );
    } catch (error) {
      console.error('Error syncing study session to Firebase:', error);
    }
  }

  // Sync all local data to Firebase (for premium users)
  async syncAllToFirebase(): Promise<void> {
    const userId = this.getUserId();
    if (!userId || !(await this.isPremiumUser())) return;
    
    try {
      // Sync all progress
      const db = await this.ensureDb();
      const transaction = db.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      const allProgress: VocabularyProgress[] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      const batch = writeBatch(this.firestore);
      
      allProgress.forEach(progress => {
        const ref = doc(this.firestore, 'users', userId, 'textbookVocabularyProgress', progress.id);
        batch.set(ref, {
          ...progress,
          lastReviewed: progress.lastReviewed.toISOString(),
          nextReview: progress.nextReview.toISOString(),
          createdAt: progress.createdAt.toISOString(),
          updatedAt: progress.updatedAt.toISOString()
        });
      });
      
      await batch.commit();
      console.log('Successfully synced all vocabulary progress to Firebase');
      
      // Sync all sessions
      const sessions = await this.getStudySessions(undefined, 1000); // Get all sessions
      const sessionBatch = writeBatch(this.firestore);
      
      sessions.forEach(session => {
        const ref = doc(this.firestore, 'users', userId, 'textbookVocabularyStudySessions', session.id);
        sessionBatch.set(ref, {
          ...session,
          startTime: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
          endTime: session.endTime ? (session.endTime instanceof Date ? session.endTime.toISOString() : session.endTime) : null
        });
      });
      
      await sessionBatch.commit();
      console.log('Successfully synced all study sessions to Firebase');
    } catch (error) {
      console.error('Error syncing all data to Firebase:', error);
    }
  }

  // Load data from Firebase (for premium users on login)
  async loadFromFirebase(): Promise<void> {
    const userId = this.getUserId();
    if (!userId || !(await this.isPremiumUser())) return;
    
    try {
      // Load progress from Firebase
      const progressRef = collection(this.firestore, 'users', userId, 'textbookVocabularyProgress');
      const progressSnapshot = await getDocs(query(progressRef));
      
      const db = await this.ensureDb();
      const transaction = db.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      
      for (const doc of progressSnapshot.docs) {
        const data = doc.data();
        const progress: VocabularyProgress = {
          ...data,
          id: doc.id,
          lastReviewed: new Date(data.lastReviewed),
          nextReview: new Date(data.nextReview),
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        };
        
        // Check if local version is newer
        const existingProgress = await this.getProgress(progress.id);
        if (!existingProgress || existingProgress.updatedAt < progress.updatedAt) {
          await store.put(progress);
        }
      }
      
      console.log('Successfully loaded vocabulary progress from Firebase');
      
      // Load sessions from Firebase
      const sessionsRef = collection(this.firestore, 'users', userId, 'textbookVocabularyStudySessions');
      const sessionsSnapshot = await getDocs(query(sessionsRef));
      
      const sessionTransaction = db.transaction(['sessions'], 'readwrite');
      const sessionStore = sessionTransaction.objectStore('sessions');
      
      for (const doc of sessionsSnapshot.docs) {
        const data = doc.data();
        const session: StudySession = {
          ...data,
          id: doc.id,
          startTime: new Date(data.startTime),
          endTime: data.endTime ? new Date(data.endTime) : undefined
        };
        
        await sessionStore.put(session);
      }
      
      console.log('Successfully loaded study sessions from Firebase');
    } catch (error) {
      console.error('Error loading from Firebase:', error);
    }
  }

  // Clear all data (for testing/reset)
  async clearAll(): Promise<void> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['progress', 'sessions', 'settings'], 'readwrite');
    
    await Promise.all([
      transaction.objectStore('progress').clear(),
      transaction.objectStore('sessions').clear(),
      transaction.objectStore('settings').clear()
    ]);
  }
}

// Export singleton instance
export const vocabStorage = new TextbookVocabularyStorage();