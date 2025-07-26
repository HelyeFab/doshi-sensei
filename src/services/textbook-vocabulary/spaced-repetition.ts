/**
 * Spaced Repetition Service using ts-fsrs
 * Implements the FSRS (Free Spaced Repetition Scheduler) algorithm
 */

import { 
  createEmptyCard, 
  fsrs, 
  generatorParameters,
  Rating,
  Card,
  FSRSParameters,
  Grade
} from 'ts-fsrs';
import { vocabStorage, VocabularyProgress } from './storage';
import type { VocabularyItem } from '@/app/tools/textbook-vocabulary/types';

export interface ReviewResult {
  card: Card;
  nextReview: Date;
  interval: number;
  easeFactor: number;
}

class SpacedRepetitionService {
  private f: ReturnType<typeof fsrs>;
  
  constructor() {
    // Initialize FSRS with optimized parameters
    const params = generatorParameters({
      enable_fuzz: true, // Add some randomness to prevent bunching
      maximum_interval: 365, // Max 1 year between reviews
    });
    this.f = fsrs(params);
  }

  /**
   * Initialize a new card for vocabulary item
   */
  createNewCard(vocabularyId: string): Card {
    return createEmptyCard(new Date());
  }

  /**
   * Process a review and calculate next review time
   * @param vocabularyId The vocabulary item ID
   * @param rating User's rating (1-5, mapped to FSRS ratings)
   * @returns Review result with next review date and updated card state
   */
  async processReview(
    vocabularyId: string, 
    rating: number,
    vocabularyItem: VocabularyItem
  ): Promise<ReviewResult> {
    // Get existing progress or create new
    const progress = await vocabStorage.getProgress(vocabularyId);
    let card: Card;

    if (progress) {
      // Reconstruct card from saved progress
      card = {
        due: new Date(progress.nextReview),
        stability: progress.easeFactor,
        difficulty: 5, // Default difficulty
        elapsed_days: progress.interval,
        scheduled_days: progress.interval,
        reps: progress.reviewCount,
        lapses: 0,
        state: this.getCardState(progress),
        last_review: progress.lastReviewed
      };
    } else {
      // Create new card
      card = this.createNewCard(vocabularyId);
    }

    // Map our 1-5 rating to FSRS ratings
    const fsrsRating = this.mapRatingToFSRS(rating);
    
    // Calculate next review
    const now = new Date();
    const scheduling_cards = this.f.repeat(card, now);
    const nextCard = scheduling_cards[fsrsRating].card;
    const log = scheduling_cards[fsrsRating].log;

    // Calculate mastery level (0-100)
    const masteryLevel = this.calculateMasteryLevel(nextCard);

    // Save progress
    const updatedProgress: VocabularyProgress = {
      id: vocabularyId,
      textbook: vocabularyItem.textbook,
      lesson: vocabularyItem.lesson,
      lastReviewed: now,
      nextReview: nextCard.due,
      reviewCount: nextCard.reps,
      easeFactor: nextCard.stability,
      interval: nextCard.scheduled_days,
      quality: rating,
      masteryLevel,
      createdAt: progress?.createdAt || now,
      updatedAt: now
    };

    await vocabStorage.saveProgress(updatedProgress);

    return {
      card: nextCard,
      nextReview: nextCard.due,
      interval: nextCard.scheduled_days,
      easeFactor: nextCard.stability
    };
  }

  /**
   * Get vocabulary items due for review
   */
  async getDueCards(textbook?: string): Promise<VocabularyProgress[]> {
    return vocabStorage.getDueCards(textbook);
  }

  /**
   * Map our 1-5 rating system to FSRS ratings
   */
  private mapRatingToFSRS(rating: number): Grade {
    // Our rating: 1 (hard) to 5 (perfect)
    // FSRS: Again (1), Hard (2), Good (3), Easy (4)
    switch (rating) {
      case 1: return Rating.Again;
      case 2: return Rating.Hard;
      case 3: 
      case 4: return Rating.Good;
      case 5: return Rating.Easy;
      default: return Rating.Good;
    }
  }

  /**
   * Calculate mastery level based on card state
   */
  private calculateMasteryLevel(card: Card): number {
    // Base mastery on stability and review count
    const stabilityFactor = Math.min(card.stability / 90, 1) * 50; // 50% from stability
    const reviewFactor = Math.min(card.reps / 10, 1) * 30; // 30% from review count
    const intervalFactor = Math.min(card.scheduled_days / 30, 1) * 20; // 20% from interval
    
    return Math.round(stabilityFactor + reviewFactor + intervalFactor);
  }

  /**
   * Get card state from progress
   */
  private getCardState(progress: VocabularyProgress): number {
    // Map review count to approximate state
    if (progress.reviewCount === 0) return 0; // New
    if (progress.reviewCount < 3) return 1; // Learning
    return 2; // Review
  }

  /**
   * Get optimal review time for a session (Golden Time)
   * Returns cards that are due or will be due soon
   */
  async getGoldenTimeCards(
    textbook: string, 
    limit: number = 20
  ): Promise<VocabularyProgress[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Get all progress for textbook
    const allProgress = await vocabStorage.getProgressByTextbook(textbook);
    
    // Filter and sort by priority
    const goldenTimeCards = allProgress
      .filter(p => {
        const due = new Date(p.nextReview);
        // Include cards due now or within next 24 hours
        return due <= tomorrow;
      })
      .sort((a, b) => {
        // Sort by how overdue they are
        const aDue = new Date(a.nextReview).getTime();
        const bDue = new Date(b.nextReview).getTime();
        return aDue - bDue;
      })
      .slice(0, limit);
    
    return goldenTimeCards;
  }

  /**
   * Get review statistics
   */
  async getStats(textbook?: string) {
    const sessions = await vocabStorage.getStudySessions(textbook);
    const progress = textbook 
      ? await vocabStorage.getProgressByTextbook(textbook)
      : [];

    const now = new Date();
    const dueCount = progress.filter(p => new Date(p.nextReview) <= now).length;
    const masteredCount = progress.filter(p => p.masteryLevel >= 80).length;
    const totalReviews = progress.reduce((sum, p) => sum + p.reviewCount, 0);

    return {
      totalCards: progress.length,
      dueCards: dueCount,
      masteredCards: masteredCount,
      totalReviews,
      averageMastery: progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.masteryLevel, 0) / progress.length)
        : 0,
      recentSessions: sessions.slice(0, 5)
    };
  }
}

// Export singleton instance
export const spacedRepetition = new SpacedRepetitionService();