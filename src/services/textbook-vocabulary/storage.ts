/**
 * IndexedDB storage service for Textbook Vocabulary feature
 * Handles local progress persistence with Firebase sync for premium users
 */

import { auth } from '@/lib/firebase';

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

  private async syncProgressToFirebase(progress: VocabularyProgress): Promise<void> {
    // TODO: Implement Firebase sync for premium users
    console.log('Firebase sync would happen here for premium users', progress);
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