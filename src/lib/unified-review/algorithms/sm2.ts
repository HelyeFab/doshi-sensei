/**
 * SuperMemo 2 (SM2) Algorithm Implementation
 * 
 * Classic spaced repetition algorithm that's simple, predictable, and widely tested.
 * Good for consistent learners who prefer straightforward scheduling.
 */

import {
  ReviewItem,
  ReviewProgress,
  ReviewRating,
  AlgorithmType,
  StudyMode,
  SM2Data,
  AlgorithmError
} from '../types';
import { BaseReviewAlgorithm } from './base';

/**
 * SM2 algorithm parameters
 */
export interface SM2Parameters {
  /** Minimum ease factor */
  minEaseFactor: number;
  
  /** Maximum ease factor */
  maxEaseFactor: number;
  
  /** Initial ease factor for new cards */
  initialEaseFactor: number;
  
  /** Ease factor increment for easy reviews */
  easyBonus: number;
  
  /** Ease factor decrement for hard reviews */
  hardPenalty: number;
  
  /** Ease factor decrement for again reviews */
  againPenalty: number;
  
  /** Maximum interval in days */
  maximumInterval: number;
  
  /** Initial intervals for new cards [again, hard, good, easy] */
  initialIntervals: number[];
  
  /** Graduate to review after this many successful reviews */
  graduationSteps: number;
  
  /** Fuzz factor to prevent review bunching */
  fuzzFactor: number;
}

/**
 * Default SM2 parameters
 */
export const DEFAULT_SM2_PARAMETERS: SM2Parameters = {
  minEaseFactor: 1.3,
  maxEaseFactor: 2.5,
  initialEaseFactor: 2.5,
  easyBonus: 0.15,
  hardPenalty: 0.15,
  againPenalty: 0.2,
  maximumInterval: 365 * 2, // 2 years
  initialIntervals: [1, 1, 1, 4], // Days for [again, hard, good, easy]
  graduationSteps: 2,
  fuzzFactor: 0.05
};

/**
 * SuperMemo 2 Algorithm Implementation
 */
export class SM2Algorithm extends BaseReviewAlgorithm {
  public readonly name = 'SuperMemo 2';
  public readonly version = '2.0.0';
  public readonly algorithmType = AlgorithmType.SM2;

  private parameters: SM2Parameters;

  constructor(parameters: Partial<SM2Parameters> = {}) {
    super();
    this.parameters = { ...DEFAULT_SM2_PARAMETERS, ...parameters };
  }

  /**
   * Process a review response using SM2 algorithm
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
      updatedProgress = this.createInitialProgress(item, 'temp-user-id');
      updatedProgress.algorithmData = this.createInitialSM2Data();
    } else {
      this.validateProgress(progress);
      updatedProgress = { ...progress };
    }

    const sm2Data = updatedProgress.algorithmData as SM2Data;
    
    // Update SM2 specific data
    const updatedSM2Data = this.updateSM2Data(sm2Data, rating, item);
    updatedProgress.algorithmData = updatedSM2Data;
    
    // Calculate next review date
    updatedProgress.nextReview = this.calculateNextReview(updatedProgress);
    updatedProgress.lastReview = now;
    
    // Update performance statistics
    this.updatePerformanceStats(
      updatedProgress, 
      rating, 
      responseTime, 
      StudyMode.RECOGNITION
    );

    return updatedProgress;
  }

  /**
   * Calculate next review date based on SM2 data
   */
  public calculateNextReview(progress: ReviewProgress): Date {
    const sm2Data = progress.algorithmData as SM2Data;
    const interval = this.addFuzzing(sm2Data.interval, this.parameters.fuzzFactor);
    
    return this.addDaysToDate(sm2Data.due, interval);
  }

  /**
   * Get initial SM2 algorithm data
   */
  protected getInitialAlgorithmData(): SM2Data {
    return this.createInitialSM2Data();
  }

  /**
   * Validate SM2 algorithm data structure
   */
  protected validateAlgorithmData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const required = ['easeFactor', 'interval', 'repetitions', 'due', 'lapses'];
    return required.every(field => field in data);
  }

  /**
   * Create initial SM2 data for new items
   */
  private createInitialSM2Data(): SM2Data {
    return {
      easeFactor: this.parameters.initialEaseFactor,
      interval: 1,
      repetitions: 0,
      due: new Date(),
      lapses: 0
    };
  }

  /**
   * Update SM2 data based on review rating
   */
  private updateSM2Data(
    sm2Data: SM2Data,
    rating: ReviewRating,
    item: ReviewItem
  ): SM2Data {
    const updated = this.cloneAlgorithmData(sm2Data);
    
    // Process the rating
    switch (rating) {
      case ReviewRating.AGAIN:
        return this.processAgainRating(updated);
      
      case ReviewRating.HARD:
        return this.processHardRating(updated);
      
      case ReviewRating.GOOD:
        return this.processGoodRating(updated);
      
      case ReviewRating.EASY:
        return this.processEasyRating(updated);
      
      default:
        throw new AlgorithmError(`Invalid rating: ${rating}`);
    }
  }

  /**
   * Process "Again" rating (complete failure)
   */
  private processAgainRating(sm2Data: SM2Data): SM2Data {
    sm2Data.lapses++;
    sm2Data.repetitions = 0;
    sm2Data.interval = this.parameters.initialIntervals[0]; // Start over
    
    // Reduce ease factor
    sm2Data.easeFactor = Math.max(
      this.parameters.minEaseFactor,
      sm2Data.easeFactor - this.parameters.againPenalty
    );
    
    sm2Data.due = new Date();
    return sm2Data;
  }

  /**
   * Process "Hard" rating (difficult but eventually correct)
   */
  private processHardRating(sm2Data: SM2Data): SM2Data {
    if (sm2Data.repetitions < this.parameters.graduationSteps) {
      // Still learning
      sm2Data.repetitions++;
      sm2Data.interval = this.parameters.initialIntervals[1];
    } else {
      // In review phase
      sm2Data.repetitions++;
      sm2Data.interval = Math.max(1, sm2Data.interval * 1.2); // Smaller increase
    }
    
    // Small ease factor reduction
    sm2Data.easeFactor = Math.max(
      this.parameters.minEaseFactor,
      sm2Data.easeFactor - this.parameters.hardPenalty
    );
    
    sm2Data.due = new Date();
    return sm2Data;
  }

  /**
   * Process "Good" rating (correct with normal effort)
   */
  private processGoodRating(sm2Data: SM2Data): SM2Data {
    sm2Data.repetitions++;
    
    if (sm2Data.repetitions <= this.parameters.graduationSteps) {
      // Learning phase - use fixed intervals
      const intervalIndex = Math.min(2, sm2Data.repetitions - 1);
      sm2Data.interval = this.parameters.initialIntervals[2];
    } else {
      // Review phase - use SM2 formula
      if (sm2Data.repetitions === this.parameters.graduationSteps + 1) {
        sm2Data.interval = 6; // First review interval
      } else {
        sm2Data.interval = Math.round(sm2Data.interval * sm2Data.easeFactor);
      }
    }
    
    // Apply maximum interval limit
    sm2Data.interval = Math.min(sm2Data.interval, this.parameters.maximumInterval);
    
    sm2Data.due = new Date();
    return sm2Data;
  }

  /**
   * Process "Easy" rating (correct with ease)
   */
  private processEasyRating(sm2Data: SM2Data): SM2Data {
    sm2Data.repetitions++;
    
    if (sm2Data.repetitions <= this.parameters.graduationSteps) {
      // Graduate immediately to review
      sm2Data.repetitions = this.parameters.graduationSteps + 1;
      sm2Data.interval = this.parameters.initialIntervals[3];
    } else {
      // Review phase with bonus
      if (sm2Data.repetitions === this.parameters.graduationSteps + 1) {
        sm2Data.interval = 6; // First review interval
      } else {
        sm2Data.interval = Math.round(sm2Data.interval * sm2Data.easeFactor * 1.3); // Easy bonus
      }
    }
    
    // Increase ease factor
    sm2Data.easeFactor = Math.min(
      this.parameters.maxEaseFactor,
      sm2Data.easeFactor + this.parameters.easyBonus
    );
    
    // Apply maximum interval limit
    sm2Data.interval = Math.min(sm2Data.interval, this.parameters.maximumInterval);
    
    sm2Data.due = new Date();
    return sm2Data;
  }

  /**
   * Calculate mastery level based on SM2 metrics
   */
  protected calculateMasteryLevel(progress: ReviewProgress): number {
    const sm2Data = progress.algorithmData as SM2Data;
    let mastery = 0;
    
    // Base mastery from repetitions (0-30 points)
    mastery += Math.min(30, sm2Data.repetitions * 3);
    
    // Bonus for ease factor (0-25 points)
    const easeScore = (sm2Data.easeFactor - this.parameters.minEaseFactor) / 
                      (this.parameters.maxEaseFactor - this.parameters.minEaseFactor);
    mastery += easeScore * 25;
    
    // Bonus for interval (0-25 points)
    const intervalScore = Math.min(1, sm2Data.interval / 30); // Max score at 30 days
    mastery += intervalScore * 25;
    
    // Overall retention rate (0-20 points)
    mastery += progress.retentionRate * 20;
    
    // Penalty for lapses
    const lapsePenalty = Math.min(10, sm2Data.lapses * 2);
    mastery -= lapsePenalty;
    
    return Math.min(100, Math.max(0, Math.round(mastery)));
  }

  /**
   * Get current parameters
   */
  public getParameters(): SM2Parameters {
    return { ...this.parameters };
  }

  /**
   * Update parameters
   */
  public updateParameters(parameters: Partial<SM2Parameters>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }

  /**
   * Get learning statistics specific to SM2
   */
  public getStatistics(items: ReviewProgress[]): {
    averageEaseFactor: number;
    averageInterval: number;
    masteryDistribution: {
      learning: number;
      young: number;
      mature: number;
    };
    lapseRate: number;
  } {
    if (items.length === 0) {
      return {
        averageEaseFactor: this.parameters.initialEaseFactor,
        averageInterval: 1,
        masteryDistribution: { learning: 0, young: 0, mature: 0 },
        lapseRate: 0
      };
    }

    const sm2Items = items.filter(item => item.algorithm === AlgorithmType.SM2);
    const sm2DataArray = sm2Items.map(item => item.algorithmData as SM2Data);

    // Calculate averages
    const avgEase = sm2DataArray.reduce((sum, data) => sum + data.easeFactor, 0) / sm2DataArray.length;
    const avgInterval = sm2DataArray.reduce((sum, data) => sum + data.interval, 0) / sm2DataArray.length;

    // Classify items by maturity
    const distribution = sm2DataArray.reduce(
      (acc, data) => {
        if (data.repetitions <= this.parameters.graduationSteps) {
          acc.learning++;
        } else if (data.interval < 21) {
          acc.young++;
        } else {
          acc.mature++;
        }
        return acc;
      },
      { learning: 0, young: 0, mature: 0 }
    );

    // Calculate lapse rate
    const totalLapses = sm2DataArray.reduce((sum, data) => sum + data.lapses, 0);
    const totalReviews = sm2Items.reduce((sum, item) => sum + item.reviewCount, 0);
    const lapseRate = totalReviews > 0 ? totalLapses / totalReviews : 0;

    return {
      averageEaseFactor: avgEase,
      averageInterval: avgInterval,
      masteryDistribution: distribution,
      lapseRate
    };
  }

  /**
   * Optimize schedule to prevent review overload
   */
  public optimizeSchedule?(items: ReviewProgress[]): ReviewProgress[] {
    const sm2Items = items.filter(item => item.algorithm === AlgorithmType.SM2);
    
    // Group by due date
    const dateGroups = new Map<string, ReviewProgress[]>();
    
    for (const item of sm2Items) {
      const dateKey = item.nextReview.toDateString();
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(item);
    }

    // Redistribute if too many items on same day
    const optimized: ReviewProgress[] = [];
    const maxItemsPerDay = 50;

    for (const [dateKey, dateItems] of dateGroups) {
      if (dateItems.length <= maxItemsPerDay) {
        optimized.push(...dateItems);
        continue;
      }

      // Redistribute excess items
      const excess = dateItems.length - maxItemsPerDay;
      const baseDate = new Date(dateKey);
      
      // Keep highest priority items on original date
      const prioritized = dateItems
        .sort((a, b) => (b.masteryLevel || 0) - (a.masteryLevel || 0))
        .slice(0, maxItemsPerDay);
      
      optimized.push(...prioritized);

      // Spread excess items over next few days
      const excessItems = dateItems.slice(maxItemsPerDay);
      excessItems.forEach((item, index) => {
        const optimizedItem = { ...item };
        const daysToAdd = Math.floor(index / 20) + 1; // 20 items per day
        optimizedItem.nextReview = this.addDaysToDate(baseDate, daysToAdd);
        optimized.push(optimizedItem);
      });
    }

    return optimized;
  }
}