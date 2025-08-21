/**
 * Review Scheduler for Unified Review Engine
 * 
 * Intelligent scheduling system that:
 * - Prevents review overload
 * - Optimizes timing for retention
 * - Balances different content types
 * - Respects user preferences and limits
 */

import {
  ReviewProgress,
  ReviewItem,
  SessionPreferences,
  ContentType,
  AlgorithmType,
  MixStrategy
} from '../types';
import { GoldenTimeCalculator, GoldenTimeResult } from './golden-time';

/**
 * Scheduling options and constraints
 */
export interface SchedulingOptions {
  /** Maximum items per session */
  maxItemsPerSession?: number;
  
  /** Maximum session duration in minutes */
  maxSessionDuration?: number;
  
  /** Maximum items per day */
  maxItemsPerDay?: number;
  
  /** Preferred study times (24h format) */
  preferredTimes?: number[];
  
  /** Content type priorities (higher = more priority) */
  contentTypePriorities?: Partial<Record<ContentType, number>>;
  
  /** Algorithm priorities */
  algorithmPriorities?: Partial<Record<AlgorithmType, number>>;
  
  /** Minimum interval between sessions (minutes) */
  minSessionInterval?: number;
  
  /** Include new items in sessions */
  includeNewItems?: boolean;
  
  /** New items ratio (0-1) */
  newItemsRatio?: number;
}

/**
 * Scheduled session information
 */
export interface ScheduledSession {
  /** Session identifier */
  sessionId: string;
  
  /** Scheduled start time */
  scheduledTime: Date;
  
  /** Items to review */
  items: ReviewProgress[];
  
  /** Session duration estimate (minutes) */
  estimatedDuration: number;
  
  /** Session quality score (0-100) */
  qualityScore: number;
  
  /** Session type */
  type: 'overdue' | 'due' | 'new' | 'mixed' | 'maintenance';
  
  /** Mix strategy used */
  mixStrategy: MixStrategy;
}

/**
 * Daily schedule overview
 */
export interface DailySchedule {
  /** Date for this schedule */
  date: Date;
  
  /** Scheduled sessions */
  sessions: ScheduledSession[];
  
  /** Total items scheduled */
  totalItems: number;
  
  /** Total study time estimate */
  totalDuration: number;
  
  /** Schedule quality score */
  overallScore: number;
  
  /** Golden time assessment */
  goldenTimeAssessment?: GoldenTimeResult;
}

/**
 * Review urgency levels
 */
export enum ReviewUrgency {
  CRITICAL = 'critical',    // Very overdue (>2 days)
  HIGH = 'high',           // Overdue (>1 day)
  MEDIUM = 'medium',       // Due today
  LOW = 'low',             // Due soon
  FUTURE = 'future'        // Future reviews
}

/**
 * Default scheduling options
 */
const DEFAULT_OPTIONS: Required<SchedulingOptions> = {
  maxItemsPerSession: 25,
  maxSessionDuration: 30,
  maxItemsPerDay: 100,
  preferredTimes: [9, 14, 19], // 9 AM, 2 PM, 7 PM
  contentTypePriorities: {
    [ContentType.KANJI]: 10,
    [ContentType.VOCABULARY]: 8,
    [ContentType.GRAMMAR]: 6,
    [ContentType.SENTENCE]: 5,
    [ContentType.FLASHCARD]: 4,
    [ContentType.RADICAL]: 3,
    [ContentType.CUSTOM]: 2
  },
  algorithmPriorities: {
    [AlgorithmType.FSRS]: 10,
    [AlgorithmType.SM2]: 8,
    [AlgorithmType.ANKI]: 6,
    [AlgorithmType.SIMPLE]: 4
  },
  minSessionInterval: 240, // 4 hours
  includeNewItems: true,
  newItemsRatio: 0.2 // 20% new items
};

/**
 * Review Scheduler Implementation
 */
export class ReviewScheduler {
  private options: Required<SchedulingOptions>;
  private goldenTimeCalculator: GoldenTimeCalculator;

  constructor(
    options: Partial<SchedulingOptions> = {},
    goldenTimeCalculator?: GoldenTimeCalculator
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.goldenTimeCalculator = goldenTimeCalculator || new GoldenTimeCalculator({
      preferredTimes: this.options.preferredTimes,
      usePerformancePatterns: true
    });
  }

  /**
   * Create an optimal daily schedule
   */
  public createDailySchedule(
    date: Date,
    userProgress: ReviewProgress[],
    availableItems?: ReviewItem[],
    lastSessionTime?: Date
  ): DailySchedule {
    // Categorize items by urgency
    const categorizedItems = this.categorizeByUrgency(userProgress, date);
    
    // Get golden time assessment
    const goldenTimeAssessment = this.goldenTimeCalculator.assessCurrentTime(
      userProgress, 
      lastSessionTime
    );

    // Create sessions based on urgency and constraints
    const sessions = this.createOptimalSessions(
      categorizedItems,
      date,
      availableItems
    );

    // Calculate totals
    const totalItems = sessions.reduce((sum, session) => sum + session.items.length, 0);
    const totalDuration = sessions.reduce((sum, session) => sum + session.estimatedDuration, 0);
    const overallScore = this.calculateScheduleQuality(sessions, goldenTimeAssessment);

    return {
      date,
      sessions,
      totalItems,
      totalDuration,
      overallScore,
      goldenTimeAssessment
    };
  }

  /**
   * Get next optimal session
   */
  public getNextOptimalSession(
    userProgress: ReviewProgress[],
    preferences?: SessionPreferences,
    lastSessionTime?: Date
  ): ScheduledSession | null {
    const now = new Date();
    
    // Check if we should suggest a session now
    if (lastSessionTime && this.isTooSoonForSession(lastSessionTime)) {
      return null;
    }

    // Get due and overdue items
    const dueItems = this.getDueItems(userProgress, now);
    const overdueItems = this.getOverdueItems(userProgress, now);
    
    if (dueItems.length === 0 && overdueItems.length === 0) {
      return null; // No items due
    }

    // Prioritize overdue items
    const prioritizedItems = [...overdueItems, ...dueItems];
    
    // Apply session preferences and limits
    const sessionItems = this.selectSessionItems(prioritizedItems, preferences);
    
    if (sessionItems.length === 0) {
      return null;
    }

    // Mix items according to strategy
    const mixedItems = this.mixItems(sessionItems, preferences?.mixStrategy || MixStrategy.ADAPTIVE);
    
    // Calculate session properties
    const estimatedDuration = this.estimateSessionDuration(mixedItems);
    const qualityScore = this.calculateSessionQuality(mixedItems, now);
    const sessionType = this.determineSessionType(mixedItems, overdueItems.length);

    return {
      sessionId: this.generateSessionId(),
      scheduledTime: now,
      items: mixedItems,
      estimatedDuration,
      qualityScore,
      type: sessionType,
      mixStrategy: preferences?.mixStrategy || MixStrategy.ADAPTIVE
    };
  }

  /**
   * Optimize session for better learning outcomes
   */
  public optimizeSession(session: ScheduledSession): ScheduledSession {
    let optimizedItems = [...session.items];
    
    // Apply difficulty progression (easier items first)
    optimizedItems = this.applyDifficultyProgression(optimizedItems);
    
    // Interleave content types for better retention
    optimizedItems = this.interleaveContentTypes(optimizedItems);
    
    // Ensure good spacing between similar items
    optimizedItems = this.applySpacing(optimizedItems);
    
    // Recalculate properties
    const estimatedDuration = this.estimateSessionDuration(optimizedItems);
    const qualityScore = this.calculateSessionQuality(optimizedItems, session.scheduledTime);

    return {
      ...session,
      items: optimizedItems,
      estimatedDuration,
      qualityScore
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Categorize items by review urgency
   */
  private categorizeByUrgency(
    userProgress: ReviewProgress[], 
    referenceDate: Date
  ): Record<ReviewUrgency, ReviewProgress[]> {
    const categories: Record<ReviewUrgency, ReviewProgress[]> = {
      [ReviewUrgency.CRITICAL]: [],
      [ReviewUrgency.HIGH]: [],
      [ReviewUrgency.MEDIUM]: [],
      [ReviewUrgency.LOW]: [],
      [ReviewUrgency.FUTURE]: []
    };

    const now = referenceDate;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const twoDaysMs = 2 * oneDayMs;

    for (const progress of userProgress) {
      if (progress.deleted) continue;
      
      const timeDiff = now.getTime() - progress.nextReview.getTime();
      
      if (timeDiff > twoDaysMs) {
        categories[ReviewUrgency.CRITICAL].push(progress);
      } else if (timeDiff > oneDayMs) {
        categories[ReviewUrgency.HIGH].push(progress);
      } else if (timeDiff > 0) {
        categories[ReviewUrgency.MEDIUM].push(progress);
      } else if (timeDiff > -oneDayMs) {
        categories[ReviewUrgency.LOW].push(progress);
      } else {
        categories[ReviewUrgency.FUTURE].push(progress);
      }
    }

    return categories;
  }

  /**
   * Create optimal sessions for the day
   */
  private createOptimalSessions(
    categorizedItems: Record<ReviewUrgency, ReviewProgress[]>,
    date: Date,
    availableItems?: ReviewItem[]
  ): ScheduledSession[] {
    const sessions: ScheduledSession[] = [];
    const preferredTimes = this.options.preferredTimes;
    
    // Calculate total reviewable items
    const totalReviewable = Object.values(categorizedItems).reduce(
      (sum, items) => sum + items.length, 0
    );

    if (totalReviewable === 0) {
      return sessions;
    }

    // Distribute items across preferred time slots
    for (let i = 0; i < preferredTimes.length; i++) {
      const time = preferredTimes[i];
      const sessionTime = new Date(date);
      sessionTime.setHours(time, 0, 0, 0);
      
      // Skip past times for today
      if (sessionTime <= new Date() && this.isSameDay(date, new Date())) {
        continue;
      }

      // Select items for this session
      const sessionItems = this.selectSessionItemsForTime(categorizedItems, i, preferredTimes.length);
      
      if (sessionItems.length === 0) continue;

      // Create session
      const session: ScheduledSession = {
        sessionId: this.generateSessionId(),
        scheduledTime: sessionTime,
        items: sessionItems,
        estimatedDuration: this.estimateSessionDuration(sessionItems),
        qualityScore: this.calculateSessionQuality(sessionItems, sessionTime),
        type: this.determineSessionType(sessionItems, categorizedItems[ReviewUrgency.HIGH].length),
        mixStrategy: MixStrategy.ADAPTIVE
      };

      sessions.push(session);

      // Stop if we've scheduled enough items for the day
      const totalScheduled = sessions.reduce((sum, s) => sum + s.items.length, 0);
      if (totalScheduled >= this.options.maxItemsPerDay) {
        break;
      }
    }

    return sessions;
  }

  /**
   * Select items for a specific time slot
   */
  private selectSessionItemsForTime(
    categorizedItems: Record<ReviewUrgency, ReviewProgress[]>,
    timeIndex: number,
    totalTimeSlots: number
  ): ReviewProgress[] {
    const maxItems = this.options.maxItemsPerSession;
    const items: ReviewProgress[] = [];
    
    // Prioritize critical and high urgency items in early sessions
    if (timeIndex === 0) {
      // First session: focus on critical and high urgency
      items.push(...categorizedItems[ReviewUrgency.CRITICAL].splice(0, Math.floor(maxItems * 0.6)));
      items.push(...categorizedItems[ReviewUrgency.HIGH].splice(0, Math.floor(maxItems * 0.3)));
      items.push(...categorizedItems[ReviewUrgency.MEDIUM].splice(0, Math.floor(maxItems * 0.1)));
    } else {
      // Later sessions: balanced mix
      const itemsPerCategory = Math.floor(maxItems / 3);
      items.push(...categorizedItems[ReviewUrgency.HIGH].splice(0, itemsPerCategory));
      items.push(...categorizedItems[ReviewUrgency.MEDIUM].splice(0, itemsPerCategory));
      items.push(...categorizedItems[ReviewUrgency.LOW].splice(0, itemsPerCategory));
    }

    return items.slice(0, maxItems);
  }

  /**
   * Get items that are currently due for review
   */
  private getDueItems(userProgress: ReviewProgress[], now: Date): ReviewProgress[] {
    return userProgress.filter(progress => 
      !progress.deleted && 
      progress.nextReview <= now
    );
  }

  /**
   * Get items that are overdue (past due by more than 1 hour)
   */
  private getOverdueItems(userProgress: ReviewProgress[], now: Date): ReviewProgress[] {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return userProgress.filter(progress => 
      !progress.deleted && 
      progress.nextReview <= oneHourAgo
    );
  }

  /**
   * Select items for a session based on preferences
   */
  private selectSessionItems(
    candidateItems: ReviewProgress[],
    preferences?: SessionPreferences
  ): ReviewProgress[] {
    let filteredItems = [...candidateItems];
    
    // Filter by content types if specified
    if (preferences?.contentTypes && preferences.contentTypes.length > 0) {
      // Would need ReviewItem data to filter by content type
      // This is a placeholder for now
    }

    // Apply limit
    const limit = Math.min(
      preferences?.maxItems || this.options.maxItemsPerSession,
      this.options.maxItemsPerSession
    );

    return filteredItems.slice(0, limit);
  }

  /**
   * Mix items according to strategy
   */
  private mixItems(items: ReviewProgress[], strategy: MixStrategy): ReviewProgress[] {
    switch (strategy) {
      case MixStrategy.INTERLEAVED:
        return this.interleaveItems(items);
      
      case MixStrategy.BLOCKED:
        return this.blockItems(items);
      
      case MixStrategy.ADAPTIVE:
      default:
        return this.adaptiveMix(items);
    }
  }

  /**
   * Interleave items for better retention
   */
  private interleaveItems(items: ReviewProgress[]): ReviewProgress[] {
    // Sort by algorithm type first, then interleave
    const grouped = this.groupBy(items, item => item.algorithm);
    const interleaved: ReviewProgress[] = [];
    
    const groups = Object.values(grouped);
    const maxLength = Math.max(...groups.map(g => g.length));
    
    for (let i = 0; i < maxLength; i++) {
      for (const group of groups) {
        if (group[i]) {
          interleaved.push(group[i]);
        }
      }
    }
    
    return interleaved;
  }

  /**
   * Block items by type (similar items together)
   */
  private blockItems(items: ReviewProgress[]): ReviewProgress[] {
    // Group by algorithm and sort each group
    const grouped = this.groupBy(items, item => item.algorithm);
    const blocked: ReviewProgress[] = [];
    
    // Sort groups by priority
    const sortedGroups = Object.entries(grouped).sort(([alg1], [alg2]) => {
      const priority1 = this.options.algorithmPriorities[alg1 as AlgorithmType] || 0;
      const priority2 = this.options.algorithmPriorities[alg2 as AlgorithmType] || 0;
      return priority2 - priority1;
    });

    for (const [_, group] of sortedGroups) {
      // Sort items within group by urgency
      group.sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());
      blocked.push(...group);
    }
    
    return blocked;
  }

  /**
   * Adaptive mixing based on performance and item characteristics
   */
  private adaptiveMix(items: ReviewProgress[]): ReviewProgress[] {
    // Start with interleaving, then apply adaptations
    let mixed = this.interleaveItems(items);
    
    // Apply difficulty progression
    mixed = this.applyDifficultyProgression(mixed);
    
    // Apply spacing between similar items
    mixed = this.applySpacing(mixed);
    
    return mixed;
  }

  /**
   * Apply difficulty progression (easier first)
   */
  private applyDifficultyProgression(items: ReviewProgress[]): ReviewProgress[] {
    // Sort by mastery level (higher mastery = easier)
    return [...items].sort((a, b) => b.masteryLevel - a.masteryLevel);
  }

  /**
   * Apply spacing between similar items
   */
  private applySpacing(items: ReviewProgress[]): ReviewProgress[] {
    // This would ideally space out items of the same content type
    // For now, we'll just return the items as-is
    return items;
  }

  /**
   * Interleave content types for better retention
   */
  private interleaveContentTypes(items: ReviewProgress[]): ReviewProgress[] {
    // Would need ReviewItem data to determine content types
    // Placeholder implementation
    return items;
  }

  /**
   * Estimate session duration in minutes
   */
  private estimateSessionDuration(items: ReviewProgress[]): number {
    // Base time per item: 30 seconds for review + thinking time
    const baseTimePerItem = 0.5; // minutes
    
    // Adjust based on mastery level
    const totalTime = items.reduce((sum, item) => {
      const difficultyMultiplier = 1 + (100 - item.masteryLevel) / 100; // 1.0 to 2.0
      return sum + (baseTimePerItem * difficultyMultiplier);
    }, 0);
    
    // Add overhead for session management
    const overhead = Math.min(5, items.length * 0.1); // Up to 5 minutes
    
    return Math.round(totalTime + overhead);
  }

  /**
   * Calculate session quality score
   */
  private calculateSessionQuality(items: ReviewProgress[], scheduledTime: Date): number {
    if (items.length === 0) return 0;
    
    // Factors affecting quality:
    // 1. Urgency distribution
    // 2. Item variety  
    // 3. Difficulty progression
    // 4. Time optimality
    
    const urgencyScore = this.calculateUrgencyScore(items);
    const varietyScore = this.calculateVarietyScore(items);
    const difficultyScore = this.calculateDifficultyScore(items);
    const timeScore = this.goldenTimeCalculator.assessCurrentTime().score;
    
    return Math.round(
      urgencyScore * 0.3 +
      varietyScore * 0.2 +
      difficultyScore * 0.2 +
      timeScore * 0.3
    );
  }

  /**
   * Calculate schedule quality for the entire day
   */
  private calculateScheduleQuality(
    sessions: ScheduledSession[],
    goldenTimeAssessment: GoldenTimeResult
  ): number {
    if (sessions.length === 0) return 0;
    
    const avgSessionQuality = sessions.reduce((sum, s) => sum + s.qualityScore, 0) / sessions.length;
    const distributionScore = this.calculateTimeDistributionScore(sessions);
    const goldenTimeScore = goldenTimeAssessment.score;
    
    return Math.round(
      avgSessionQuality * 0.4 +
      distributionScore * 0.3 +
      goldenTimeScore * 0.3
    );
  }

  /**
   * Calculate urgency score for items
   */
  private calculateUrgencyScore(items: ReviewProgress[]): number {
    const now = new Date();
    const urgencyScores = items.map(item => {
      const hoursOverdue = (now.getTime() - item.nextReview.getTime()) / (1000 * 60 * 60);
      if (hoursOverdue > 48) return 100; // Very urgent
      if (hoursOverdue > 24) return 80;  // Urgent
      if (hoursOverdue > 0) return 60;   // Due
      if (hoursOverdue > -24) return 40; // Soon
      return 20; // Future
    });
    
    return urgencyScores.reduce((sum, score) => sum + score, 0) / urgencyScores.length;
  }

  /**
   * Calculate variety score for items
   */
  private calculateVarietyScore(items: ReviewProgress[]): number {
    // More variety = better for retention
    const algorithms = new Set(items.map(item => item.algorithm));
    const varietyRatio = algorithms.size / Math.min(4, items.length); // Max variety is 4 algorithms
    
    return Math.min(100, varietyRatio * 100);
  }

  /**
   * Calculate difficulty progression score
   */
  private calculateDifficultyScore(items: ReviewProgress[]): number {
    if (items.length <= 1) return 100;
    
    // Check if items are ordered from easier to harder (higher to lower mastery)
    let progressionScore = 0;
    for (let i = 1; i < items.length; i++) {
      if (items[i-1].masteryLevel >= items[i].masteryLevel) {
        progressionScore++;
      }
    }
    
    return (progressionScore / (items.length - 1)) * 100;
  }

  /**
   * Calculate time distribution score
   */
  private calculateTimeDistributionScore(sessions: ScheduledSession[]): number {
    if (sessions.length <= 1) return 100;
    
    // Check spacing between sessions
    const intervals = [];
    for (let i = 1; i < sessions.length; i++) {
      const interval = sessions[i].scheduledTime.getTime() - sessions[i-1].scheduledTime.getTime();
      intervals.push(interval / (1000 * 60 * 60)); // Convert to hours
    }
    
    // Ideal interval is 4-6 hours
    const idealInterval = 5;
    const scores = intervals.map(interval => {
      const diff = Math.abs(interval - idealInterval);
      return Math.max(0, 100 - (diff * 10));
    });
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Determine session type based on content
   */
  private determineSessionType(
    items: ReviewProgress[], 
    overdueCount: number
  ): ScheduledSession['type'] {
    if (overdueCount > items.length * 0.7) return 'overdue';
    if (overdueCount > 0) return 'mixed';
    
    // Check if all items are new (no reviews yet)
    const newItems = items.filter(item => item.reviewCount === 0);
    if (newItems.length > items.length * 0.7) return 'new';
    if (newItems.length > 0) return 'mixed';
    
    return 'due';
  }

  /**
   * Check if it's too soon for another session
   */
  private isTooSoonForSession(lastSessionTime: Date): boolean {
    const now = new Date();
    const minutesSince = (now.getTime() - lastSessionTime.getTime()) / (1000 * 60);
    return minutesSince < this.options.minSessionInterval;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Group array by key function
   */
  private groupBy<T, K extends string | number>(
    items: T[], 
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    const groups = {} as Record<K, T[]>;
    
    for (const item of items) {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    
    return groups;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update scheduling options
   */
  public updateOptions(options: Partial<SchedulingOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Update golden time calculator if preferred times changed
    if (options.preferredTimes) {
      this.goldenTimeCalculator.updateConfig({
        preferredTimes: options.preferredTimes
      });
    }
  }

  /**
   * Get current scheduling options
   */
  public getOptions(): SchedulingOptions {
    return { ...this.options };
  }
}