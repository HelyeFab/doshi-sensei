import { MoodBoardsProgress, BoardProgress } from '@/types/moodBoard';
import { getTotalKanjiCount, calculateProgressPercentage } from './moodBoardData';

const STORAGE_KEY = 'doshi_mood_boards_progress';

/**
 * Get all mood board progress from localStorage
 */
export function getAllProgress(): MoodBoardsProgress {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading mood board progress:', error);
    return {};
  }
}

/**
 * Get progress for a specific board
 */
export function getBoardProgress(boardId: string): BoardProgress | null {
  const allProgress = getAllProgress();
  return allProgress[boardId] || null;
}

/**
 * Save progress for a specific board
 */
export function saveBoardProgress(boardId: string, progress: BoardProgress): void {
  if (typeof window === 'undefined') return;

  try {
    const allProgress = getAllProgress();
    allProgress[boardId] = progress;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  } catch (error) {
    console.error('Error saving mood board progress:', error);
  }
}

/**
 * Toggle learned status for a kanji character
 */
export function toggleKanjiLearned(boardId: string, kanjiChar: string): BoardProgress {
  const currentProgress = getBoardProgress(boardId);
  const totalKanji = getTotalKanjiCount(boardId);

  // Initialize progress if it doesn't exist
  let learnedKanji = currentProgress?.learnedKanji || [];

  // Toggle the kanji
  if (learnedKanji.includes(kanjiChar)) {
    learnedKanji = learnedKanji.filter(char => char !== kanjiChar);
  } else {
    learnedKanji = [...learnedKanji, kanjiChar];
  }

  const progressPercentage = calculateProgressPercentage(learnedKanji, totalKanji);
  const isCompleted = progressPercentage === 100;

  const newProgress: BoardProgress = {
    boardId,
    learnedKanji,
    totalKanji,
    progressPercentage,
    lastStudied: new Date(),
    ...(isCompleted && !currentProgress?.completedAt && { completedAt: new Date() })
  };

  saveBoardProgress(boardId, newProgress);
  return newProgress;
}

/**
 * Check if a kanji is learned
 */
export function isKanjiLearned(boardId: string, kanjiChar: string): boolean {
  const progress = getBoardProgress(boardId);
  return progress?.learnedKanji.includes(kanjiChar) || false;
}

/**
 * Check if a board is completed
 */
export function isBoardCompleted(boardId: string): boolean {
  const progress = getBoardProgress(boardId);
  return progress?.progressPercentage === 100 || false;
}

/**
 * Get summary statistics for all boards
 */
export function getProgressSummary() {
  const allProgress = getAllProgress();
  const boardIds = Object.keys(allProgress);

  const totalBoards = boardIds.length;
  const completedBoards = boardIds.filter(id => isBoardCompleted(id)).length;
  const totalKanji = boardIds.reduce((sum, id) => sum + getTotalKanjiCount(id), 0);
  const learnedKanji = boardIds.reduce((sum, id) => {
    const progress = allProgress[id];
    return sum + (progress?.learnedKanji.length || 0);
  }, 0);

  return {
    totalBoards,
    completedBoards,
    totalKanji,
    learnedKanji,
    overallProgress: totalKanji > 0 ? Math.round((learnedKanji / totalKanji) * 100) : 0
  };
}

/**
 * Reset progress for a specific board
 */
export function resetBoardProgress(boardId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const allProgress = getAllProgress();
    delete allProgress[boardId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  } catch (error) {
    console.error('Error resetting board progress:', error);
  }
}

/**
 * Reset all progress (for testing/debugging)
 */
export function resetAllProgress(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting all progress:', error);
  }
}
