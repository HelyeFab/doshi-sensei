/**
 * Kanji Mastery Storage Service
 * Handles all data persistence for kanji learning progress
 */

import EnhancedStorageManager from '@/utils/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, orderBy } from 'firebase/firestore';

export interface KanjiProgress {
  id: string; // kanji character
  lastReviewed: Date;
  nextReview: Date;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  difficulty: number;
  lapses: number;
  lastQuality: number;
  retentionRate: number;
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
  id?: string;
  date: Date;
  kanjiReviewed: number;
  newKanji?: number;
  averageQuality: number;
  timeSpent: number; // in seconds
  jlptLevel?: string;
}

export interface Achievement {
  id: string;
  unlockedAt: Date;
  type: 'streak' | 'kanji_count' | 'mastery' | 'perfect_session';
  value: number;
}

class KanjiStorageService {
  private db = getFirestore();
  private localStorageKey = 'kanji_mastery_progress';
  private sessionStorageKey = 'kanji_study_sessions';
  private achievementStorageKey = 'kanji_achievements';

  /**
   * Save kanji progress
   */
  async saveProgress(progress: KanjiProgress): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      // Save to Firebase for logged-in users
      try {
        await setDoc(
          doc(this.db, 'users', user.uid, 'kanjiProgress', progress.id),
          {
            ...progress,
            lastReviewed: progress.lastReviewed.toISOString(),
            nextReview: progress.nextReview.toISOString(),
            createdAt: progress.createdAt.toISOString(),
            updatedAt: progress.updatedAt.toISOString()
          }
        );
      } catch (error) {
        console.error('Error saving to Firebase:', error);
      }
    }

    // Always save to IndexedDB for offline support
    await this.saveToLocal(progress);
  }

  /**
   * Get progress for a specific kanji
   */
  async getProgress(kanjiId: string): Promise<KanjiProgress | null> {
    const auth = getAuth();
    const user = auth.currentUser;

    // Try Firebase first for logged-in users
    if (user) {
      try {
        const docRef = doc(this.db, 'users', user.uid, 'kanjiProgress', kanjiId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            ...data,
            lastReviewed: new Date(data.lastReviewed),
            nextReview: new Date(data.nextReview),
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
          } as KanjiProgress;
        }
      } catch (error) {
        console.error('Error fetching from Firebase:', error);
      }
    }

    // Fall back to local storage
    return this.getFromLocal(kanjiId);
  }

  /**
   * Get all kanji progress
   */
  async getAllProgress(): Promise<KanjiProgress[]> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        const progressRef = collection(this.db, 'users', user.uid, 'kanjiProgress');
        const progressQuery = query(progressRef, orderBy('lastReviewed', 'desc'));
        const snapshot = await getDocs(progressQuery);
        
        const progress: KanjiProgress[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          progress.push({
            ...data,
            id: doc.id,
            lastReviewed: new Date(data.lastReviewed),
            nextReview: new Date(data.nextReview),
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
          } as KanjiProgress);
        });
        
        return progress;
      } catch (error) {
        console.error('Error fetching all progress from Firebase:', error);
      }
    }

    // Fall back to local storage
    return this.getAllFromLocal();
  }

  /**
   * Get list of all studied kanji
   */
  async getStudiedKanji(): Promise<string[]> {
    const allProgress = await this.getAllProgress();
    return allProgress.map(p => p.id);
  }

  /**
   * Record a study session
   */
  async recordStudySession(session: StudySession): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;

    const sessionWithId = {
      ...session,
      id: session.id || Date.now().toString()
    };

    if (user) {
      try {
        await setDoc(
          doc(this.db, 'users', user.uid, 'kanjiStudySessions', sessionWithId.id),
          {
            ...sessionWithId,
            date: session.date.toISOString()
          }
        );
      } catch (error) {
        console.error('Error saving session to Firebase:', error);
      }
    }

    // Save to local storage
    await this.saveSessionToLocal(sessionWithId);
  }

  /**
   * Get study sessions
   */
  async getStudySessions(limit?: number): Promise<StudySession[]> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        const sessionsRef = collection(this.db, 'users', user.uid, 'kanjiStudySessions');
        const sessionsQuery = query(sessionsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(sessionsQuery);
        
        const sessions: StudySession[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          sessions.push({
            ...data,
            id: doc.id,
            date: new Date(data.date)
          } as StudySession);
        });
        
        return limit ? sessions.slice(0, limit) : sessions;
      } catch (error) {
        console.error('Error fetching sessions from Firebase:', error);
      }
    }

    return this.getSessionsFromLocal(limit);
  }

  /**
   * Save achievement
   */
  async saveAchievement(achievement: Achievement): Promise<void> {
    const achievements = await this.getAchievementsFromLocal();
    achievements.push(achievement);
    await EnhancedStorageManager.saveData(this.achievementStorageKey, achievements);
  }

  /**
   * Get achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    return this.getAchievementsFromLocal();
  }

  // Local storage methods
  private async saveToLocal(progress: KanjiProgress): Promise<void> {
    const allProgress = await this.getAllFromLocal();
    const index = allProgress.findIndex(p => p.id === progress.id);
    
    if (index >= 0) {
      allProgress[index] = progress;
    } else {
      allProgress.push(progress);
    }
    
    await EnhancedStorageManager.saveData(this.localStorageKey, allProgress);
  }

  private async getFromLocal(kanjiId: string): Promise<KanjiProgress | null> {
    const allProgress = await this.getAllFromLocal();
    return allProgress.find(p => p.id === kanjiId) || null;
  }

  private async getAllFromLocal(): Promise<KanjiProgress[]> {
    const data = await EnhancedStorageManager.loadData(this.localStorageKey);
    if (!data) return [];
    
    // Convert date strings back to Date objects
    return data.map((p: any) => ({
      ...p,
      lastReviewed: new Date(p.lastReviewed),
      nextReview: new Date(p.nextReview),
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    }));
  }

  private async saveSessionToLocal(session: StudySession): Promise<void> {
    const sessions = await this.getSessionsFromLocal();
    sessions.push(session);
    
    // Keep only last 100 sessions
    const recentSessions = sessions.slice(-100);
    await EnhancedStorageManager.saveData(this.sessionStorageKey, recentSessions);
  }

  private async getSessionsFromLocal(limit?: number): Promise<StudySession[]> {
    const data = await EnhancedStorageManager.loadData(this.sessionStorageKey);
    if (!data) return [];
    
    const sessions = data.map((s: any) => ({
      ...s,
      date: new Date(s.date)
    }));
    
    // Sort by date descending
    sessions.sort((a: StudySession, b: StudySession) => 
      b.date.getTime() - a.date.getTime()
    );
    
    return limit ? sessions.slice(0, limit) : sessions;
  }

  private async getAchievementsFromLocal(): Promise<Achievement[]> {
    const data = await EnhancedStorageManager.loadData(this.achievementStorageKey);
    if (!data) return [];
    
    return data.map((a: any) => ({
      ...a,
      unlockedAt: new Date(a.unlockedAt)
    }));
  }
}

// Export singleton instance
export const kanjiStorage = new KanjiStorageService();