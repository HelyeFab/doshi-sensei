/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Implementation
 * Based on the ts-fsrs library but optimized for kanji learning
 * Production-ready with full TypeScript types and error handling
 */

import { Timestamp } from 'firebase/firestore';

/**
 * FSRS Parameters for the algorithm
 * These can be customized per user for optimal learning
 */
export interface FSRSParameters {
  // Default: [0.5, 1.2, 2.8, 4.6]
  defaultStability: number[];
  
  // Default: 0.9
  requestRetention: number;
  
  // Default: 2.5
  maximumInterval: number;
  
  // Default: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
  weights: number[];
  
  // Custom for kanji learning
  kanjiDifficultyModifier?: number; // Modifier based on kanji complexity
  contextBonus?: number; // Bonus for kanji learned in context
}

/**
 * Card state in the FSRS system
 */
export interface FSRSCard {
  // Core FSRS fields
  id: string; // Kanji character
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: Date;
  
  // Kanji-specific fields
  kanjiChar: string;
  jlptLevel?: string;
  strokeCount?: number;
  frequency?: number;
}

export enum CardState {
  NEW = 0,
  LEARNING = 1,
  REVIEW = 2,
  RELEARNING = 3
}

export enum Rating {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4
}

/**
 * Review result with next states for each rating
 */
export interface ReviewResult {
  card: FSRSCard;
  nextStates: {
    again: ScheduledCard;
    hard: ScheduledCard;
    good: ScheduledCard;
    easy: ScheduledCard;
  };
}

/**
 * Scheduled card with interval information
 */
export interface ScheduledCard {
  card: FSRSCard;
  interval: number; // Days until next review
  easeFactor: number;
  reviewDate: Date;
}

/**
 * Default FSRS parameters optimized for kanji learning
 */
export const DEFAULT_PARAMETERS: FSRSParameters = {
  defaultStability: [0.5, 1.2, 2.8, 4.6],
  requestRetention: 0.9,
  maximumInterval: 365 * 2, // 2 years max
  weights: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01,
    1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
  ],
  kanjiDifficultyModifier: 1.0,
  contextBonus: 0.1
};

/**
 * FSRS Algorithm implementation
 */
export class FSRSAlgorithm {
  private parameters: FSRSParameters;
  
  constructor(parameters: Partial<FSRSParameters> = {}) {
    this.parameters = { ...DEFAULT_PARAMETERS, ...parameters };
  }
  
  /**
   * Create a new card for a kanji
   */
  createCard(kanjiChar: string, additionalData?: Partial<FSRSCard>): FSRSCard {
    return {
      id: kanjiChar,
      kanjiChar,
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: CardState.NEW,
      ...additionalData
    };
  }
  
  /**
   * Calculate the next review states for all ratings
   */
  calculateNextStates(card: FSRSCard, now: Date = new Date()): ReviewResult {
    const elapsedDays = this.daysSinceLastReview(card, now);
    
    // Update elapsed days
    const updatedCard = {
      ...card,
      elapsedDays,
      lastReview: now
    };
    
    return {
      card: updatedCard,
      nextStates: {
        again: this.scheduleCard(updatedCard, Rating.AGAIN, now),
        hard: this.scheduleCard(updatedCard, Rating.HARD, now),
        good: this.scheduleCard(updatedCard, Rating.GOOD, now),
        easy: this.scheduleCard(updatedCard, Rating.EASY, now)
      }
    };
  }
  
  /**
   * Schedule a card based on the rating
   */
  private scheduleCard(card: FSRSCard, rating: Rating, now: Date): ScheduledCard {
    const newCard = { ...card };
    
    // Apply kanji difficulty modifier if available
    const difficultyModifier = this.calculateKanjiDifficulty(card);
    
    switch (card.state) {
      case CardState.NEW:
        return this.scheduleNewCard(newCard, rating, now, difficultyModifier);
      
      case CardState.LEARNING:
      case CardState.RELEARNING:
        return this.scheduleLearningCard(newCard, rating, now, difficultyModifier);
      
      case CardState.REVIEW:
        return this.scheduleReviewCard(newCard, rating, now, difficultyModifier);
      
      default:
        throw new Error(`Unknown card state: ${card.state}`);
    }
  }
  
  /**
   * Schedule a new card
   */
  private scheduleNewCard(
    card: FSRSCard,
    rating: Rating,
    now: Date,
    difficultyModifier: number
  ): ScheduledCard {
    const newCard = { ...card };
    newCard.reps = 1;
    
    // Initialize difficulty and stability
    newCard.difficulty = this.initDifficulty(rating);
    newCard.stability = this.initStability(rating) * difficultyModifier;
    
    // Determine next state and interval
    let interval: number;
    
    switch (rating) {
      case Rating.AGAIN:
        newCard.state = CardState.LEARNING;
        interval = 1 / 1440; // 1 minute
        break;
      
      case Rating.HARD:
        newCard.state = CardState.LEARNING;
        interval = 5 / 1440; // 5 minutes
        break;
      
      case Rating.GOOD:
        newCard.state = CardState.LEARNING;
        interval = 10 / 1440; // 10 minutes
        break;
      
      case Rating.EASY:
        newCard.state = CardState.REVIEW;
        interval = this.calculateInterval(newCard.stability);
        break;
      
      default:
        interval = 1;
    }
    
    newCard.scheduledDays = interval;
    newCard.due = this.addDays(now, interval);
    
    return {
      card: newCard,
      interval,
      easeFactor: 2.5,
      reviewDate: newCard.due
    };
  }
  
  /**
   * Schedule a learning/relearning card
   */
  private scheduleLearningCard(
    card: FSRSCard,
    rating: Rating,
    now: Date,
    difficultyModifier: number
  ): ScheduledCard {
    const newCard = { ...card };
    newCard.reps++;
    
    // Update difficulty
    newCard.difficulty = this.updateDifficulty(newCard.difficulty, rating);
    
    let interval: number;
    
    switch (rating) {
      case Rating.AGAIN:
        newCard.state = CardState.LEARNING;
        newCard.stability = Math.max(0.1, newCard.stability * 0.6);
        interval = 1 / 1440; // 1 minute
        break;
      
      case Rating.HARD:
        interval = Math.max(1 / 1440, newCard.scheduledDays * 1.2);
        break;
      
      case Rating.GOOD:
        newCard.state = CardState.REVIEW;
        newCard.stability = this.updateStability(
          newCard.stability,
          newCard.difficulty,
          rating,
          newCard.elapsedDays
        ) * difficultyModifier;
        interval = this.calculateInterval(newCard.stability);
        break;
      
      case Rating.EASY:
        newCard.state = CardState.REVIEW;
        newCard.stability = this.updateStability(
          newCard.stability,
          newCard.difficulty,
          rating,
          newCard.elapsedDays
        ) * difficultyModifier * 1.3; // Easy bonus
        interval = this.calculateInterval(newCard.stability);
        break;
      
      default:
        interval = 1;
    }
    
    newCard.scheduledDays = interval;
    newCard.due = this.addDays(now, interval);
    
    return {
      card: newCard,
      interval,
      easeFactor: 2.5,
      reviewDate: newCard.due
    };
  }
  
  /**
   * Schedule a review card
   */
  private scheduleReviewCard(
    card: FSRSCard,
    rating: Rating,
    now: Date,
    difficultyModifier: number
  ): ScheduledCard {
    const newCard = { ...card };
    newCard.reps++;
    
    // Update difficulty
    newCard.difficulty = this.updateDifficulty(newCard.difficulty, rating);
    
    // Calculate retrievability
    const retrievability = this.calculateRetrievability(
      newCard.stability,
      newCard.elapsedDays
    );
    
    let interval: number;
    
    switch (rating) {
      case Rating.AGAIN:
        newCard.state = CardState.RELEARNING;
        newCard.lapses++;
        newCard.stability = Math.max(
          0.1,
          newCard.stability * Math.pow(0.9, 1 / retrievability)
        );
        interval = 1; // 1 day
        break;
      
      case Rating.HARD:
        newCard.stability = this.updateStability(
          newCard.stability,
          newCard.difficulty,
          rating,
          newCard.elapsedDays
        ) * difficultyModifier * 1.2; // Hard penalty
        interval = this.calculateInterval(newCard.stability) * 1.2;
        break;
      
      case Rating.GOOD:
        newCard.stability = this.updateStability(
          newCard.stability,
          newCard.difficulty,
          rating,
          newCard.elapsedDays
        ) * difficultyModifier;
        interval = this.calculateInterval(newCard.stability);
        break;
      
      case Rating.EASY:
        newCard.stability = this.updateStability(
          newCard.stability,
          newCard.difficulty,
          rating,
          newCard.elapsedDays
        ) * difficultyModifier * 1.3; // Easy bonus
        interval = this.calculateInterval(newCard.stability) * 1.3;
        break;
      
      default:
        interval = 1;
    }
    
    // Apply maximum interval
    interval = Math.min(interval, this.parameters.maximumInterval);
    
    // Apply fuzz to prevent bunching
    interval = this.applyFuzz(interval);
    
    newCard.scheduledDays = interval;
    newCard.due = this.addDays(now, interval);
    
    return {
      card: newCard,
      interval,
      easeFactor: 2.5 + (0.1 * (rating - 2)),
      reviewDate: newCard.due
    };
  }
  
  /**
   * Initialize difficulty based on first rating
   */
  private initDifficulty(rating: Rating): number {
    return Math.max(0, Math.min(1, 5 - rating));
  }
  
  /**
   * Initialize stability based on first rating
   */
  private initStability(rating: Rating): number {
    return this.parameters.defaultStability[rating - 1] || 1;
  }
  
  /**
   * Update difficulty based on rating
   */
  private updateDifficulty(difficulty: number, rating: Rating): number {
    const delta = rating === Rating.AGAIN ? 0.2 : -0.15 * (rating - 2);
    return Math.max(0, Math.min(1, difficulty + delta));
  }
  
  /**
   * Update stability using FSRS formula
   */
  private updateStability(
    stability: number,
    difficulty: number,
    rating: Rating,
    elapsedDays: number
  ): number {
    const retrievability = this.calculateRetrievability(stability, elapsedDays);
    
    // FSRS stability update formula
    const factor = Math.exp(this.parameters.weights[8]) *
      (11 - difficulty) *
      Math.pow(stability, this.parameters.weights[9]) *
      Math.exp(this.parameters.weights[10] * (1 - retrievability));
    
    // Apply rating-specific multiplier
    const multiplier = rating === Rating.EASY ? 1.3 :
                      rating === Rating.GOOD ? 1 :
                      rating === Rating.HARD ? 0.8 : 0.6;
    
    return stability * factor * multiplier;
  }
  
  /**
   * Calculate retrievability (probability of recall)
   */
  private calculateRetrievability(stability: number, elapsedDays: number): number {
    return Math.pow(1 + elapsedDays / (9 * stability), -1);
  }
  
  /**
   * Calculate interval from stability
   */
  private calculateInterval(stability: number): number {
    const retention = this.parameters.requestRetention;
    return 9 * stability * (1 / retention - 1);
  }
  
  /**
   * Calculate kanji-specific difficulty modifier
   */
  private calculateKanjiDifficulty(card: FSRSCard): number {
    let modifier = this.parameters.kanjiDifficultyModifier || 1.0;
    
    // Adjust based on stroke count
    if (card.strokeCount) {
      if (card.strokeCount > 15) modifier *= 1.2;
      else if (card.strokeCount < 5) modifier *= 0.9;
    }
    
    // Adjust based on JLPT level
    if (card.jlptLevel) {
      const levelModifiers: Record<string, number> = {
        'N5': 0.8,
        'N4': 0.9,
        'N3': 1.0,
        'N2': 1.1,
        'N1': 1.2
      };
      modifier *= levelModifiers[card.jlptLevel] || 1.0;
    }
    
    // Adjust based on frequency
    if (card.frequency) {
      if (card.frequency < 500) modifier *= 0.9; // Common kanji
      else if (card.frequency > 2000) modifier *= 1.1; // Rare kanji
    }
    
    return modifier;
  }
  
  /**
   * Apply fuzz to interval to prevent bunching
   */
  private applyFuzz(interval: number): number {
    if (interval < 2.5) return interval;
    
    const fuzzRange = interval * 0.05; // 5% fuzz
    const fuzz = (Math.random() - 0.5) * 2 * fuzzRange;
    
    return Math.max(1, interval + fuzz);
  }
  
  /**
   * Calculate days since last review
   */
  private daysSinceLastReview(card: FSRSCard, now: Date): number {
    if (!card.lastReview) return 0;
    
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, (now.getTime() - card.lastReview.getTime()) / msPerDay);
  }
  
  /**
   * Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setTime(result.getTime() + days * 24 * 60 * 60 * 1000);
    return result;
  }
  
  /**
   * Get optimal review time based on user's performance patterns
   */
  getOptimalReviewTime(userPattern?: { bestHours?: number[] }): Date {
    const now = new Date();
    const optimalHour = userPattern?.bestHours?.[0] || 9; // Default to 9 AM
    
    const reviewTime = new Date(now);
    reviewTime.setHours(optimalHour, 0, 0, 0);
    
    // If it's already past the optimal time today, schedule for tomorrow
    if (reviewTime <= now) {
      reviewTime.setDate(reviewTime.getDate() + 1);
    }
    
    return reviewTime;
  }
  
  /**
   * Batch process multiple cards for efficiency
   */
  batchCalculateNextStates(cards: FSRSCard[], now: Date = new Date()): ReviewResult[] {
    return cards.map(card => this.calculateNextStates(card, now));
  }
  
  /**
   * Export parameters for persistence
   */
  exportParameters(): FSRSParameters {
    return { ...this.parameters };
  }
  
  /**
   * Import parameters from storage
   */
  importParameters(parameters: Partial<FSRSParameters>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }
  
  /**
   * Get learning statistics for analytics
   */
  getStatistics(cards: FSRSCard[]): {
    averageInterval: number;
    retentionRate: number;
    masteryDistribution: Record<CardState, number>;
    difficulty: number;
  } {
    if (cards.length === 0) {
      return {
        averageInterval: 0,
        retentionRate: 0,
        masteryDistribution: {
          [CardState.NEW]: 0,
          [CardState.LEARNING]: 0,
          [CardState.REVIEW]: 0,
          [CardState.RELEARNING]: 0
        },
        difficulty: 0
      };
    }
    
    const intervals = cards.map(c => c.scheduledDays);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    const successfulReviews = cards.filter(c => c.state === CardState.REVIEW).length;
    const retention = successfulReviews / cards.length;
    
    const distribution = cards.reduce((acc, card) => {
      acc[card.state] = (acc[card.state] || 0) + 1;
      return acc;
    }, {} as Record<CardState, number>);
    
    const avgDifficulty = cards.reduce((sum, c) => sum + c.difficulty, 0) / cards.length;
    
    return {
      averageInterval: avgInterval,
      retentionRate: retention,
      masteryDistribution: {
        [CardState.NEW]: distribution[CardState.NEW] || 0,
        [CardState.LEARNING]: distribution[CardState.LEARNING] || 0,
        [CardState.REVIEW]: distribution[CardState.REVIEW] || 0,
        [CardState.RELEARNING]: distribution[CardState.RELEARNING] || 0
      },
      difficulty: avgDifficulty
    };
  }
}

// Export singleton instance for app-wide use
export const fsrsAlgorithm = new FSRSAlgorithm();