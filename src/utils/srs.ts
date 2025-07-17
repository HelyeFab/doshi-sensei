// Spaced Repetition System (SRS) implementation
import { JapaneseWord } from '@/types';

export interface SRSData {
  wordId: string;
  lastReviewed: Date;
  nextReview: Date;
  interval: number; // days
  easeFactor: number;
  repetitions: number;
}

export class SRS {
  private readonly MIN_EASE_FACTOR = 1.3;
  private readonly INITIAL_EASE_FACTOR = 2.5;

  // Get cards due for review
  async getDueCards(): Promise<JapaneseWord[]> {
    // TODO: Implement actual SRS data storage and retrieval
    // For now, return empty array
    return [];
  }

  // Update card after review
  async updateCard(wordId: string, rating: 'again' | 'hard' | 'good' | 'easy'): Promise<void> {
    // TODO: Implement actual SRS algorithm
    // This would typically:
    // 1. Load current SRS data for the word
    // 2. Calculate new interval based on rating
    // 3. Update next review date
    // 4. Save to storage

    const intervals = {
      again: 0, // Review again today
      hard: 1,  // Review tomorrow
      good: 3,  // Review in 3 days
      easy: 7   // Review in a week
    };

    console.log(`SRS: Card ${wordId} rated as ${rating}, next review in ${intervals[rating]} days`);
  }

  // Calculate next review date based on SuperMemo 2 algorithm
  private calculateNextReview(
    currentInterval: number,
    easeFactor: number,
    rating: 'again' | 'hard' | 'good' | 'easy'
  ): { interval: number; easeFactor: number } {
    let newInterval = currentInterval;
    let newEaseFactor = easeFactor;

    switch (rating) {
      case 'again':
        newInterval = 1;
        newEaseFactor = Math.max(this.MIN_EASE_FACTOR, easeFactor - 0.2);
        break;
      case 'hard':
        newInterval = currentInterval * 1.2;
        newEaseFactor = Math.max(this.MIN_EASE_FACTOR, easeFactor - 0.15);
        break;
      case 'good':
        newInterval = currentInterval * easeFactor;
        break;
      case 'easy':
        newInterval = currentInterval * easeFactor * 1.3;
        newEaseFactor = easeFactor + 0.1;
        break;
    }

    return {
      interval: Math.round(newInterval),
      easeFactor: newEaseFactor
    };
  }

  // Initialize SRS data for a new word
  private initializeSRSData(wordId: string): SRSData {
    return {
      wordId,
      lastReviewed: new Date(),
      nextReview: new Date(),
      interval: 1,
      easeFactor: this.INITIAL_EASE_FACTOR,
      repetitions: 0
    };
  }
}