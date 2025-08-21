/**
 * Simple Intervals Algorithm
 * 
 * Fixed intervals (1, 3, 7, 14, 30 days) with no complexity.
 * Easy to understand and good for casual learners who prefer predictability.
 */

import {
  ReviewItem,
  ReviewProgress,
  ReviewRating,
  AlgorithmType,
  StudyMode,
  SimpleData,
  AlgorithmError
} from '../types';
import { BaseReviewAlgorithm } from './base';

/**
 * Simple algorithm parameters
 */
export interface SimpleParameters {
  /** Fixed intervals for each level */
  intervals: number[];
  
  /** Maximum level (prevents infinite growth) */
  maxLevel: number;
  
  /** How many levels to drop on "Again" */
  againPenalty: number;
  
  /** Bonus levels for "Easy" */
  easyBonus: number;
  
  /** Fuzz factor to prevent bunching */
  fuzzFactor: number;
}

/**
 * Default simple algorithm parameters
 */
export const DEFAULT_SIMPLE_PARAMETERS: SimpleParameters = {
  intervals: [1, 3, 7, 14, 30, 60, 120, 240], // Days
  maxLevel: 7, // Index of last interval (240 days)
  againPenalty: 2, // Drop 2 levels on "Again"
  easyBonus: 1, // Skip 1 level on "Easy"
  fuzzFactor: 0.1 // 10% fuzz
};

/**
 * Simple Intervals Algorithm Implementation
 */
export class SimpleAlgorithm extends BaseReviewAlgorithm {
  public readonly name = 'Simple Intervals';
  public readonly version = '1.0.0';
  public readonly algorithmType = AlgorithmType.SIMPLE;

  private parameters: SimpleParameters;

  constructor(parameters: Partial<SimpleParameters> = {}) {
    super();
    this.parameters = { ...DEFAULT_SIMPLE_PARAMETERS, ...parameters };
  }

  /**
   * Process a review response using simple intervals
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
      updatedProgress.algorithmData = this.createInitialSimpleData();
    } else {
      this.validateProgress(progress);
      updatedProgress = { ...progress };
    }

    const simpleData = updatedProgress.algorithmData as SimpleData;
    
    // Update simple algorithm data
    const updatedSimpleData = this.updateSimpleData(simpleData, rating);
    updatedProgress.algorithmData = updatedSimpleData;
    
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
   * Calculate next review date based on current level
   */
  public calculateNextReview(progress: ReviewProgress): Date {
    const simpleData = progress.algorithmData as SimpleData;
    const interval = this.parameters.intervals[simpleData.level] || 1;
    const fuzzedInterval = this.addFuzzing(interval, this.parameters.fuzzFactor);
    
    return this.addDaysToDate(new Date(), fuzzedInterval);
  }

  /**
   * Get initial simple algorithm data
   */
  protected getInitialAlgorithmData(): SimpleData {
    return this.createInitialSimpleData();
  }

  /**
   * Validate simple algorithm data structure
   */
  protected validateAlgorithmData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const required = ['level', 'due', 'streak'];
    return required.every(field => field in data);
  }

  /**
   * Create initial simple data for new items
   */
  private createInitialSimpleData(): SimpleData {
    return {
      level: 0, // Start at first interval
      due: new Date(),
      streak: 0
    };
  }

  /**
   * Update simple data based on review rating
   */
  private updateSimpleData(
    simpleData: SimpleData,
    rating: ReviewRating
  ): SimpleData {
    const updated = this.cloneAlgorithmData(simpleData);
    
    switch (rating) {
      case ReviewRating.AGAIN:
        // Reset streak and drop levels
        updated.streak = 0;
        updated.level = Math.max(0, updated.level - this.parameters.againPenalty);
        break;
      
      case ReviewRating.HARD:
        // Maintain current level, increment streak
        updated.streak++;
        // No level change - stay at same interval
        break;
      
      case ReviewRating.GOOD:
        // Advance one level, increment streak
        updated.streak++;
        updated.level = Math.min(this.parameters.maxLevel, updated.level + 1);
        break;
      
      case ReviewRating.EASY:
        // Skip a level (bonus), increment streak
        updated.streak++;
        updated.level = Math.min(
          this.parameters.maxLevel, 
          updated.level + 1 + this.parameters.easyBonus
        );
        break;
      
      default:
        throw new AlgorithmError(`Invalid rating: ${rating}`);
    }

    updated.due = new Date();
    return updated;
  }

  /**
   * Calculate mastery level based on simple metrics
   */
  protected calculateMasteryLevel(progress: ReviewProgress): number {
    const simpleData = progress.algorithmData as SimpleData;
    let mastery = 0;
    
    // Base mastery from level (0-40 points)
    const levelScore = (simpleData.level / this.parameters.maxLevel) * 40;
    mastery += levelScore;
    
    // Bonus for streak (0-30 points)
    const streakScore = Math.min(30, simpleData.streak * 3);
    mastery += streakScore;
    
    // Overall retention rate (0-30 points)
    mastery += progress.retentionRate * 30;
    
    return Math.min(100, Math.max(0, Math.round(mastery)));
  }

  /**
   * Get current parameters
   */
  public getParameters(): SimpleParameters {
    return { ...this.parameters };
  }

  /**
   * Update parameters
   */
  public updateParameters(parameters: Partial<SimpleParameters>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }

  /**
   * Get learning statistics specific to simple algorithm
   */
  public getStatistics(items: ReviewProgress[]): {
    averageLevel: number;
    averageStreak: number;
    levelDistribution: Record<number, number>;
    completionRate: number;
  } {
    if (items.length === 0) {
      return {
        averageLevel: 0,
        averageStreak: 0,
        levelDistribution: {},
        completionRate: 0
      };
    }

    const simpleItems = items.filter(item => item.algorithm === AlgorithmType.SIMPLE);
    const simpleDataArray = simpleItems.map(item => item.algorithmData as SimpleData);

    // Calculate averages
    const avgLevel = simpleDataArray.reduce((sum, data) => sum + data.level, 0) / simpleDataArray.length;
    const avgStreak = simpleDataArray.reduce((sum, data) => sum + data.streak, 0) / simpleDataArray.length;

    // Calculate level distribution
    const distribution = simpleDataArray.reduce((acc, data) => {
      acc[data.level] = (acc[data.level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Calculate completion rate (items at max level)
    const completedItems = simpleDataArray.filter(data => data.level >= this.parameters.maxLevel).length;
    const completionRate = simpleDataArray.length > 0 ? completedItems / simpleDataArray.length : 0;

    return {
      averageLevel: avgLevel,
      averageStreak: avgStreak,
      levelDistribution: distribution,
      completionRate
    };
  }

  /**
   * Get interval for a specific level
   */
  public getIntervalForLevel(level: number): number {
    return this.parameters.intervals[Math.min(level, this.parameters.maxLevel)] || 1;
  }

  /**
   * Get all available intervals
   */
  public getAvailableIntervals(): number[] {
    return [...this.parameters.intervals];
  }

  /**
   * Predict next few review dates for an item
   */
  public predictNextReviews(
    progress: ReviewProgress, 
    assumedRating: ReviewRating = ReviewRating.GOOD,
    count: number = 5
  ): Date[] {
    const simpleData = progress.algorithmData as SimpleData;
    const predictions: Date[] = [];
    let currentLevel = simpleData.level;
    let currentDate = new Date(progress.nextReview);

    for (let i = 0; i < count; i++) {
      // Simulate the rating effect
      switch (assumedRating) {
        case ReviewRating.AGAIN:
          currentLevel = Math.max(0, currentLevel - this.parameters.againPenalty);
          break;
        case ReviewRating.HARD:
          // No change
          break;
        case ReviewRating.GOOD:
          currentLevel = Math.min(this.parameters.maxLevel, currentLevel + 1);
          break;
        case ReviewRating.EASY:
          currentLevel = Math.min(this.parameters.maxLevel, currentLevel + 1 + this.parameters.easyBonus);
          break;
      }

      // Calculate next date
      const interval = this.parameters.intervals[currentLevel] || 1;
      currentDate = this.addDaysToDate(currentDate, interval);
      predictions.push(new Date(currentDate));
    }

    return predictions;
  }

  /**
   * Simple optimization - just prevent too many items on same day
   */
  public optimizeSchedule?(items: ReviewProgress[]): ReviewProgress[] {
    const simpleItems = items.filter(item => item.algorithm === AlgorithmType.SIMPLE);
    
    // Group by due date
    const dateGroups = new Map<string, ReviewProgress[]>();
    
    for (const item of simpleItems) {
      const dateKey = item.nextReview.toDateString();
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(item);
    }

    // Redistribute if more than 30 items on same day
    const optimized: ReviewProgress[] = [];
    const maxItemsPerDay = 30;

    for (const [dateKey, dateItems] of dateGroups) {
      if (dateItems.length <= maxItemsPerDay) {
        optimized.push(...dateItems);
        continue;
      }

      const baseDate = new Date(dateKey);
      
      // Keep first 30 items on original date
      optimized.push(...dateItems.slice(0, maxItemsPerDay));

      // Spread remaining items over next days
      const remaining = dateItems.slice(maxItemsPerDay);
      remaining.forEach((item, index) => {
        const optimizedItem = { ...item };
        const daysToAdd = Math.floor(index / maxItemsPerDay) + 1;
        optimizedItem.nextReview = this.addDaysToDate(baseDate, daysToAdd);
        optimized.push(optimizedItem);
      });
    }

    return optimized;
  }
}