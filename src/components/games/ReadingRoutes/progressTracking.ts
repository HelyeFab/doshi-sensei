import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { trackGamePlayed } from '@/lib/stats/trackingEvents';
import { trackEvent } from '@/utils/analytics';
import { analyticsTracker } from '@/lib/analytics/analyticsTracker';

interface ReadingRoutesProgress {
  boardId: string;
  kanjiProgress: Record<string, KanjiReadingProgress>;
  lastPlayed: string;
  totalGamesPlayed: number;
  highScore: number;
  averageAccuracy: number;
}

interface KanjiReadingProgress {
  char: string;
  onYomiAttempts: number;
  onYomiCorrect: number;
  kunYomiAttempts: number;
  kunYomiCorrect: number;
  lastSeen: string;
  masteryLevel: number; // 0-100
}

interface GameResult {
  boardId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timestamp: string;
}

const STORAGE_KEY = 'reading_routes_progress';

// Load all Reading Routes progress
export async function getAllReadingRoutesProgress(): Promise<Record<string, ReadingRoutesProgress>> {
  try {
    const data = await EnhancedStorageManager2.loadData(STORAGE_KEY);
    return data || {};
  } catch (error) {
    console.error('Error loading Reading Routes progress:', error);
    return {};
  }
}

// Get progress for a specific board
export async function getBoardProgress(boardId: string): Promise<ReadingRoutesProgress | null> {
  const allProgress = await getAllReadingRoutesProgress();
  return allProgress[boardId] || null;
}

// Save game results and update progress
export async function saveReadingRoutesProgress(
  userId: string | null,
  boardId: string,
  result: GameResult
): Promise<void> {
  try {
    // Track game played for stats
    await trackGamePlayed(
      'reading-routes',
      result.score,
      result.totalQuestions,
      result.correctAnswers
    );
    
    // Track with new analytics
    const accuracy = result.totalQuestions > 0 ? (result.correctAnswers / result.totalQuestions) * 100 : 0;
    analyticsTracker.trackGameComplete('reading_routes', result.score, accuracy);
    console.log('[ReadingRoutes] Analytics tracked:', { game: 'reading_routes', score: result.score, accuracy });

    // Track analytics event
    if (userId) {
      await trackEvent('drill_completed', {
        gameType: 'reading-routes',
        boardId,
        score: result.score,
        accuracy: (result.correctAnswers / result.totalQuestions) * 100,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        timestamp: result.timestamp
      }, userId);
    }

    // Load existing progress
    const allProgress = await getAllReadingRoutesProgress();
    
    // Get or create board progress
    const boardProgress = allProgress[boardId] || {
      boardId,
      kanjiProgress: {},
      lastPlayed: result.timestamp,
      totalGamesPlayed: 0,
      highScore: 0,
      averageAccuracy: 0
    };

    // Update board stats
    boardProgress.lastPlayed = result.timestamp;
    boardProgress.totalGamesPlayed += 1;
    boardProgress.highScore = Math.max(boardProgress.highScore, result.score);
    
    // Update average accuracy
    const currentAccuracy = (result.correctAnswers / result.totalQuestions) * 100;
    boardProgress.averageAccuracy = 
      (boardProgress.averageAccuracy * (boardProgress.totalGamesPlayed - 1) + currentAccuracy) / 
      boardProgress.totalGamesPlayed;

    // Save updated progress
    allProgress[boardId] = boardProgress;
    await EnhancedStorageManager2.saveData(STORAGE_KEY, allProgress);

  } catch (error) {
    console.error('Error saving Reading Routes progress:', error);
  }
}

// Update individual kanji reading progress
export async function updateKanjiReadingProgress(
  boardId: string,
  kanjiChar: string,
  readingType: 'on' | 'kun',
  isCorrect: boolean
): Promise<void> {
  try {
    const allProgress = await getAllReadingRoutesProgress();
    const boardProgress = allProgress[boardId] || {
      boardId,
      kanjiProgress: {},
      lastPlayed: new Date().toISOString(),
      totalGamesPlayed: 0,
      highScore: 0,
      averageAccuracy: 0
    };

    // Get or create kanji progress
    const kanjiProgress = boardProgress.kanjiProgress[kanjiChar] || {
      char: kanjiChar,
      onYomiAttempts: 0,
      onYomiCorrect: 0,
      kunYomiAttempts: 0,
      kunYomiCorrect: 0,
      lastSeen: new Date().toISOString(),
      masteryLevel: 0
    };

    // Update attempts and correct counts
    if (readingType === 'on') {
      kanjiProgress.onYomiAttempts += 1;
      if (isCorrect) kanjiProgress.onYomiCorrect += 1;
    } else {
      kanjiProgress.kunYomiAttempts += 1;
      if (isCorrect) kanjiProgress.kunYomiCorrect += 1;
    }

    // Update last seen
    kanjiProgress.lastSeen = new Date().toISOString();

    // Calculate mastery level (0-100)
    const onAccuracy = kanjiProgress.onYomiAttempts > 0 
      ? (kanjiProgress.onYomiCorrect / kanjiProgress.onYomiAttempts) * 100 
      : 0;
    const kunAccuracy = kanjiProgress.kunYomiAttempts > 0 
      ? (kanjiProgress.kunYomiCorrect / kanjiProgress.kunYomiAttempts) * 100 
      : 0;
    
    // Weighted average with minimum attempt requirements
    const onWeight = Math.min(kanjiProgress.onYomiAttempts / 5, 1); // Need 5 attempts for full weight
    const kunWeight = Math.min(kanjiProgress.kunYomiAttempts / 5, 1);
    
    if (onWeight + kunWeight > 0) {
      kanjiProgress.masteryLevel = 
        (onAccuracy * onWeight + kunAccuracy * kunWeight) / (onWeight + kunWeight);
    }

    // Save updated progress
    boardProgress.kanjiProgress[kanjiChar] = kanjiProgress;
    allProgress[boardId] = boardProgress;
    await EnhancedStorageManager2.saveData(STORAGE_KEY, allProgress);

  } catch (error) {
    console.error('Error updating kanji reading progress:', error);
  }
}

// Get kanji mastery for a specific board
export async function getKanjiMastery(
  boardId: string,
  kanjiChar: string
): Promise<KanjiReadingProgress | null> {
  const boardProgress = await getBoardProgress(boardId);
  return boardProgress?.kanjiProgress[kanjiChar] || null;
}

// Get overall board mastery percentage
export async function getBoardMasteryPercentage(boardId: string): Promise<number> {
  const boardProgress = await getBoardProgress(boardId);
  if (!boardProgress) return 0;

  const kanjiList = Object.values(boardProgress.kanjiProgress);
  if (kanjiList.length === 0) return 0;

  const totalMastery = kanjiList.reduce((sum, kanji) => sum + kanji.masteryLevel, 0);
  return totalMastery / kanjiList.length;
}

// Clear progress for a board (for testing or user request)
export async function clearBoardProgress(boardId: string): Promise<void> {
  try {
    const allProgress = await getAllReadingRoutesProgress();
    delete allProgress[boardId];
    await EnhancedStorageManager2.saveData(STORAGE_KEY, allProgress);
  } catch (error) {
    console.error('Error clearing board progress:', error);
  }
}

// Get reading statistics for a specific kanji
export function getReadingStats(kanjiProgress: KanjiReadingProgress) {
  return {
    onYomi: {
      accuracy: kanjiProgress.onYomiAttempts > 0 
        ? (kanjiProgress.onYomiCorrect / kanjiProgress.onYomiAttempts) * 100 
        : 0,
      attempts: kanjiProgress.onYomiAttempts,
      correct: kanjiProgress.onYomiCorrect
    },
    kunYomi: {
      accuracy: kanjiProgress.kunYomiAttempts > 0 
        ? (kanjiProgress.kunYomiCorrect / kanjiProgress.kunYomiAttempts) * 100 
        : 0,
      attempts: kanjiProgress.kunYomiAttempts,
      correct: kanjiProgress.kunYomiCorrect
    },
    overall: {
      mastery: kanjiProgress.masteryLevel,
      totalAttempts: kanjiProgress.onYomiAttempts + kanjiProgress.kunYomiAttempts,
      lastSeen: kanjiProgress.lastSeen
    }
  };
}