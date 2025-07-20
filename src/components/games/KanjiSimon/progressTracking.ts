import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { trackGamePlayed } from '@/lib/stats/trackingEvents';
import { trackEvent } from '@/utils/analytics';
import { analyticsTracker } from '@/lib/analytics/analyticsTracker';

interface KanjiSimonProgress {
  boardId: string;
  kanjiProgress: Record<string, KanjiMemoryProgress>;
  lastPlayed: string;
  totalGamesPlayed: number;
  highScore: number;
  longestSequence: number;
}

interface KanjiMemoryProgress {
  char: string;
  timesPlayed: number;
  successfulSequences: number;
  longestSequence: number;
  lastSeen: string;
}

interface GameResult {
  boardId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  longestSequence: number;
  timestamp: string;
}

const STORAGE_KEY = 'kanji_simon_progress';

// Load all Kanji Simon progress
export async function getAllKanjiSimonProgress(): Promise<Record<string, KanjiSimonProgress>> {
  try {
    const data = await EnhancedStorageManager2.loadData(STORAGE_KEY);
    return data || {};
  } catch (error) {
    console.error('Error loading Kanji Simon progress:', error);
    return {};
  }
}

// Get progress for a specific board
export async function getBoardProgress(boardId: string): Promise<KanjiSimonProgress | null> {
  const allProgress = await getAllKanjiSimonProgress();
  return allProgress[boardId] || null;
}

// Save game results and update progress
export async function saveKanjiSimonProgress(
  userId: string | null,
  boardId: string,
  result: GameResult
): Promise<void> {
  try {
    // Track game played for stats
    await trackGamePlayed(
      'kanji-simon',
      result.score,
      result.totalQuestions,
      result.correctAnswers
    );
    
    // Track with new analytics
    const accuracy = result.totalQuestions > 0 ? (result.correctAnswers / result.totalQuestions) * 100 : 0;
    analyticsTracker.trackGameComplete('kanji_simon', result.score, accuracy);
    console.log('[KanjiSimon] Analytics tracked:', { game: 'kanji_simon', score: result.score, accuracy });

    // Track analytics event
    if (userId) {
      await trackEvent('drill_completed', {
        gameType: 'kanji-simon',
        boardId,
        score: result.score,
        accuracy: (result.correctAnswers / result.totalQuestions) * 100,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        longestSequence: result.longestSequence,
        timestamp: result.timestamp
      }, userId);
    }

    // Load existing progress
    const allProgress = await getAllKanjiSimonProgress();
    
    // Get or create board progress
    const boardProgress = allProgress[boardId] || {
      boardId,
      kanjiProgress: {},
      lastPlayed: result.timestamp,
      totalGamesPlayed: 0,
      highScore: 0,
      longestSequence: 0
    };

    // Update board stats
    boardProgress.lastPlayed = result.timestamp;
    boardProgress.totalGamesPlayed += 1;
    boardProgress.highScore = Math.max(boardProgress.highScore, result.score);
    boardProgress.longestSequence = Math.max(boardProgress.longestSequence, result.longestSequence);

    // Save updated progress
    allProgress[boardId] = boardProgress;
    await EnhancedStorageManager2.saveData(STORAGE_KEY, allProgress);

  } catch (error) {
    console.error('Error saving Kanji Simon progress:', error);
  }
}

// Update individual kanji progress
export async function updateKanjiProgress(
  boardId: string,
  kanjiChar: string,
  sequenceLength: number,
  success: boolean
): Promise<void> {
  try {
    const allProgress = await getAllKanjiSimonProgress();
    const boardProgress = allProgress[boardId] || {
      boardId,
      kanjiProgress: {},
      lastPlayed: new Date().toISOString(),
      totalGamesPlayed: 0,
      highScore: 0,
      longestSequence: 0
    };

    // Get or create kanji progress
    const kanjiProgress = boardProgress.kanjiProgress[kanjiChar] || {
      char: kanjiChar,
      timesPlayed: 0,
      successfulSequences: 0,
      longestSequence: 0,
      lastSeen: new Date().toISOString()
    };

    // Update stats
    kanjiProgress.timesPlayed += 1;
    if (success) {
      kanjiProgress.successfulSequences += 1;
    }
    kanjiProgress.longestSequence = Math.max(kanjiProgress.longestSequence, sequenceLength);
    kanjiProgress.lastSeen = new Date().toISOString();

    // Save updated progress
    boardProgress.kanjiProgress[kanjiChar] = kanjiProgress;
    allProgress[boardId] = boardProgress;
    await EnhancedStorageManager2.saveData(STORAGE_KEY, allProgress);

  } catch (error) {
    console.error('Error updating kanji progress:', error);
  }
}

// Get kanji memory stats for a specific board
export async function getKanjiMemoryStats(
  boardId: string,
  kanjiChar: string
): Promise<KanjiMemoryProgress | null> {
  const boardProgress = await getBoardProgress(boardId);
  return boardProgress?.kanjiProgress[kanjiChar] || null;
}

// Clear progress for a board (for testing or user request)
export async function clearBoardProgress(boardId: string): Promise<void> {
  try {
    const allProgress = await getAllKanjiSimonProgress();
    delete allProgress[boardId];
    await EnhancedStorageManager2.saveData(STORAGE_KEY, allProgress);
  } catch (error) {
    console.error('Error clearing board progress:', error);
  }
}