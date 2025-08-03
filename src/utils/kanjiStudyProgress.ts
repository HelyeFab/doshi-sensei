import { auth, db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { FlashcardProgress, FlashcardQuality } from '@/types';
import {
  calculateNextReview,
  initializeFlashcardProgress,
  updateFlashcardProgress 
} from './spacedRepetition';
import { StatsManager } from './stats';
import { trackKanjiStudy } from '@/lib/stats/trackingEvents';

export interface KanjiStudyResult {
  boardId: string;
  kanjiChar: string;
  questionType: 'kanji' | 'meaning' | 'onyomi' | 'kunyomi';
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  timestamp: Date;
}

export interface KanjiStudySession {
  boardId: string;
  boardTitle: string;
  startedAt: Date;
  completedAt?: Date;
  totalQuestions: number;
  correctAnswers: number;
  results: KanjiStudyResult[];
  accuracy: number;
}

export interface KanjiProgress extends FlashcardProgress {
  kanjiChar: string;
  boardId: string;
  // Track performance by question type
  meaningAccuracy: number;
  onyomiAccuracy: number;
  kunyomiAccuracy: number;
  totalMeaningAttempts: number;
  totalOnyomiAttempts: number;
  totalKunyomiAttempts: number;
}

const KANJI_PROGRESS_KEY = 'doshi_kanji_progress';
const KANJI_SESSIONS_KEY = 'doshi_kanji_sessions';
const DAILY_STUDY_LIMIT_KEY = 'doshi_kanji_daily_study';

/**
 * Get all kanji progress from localStorage
 */
function getAllKanjiProgress(): Record<string, KanjiProgress> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(KANJI_PROGRESS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading kanji progress:', error);
    return {};
  }
}

/**
 * Save all kanji progress to localStorage
 */
function saveAllKanjiProgress(progress: Record<string, KanjiProgress>): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(KANJI_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving kanji progress:', error);
  }
}

/**
 * Initialize or get kanji progress
 */
export async function getKanjiProgress(boardId: string, kanjiChar: string): Promise<KanjiProgress | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const userId = auth?.currentUser?.uid;
    if (!userId) return null;

    const progressId = `${userId}_${boardId}_${kanjiChar}`;
    
    // Try to get from localStorage first
    const allProgress = getAllKanjiProgress();
    const localProgress = allProgress[progressId];
    if (localProgress) return localProgress;

    // If not found locally, try Firebase
    const docRef = doc(db, 'users', userId, 'kanjiProgress', progressId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as KanjiProgress;
      // Cache locally
      allProgress[progressId] = data;
      saveAllKanjiProgress(allProgress);
      return data;
    }

    return null;
  } catch (error) {
    console.error('Error getting kanji progress:', error);
    return null;
  }
}

/**
 * Initialize kanji progress for a new kanji
 */
export async function initializeKanjiProgress(boardId: string, kanjiChar: string): Promise<KanjiProgress> {
  if (typeof window === 'undefined') throw new Error('Cannot initialize on server side');
  
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const progressId = `${userId}_${boardId}_${kanjiChar}`;
  const baseProgress = initializeFlashcardProgress(progressId, userId, 'kanji');
  
  const kanjiProgress: KanjiProgress = {
    ...baseProgress,
    kanjiChar,
    boardId,
    meaningAccuracy: 0,
    onyomiAccuracy: 0,
    kunyomiAccuracy: 0,
    totalMeaningAttempts: 0,
    totalOnyomiAttempts: 0,
    totalKunyomiAttempts: 0,
  };

  // Save to localStorage
  const allProgress = getAllKanjiProgress();
  allProgress[progressId] = kanjiProgress;
  saveAllKanjiProgress(allProgress);
  
  // Sync to Firebase
  const docRef = doc(db, 'users', userId, 'kanjiProgress', progressId);
  await setDoc(docRef, {
    ...kanjiProgress,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return kanjiProgress;
}

/**
 * Update kanji progress after a study result
 */
export async function updateKanjiProgressFromResult(
  result: KanjiStudyResult,
  responseTime: number
): Promise<KanjiProgress> {
  if (typeof window === 'undefined') throw new Error('Cannot update on server side');
  
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  // Get or initialize progress
  let progress = await getKanjiProgress(result.boardId, result.kanjiChar);
  if (!progress) {
    progress = await initializeKanjiProgress(result.boardId, result.kanjiChar);
  }

  // Calculate quality based on correctness and response time
  let quality: FlashcardQuality;
  if (!result.isCorrect) {
    quality = 1; // Wrong answer
  } else if (responseTime < 2000) {
    quality = 5; // Perfect recall
  } else if (responseTime < 4000) {
    quality = 4; // Good recall
  } else {
    quality = 3; // Correct but slow
  }

  // Update SRS progress
  const updatedProgress = updateFlashcardProgress(progress, quality, responseTime);

  // Update question-type specific accuracy
  const kanjiProgress: KanjiProgress = {
    ...updatedProgress,
    kanjiChar: result.kanjiChar,
    boardId: result.boardId,
    meaningAccuracy: progress.meaningAccuracy,
    onyomiAccuracy: progress.onyomiAccuracy,
    kunyomiAccuracy: progress.kunyomiAccuracy,
    totalMeaningAttempts: progress.totalMeaningAttempts,
    totalOnyomiAttempts: progress.totalOnyomiAttempts,
    totalKunyomiAttempts: progress.totalKunyomiAttempts,
  };

  // Update specific question type stats
  switch (result.questionType) {
    case 'meaning':
    case 'kanji': // kanji->meaning counts as meaning
      kanjiProgress.totalMeaningAttempts++;
      if (result.isCorrect) {
        kanjiProgress.meaningAccuracy = 
          ((kanjiProgress.meaningAccuracy * (kanjiProgress.totalMeaningAttempts - 1)) + 1) / 
          kanjiProgress.totalMeaningAttempts;
      } else {
        kanjiProgress.meaningAccuracy = 
          (kanjiProgress.meaningAccuracy * (kanjiProgress.totalMeaningAttempts - 1)) / 
          kanjiProgress.totalMeaningAttempts;
      }
      break;
    case 'onyomi':
      kanjiProgress.totalOnyomiAttempts++;
      if (result.isCorrect) {
        kanjiProgress.onyomiAccuracy = 
          ((kanjiProgress.onyomiAccuracy * (kanjiProgress.totalOnyomiAttempts - 1)) + 1) / 
          kanjiProgress.totalOnyomiAttempts;
      } else {
        kanjiProgress.onyomiAccuracy = 
          (kanjiProgress.onyomiAccuracy * (kanjiProgress.totalOnyomiAttempts - 1)) / 
          kanjiProgress.totalOnyomiAttempts;
      }
      break;
    case 'kunyomi':
      kanjiProgress.totalKunyomiAttempts++;
      if (result.isCorrect) {
        kanjiProgress.kunyomiAccuracy = 
          ((kanjiProgress.kunyomiAccuracy * (kanjiProgress.totalKunyomiAttempts - 1)) + 1) / 
          kanjiProgress.totalKunyomiAttempts;
      } else {
        kanjiProgress.kunyomiAccuracy = 
          (kanjiProgress.kunyomiAccuracy * (kanjiProgress.totalKunyomiAttempts - 1)) / 
          kanjiProgress.totalKunyomiAttempts;
      }
      break;
  }

  // Save to localStorage
  const allProgress = getAllKanjiProgress();
  const progressId = `${userId}_${result.boardId}_${result.kanjiChar}`;
  allProgress[progressId] = kanjiProgress;
  saveAllKanjiProgress(allProgress);

  // Sync to Firebase
  const docRef = doc(db, 'users', userId, 'kanjiProgress', progressId);
  try {
    await updateDoc(docRef, {
      ...kanjiProgress,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    // If document doesn't exist, create it
    await setDoc(docRef, {
      ...kanjiProgress,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return kanjiProgress;
}

/**
 * Get daily study count for a user
 */
export function getDailyStudyCount(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const stored = localStorage.getItem(DAILY_STUDY_LIMIT_KEY);
    if (!stored) return 0;
    
    const data = JSON.parse(stored);
    const today = new Date().toDateString();
    
    // Reset count if it's a new day
    if (data.date !== today) {
      return 0;
    }
    
    return data.count || 0;
  } catch (error) {
    console.error('Error getting daily study count:', error);
    return 0;
  }
}

/**
 * Increment daily study count
 */
export function incrementDailyStudyCount(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const today = new Date().toDateString();
    const currentCount = getDailyStudyCount();
    
    localStorage.setItem(DAILY_STUDY_LIMIT_KEY, JSON.stringify({
      date: today,
      count: currentCount + 1,
      lastStudyTime: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error incrementing daily study count:', error);
  }
}

/**
 * Check if user can study (considering daily limit for free users)
 */
export async function canUserStudy(userId?: string): Promise<{ canStudy: boolean; remainingSessions: number; isPremium: boolean }> {
  if (typeof window === 'undefined') {
    // Server-side: return default values
    return { canStudy: false, remainingSessions: 0, isPremium: false };
  }
  
  // Allow passing userId to avoid auth timing issues
  const effectiveUserId = userId || auth?.currentUser?.uid;
  if (!effectiveUserId) {
    return { canStudy: false, remainingSessions: 0, isPremium: false };
  }

  try {
    // Check if user is premium
    const userDoc = await getDoc(doc(db, 'users', effectiveUserId));
    const isPremium = userDoc.data()?.isPremium || false;
    
    if (isPremium) {
      return { canStudy: true, remainingSessions: -1, isPremium: true }; // -1 means unlimited
    }
    
    // Free user - check daily limit
    const dailyCount = getDailyStudyCount();
    const DAILY_LIMIT = 3;
    const canStudy = dailyCount < DAILY_LIMIT;
    const remainingSessions = Math.max(0, DAILY_LIMIT - dailyCount);
    
    return { canStudy, remainingSessions, isPremium: false };
  } catch (error) {
    console.error('Error checking study access:', error);
    // Default to free user limits on error
    const dailyCount = getDailyStudyCount();
    const DAILY_LIMIT = 3;
    return { 
      canStudy: dailyCount < DAILY_LIMIT, 
      remainingSessions: Math.max(0, DAILY_LIMIT - dailyCount), 
      isPremium: false 
    };
  }
}

/**
 * Save a complete study session
 */
export async function saveStudySession(session: KanjiStudySession): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const userId = auth?.currentUser?.uid;
    if (!userId) return;

    const sessionId = `${userId}_${session.boardId}_${session.startedAt.getTime()}`;
    
    // Increment daily count for free users
    const { isPremium } = await canUserStudy();
    if (!isPremium) {
      incrementDailyStudyCount();
    }
    
    // Save session to localStorage
    const storedSessions = localStorage.getItem(KANJI_SESSIONS_KEY);
    const sessions = storedSessions ? JSON.parse(storedSessions) : {};
    sessions[sessionId] = session;
    localStorage.setItem(KANJI_SESSIONS_KEY, JSON.stringify(sessions));

    // Update stats
    await StatsManager.recordKanjiStudySession(
      session.totalQuestions,
      session.correctAnswers
    );

    // Track in new stats system
    // Since trackKanjiStudy expects (character, correct, sessionType), we'll track each correct answer
    for (let i = 0; i < session.correctAnswers; i++) {
      await trackKanjiStudy(
        session.boardId, // Using boardId as a placeholder for kanji character
        true,
        'mood' // Assuming this is a mood board session
      );
    }

    // Save to Firebase
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      kanjiStudySessions: arrayUnion({
        ...session,
        id: sessionId,
        results: session.results.map(r => ({
          ...r,
          timestamp: r.timestamp.toISOString()
        }))
      }),
      totalKanjiStudySessions: increment(1),
      totalKanjiStudyQuestions: increment(session.totalQuestions),
      totalKanjiCorrectAnswers: increment(session.correctAnswers),
      lastKanjiStudySession: serverTimestamp()
    });

    // Update board-specific stats
    const boardStatsRef = doc(db, 'users', userId, 'boardStats', session.boardId);
    const boardStatsSnap = await getDoc(boardStatsRef);
    
    if (boardStatsSnap.exists()) {
      await updateDoc(boardStatsRef, {
        totalSessions: increment(1),
        totalQuestions: increment(session.totalQuestions),
        totalCorrect: increment(session.correctAnswers),
        lastStudied: serverTimestamp(),
        averageAccuracy: increment(
          (session.accuracy - (boardStatsSnap.data().averageAccuracy || 0)) / 
          ((boardStatsSnap.data().totalSessions || 0) + 1)
        )
      });
    } else {
      await setDoc(boardStatsRef, {
        boardId: session.boardId,
        boardTitle: session.boardTitle,
        totalSessions: 1,
        totalQuestions: session.totalQuestions,
        totalCorrect: session.correctAnswers,
        averageAccuracy: session.accuracy,
        lastStudied: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error saving study session:', error);
  }
}

/**
 * Get study statistics for a board
 */
export async function getBoardStudyStats(boardId: string) {
  if (typeof window === 'undefined') return null;
  
  try {
    const userId = auth?.currentUser?.uid;
    if (!userId) return null;

    const boardStatsRef = doc(db, 'users', userId, 'boardStats', boardId);
    const boardStatsSnap = await getDoc(boardStatsRef);
    
    if (boardStatsSnap.exists()) {
      return boardStatsSnap.data();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting board study stats:', error);
    return null;
  }
}

/**
 * Get all kanji progress for a board
 */
export async function getBoardKanjiProgress(boardId: string): Promise<KanjiProgress[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    const userId = auth?.currentUser?.uid;
    if (!userId) return [];

    // Get all kanji progress from localStorage
    const allProgress = getAllKanjiProgress();
    
    // Filter by boardId and userId
    return Object.values(allProgress).filter(p => p.boardId === boardId && p.userId === userId);
  } catch (error) {
    console.error('Error getting board kanji progress:', error);
    return [];
  }
}

/**
 * Calculate overall kanji mastery for a board
 */
export async function calculateBoardMastery(boardId: string): Promise<{
  totalKanji: number;
  masteredKanji: number;
  learningKanji: number;
  difficultKanji: number;
  averageAccuracy: number;
  nextReviewDate: Date | null;
}> {
  const kanjiProgress = await getBoardKanjiProgress(boardId);
  
  if (kanjiProgress.length === 0) {
    return {
      totalKanji: 0,
      masteredKanji: 0,
      learningKanji: 0,
      difficultKanji: 0,
      averageAccuracy: 0,
      nextReviewDate: null
    };
  }

  const masteredKanji = kanjiProgress.filter(p => p.difficulty === 'mastered').length;
  const learningKanji = kanjiProgress.filter(p => p.difficulty === 'learning').length;
  const difficultKanji = kanjiProgress.filter(p => p.difficulty === 'difficult').length;
  
  const totalAccuracy = kanjiProgress.reduce((sum, p) => {
    const attempts = p.totalReviews || 0;
    const correct = p.correctReviews || 0;
    return sum + (attempts > 0 ? correct / attempts : 0);
  }, 0);
  
  const averageAccuracy = (totalAccuracy / kanjiProgress.length) * 100;
  
  // Find next review date
  const nextReviewDates = kanjiProgress
    .map(p => p.nextReviewDate)
    .filter(date => date > new Date())
    .sort((a, b) => a.getTime() - b.getTime());
  
  const nextReviewDate = nextReviewDates.length > 0 ? nextReviewDates[0] : null;

  return {
    totalKanji: kanjiProgress.length,
    masteredKanji,
    learningKanji,
    difficultKanji,
    averageAccuracy: Math.round(averageAccuracy),
    nextReviewDate
  };
}