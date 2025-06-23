import { MoodBoard, MoodBoardsProgress, BoardProgress } from '@/types/moodBoard';
import moodBoardsData from '@/data/moodBoards.json';

/**
 * Get all available mood boards
 */
export function getAllMoodBoards(): MoodBoard[] {
  return Object.values(moodBoardsData) as MoodBoard[];
}

/**
 * Get a specific mood board by ID
 */
export function getMoodBoardById(id: string): MoodBoard | null {
  const board = moodBoardsData[id as keyof typeof moodBoardsData];
  return board ? (board as MoodBoard) : null;
}

/**
 * Get mood boards filtered by JLPT level
 */
export function getMoodBoardsByJLPT(jlpt: string): MoodBoard[] {
  return getAllMoodBoards().filter(board => board.jlpt === jlpt);
}

/**
 * Check if a mood board exists
 */
export function moodBoardExists(id: string): boolean {
  return id in moodBoardsData;
}

/**
 * Get the total number of kanji in a mood board
 */
export function getTotalKanjiCount(boardId: string): number {
  const board = getMoodBoardById(boardId);
  return board ? board.kanji.length : 0;
}

/**
 * Calculate progress percentage for a board
 */
export function calculateProgressPercentage(learnedKanji: string[], totalKanji: number): number {
  if (totalKanji === 0) return 0;
  return Math.round((learnedKanji.length / totalKanji) * 100);
}
