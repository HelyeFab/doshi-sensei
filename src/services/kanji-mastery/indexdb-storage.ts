/**
 * IndexedDB storage service for Kanji Mastery feature
 * Handles local progress persistence with Firebase sync for premium users
 */

import { auth } from '@/lib/firebase';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { Card } from 'ts-fsrs';

export interface KanjiProgress {
  id: string; // kanji character
  userId?: string;
  jlptLevel?: string;
  grade?: number;
  lastReviewed: Date;
  nextReview: Date;
  reviewCount: number;
  easeFactor: number; // For spaced repetition algorithm
  interval: number; // Days until next review
  difficulty: number;
  lapses: number;
  quality: number; // Last review quality (1-5)
  retentionRate: number;
  masteryLevel: number; // 0-100
  studyModes?: {
    recognition?: {
      reviewCount: number;
      lastQuality: number;
      averageQuality: number;
    };
    production?: {
      reviewCount: number;
      lastQuality: number;
      averageQuality: number;
    };
    writing?: {
      reviewCount: number;
      lastQuality: number;
      averageQuality: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StudySession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  kanjiStudied: number;
  kanjiCorrect: number;
  newKanji: number;
  avgQuality: number;
  jlptLevel?: string;
  timeSpent?: number; // in seconds
}

export interface KanjiSettings {
  id: string;
  userId?: string;
  defaultStudyMode: 'recognition' | 'production' | 'writing';
  dailyNewKanji: number;
  enableSRS: boolean;
  enableHints: boolean;
  updatedAt: Date;
}

class KanjiMasteryIndexedDBStorage {
  private dbName = 'doshi-sensei-kanji-mastery';
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
          progressStore.createIndex('jlptLevel', 'jlptLevel', { unique: false });
          progressStore.createIndex('nextReview', 'nextReview', { unique: false });
          progressStore.createIndex('composite', ['userId', 'jlptLevel'], { unique: false });
        }

        // Study sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('userId', 'userId', { unique: false });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
          sessionsStore.createIndex('jlptLevel', 'jlptLevel', { unique: false });
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
  async saveProgress(progress: KanjiProgress): Promise<void> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    // Only save for authenticated users (free and premium)
    if (!userId) {

      return;
    }
    
    const progressWithUser = {
      ...progress,
      userId,
      updatedAt: new Date()
    };

    const transaction = db.transaction(['progress'], 'readwrite');
    const store = transaction.objectStore('progress');
    await store.put(progressWithUser);

    // Sync with Firebase for premium users
    if (await this.isPremiumUser()) {
      this.syncProgressToFirebase(progressWithUser);
    }
  }

  async getProgress(kanjiId: string): Promise<KanjiProgress | null> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) return null;
    
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    
    return new Promise((resolve, reject) => {
      const request = store.get(kanjiId);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.userId === userId) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getProgressByJLPT(jlptLevel: string): Promise<KanjiProgress[]> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) return [];
    
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const index = store.index('composite');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll([userId, jlptLevel]);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProgress(): Promise<KanjiProgress[]> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) return [];
    
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const index = store.index('userId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getProgressIds(): Promise<Set<string>> {
    const progress = await this.getAllProgress();
    return new Set(progress.map(p => p.id));
  }

  async getDueCards(jlptLevel?: string): Promise<KanjiProgress[]> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) return [];
    
    const now = new Date();
    const transaction = db.transaction(['progress'], 'readonly');
    const store = transaction.objectStore('progress');
    const index = store.index('nextReview');
    
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(now);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        let results = request.result || [];
        
        // Filter by userId and optionally by JLPT level
        results = results.filter(p => 
          p.userId === userId && 
          (!jlptLevel || p.jlptLevel === jlptLevel)
        );
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Study Sessions
  async startStudySession(jlptLevel?: string): Promise<string> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) {
      throw new Error('Cannot start session: user not authenticated');
    }
    
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: StudySession = {
      id: sessionId,
      userId,
      jlptLevel,
      startTime: new Date(),
      kanjiStudied: 0,
      kanjiCorrect: 0,
      newKanji: 0,
      avgQuality: 0
    };
    
    const transaction = db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    await store.add(session);
    
    // Sync with Firebase for premium users
    if (await this.isPremiumUser()) {
      this.syncSessionToFirebase(session);
    }
    
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
      
      // Sync with Firebase for premium users
      if (await this.isPremiumUser()) {
        this.syncSessionToFirebase(updatedSession);
      }
    }
  }

  async getStudySessions(jlptLevel?: string, limit = 10): Promise<StudySession[]> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) return [];
    
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
          if (session.userId === userId && (!jlptLevel || session.jlptLevel === jlptLevel)) {
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

  // Settings
  async getSettings(): Promise<KanjiSettings | null> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) return null;
    
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    
    return new Promise((resolve, reject) => {
      const request = store.get(`settings-${userId}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: Partial<KanjiSettings>): Promise<void> {
    const db = await this.ensureDb();
    const userId = this.getUserId();
    
    if (!userId) return;
    
    const currentSettings = await this.getSettings();
    const updatedSettings: KanjiSettings = {
      id: `settings-${userId}`,
      userId,
      defaultStudyMode: 'recognition',
      dailyNewKanji: 5,
      enableSRS: true,
      enableHints: true,
      ...currentSettings,
      ...settings,
      updatedAt: new Date()
    };
    
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    await store.put(updatedSettings);
  }

  // Helper Methods
  private async syncProgressToFirebase(progress: KanjiProgress): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;
    
    try {
      await setDoc(
        doc(this.firestore, 'users', userId, 'kanjiProgress', progress.id),
        {
          ...progress,
          lastReviewed: progress.lastReviewed.toISOString(),
          nextReview: progress.nextReview.toISOString(),
          createdAt: progress.createdAt.toISOString(),
          updatedAt: progress.updatedAt.toISOString()
        }
      );
    } catch (error) {
      console.error('Error syncing to Firebase:', error);
    }
  }

  private async syncSessionToFirebase(session: StudySession): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;
    
    try {
      // Calculate time spent in seconds
      const timeSpent = session.endTime 
        ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000)
        : session.timeSpent || 0;
      
      // Format data to match Firebase security rules
      const sessionData = {
        id: session.id,
        date: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
        kanjiReviewed: session.kanjiStudied || 0,
        averageQuality: session.avgQuality || 0,
        timeSpent: timeSpent,
        // Additional fields for our use (not required by rules)
        userId: session.userId,
        jlptLevel: session.jlptLevel,
        kanjiCorrect: session.kanjiCorrect || 0,
        newKanji: session.newKanji || 0,
        startTime: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
        endTime: session.endTime ? (session.endTime instanceof Date ? session.endTime.toISOString() : session.endTime) : null
      };
      
      await setDoc(
        doc(this.firestore, 'users', userId, 'kanjiStudySessions', session.id),
        sessionData
      );
    } catch (error) {
      console.error('Error syncing session to Firebase:', error);
    }
  }
  
  // Sync all local data to Firebase (for premium users)
  async syncAllToFirebase(): Promise<void> {
    const userId = this.getUserId();
    if (!userId || !(await this.isPremiumUser())) return;
    
    try {
      // Sync all progress
      const allProgress = await this.getAllProgress();
      const batch = writeBatch(this.firestore);
      
      allProgress.forEach(progress => {
        const ref = doc(this.firestore, 'users', userId, 'kanjiProgress', progress.id);
        batch.set(ref, {
          ...progress,
          lastReviewed: progress.lastReviewed.toISOString(),
          nextReview: progress.nextReview.toISOString(),
          createdAt: progress.createdAt.toISOString(),
          updatedAt: progress.updatedAt.toISOString()
        });
      });
      
      await batch.commit();

      // Sync all sessions
      const sessions = await this.getStudySessions(undefined, 1000); // Get all sessions
      const sessionBatch = writeBatch(this.firestore);
      
      sessions.forEach(session => {
        const ref = doc(this.firestore, 'users', userId, 'kanjiStudySessions', session.id);
        sessionBatch.set(ref, {
          ...session,
          startTime: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
          endTime: session.endTime ? (session.endTime instanceof Date ? session.endTime.toISOString() : session.endTime) : null
        });
      });
      
      await sessionBatch.commit();

    } catch (error) {
      console.error('Error syncing all data to Firebase:', error);
    }
  }
  
  // Load data from Firebase (for premium users)
  async loadFromFirebase(): Promise<void> {
    const userId = this.getUserId();
    if (!userId || !(await this.isPremiumUser())) return;
    
    try {
      // Load progress from Firebase
      const progressRef = collection(this.firestore, 'users', userId, 'kanjiProgress');
      const progressSnapshot = await getDocs(query(progressRef));
      
      const db = await this.ensureDb();
      const transaction = db.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      
      progressSnapshot.forEach(async (doc) => {
        const data = doc.data();
        const progress: KanjiProgress = {
          ...data,
          id: doc.id,
          lastReviewed: new Date(data.lastReviewed),
          nextReview: new Date(data.nextReview),
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        };
        
        await store.put(progress);
      });

      // Load sessions from Firebase
      const sessionsRef = collection(this.firestore, 'users', userId, 'kanjiStudySessions');
      const sessionsSnapshot = await getDocs(query(sessionsRef));
      
      const sessionTransaction = db.transaction(['sessions'], 'readwrite');
      const sessionStore = sessionTransaction.objectStore('sessions');
      
      sessionsSnapshot.forEach(async (doc) => {
        const data = doc.data();
        const session: StudySession = {
          ...data,
          id: doc.id,
          startTime: new Date(data.startTime),
          endTime: data.endTime ? new Date(data.endTime) : undefined
        };
        
        await sessionStore.put(session);
      });

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

  // Get stats
  async getStats(jlptLevel?: string) {
    const sessions = await this.getStudySessions(jlptLevel);
    const progress = jlptLevel 
      ? await this.getProgressByJLPT(jlptLevel)
      : await this.getAllProgress();

    const now = new Date();
    const dueCount = progress.filter(p => new Date(p.nextReview) <= now).length;
    const masteredCount = progress.filter(p => p.masteryLevel >= 80).length;
    const totalReviews = progress.reduce((sum, p) => sum + p.reviewCount, 0);

    return {
      totalKanji: progress.length,
      dueKanji: dueCount,
      masteredKanji: masteredCount,
      totalReviews,
      averageMastery: progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.masteryLevel, 0) / progress.length)
        : 0,
      recentSessions: sessions.slice(0, 5)
    };
  }
}

// Export singleton instance
export const kanjiMasteryStorage = new KanjiMasteryIndexedDBStorage();