/**
 * IndexedDB storage service for Kanji Mastery feature
 * Handles local progress persistence with Firebase sync for premium users
 */

import { auth } from '@/lib/firebase';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { Card } from 'ts-fsrs';
import { IndexedDBConnectionManager } from '@/utils/indexedDBConnectionManager';

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
  private connectionManager: IndexedDBConnectionManager;
  private firestore = getFirestore();
  
  constructor() {
    this.connectionManager = IndexedDBConnectionManager.getInstance(
      this.dbName,
      this.version,
      this.setupDatabase.bind(this)
    );
  }

  private setupDatabase(db: IDBDatabase, oldVersion: number, newVersion: number): void {
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
  }

  async init(): Promise<void> {
    // Ensure connection is established
    await this.connectionManager.getConnection();

    // Only sync from Firebase if user is authenticated AND premium
    const userId = this.getUserId();
    if (userId && await this.isPremiumUser()) {
      await this.syncFromFirebase();
    }
  }

  private async ensureDb(): Promise<IDBDatabase> {
    return await this.connectionManager.getConnection();
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
      // Using correct flat structure as per Firebase Functions and SUPERPOWERS-V-III.md
      return userData.subscription?.status === 'active' && 
             (userData.subscription?.plan === 'monthly' || userData.subscription?.plan === 'yearly');
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  // Progress Management
  async saveProgress(progress: KanjiProgress): Promise<void> {
    const userId = this.getUserId();
    
    // Save for all users (guest users get 'guest' as userId)
    const progressWithUser = {
      ...progress,
      userId: userId || 'guest',
      updatedAt: new Date()
    };

    await this.connectionManager.executeTransaction(
      'progress',
      'readwrite',
      async (transaction) => {
        const store = transaction.objectStore('progress');
        const request = store.put(progressWithUser);
        await new Promise((resolve, reject) => {
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error);
        });
      }
    );

    // Only sync with Firebase if user is authenticated AND premium
    // But don't block saving for guest users
    if (userId && await this.isPremiumUser()) {
      this.syncProgressToFirebase(progressWithUser);
    }
  }

  async getProgress(kanjiId: string): Promise<KanjiProgress | null> {
    const userId = this.getUserId() || 'guest';
    
    return await this.connectionManager.executeTransaction(
      'progress',
      'readonly',
      async (transaction) => {
        const store = transaction.objectStore('progress');
        const request = store.get(kanjiId);
        
        return new Promise<KanjiProgress | null>((resolve, reject) => {
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
    );
  }

  async getProgressByJLPT(jlptLevel: string): Promise<KanjiProgress[]> {
    const userId = this.getUserId() || 'guest';
    
    return await this.connectionManager.executeTransaction(
      'progress',
      'readonly',
      async (transaction) => {
        const store = transaction.objectStore('progress');
        const index = store.index('composite');
        const request = index.getAll([userId, jlptLevel]);
        
        return new Promise<KanjiProgress[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  async getAllProgress(): Promise<KanjiProgress[]> {
    const userId = this.getUserId() || 'guest';
    
    return await this.connectionManager.executeTransaction(
      'progress',
      'readonly',
      async (transaction) => {
        const store = transaction.objectStore('progress');
        const index = store.index('userId');
        const request = index.getAll(userId);
        
        return new Promise<KanjiProgress[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  async getProgressIds(): Promise<Set<string>> {
    const progress = await this.getAllProgress();
    return new Set(progress.map(p => p.id));
  }

  async getDueCards(jlptLevel?: string): Promise<KanjiProgress[]> {
    const db = await this.ensureDb();
    const userId = this.getUserId() || 'guest';
    
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
    const userId = this.getUserId() || 'guest';
    
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
    
    // Only sync with Firebase if user is authenticated AND premium
    if (userId !== 'guest' && await this.isPremiumUser()) {
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
      
      // Only sync with Firebase if user is authenticated AND premium
      const userId = this.getUserId();
      if (userId && await this.isPremiumUser()) {
        this.syncSessionToFirebase(updatedSession);
      }
    }
  }

  async getStudySessions(jlptLevel?: string, limit = 10): Promise<StudySession[]> {
    const db = await this.ensureDb();
    const userId = this.getUserId() || 'guest';
    
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
    const userId = this.getUserId() || 'guest';
    
    return await this.connectionManager.executeTransaction(
      'settings',
      'readonly',
      async (transaction) => {
        const store = transaction.objectStore('settings');
        const request = store.get(`settings-${userId}`);
        
        return new Promise<KanjiSettings | null>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  async saveSettings(settings: Partial<KanjiSettings>): Promise<void> {
    const userId = this.getUserId() || 'guest';
    
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
    
    await this.connectionManager.executeTransaction(
      'settings',
      'readwrite',
      async (transaction) => {
        const store = transaction.objectStore('settings');
        const request = store.put(updatedSettings);
        
        await new Promise((resolve, reject) => {
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  // Helper Methods
  private async syncProgressToFirebase(progress: KanjiProgress): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;
    
    try {
      // Create a clean object without undefined values
      const cleanProgress: any = {
        id: progress.id,
        userId: progress.userId,
        lastReviewed: progress.lastReviewed.toISOString(),
        nextReview: progress.nextReview.toISOString(),
        reviewCount: progress.reviewCount,
        easeFactor: progress.easeFactor,
        interval: progress.interval,
        difficulty: progress.difficulty,
        lapses: progress.lapses,
        quality: progress.quality,
        retentionRate: progress.retentionRate,
        masteryLevel: progress.masteryLevel,
        createdAt: progress.createdAt.toISOString(),
        updatedAt: progress.updatedAt.toISOString()
      };
      
      // Only add optional fields if they exist and are not undefined
      if (progress.jlptLevel !== undefined) cleanProgress.jlptLevel = progress.jlptLevel;
      if (progress.grade !== undefined) cleanProgress.grade = progress.grade;
      if (progress.studyModes !== undefined) cleanProgress.studyModes = progress.studyModes;
      
      await setDoc(
        doc(this.firestore, 'users', userId, 'kanjiProgress', progress.id),
        cleanProgress
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
  
  // Sync data from Firebase to local IndexedDB (for premium users)
  async syncFromFirebase(): Promise<void> {
    const userId = this.getUserId();
    if (!userId || !(await this.isPremiumUser())) return;
    
    try {
      console.log('Syncing Kanji Mastery data from Firebase for premium user...');
      
      // Sync progress data
      const progressCollection = collection(this.firestore, 'users', userId, 'kanjiProgress');
      const progressSnapshot = await getDocs(progressCollection);
      
      if (!progressSnapshot.empty) {
        const db = await this.ensureDb();
        const transaction = db.transaction(['progress'], 'readwrite');
        const store = transaction.objectStore('progress');
        
        for (const doc of progressSnapshot.docs) {
          const data = doc.data();
          const progress: KanjiProgress = {
            ...data,
            id: doc.id,
            userId,
            lastReviewed: new Date(data.lastReviewed),
            nextReview: new Date(data.nextReview),
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
          };
          
          // Check if local version is newer
          const existingProgress = await new Promise<KanjiProgress | null>((resolve) => {
            const getRequest = store.get(progress.id);
            getRequest.onsuccess = () => resolve(getRequest.result || null);
            getRequest.onerror = () => resolve(null);
          });
          
          // Only update if Firebase version is newer or doesn't exist locally
          if (!existingProgress || existingProgress.updatedAt < progress.updatedAt) {
            await store.put(progress);
          }
        }
        
        console.log(`Synced ${progressSnapshot.size} kanji progress records from Firebase`);
      }
      
      // Sync study sessions
      const sessionsCollection = collection(this.firestore, 'users', userId, 'kanjiStudySessions');
      const sessionsSnapshot = await getDocs(query(sessionsCollection, orderBy('startTime', 'desc')));
      
      if (!sessionsSnapshot.empty) {
        const db = await this.ensureDb();
        const transaction = db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        
        for (const doc of sessionsSnapshot.docs) {
          const data = doc.data();
          const session: StudySession = {
            ...data,
            id: doc.id,
            userId,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : undefined
          };
          
          await store.put(session);
        }
        
        console.log(`Synced ${sessionsSnapshot.size} study sessions from Firebase`);
      }
      
    } catch (error) {
      console.error('Error syncing from Firebase:', error);
    }
  }
  
  // Manual sync trigger for premium users (both directions)
  async performFullSync(): Promise<{ success: boolean; message: string }> {
    const userId = this.getUserId();
    if (!userId) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const isPremium = await this.isPremiumUser();
    if (!isPremium) {
      return { success: false, message: 'Sync is only available for premium users' };
    }
    
    try {
      console.log('Starting full Kanji Mastery sync...');
      
      // First sync from Firebase to get latest data
      await this.syncFromFirebase();
      
      // Then sync local changes back to Firebase
      await this.syncAllToFirebase();
      
      console.log('Full Kanji Mastery sync completed successfully');
      return { success: true, message: 'Data synced successfully' };
    } catch (error) {
      console.error('Full sync failed:', error);
      return { success: false, message: 'Sync failed. Please try again later.' };
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
        
        // Create a clean object without undefined values
        const cleanProgress: any = {
          id: progress.id,
          userId: progress.userId,
          lastReviewed: progress.lastReviewed.toISOString(),
          nextReview: progress.nextReview.toISOString(),
          reviewCount: progress.reviewCount,
          easeFactor: progress.easeFactor,
          interval: progress.interval,
          difficulty: progress.difficulty,
          lapses: progress.lapses,
          quality: progress.quality,
          retentionRate: progress.retentionRate,
          masteryLevel: progress.masteryLevel,
          createdAt: progress.createdAt.toISOString(),
          updatedAt: progress.updatedAt.toISOString()
        };
        
        // Only add optional fields if they exist and are not undefined
        if (progress.jlptLevel !== undefined) cleanProgress.jlptLevel = progress.jlptLevel;
        if (progress.grade !== undefined) cleanProgress.grade = progress.grade;
        if (progress.studyModes !== undefined) cleanProgress.studyModes = progress.studyModes;
        
        batch.set(ref, cleanProgress);
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
  // Update only the nextReview date for testing purposes
  async updateNextReviewForTesting(kanjiId: string, newNextReview: Date): Promise<void> {
    const userId = this.getUserId() || 'guest';
    
    const existing = await this.getProgress(kanjiId);
    if (!existing) return;
    
    await this.saveProgress({
      ...existing,
      nextReview: newNextReview,
      updatedAt: new Date()
    });
  }

  async clearAll(): Promise<void> {
    await this.connectionManager.executeTransaction(
      ['progress', 'sessions', 'settings'],
      'readwrite',
      async (transaction) => {
        const promises = [
          'progress',
          'sessions',
          'settings'
        ].map(storeName => {
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          return new Promise((resolve, reject) => {
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
          });
        });
        
        await Promise.all(promises);
      }
    );
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
    // Fix NaN by ensuring reviewCount is a number (default to 0 if undefined)
    const totalReviews = progress.reduce((sum, p) => sum + (p.reviewCount || 0), 0);

    return {
      totalKanji: progress.length,
      dueKanji: dueCount,
      masteredKanji: masteredCount,
      totalReviews,
      averageMastery: progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + (p.masteryLevel || 0), 0) / progress.length)
        : 0,
      recentSessions: sessions.slice(0, 5)
    };
  }
}

// Export singleton instance
export const kanjiMasteryStorage = new KanjiMasteryIndexedDBStorage();