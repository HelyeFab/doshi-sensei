/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Implementation
 * Adapted for the Unified Review Engine from the original kanji mastery system
 * 
 * This implementation provides the most sophisticated spaced repetition algorithm
 * with optimal retention and individual learning pattern adaptation.
 */

import {
  ReviewItem,
  ReviewProgress,
  ReviewRating,
  AlgorithmType,
  StudyMode,
  FSRSData,
  AlgorithmError
} from '../types';
import { BaseReviewAlgorithm } from './base';

/**
 * FSRS Parameters for the algorithm
 * These can be customized per user for optimal learning
 */
export interface FSRSParameters {
  /** Default stability values for new items [Again, Hard, Good, Easy] */
  defaultStability: number[];
  
  /** Target retention rate (0.0 - 1.0) */
  requestRetention: number;
  
  /** Maximum interval in days */
  maximumInterval: number;
  
  /** FSRS algorithm weights (17 parameters) */
  weights: number[];
  
  /** Difficulty modifier for complex content */
  difficultyModifier?: number;
  
  /** Bonus for items learned in context */
  contextBonus?: number;
  
  /** Fuzz factor to prevent review bunching */
  fuzzFactor?: number;
}

/**
 * Card states in the FSRS system
 */
export enum FSRSCardState {
  NEW = 'new',
  LEARNING = 'learning', 
  REVIEW = 'review',
  RELEARNING = 'relearning'
}

/**
 * Default FSRS parameters optimized for Japanese learning
 */
export const DEFAULT_FSRS_PARAMETERS: FSRSParameters = {
  defaultStability: [0.5, 1.2, 2.8, 4.6],
  requestRetention: 0.9,
  maximumInterval: 365 * 2, // 2 years max
  weights: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01,
    1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
  ],
  difficultyModifier: 1.0,
  contextBonus: 0.1,
  fuzzFactor: 0.05
};

/**
 * FSRS Algorithm Implementation for the Unified Review Engine
 */
export class FSRSAlgorithm extends BaseReviewAlgorithm {
  public readonly name = 'FSRS';
  public readonly version = '4.5.0';
  public readonly algorithmType = AlgorithmType.FSRS;

  private parameters: FSRSParameters;

  constructor(parameters: Partial<FSRSParameters> = {}) {
    super();
    this.parameters = { ...DEFAULT_FSRS_PARAMETERS, ...parameters };
  }

  /**
   * Process a review response and update progress using FSRS
   */
  public processReview(
    item: ReviewItem,
    rating: ReviewRating,
    responseTime: number,
    progress?: ReviewProgress
  ): ReviewProgress {
    this.validateRating(rating);
    
    const now = new Date();
    
    // Create or update progress
    let updatedProgress: ReviewProgress;
    
    if (!progress) {
      // New item - create initial progress
      updatedProgress = this.createInitialProgress(item, 'temp-user-id'); // Will be set by engine
      updatedProgress.algorithmData = this.createInitialFSRSData();
    } else {
      this.validateProgress(progress);
      updatedProgress = { ...progress };
    }

    const fsrsData = updatedProgress.algorithmData as FSRSData;
    const elapsedDays = this.calculateElapsedDays(fsrsData.due, now);
    
    // Update FSRS specific data
    const updatedFSRSData = this.updateFSRSData(fsrsData, rating, elapsedDays, item);
    updatedProgress.algorithmData = updatedFSRSData;
    
    // Calculate next review date
    updatedProgress.nextReview = this.calculateNextReview(updatedProgress);
    updatedProgress.lastReview = now;
    
    // Update performance statistics
    this.updatePerformanceStats(
      updatedProgress, 
      rating, 
      responseTime, 
      StudyMode.RECOGNITION // Default, can be parameterized
    );

    return updatedProgress;
  }

  /**
   * Calculate the next review date based on FSRS data
   */
  public calculateNextReview(progress: ReviewProgress): Date {
    const fsrsData = progress.algorithmData as FSRSData;
    const interval = this.calculateInterval(fsrsData.stability);
    const fuzzedInterval = this.addFuzzing(interval, this.parameters.fuzzFactor || 0.05);
    
    return this.addDaysToDate(new Date(), fuzzedInterval);
  }

  /**
   * Get initial FSRS algorithm data for new items
   */
  protected getInitialAlgorithmData(): FSRSData {
    return this.createInitialFSRSData();
  }

  /**
   * Validate FSRS algorithm data structure
   */
  protected validateAlgorithmData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const required = ['stability', 'difficulty', 'daysSinceLastReview', 'state', 'due', 'reps', 'lapses'];
    return required.every(field => field in data);
  }

  /**
   * Create initial FSRS data for a new item
   */
  private createInitialFSRSData(): FSRSData {
    return {
      stability: 0,
      difficulty: 0,
      daysSinceLastReview: 0,
      state: FSRSCardState.NEW,
      due: new Date(),
      reps: 0,
      lapses: 0
    };
  }

  /**
   * Update FSRS data based on review result
   */
  private updateFSRSData(
    fsrsData: FSRSData,
    rating: ReviewRating,
    elapsedDays: number,
    item: ReviewItem
  ): FSRSData {
    const updated = this.cloneAlgorithmData(fsrsData);
    
    updated.daysSinceLastReview = elapsedDays;
    updated.reps++;
    updated.due = new Date();

    const difficultyModifier = this.calculateContentDifficulty(item);

    switch (updated.state) {
      case FSRSCardState.NEW:
        return this.scheduleNewCard(updated, rating, difficultyModifier);
      
      case FSRSCardState.LEARNING:
      case FSRSCardState.RELEARNING:
        return this.scheduleLearningCard(updated, rating, difficultyModifier);
      
      case FSRSCardState.REVIEW:
        return this.scheduleReviewCard(updated, rating, difficultyModifier);
      
      default:
        throw new AlgorithmError(`Unknown FSRS state: ${updated.state}`);
    }
  }

  /**
   * Schedule a new card based on first review
   */
  private scheduleNewCard(
    fsrsData: FSRSData,
    rating: ReviewRating,
    difficultyModifier: number
  ): FSRSData {
    fsrsData.difficulty = this.initDifficulty(rating);
    fsrsData.stability = this.initStability(rating) * difficultyModifier;

    switch (rating) {
      case ReviewRating.AGAIN:
        fsrsData.state = FSRSCardState.LEARNING;
        break;
      
      case ReviewRating.HARD:
        fsrsData.state = FSRSCardState.LEARNING;
        break;
      
      case ReviewRating.GOOD:
        fsrsData.state = FSRSCardState.LEARNING;
        break;
      
      case ReviewRating.EASY:
        fsrsData.state = FSRSCardState.REVIEW;
        break;
    }

    return fsrsData;
  }

  /**
   * Schedule a learning/relearning card
   */
  private scheduleLearningCard(
    fsrsData: FSRSData,
    rating: ReviewRating,
    difficultyModifier: number
  ): FSRSData {
    fsrsData.difficulty = this.updateDifficulty(fsrsData.difficulty, rating);

    switch (rating) {
      case ReviewRating.AGAIN:
        fsrsData.state = FSRSCardState.LEARNING;
        fsrsData.stability = Math.max(0.1, fsrsData.stability * 0.6);
        break;
      
      case ReviewRating.HARD:
        // Stay in learning, slight stability increase
        fsrsData.stability = Math.max(fsrsData.stability, fsrsData.stability * 1.1);
        break;
      
      case ReviewRating.GOOD:
        fsrsData.state = FSRSCardState.REVIEW;
        fsrsData.stability = this.updateStability(
          fsrsData.stability,
          fsrsData.difficulty,
          rating,
          fsrsData.daysSinceLastReview
        ) * difficultyModifier;
        break;
      
      case ReviewRating.EASY:
        fsrsData.state = FSRSCardState.REVIEW;
        fsrsData.stability = this.updateStability(
          fsrsData.stability,
          fsrsData.difficulty,
          rating,
          fsrsData.daysSinceLastReview
        ) * difficultyModifier * 1.3; // Easy bonus
        break;
    }

    return fsrsData;
  }

  /**
   * Schedule a review card
   */
  private scheduleReviewCard(
    fsrsData: FSRSData,
    rating: ReviewRating,
    difficultyModifier: number
  ): FSRSData {
    fsrsData.difficulty = this.updateDifficulty(fsrsData.difficulty, rating);
    
    const retrievability = this.calculateRetrievability(
      fsrsData.stability,
      fsrsData.daysSinceLastReview
    );

    switch (rating) {
      case ReviewRating.AGAIN:
        fsrsData.state = FSRSCardState.RELEARNING;
        fsrsData.lapses++;
        fsrsData.stability = Math.max(
          0.1,
          fsrsData.stability * Math.pow(0.9, 1 / retrievability)
        );
        break;
      
      case ReviewRating.HARD:
        fsrsData.stability = this.updateStability(
          fsrsData.stability,
          fsrsData.difficulty,
          rating,
          fsrsData.daysSinceLastReview
        ) * difficultyModifier * 1.2; // Hard penalty
        break;
      
      case ReviewRating.GOOD:
        fsrsData.stability = this.updateStability(
          fsrsData.stability,
          fsrsData.difficulty,
          rating,
          fsrsData.daysSinceLastReview
        ) * difficultyModifier;
        break;
      
      case ReviewRating.EASY:
        fsrsData.stability = this.updateStability(
          fsrsData.stability,
          fsrsData.difficulty,
          rating,
          fsrsData.daysSinceLastReview
        ) * difficultyModifier * 1.3; // Easy bonus
        break;
    }

    return fsrsData;
  }

  /**
   * Initialize difficulty based on first rating
   */
  private initDifficulty(rating: ReviewRating): number {
    return Math.max(0.1, Math.min(10, 5 - rating));
  }

  /**
   * Initialize stability based on first rating
   */
  private initStability(rating: ReviewRating): number {
    const index = rating - 1;
    return this.parameters.defaultStability[index] || 1;
  }

  /**
   * Update difficulty based on rating using FSRS formula
   */
  private updateDifficulty(difficulty: number, rating: ReviewRating): number {
    const delta = rating === ReviewRating.AGAIN ? 0.2 : -0.15 * (rating - 2);
    return Math.max(0.1, Math.min(10, difficulty + delta));
  }

  /**
   * Update stability using FSRS formula
   */
  private updateStability(
    stability: number,
    difficulty: number,
    rating: ReviewRating,
    elapsedDays: number
  ): number {
    const retrievability = this.calculateRetrievability(stability, elapsedDays);
    
    // FSRS stability update formula
    const factor = Math.exp(this.parameters.weights[8]) *
      (11 - difficulty) *
      Math.pow(stability, this.parameters.weights[9]) *
      Math.exp(this.parameters.weights[10] * (1 - retrievability));
    
    // Apply rating-specific multiplier
    const multiplier = rating === ReviewRating.EASY ? 1.3 :
                      rating === ReviewRating.GOOD ? 1 :
                      rating === ReviewRating.HARD ? 0.8 : 0.6;
    
    return Math.max(0.1, stability * factor * multiplier);
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
    const interval = 9 * stability * (1 / retention - 1);
    return Math.min(interval, this.parameters.maximumInterval);
  }

  /**
   * Calculate content-specific difficulty modifier
   */
  private calculateContentDifficulty(item: ReviewItem): number {
    let modifier = this.parameters.difficultyModifier || 1.0;
    
    // Apply content type specific modifiers
    switch (item.type) {
      case 'kanji':
        const kanjiContent = item.content as any;
        
        // Adjust based on stroke count
        if (kanjiContent.strokes) {
          if (kanjiContent.strokes > 15) modifier *= 1.2;
          else if (kanjiContent.strokes < 5) modifier *= 0.9;
        }
        
        // Adjust based on JLPT level
        if (kanjiContent.jlpt) {
          const levelModifiers: Record<string, number> = {
            'N5': 0.8, 'N4': 0.9, 'N3': 1.0, 'N2': 1.1, 'N1': 1.2
          };
          modifier *= levelModifiers[kanjiContent.jlpt] || 1.0;
        }
        break;
        
      case 'vocabulary':
        const vocabContent = item.content as any;
        
        // Adjust based on JLPT level
        if (vocabContent.jlpt) {
          const levelModifiers: Record<string, number> = {
            'N5': 0.8, 'N4': 0.9, 'N3': 1.0, 'N2': 1.1, 'N1': 1.2
          };
          modifier *= levelModifiers[vocabContent.jlpt] || 1.0;
        }
        
        // Adjust based on frequency
        if (vocabContent.frequency) {
          if (vocabContent.frequency < 500) modifier *= 0.9; // Common words
          else if (vocabContent.frequency > 2000) modifier *= 1.1; // Rare words
        }
        break;
        
      default:
        // Use base difficulty from metadata if available
        if (item.metadata.difficulty) {
          modifier *= 0.8 + (item.metadata.difficulty / 10) * 0.4; // Scale 1-10 to 0.8-1.2
        }
    }
    
    return modifier;
  }

  /**
   * Calculate days between two dates
   */
  private calculateElapsedDays(lastReview: Date, now: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, (now.getTime() - lastReview.getTime()) / msPerDay);
  }

  /**
   * Get current parameters (for serialization)
   */
  public getParameters(): FSRSParameters {
    return { ...this.parameters };
  }

  /**
   * Update parameters (for personalization)
   */
  public updateParameters(parameters: Partial<FSRSParameters>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }

  /**
   * Optimize schedule by spacing out reviews
   */
  public optimizeSchedule?(items: ReviewProgress[]): ReviewProgress[] {
    // Sort items by their original due date
    const sorted = [...items].sort((a, b) => 
      a.nextReview.getTime() - b.nextReview.getTime()
    );

    // Space out items that are due at similar times
    const optimized: ReviewProgress[] = [];
    let lastScheduled = new Date(0);

    for (const item of sorted) {
      const optimizedItem = { ...item };
      const minGap = 4 * 60 * 60 * 1000; // 4 hours minimum gap
      
      if (optimizedItem.nextReview.getTime() - lastScheduled.getTime() < minGap) {
        optimizedItem.nextReview = new Date(lastScheduled.getTime() + minGap);
      }
      
      lastScheduled = optimizedItem.nextReview;
      optimized.push(optimizedItem);
    }

    return optimized;
  }
}