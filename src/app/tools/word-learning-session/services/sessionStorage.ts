import { SessionData } from '../types';
import { collection, doc, setDoc, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

class SessionStorageService {
  private dbName = 'WordLearningSessions';
  private storeName = 'sessions';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
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
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('setId', 'setId', { unique: false });
          store.createIndex('completedAt', 'completedAt', { unique: false });
        }
      };
    });
  }

  // Save session to IndexedDB (for all users)
  async saveSessionLocal(userId: string, session: SessionData): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const sessionWithUser = { ...session, userId };
      const request = store.put(sessionWithUser);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save session to Firebase (for authenticated users)
  async saveSessionFirebase(userId: string, session: SessionData): Promise<void> {
    try {
      const sessionsRef = collection(db, 'users', userId, 'wordLearningSessions');
      await setDoc(doc(sessionsRef, session.id), {
        ...session,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() || null
      });
    } catch (error) {
      console.error('Failed to save session to Firebase:', error);
      throw error;
    }
  }

  // Save session (both local and Firebase if authenticated)
  async saveSession(userId: string, session: SessionData): Promise<void> {
    // Always save locally
    await this.saveSessionLocal(userId, session);
    
    // Try to save to Firebase if user is authenticated
    if (userId && userId !== 'guest') {
      try {
        await this.saveSessionFirebase(userId, session);
      } catch (error) {

      }
    }
  }

  // Get recent sessions from IndexedDB
  async getRecentSessionsLocal(userId: string, limit: number = 10): Promise<SessionData[]> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      
      request.onsuccess = () => {
        const sessions = request.result
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          .slice(0, limit)
          .map(session => ({
            ...session,
            startedAt: new Date(session.startedAt),
            completedAt: session.completedAt ? new Date(session.completedAt) : null
          }));
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get session stats
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    totalWords: number;
    averageScore: number;
    weakWords: string[];
  }> {
    const sessions = await this.getRecentSessionsLocal(userId, 100);
    
    const totalSessions = sessions.length;
    const totalWords = sessions.reduce((sum, s) => sum + s.words.length, 0);
    const averageScore = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length
      : 0;
    
    // Collect all weak words
    const weakWordsMap = new Map<string, number>();
    sessions.forEach(session => {
      session.weakWords.forEach(wordId => {
        weakWordsMap.set(wordId, (weakWordsMap.get(wordId) || 0) + 1);
      });
    });
    
    // Sort by frequency and get top weak words
    const weakWords = Array.from(weakWordsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([wordId]) => wordId);
    
    return {
      totalSessions,
      totalWords,
      averageScore,
      weakWords
    };
  }

  // Clear old sessions (older than 30 days)
  async clearOldSessions(): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('completedAt');
      
      const range = IDBKeyRange.upperBound(thirtyDaysAgo.toISOString());
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const sessionStorage = new SessionStorageService();