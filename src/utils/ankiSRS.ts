/**
 * Anki's Spaced Repetition Algorithm (SM-2 variant)
 * 
 * This is a unified implementation of Anki's algorithm for all flashcards in the app.
 * It replaces our previous FSRS implementation to maintain consistency with imported Anki decks.
 * 
 * Algorithm details:
 * - New cards: interval = 1 day, then 6 days
 * - Ease factor: starts at 2.5, minimum 1.3
 * - Interval modifier: 1.0 by default
 * - Failed cards: interval * 0.25 (new interval)
 */

export interface AnkiSRSData {
  due: Date;              // When the card is due for review
  interval: number;       // Current interval in days
  ease: number;           // Ease factor (default 2.5)
  reviews: number;        // Total number of reviews
  lapses: number;         // Number of times forgotten
  lastReview?: Date;      // Last review timestamp
  status: 'new' | 'learning' | 'review' | 'relearning';
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export class AnkiSRS {
  // Default settings (matching Anki's defaults)
  private static readonly NEW_INTERVAL_FACTOR = 0.25;  // When failed
  private static readonly EASY_BONUS = 1.3;            // Bonus for easy answers
  private static readonly HARD_INTERVAL = 1.2;         // Multiplier for hard answers
  private static readonly MIN_EASE = 1.3;              // Minimum ease factor
  private static readonly STARTING_EASE = 2.5;         // Default ease
  private static readonly GRADUATING_INTERVAL = 6;     // Days after first success
  private static readonly LEARNING_STEPS = [1, 10];    // Minutes for learning cards
  
  /**
   * Create initial SRS data for a new card
   */
  static createInitialData(): AnkiSRSData {
    return {
      due: new Date(),
      interval: 0,
      ease: this.STARTING_EASE,
      reviews: 0,
      lapses: 0,
      status: 'new'
    };
  }

  /**
   * Calculate the next review data based on rating
   */
  static calculateNextReview(
    current: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date = new Date()
  ): AnkiSRSData {
    const updated = { ...current };
    updated.lastReview = reviewTime;
    updated.reviews += 1;

    switch (current.status) {
      case 'new':
        return this.reviewNewCard(updated, rating, reviewTime);
      
      case 'learning':
      case 'relearning':
        return this.reviewLearningCard(updated, rating, reviewTime);
      
      case 'review':
        return this.reviewReviewCard(updated, rating, reviewTime);
      
      default:
        return updated;
    }
  }

  /**
   * Review a new card
   */
  private static reviewNewCard(
    card: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date
  ): AnkiSRSData {
    switch (rating) {
      case 'again':
        // Stay in learning, review in 1 minute
        card.status = 'learning';
        card.due = new Date(reviewTime.getTime() + 60 * 1000);
        return card;
      
      case 'hard':
        // Move to learning, review in 1 minute
        card.status = 'learning';
        card.due = new Date(reviewTime.getTime() + 60 * 1000);
        return card;
      
      case 'good':
        // Move to learning, review in 10 minutes
        card.status = 'learning';
        card.due = new Date(reviewTime.getTime() + 10 * 60 * 1000);
        return card;
      
      case 'easy':
        // Graduate immediately with 4 day interval
        card.status = 'review';
        card.interval = 4;
        card.due = this.addDays(reviewTime, 4);
        return card;
    }
  }

  /**
   * Review a learning/relearning card
   */
  private static reviewLearningCard(
    card: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date
  ): AnkiSRSData {
    switch (rating) {
      case 'again':
        // Back to first step
        card.lapses += 1;
        card.status = 'relearning';
        card.due = new Date(reviewTime.getTime() + this.LEARNING_STEPS[0] * 60 * 1000);
        // Reduce ease
        card.ease = Math.max(this.MIN_EASE, card.ease - 0.2);
        return card;
      
      case 'hard':
        // Stay at current step, repeat interval
        const currentInterval = this.getMinutesTillDue(card.due, reviewTime);
        card.due = new Date(reviewTime.getTime() + currentInterval * 60 * 1000);
        return card;
      
      case 'good':
        if (card.status === 'learning' && card.reviews === 1) {
          // Graduate to review
          card.status = 'review';
          card.interval = 1;
          card.due = this.addDays(reviewTime, 1);
        } else if (card.status === 'learning') {
          // Move to next learning step
          card.due = new Date(reviewTime.getTime() + this.LEARNING_STEPS[1] * 60 * 1000);
        } else {
          // Relearning -> back to review
          card.status = 'review';
          card.interval = Math.max(1, Math.floor(card.interval * this.NEW_INTERVAL_FACTOR));
          card.due = this.addDays(reviewTime, card.interval);
        }
        return card;
      
      case 'easy':
        // Graduate immediately
        card.status = 'review';
        card.interval = card.status === 'relearning' 
          ? Math.max(1, card.interval)
          : this.GRADUATING_INTERVAL;
        card.due = this.addDays(reviewTime, card.interval);
        return card;
    }
  }

  /**
   * Review a review card (main algorithm)
   */
  private static reviewReviewCard(
    card: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date
  ): AnkiSRSData {
    const daysSinceLastReview = this.getDaysBetween(card.lastReview || reviewTime, reviewTime);
    
    switch (rating) {
      case 'again':
        // Failed - move to relearning
        card.lapses += 1;
        card.status = 'relearning';
        card.interval = Math.max(1, Math.floor(card.interval * this.NEW_INTERVAL_FACTOR));
        card.ease = Math.max(this.MIN_EASE, card.ease - 0.2);
        card.due = new Date(reviewTime.getTime() + this.LEARNING_STEPS[0] * 60 * 1000);
        return card;
      
      case 'hard':
        // Increase interval slightly
        card.interval = Math.max(
          card.interval + 1,
          Math.floor(card.interval * this.HARD_INTERVAL)
        );
        card.ease = Math.max(this.MIN_EASE, card.ease - 0.15);
        card.due = this.addDays(reviewTime, card.interval);
        return card;
      
      case 'good':
        // Standard increase
        card.interval = Math.max(
          Math.floor((card.interval + daysSinceLastReview / 2) * card.ease),
          card.interval + 1
        );
        card.due = this.addDays(reviewTime, card.interval);
        return card;
      
      case 'easy':
        // Larger increase with ease bonus
        card.interval = Math.max(
          Math.floor((card.interval + daysSinceLastReview) * card.ease * this.EASY_BONUS),
          card.interval + 1
        );
        card.ease += 0.15;
        card.due = this.addDays(reviewTime, card.interval);
        return card;
    }
  }

  /**
   * Get cards due for review
   */
  static getDueCards(cards: AnkiSRSData[], now: Date = new Date()): AnkiSRSData[] {
    return cards.filter(card => card.due <= now);
  }

  /**
   * Helper: Add days to a date
   */
  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Helper: Get days between dates
   */
  private static getDaysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Get minutes until due
   */
  private static getMinutesTillDue(due: Date, now: Date): number {
    const diffTime = due.getTime() - now.getTime();
    return Math.max(1, Math.floor(diffTime / (1000 * 60)));
  }

  /**
   * Convert legacy SRS data to Anki format
   */
  static convertFromLegacy(legacyData: any): AnkiSRSData {
    // If it's already in Anki format, return as is
    if (legacyData && 'interval' in legacyData && 'ease' in legacyData) {
      return {
        due: new Date(legacyData.due),
        interval: legacyData.interval,
        ease: legacyData.ease,
        reviews: legacyData.reviews || 0,
        lapses: legacyData.lapses || 0,
        lastReview: legacyData.lastReview ? new Date(legacyData.lastReview) : undefined,
        status: legacyData.status || 'review'
      };
    }

    // Convert from old format
    return this.createInitialData();
  }
}