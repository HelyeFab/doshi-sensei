/**
 * Base abstract class for all spaced repetition algorithms
 * 
 * This provides the foundation that all review algorithms must implement,
 * ensuring consistent behavior across different spaced repetition systems.
 */

import {
  ReviewAlgorithm,
  ReviewItem,
  ReviewProgress,
  ReviewRating,
  AlgorithmType,
  StudyMode,
  PerformanceMetrics,
  AlgorithmError
} from '../types';

/**
 * Abstract base class that all review algorithms extend
 */
export abstract class BaseReviewAlgorithm implements ReviewAlgorithm {
  /** Algorithm name */
  public abstract readonly name: string;
  
  /** Algorithm version */
  public abstract readonly version: string;
  
  /** Algorithm type identifier */
  public abstract readonly algorithmType: AlgorithmType;

  /**
   * Process a review response and update progress
   * This is the core method that each algorithm must implement
   */
  public abstract processReview(
    item: ReviewItem,
    rating: ReviewRating,
    responseTime: number,
    progress?: ReviewProgress
  ): ReviewProgress;

  /**
   * Calculate the next review date for an item
   * Each algorithm has its own scheduling logic
   */
  public abstract calculateNextReview(progress: ReviewProgress): Date;

  /**
   * Get items due for review
   * Default implementation filters by nextReview date
   */
  public getDueItems(
    items: ReviewProgress[],
    limit?: number,
    now: Date = new Date()
  ): ReviewProgress[] {
    // Filter items that are due for review
    const dueItems = items.filter(item => {
      return item.nextReview <= now && !item.deleted;
    });

    // Sort by due date (most overdue first) and priority
    const sortedItems = dueItems.sort((a, b) => {
      // First, prioritize overdue items
      const aDaysOverdue = Math.max(0, (now.getTime() - a.nextReview.getTime()) / (1000 * 60 * 60 * 24));
      const bDaysOverdue = Math.max(0, (now.getTime() - b.nextReview.getTime()) / (1000 * 60 * 60 * 24));
      
      if (aDaysOverdue !== bDaysOverdue) {
        return bDaysOverdue - aDaysOverdue; // More overdue first
      }

      // Then by mastery level (lower mastery first for more practice)
      if (a.masteryLevel !== b.masteryLevel) {
        return a.masteryLevel - b.masteryLevel;
      }

      // Finally by creation date (older first)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Apply limit if specified
    return limit ? sortedItems.slice(0, limit) : sortedItems;
  }

  /**
   * Create initial progress for a new item
   * Each algorithm can override this for custom initialization
   */
  public createInitialProgress(
    item: ReviewItem,
    userId: string,
    studyMode: StudyMode = StudyMode.RECOGNITION
  ): ReviewProgress {
    const now = new Date();
    
    return {
      itemId: item.id,
      userId,
      algorithm: this.algorithmType,
      algorithmData: this.getInitialAlgorithmData(),
      nextReview: now, // Available for immediate review
      reviewCount: 0,
      masteryLevel: 0,
      retentionRate: 0,
      averageResponseTime: 0,
      studyModes: {
        [StudyMode.RECOGNITION]: this.createInitialModeStats(),
        [StudyMode.PRODUCTION]: this.createInitialModeStats(),
        [StudyMode.READING]: this.createInitialModeStats(),
        [StudyMode.LISTENING]: this.createInitialModeStats(),
        [StudyMode.TYPING]: this.createInitialModeStats(),
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update performance statistics after a review
   */
  protected updatePerformanceStats(
    progress: ReviewProgress,
    rating: ReviewRating,
    responseTime: number,
    studyMode: StudyMode
  ): void {
    const wasCorrect = rating >= ReviewRating.GOOD;
    
    // Update overall stats
    progress.reviewCount++;
    progress.updatedAt = new Date();
    
    // Update retention rate
    if (progress.reviewCount === 1) {
      progress.retentionRate = wasCorrect ? 1 : 0;
    } else {
      const oldTotal = progress.retentionRate * (progress.reviewCount - 1);
      progress.retentionRate = (oldTotal + (wasCorrect ? 1 : 0)) / progress.reviewCount;
    }
    
    // Update average response time
    if (progress.reviewCount === 1) {
      progress.averageResponseTime = responseTime;
    } else {
      const oldTotal = progress.averageResponseTime * (progress.reviewCount - 1);
      progress.averageResponseTime = (oldTotal + responseTime) / progress.reviewCount;
    }
    
    // Update mastery level based on recent performance
    progress.masteryLevel = this.calculateMasteryLevel(progress);
    
    // Update study mode specific stats
    const modeStats = progress.studyModes[studyMode];
    modeStats.attempts++;
    if (wasCorrect) {
      modeStats.successes++;
      modeStats.streak++;
    } else {
      modeStats.streak = 0;
    }
    
    // Update average time for this mode
    if (modeStats.attempts === 1) {
      modeStats.averageTime = responseTime;
    } else {
      const oldTotal = modeStats.averageTime * (modeStats.attempts - 1);
      modeStats.averageTime = (oldTotal + responseTime) / modeStats.attempts;
    }
    
    modeStats.lastAttempt = new Date();
  }

  /**
   * Calculate mastery level based on performance metrics
   * Override in specific algorithms for custom calculation
   */
  protected calculateMasteryLevel(progress: ReviewProgress): number {
    let mastery = 0;
    
    // Base mastery from retention rate (0-50 points)
    mastery += progress.retentionRate * 50;
    
    // Bonus for review count (0-25 points)
    const reviewCountBonus = Math.min(25, progress.reviewCount * 2);
    mastery += reviewCountBonus;
    
    // Bonus for consistent performance across modes (0-15 points)
    const modeConsistency = this.calculateModeConsistency(progress);
    mastery += modeConsistency * 15;
    
    // Bonus for response time (0-10 points)
    const responseTimeBonus = this.calculateResponseTimeBonus(progress);
    mastery += responseTimeBonus * 10;
    
    return Math.min(100, Math.max(0, Math.round(mastery)));
  }

  /**
   * Calculate consistency across different study modes
   */
  private calculateModeConsistency(progress: ReviewProgress): number {
    const modes = Object.values(progress.studyModes);
    const successRates = modes
      .filter(mode => mode.attempts > 0)
      .map(mode => mode.successes / mode.attempts);
    
    if (successRates.length === 0) return 0;
    
    // Calculate variance in success rates
    const mean = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / successRates.length;
    
    // Lower variance = higher consistency
    return Math.max(0, 1 - variance);
  }

  /**
   * Calculate bonus points for response time
   */
  private calculateResponseTimeBonus(progress: ReviewProgress): number {
    // Ideal response time is between 2-5 seconds
    const idealMin = 2;
    const idealMax = 5;
    const avgTime = progress.averageResponseTime;
    
    if (avgTime >= idealMin && avgTime <= idealMax) {
      return 1; // Perfect score
    } else if (avgTime < idealMin) {
      // Too fast - might be guessing
      return Math.max(0, avgTime / idealMin);
    } else {
      // Too slow - might be struggling
      return Math.max(0, 1 - ((avgTime - idealMax) / 10));
    }
  }

  /**
   * Create initial statistics for a study mode
   */
  private createInitialModeStats() {
    return {
      attempts: 0,
      successes: 0,
      averageTime: 0,
      streak: 0
    };
  }

  /**
   * Get initial algorithm-specific data
   * Must be implemented by each algorithm
   */
  protected abstract getInitialAlgorithmData(): any;

  /**
   * Validate algorithm data structure
   * Each algorithm should validate its specific data format
   */
  protected abstract validateAlgorithmData(data: any): boolean;

  /**
   * Add fuzzing to intervals to prevent review bunching
   */
  protected addFuzzing(interval: number, factor: number = 0.05): number {
    const fuzz = interval * factor * (Math.random() - 0.5) * 2;
    return Math.max(1, interval + fuzz);
  }

  /**
   * Convert interval in days to a future date
   */
  protected addDaysToDate(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Get days between two dates
   */
  protected getDaysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Validate review rating
   */
  protected validateRating(rating: ReviewRating): void {
    if (!Object.values(ReviewRating).includes(rating)) {
      throw new AlgorithmError(`Invalid review rating: ${rating}`);
    }
  }

  /**
   * Validate that progress matches this algorithm
   */
  protected validateProgress(progress: ReviewProgress): void {
    if (progress.algorithm !== this.algorithmType) {
      throw new AlgorithmError(
        `Progress algorithm ${progress.algorithm} does not match ${this.algorithmType}`
      );
    }
    
    if (!this.validateAlgorithmData(progress.algorithmData)) {
      throw new AlgorithmError('Invalid algorithm data structure');
    }
  }

  /**
   * Clone algorithm data to prevent mutations
   */
  protected cloneAlgorithmData<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }
}