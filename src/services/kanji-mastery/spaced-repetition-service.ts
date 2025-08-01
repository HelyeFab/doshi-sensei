/**
 * Spaced Repetition Service for Kanji Mastery using ts-fsrs
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
import { kanjiMasteryStorage, KanjiProgress } from './indexdb-storage';
import type { EnrichedKanji } from './kanji-enrichment';

export interface ReviewResult {
  card: Card;
  nextReview: Date;
  interval: number;
  easeFactor: number;
}

class KanjiSpacedRepetitionService {
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
   * Initialize a new card for kanji
   */
  createNewCard(kanjiId: string): Card {
    return createEmptyCard(new Date());
  }

  /**
   * Process a review and calculate next review time
   * @param kanjiId The kanji character
   * @param rating User's rating (1-5, mapped to FSRS ratings)
   * @param kanjiData The enriched kanji data
   * @returns Review result with next review date and updated card state
   */
  async processReview(
    kanjiId: string, 
    rating: number,
    kanjiData: EnrichedKanji,
    studyMode: 'recognition' | 'production' | 'writing' = 'recognition'
  ): Promise<ReviewResult> {
    // Get existing progress or create new
    const progress = await kanjiMasteryStorage.getProgress(kanjiId);
    let card: Card;

    if (progress) {
      // Reconstruct card from saved progress
      card = {
        due: new Date(progress.nextReview),
        stability: progress.easeFactor,
        difficulty: progress.difficulty,
        elapsed_days: progress.interval,
        scheduled_days: progress.interval,
        reps: progress.reviewCount,
        lapses: progress.lapses,
        state: this.getCardState(progress),
        last_review: progress.lastReviewed
      };
    } else {
      // Create new card
      card = this.createNewCard(kanjiId);
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

    // Update study mode stats
    const studyModes = progress?.studyModes || {};
    if (!studyModes[studyMode]) {
      studyModes[studyMode] = {
        reviewCount: 0,
        lastQuality: rating,
        averageQuality: rating
      };
    } else {
      const mode = studyModes[studyMode]!;
      const totalQuality = mode.averageQuality * mode.reviewCount + rating;
      mode.reviewCount++;
      mode.averageQuality = totalQuality / mode.reviewCount;
      mode.lastQuality = rating;
    }

    // Calculate retention rate
    const retentionRate = this.calculateRetentionRate(progress, rating);

    // Save progress
    const updatedProgress: KanjiProgress = {
      id: kanjiId,
      jlptLevel: kanjiData.jlpt,
      grade: kanjiData.grade,
      lastReviewed: now,
      nextReview: nextCard.due,
      reviewCount: nextCard.reps,
      easeFactor: nextCard.stability,
      interval: nextCard.scheduled_days,
      difficulty: nextCard.difficulty,
      lapses: nextCard.lapses,
      quality: rating,
      retentionRate,
      masteryLevel,
      studyModes,
      createdAt: progress?.createdAt || now,
      updatedAt: now
    };

    await kanjiMasteryStorage.saveProgress(updatedProgress);

    return {
      card: nextCard,
      nextReview: nextCard.due,
      interval: nextCard.scheduled_days,
      easeFactor: nextCard.stability
    };
  }

  /**
   * Get kanji due for review
   */
  async getDueKanji(jlptLevel?: string): Promise<KanjiProgress[]> {
    return kanjiMasteryStorage.getDueCards(jlptLevel);
  }

  /**
   * Map our 1-5 rating system to FSRS ratings
   */
  private mapRatingToFSRS(rating: number): Grade {
    // Our rating: 1 (forgot) to 5 (perfect)
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
   * Calculate retention rate based on review history
   */
  private calculateRetentionRate(progress: KanjiProgress | null, currentRating: number): number {
    if (!progress) return currentRating >= 3 ? 100 : 0;
    
    const previousRate = progress.retentionRate || 0;
    const weight = 0.1; // How much the current review affects the rate
    
    const currentSuccess = currentRating >= 3 ? 100 : 0;
    return Math.round(previousRate * (1 - weight) + currentSuccess * weight);
  }

  /**
   * Get card state from progress
   */
  private getCardState(progress: KanjiProgress): number {
    // Map review count to approximate state
    if (progress.reviewCount === 0) return 0; // New
    if (progress.reviewCount < 3) return 1; // Learning
    return 2; // Review
  }

  /**
   * Get optimal review time for a session
   * Returns kanji that are due or will be due soon
   */
  async getOptimalReviewKanji(
    jlptLevel?: string, 
    limit: number = 20
  ): Promise<KanjiProgress[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Get all progress for level
    const allProgress = jlptLevel 
      ? await kanjiMasteryStorage.getProgressByJLPT(jlptLevel)
      : await kanjiMasteryStorage.getAllProgress();
    
    // Filter and sort by priority
    const optimalKanji = allProgress
      .filter(p => {
        const due = new Date(p.nextReview);
        // Include kanji due now or within next 24 hours
        return due <= tomorrow;
      })
      .sort((a, b) => {
        // Sort by how overdue they are
        const aDue = new Date(a.nextReview).getTime();
        const bDue = new Date(b.nextReview).getTime();
        return aDue - bDue;
      })
      .slice(0, limit);
    
    return optimalKanji;
  }

  /**
   * Get review statistics
   */
  async getStats(jlptLevel?: string) {
    return kanjiMasteryStorage.getStats(jlptLevel);
  }

  /**
   * Get new kanji to learn based on settings
   */
  async getNewKanjiToLearn(jlptLevel: string, limit: number = 5): Promise<string[]> {
    // Get all learned kanji IDs
    const learnedIds = await kanjiMasteryStorage.getProgressIds();
    
    // TODO: Load all kanji for the JLPT level and filter out learned ones
    // For now, return empty array
    return [];
  }
}

// Export singleton instance
export const kanjiSpacedRepetition = new KanjiSpacedRepetitionService();