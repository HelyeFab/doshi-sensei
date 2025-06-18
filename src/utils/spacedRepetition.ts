import { FlashcardProgress, FlashcardQuality } from '@/types';

/**
 * SuperMemo SM-2 Algorithm Implementation
 * Used for calculating optimal review intervals based on recall quality
 */

export interface SpacedRepetitionResult {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
}

/**
 * Calculate next review schedule using SuperMemo SM-2 algorithm
 * @param quality Quality of recall (0-5 scale)
 * @param repetitions Current number of successful repetitions
 * @param easeFactor Current ease factor (1.3-2.5)
 * @param interval Current interval in days
 * @returns Updated scheduling parameters
 */
export function calculateNextReview(
  quality: FlashcardQuality,
  repetitions: number,
  easeFactor: number,
  interval: number
): SpacedRepetitionResult {
  let newInterval = interval;
  let newRepetitions = repetitions;
  let newEaseFactor = easeFactor;

  // If quality >= 3 (correct response), increase interval
  if (quality >= 3) {
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    // If quality < 3 (incorrect response), reset repetitions and interval
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor based on quality
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ensure ease factor stays within bounds
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    nextReviewDate
  };
}

/**
 * Initialize flashcard progress for a new word
 * @param wordId The word ID
 * @param userId The user ID
 * @returns Initial flashcard progress
 */
export function initializeFlashcardProgress(wordId: string, userId: string): FlashcardProgress {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    id: `${userId}_${wordId}`,
    userId,
    wordId,
    easeFactor: 2.5, // Initial ease factor
    interval: 1, // Start with 1 day interval
    repetitions: 0,
    nextReviewDate: tomorrow,
    lastReviewDate: now,
    difficulty: 'learning',
    totalReviews: 0,
    correctReviews: 0,
    averageResponseTime: 0,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Update flashcard progress after a review
 * @param progress Current progress
 * @param quality Quality rating from review
 * @param responseTime Time taken to respond in milliseconds
 * @returns Updated progress
 */
export function updateFlashcardProgress(
  progress: FlashcardProgress,
  quality: FlashcardQuality,
  responseTime: number
): FlashcardProgress {
  const result = calculateNextReview(
    quality,
    progress.repetitions,
    progress.easeFactor,
    progress.interval
  );

  // Update difficulty level based on performance
  let difficulty: FlashcardProgress['difficulty'] = 'learning';
  if (progress.repetitions >= 5 && progress.correctReviews / progress.totalReviews > 0.8) {
    difficulty = 'mastered';
  } else if (progress.repetitions >= 2) {
    difficulty = 'reviewing';
  }

  // Calculate new average response time
  const totalResponseTime = progress.averageResponseTime * progress.totalReviews + responseTime;
  const newAverageResponseTime = totalResponseTime / (progress.totalReviews + 1);

  return {
    ...progress,
    easeFactor: result.easeFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    nextReviewDate: result.nextReviewDate,
    lastReviewDate: new Date(),
    difficulty,
    totalReviews: progress.totalReviews + 1,
    correctReviews: progress.correctReviews + (quality >= 3 ? 1 : 0),
    averageResponseTime: newAverageResponseTime,
    updatedAt: new Date()
  };
}

/**
 * Check if a card is due for review
 * @param progress Flashcard progress
 * @returns True if card is due for review
 */
export function isCardDueForReview(progress: FlashcardProgress): boolean {
  const now = new Date();
  return progress.nextReviewDate <= now;
}

/**
 * Get cards due for review from a list of progress records
 * @param progressList List of flashcard progress records
 * @returns Cards that are due for review, sorted by priority
 */
export function getDueCards(progressList: FlashcardProgress[]): FlashcardProgress[] {
  const now = new Date();

  return progressList
    .filter(progress => isCardDueForReview(progress))
    .sort((a, b) => {
      // Sort by priority: overdue cards first, then by difficulty
      const aOverdue = Math.max(0, now.getTime() - a.nextReviewDate.getTime());
      const bOverdue = Math.max(0, now.getTime() - b.nextReviewDate.getTime());

      if (aOverdue !== bOverdue) {
        return bOverdue - aOverdue; // More overdue first
      }

      // If equally overdue, prioritize learning cards
      const difficultyOrder = { learning: 0, reviewing: 1, mastered: 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
}

/**
 * Calculate study statistics for a set of flashcard progress records
 * @param progressList List of flashcard progress records
 * @returns Study statistics
 */
export function calculateStudyStats(progressList: FlashcardProgress[]) {
  const total = progressList.length;
  const learning = progressList.filter(p => p.difficulty === 'learning').length;
  const reviewing = progressList.filter(p => p.difficulty === 'reviewing').length;
  const mastered = progressList.filter(p => p.difficulty === 'mastered').length;
  const dueToday = getDueCards(progressList).length;

  const totalReviews = progressList.reduce((sum, p) => sum + p.totalReviews, 0);
  const totalCorrect = progressList.reduce((sum, p) => sum + p.correctReviews, 0);
  const overallAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

  const avgResponseTime = progressList.reduce((sum, p) => sum + p.averageResponseTime, 0) / total;

  return {
    total,
    learning,
    reviewing,
    mastered,
    dueToday,
    overallAccuracy: Math.round(overallAccuracy),
    avgResponseTime: Math.round(avgResponseTime)
  };
}

/**
 * Generate quality rating descriptions for UI
 */
export const qualityDescriptions: Record<FlashcardQuality, string> = {
  0: 'Complete blackout - No recall at all',
  1: 'Incorrect response - Answer seemed familiar',
  2: 'Incorrect response - Answer seemed easy to recall',
  3: 'Correct response - With significant difficulty',
  4: 'Correct response - After some hesitation',
  5: 'Correct response - Perfect recall'
};

/**
 * Get recommended study session size based on due cards and time available
 * @param dueCount Number of due cards
 * @param timeAvailable Time available in minutes
 * @returns Recommended number of cards to study
 */
export function getRecommendedSessionSize(dueCount: number, timeAvailable: number): number {
  // Assume average 30 seconds per card
  const maxCardsForTime = Math.floor(timeAvailable * 2);

  // Don't overwhelm user - cap at 50 cards per session
  const maxRecommended = Math.min(50, maxCardsForTime);

  return Math.min(dueCount, maxRecommended);
}
