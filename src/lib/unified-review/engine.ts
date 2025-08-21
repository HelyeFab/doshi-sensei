/**
 * Unified Review Engine - Main Controller
 * 
 * The central orchestrator that brings together all components of the
 * Unified Review Engine to provide a single, cohesive API for reviews.
 * 
 * Features:
 * - Multi-algorithm support (FSRS, SM2, Simple)
 * - Intelligent scheduling and notifications
 * - Offline-first storage with sync
 * - Performance analytics and optimization
 */

import {
  ReviewItem,
  ReviewProgress,
  ReviewResponse,
  ReviewResult,
  ReviewRating,
  SessionState,
  SessionPreferences,
  SessionSummary,
  ContentType,
  AlgorithmType,
  StudyMode,
  StorageConfig,
  SyncStatus,
  UREError
} from './types';

// Core components
import { FSRSAlgorithm } from './algorithms/fsrs';
import { SM2Algorithm } from './algorithms/sm2';
import { SimpleAlgorithm } from './algorithms/simple';
import { BaseReviewAlgorithm } from './algorithms/base';

// Storage components
import { IndexedDBManager } from './storage/indexdb-manager';
import { ReviewStorage } from './storage/review-storage';
import { SyncService } from './storage/sync-service';

// Scheduling components
import { ReviewScheduler, ScheduledSession, DailySchedule } from './scheduling/scheduler';
import { GoldenTimeCalculator } from './scheduling/golden-time';
import { NotificationScheduler } from './scheduling/notification-scheduler';

/**
 * Engine configuration options
 */
export interface EngineConfig {
  /** Storage configuration */
  storage?: Partial<StorageConfig>;
  
  /** Default algorithm for new items */
  defaultAlgorithm?: AlgorithmType;
  
  /** User ID for this engine instance */
  userId?: string;
  
  /** Enable automatic sync for premium users */
  enableSync?: boolean;
  
  /** Enable notifications */
  enableNotifications?: boolean;
  
  /** Debug mode for additional logging */
  debug?: boolean;
}

/**
 * Engine statistics and metrics
 */
export interface EngineStats {
  /** Total items in the system */
  totalItems: number;
  
  /** Items by content type */
  itemsByType: Record<ContentType, number>;
  
  /** Items by algorithm */
  itemsByAlgorithm: Record<AlgorithmType, number>;
  
  /** Items due today */
  dueToday: number;
  
  /** Overdue items */
  overdue: number;
  
  /** Average mastery level */
  averageMastery: number;
  
  /** Study streak (days) */
  studyStreak: number;
  
  /** Total reviews completed */
  totalReviews: number;
  
  /** Overall retention rate */
  retentionRate: number;
}

/**
 * Default engine configuration
 */
const DEFAULT_CONFIG: Required<EngineConfig> = {
  storage: {},
  defaultAlgorithm: AlgorithmType.FSRS,
  userId: 'anonymous',
  enableSync: false,
  enableNotifications: true,
  debug: false
};

/**
 * Unified Review Engine - Main Class
 */
export class UnifiedReviewEngine {
  private config: Required<EngineConfig>;
  private algorithms: Map<AlgorithmType, BaseReviewAlgorithm> = new Map();
  
  // Core components
  private dbManager: IndexedDBManager;
  private storage: ReviewStorage;
  private syncService?: SyncService;
  private scheduler: ReviewScheduler;
  private goldenTimeCalculator: GoldenTimeCalculator;
  private notificationScheduler?: NotificationScheduler;
  
  // State management
  private currentSession: SessionState | null = null;
  private initialized = false;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize algorithms
    this.algorithms.set(AlgorithmType.FSRS, new FSRSAlgorithm());
    this.algorithms.set(AlgorithmType.SM2, new SM2Algorithm());
    this.algorithms.set(AlgorithmType.SIMPLE, new SimpleAlgorithm());
    
    // Initialize storage
    this.dbManager = new IndexedDBManager(this.config.storage);
    this.storage = new ReviewStorage(this.dbManager);
    
    // Initialize scheduling components
    this.goldenTimeCalculator = new GoldenTimeCalculator();
    this.scheduler = new ReviewScheduler({}, this.goldenTimeCalculator);
    
    // Initialize optional components
    if (this.config.enableSync) {
      this.syncService = new SyncService(this.storage);
    }
    
    if (this.config.enableNotifications) {
      this.notificationScheduler = new NotificationScheduler({}, this.goldenTimeCalculator);
    }
  }

  /**
   * Initialize the engine (call once before using)
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize storage
      await this.dbManager.init();
      
      // Initialize sync service
      if (this.syncService) {
        await this.syncService.init();
      }
      
      this.initialized = true;
      this.log('Engine initialized successfully');
      
    } catch (error) {
      throw new UREError('Failed to initialize engine', 'INIT_ERROR', error as Error);
    }
  }

  // ============================================================================
  // Item Management
  // ============================================================================

  /**
   * Add a new review item
   */
  public async addReviewItem(item: ReviewItem): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Create the review item
      await this.storage.createReviewItem(item);
      
      // Create initial progress for the current user
      if (this.config.userId !== 'anonymous') {
        const algorithm = this.algorithms.get(this.config.defaultAlgorithm)!;
        const initialProgress = algorithm.createInitialProgress(item, this.config.userId);
        await this.storage.createReviewProgress(initialProgress);
      }
      
      this.log(`Added review item: ${item.id} (${item.type})`);
      
    } catch (error) {
      throw new UREError(`Failed to add review item: ${item.id}`, 'ADD_ITEM_ERROR', error as Error);
    }
  }

  /**
   * Get review item by ID
   */
  public async getReviewItem(itemId: string): Promise<ReviewItem | null> {
    await this.ensureInitialized();
    return this.storage.getReviewItem(itemId);
  }

  /**
   * Update a review item
   */
  public async updateReviewItem(item: ReviewItem): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.storage.updateReviewItem(item);
      this.log(`Updated review item: ${item.id}`);
      
    } catch (error) {
      throw new UREError(`Failed to update review item: ${item.id}`, 'UPDATE_ITEM_ERROR', error as Error);
    }
  }

  /**
   * Remove a review item and all associated progress
   */
  public async removeReviewItem(itemId: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.storage.deleteReviewItem(itemId);
      this.log(`Removed review item: ${itemId}`);
      
    } catch (error) {
      throw new UREError(`Failed to remove review item: ${itemId}`, 'REMOVE_ITEM_ERROR', error as Error);
    }
  }

  // ============================================================================
  // Review Sessions
  // ============================================================================

  /**
   * Get items due for review
   */
  public async getDueItems(limit?: number): Promise<ReviewProgress[]> {
    await this.ensureInitialized();
    
    if (this.config.userId === 'anonymous') {
      return [];
    }

    const dueItems = await this.storage.getDueItems(this.config.userId, {
      limit,
      sort: { field: 'nextReview', direction: 'asc' }
    });

    return dueItems;
  }

  /**
   * Start a new review session
   */
  public async startSession(preferences?: SessionPreferences): Promise<SessionState> {
    await this.ensureInitialized();

    if (this.currentSession) {
      throw new UREError('Session already in progress', 'SESSION_ACTIVE_ERROR');
    }

    if (this.config.userId === 'anonymous') {
      throw new UREError('Cannot start session for anonymous user', 'ANONYMOUS_USER_ERROR');
    }

    try {
      // Get optimal session from scheduler
      const lastSessionTime = this.currentSession?.startTime;
      const userProgress = await this.storage.getUserReviewProgress(this.config.userId);
      const optimalSession = this.scheduler.getNextOptimalSession(
        userProgress, 
        preferences,
        lastSessionTime
      );

      if (!optimalSession) {
        throw new UREError('No items available for review', 'NO_ITEMS_ERROR');
      }

      // Create session state
      this.currentSession = {
        sessionId: optimalSession.sessionId,
        userId: this.config.userId,
        items: optimalSession.items,
        currentIndex: 0,
        startTime: new Date(),
        preferences: preferences || {},
        completed: [],
        stats: {
          totalReviewed: 0,
          correctAnswers: 0,
          averageResponseTime: 0,
          ratingDistribution: {
            [ReviewRating.AGAIN]: 0,
            [ReviewRating.HARD]: 0,
            [ReviewRating.GOOD]: 0,
            [ReviewRating.EASY]: 0
          },
          studyModeStats: {
            [StudyMode.RECOGNITION]: { attempts: 0, successes: 0, averageTime: 0, streak: 0 },
            [StudyMode.PRODUCTION]: { attempts: 0, successes: 0, averageTime: 0, streak: 0 },
            [StudyMode.READING]: { attempts: 0, successes: 0, averageTime: 0, streak: 0 },
            [StudyMode.LISTENING]: { attempts: 0, successes: 0, averageTime: 0, streak: 0 },
            [StudyMode.TYPING]: { attempts: 0, successes: 0, averageTime: 0, streak: 0 }
          }
        }
      };

      this.log(`Started session: ${this.currentSession.sessionId} with ${this.currentSession.items.length} items`);
      
      return this.currentSession;

    } catch (error) {
      throw new UREError('Failed to start session', 'START_SESSION_ERROR', error as Error);
    }
  }

  /**
   * Process a review response
   */
  public async processReview(
    itemId: string, 
    response: ReviewResponse
  ): Promise<ReviewResult> {
    await this.ensureInitialized();

    if (!this.currentSession) {
      throw new UREError('No active session', 'NO_SESSION_ERROR');
    }

    try {
      // Find the item in current session
      const currentItem = this.currentSession.items.find(item => item.itemId === itemId);
      if (!currentItem) {
        throw new UREError(`Item ${itemId} not found in current session`, 'ITEM_NOT_FOUND_ERROR');
      }

      // Get the review item data
      const reviewItem = await this.storage.getReviewItem(itemId);
      if (!reviewItem) {
        throw new UREError(`Review item ${itemId} not found`, 'REVIEW_ITEM_NOT_FOUND_ERROR');
      }

      // Get the appropriate algorithm
      const algorithm = this.algorithms.get(currentItem.algorithm);
      if (!algorithm) {
        throw new UREError(`Algorithm ${currentItem.algorithm} not found`, 'ALGORITHM_NOT_FOUND_ERROR');
      }

      // Process the review with the algorithm
      const updatedProgress = algorithm.processReview(
        reviewItem,
        response.rating,
        response.responseTime,
        currentItem
      );

      // Save updated progress
      await this.storage.updateReviewProgress(updatedProgress);

      // Update session statistics
      this.updateSessionStats(response, updatedProgress);

      // Create result
      const result: ReviewResult = {
        itemId,
        response,
        progress: updatedProgress,
        timestamp: new Date()
      };

      // Add to session completed items
      this.currentSession.completed.push(result);
      this.currentSession.currentIndex++;

      this.log(`Processed review for item ${itemId}: ${ReviewRating[response.rating]} (${response.responseTime}s)`);

      return result;

    } catch (error) {
      throw new UREError(`Failed to process review for item ${itemId}`, 'PROCESS_REVIEW_ERROR', error as Error);
    }
  }

  /**
   * Get current session state
   */
  public getCurrentSession(): SessionState | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Complete the current session
   */
  public async completeSession(): Promise<SessionSummary> {
    await this.ensureInitialized();

    if (!this.currentSession) {
      throw new UREError('No active session', 'NO_SESSION_ERROR');
    }

    try {
      const session = this.currentSession;
      const endTime = new Date();
      const duration = (endTime.getTime() - session.startTime.getTime()) / (1000 * 60); // minutes

      // Calculate items needing more work (items rated Again or Hard)
      const itemsNeedingWork = session.completed
        .filter(result => 
          result.response.rating === ReviewRating.AGAIN || 
          result.response.rating === ReviewRating.HARD
        )
        .map(result => result.itemId);

      // Estimate next review time
      const nextReviewEstimate = await this.estimateNextReviewTime();

      // Generate performance suggestions
      const suggestions = this.generatePerformanceSuggestions(session);

      const summary: SessionSummary = {
        ...session.stats,
        duration,
        itemsNeedingWork,
        nextReviewEstimate,
        suggestions
      };

      // Clear current session
      this.currentSession = null;

      this.log(`Completed session: ${session.sessionId} (${duration} minutes, ${session.stats.totalReviewed} items)`);

      // Schedule notifications for future reviews if enabled
      if (this.notificationScheduler) {
        const userProgress = await this.storage.getUserReviewProgress(this.config.userId);
        const dueItems = await this.storage.getDueItems(this.config.userId, { limit: 20 });
        
        if (dueItems.length > 0) {
          await this.notificationScheduler.scheduleNotifications(this.config.userId, dueItems);
        }
      }

      return summary;

    } catch (error) {
      throw new UREError('Failed to complete session', 'COMPLETE_SESSION_ERROR', error as Error);
    }
  }

  // ============================================================================
  // Scheduling and Notifications
  // ============================================================================

  /**
   * Get today's review schedule
   */
  public async getTodaySchedule(): Promise<DailySchedule> {
    await this.ensureInitialized();

    if (this.config.userId === 'anonymous') {
      throw new UREError('Cannot get schedule for anonymous user', 'ANONYMOUS_USER_ERROR');
    }

    const userProgress = await this.storage.getUserReviewProgress(this.config.userId);
    const schedule = this.scheduler.createDailySchedule(new Date(), userProgress);
    
    return schedule;
  }

  /**
   * Get golden time assessment for studying
   */
  public async getGoldenTimeAssessment(): Promise<any> {
    await this.ensureInitialized();
    
    if (this.config.userId === 'anonymous') {
      return this.goldenTimeCalculator.assessCurrentTime();
    }

    const userProgress = await this.storage.getUserReviewProgress(this.config.userId);
    const lastSession = this.currentSession?.startTime;
    
    return this.goldenTimeCalculator.assessCurrentTime(userProgress, lastSession);
  }

  // ============================================================================
  // Statistics and Analytics
  // ============================================================================

  /**
   * Get comprehensive engine statistics
   */
  public async getStats(): Promise<EngineStats> {
    await this.ensureInitialized();

    if (this.config.userId === 'anonymous') {
      return this.getEmptyStats();
    }

    try {
      const userProgress = await this.storage.getUserReviewProgress(this.config.userId);
      const reviewStats = await this.storage.getReviewStats(this.config.userId);

      // Calculate derived statistics
      const averageMastery = userProgress.length > 0
        ? userProgress.reduce((sum, p) => sum + p.masteryLevel, 0) / userProgress.length
        : 0;

      const totalReviews = userProgress.reduce((sum, p) => sum + p.reviewCount, 0);
      const overallRetention = userProgress.length > 0
        ? userProgress.reduce((sum, p) => sum + p.retentionRate, 0) / userProgress.length
        : 0;

      // Calculate study streak (placeholder - would need session history)
      const studyStreak = 0;

      return {
        totalItems: reviewStats.totalItems,
        itemsByType: reviewStats.contentTypeDistribution,
        itemsByAlgorithm: reviewStats.algorithmDistribution,
        dueToday: reviewStats.dueToday,
        overdue: reviewStats.overdueItems,
        averageMastery,
        studyStreak,
        totalReviews,
        retentionRate: overallRetention
      };

    } catch (error) {
      throw new UREError('Failed to get statistics', 'STATS_ERROR', error as Error);
    }
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): SyncStatus | null {
    return this.syncService ? this.syncService.getSyncStatus() : null;
  }

  /**
   * Manually trigger sync
   */
  public async syncNow(): Promise<any> {
    if (!this.syncService) {
      throw new UREError('Sync service not enabled', 'SYNC_NOT_ENABLED_ERROR');
    }

    return this.syncService.syncNow();
  }

  // ============================================================================
  // Configuration and Utilities
  // ============================================================================

  /**
   * Update engine configuration
   */
  public updateConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update components if necessary
    if (config.userId && config.userId !== this.config.userId) {
      // User changed - would need to handle this
      this.log(`User changed to: ${config.userId}`);
    }
  }

  /**
   * Get health check information
   */
  public async getHealthCheck(): Promise<{
    engine: boolean;
    storage: boolean;
    sync: boolean;
    algorithms: boolean;
  }> {
    const health = {
      engine: this.initialized,
      storage: false,
      sync: this.syncService ? true : false,
      algorithms: this.algorithms.size > 0
    };

    try {
      const dbHealth = await this.dbManager.healthCheck();
      health.storage = dbHealth.connected;
    } catch (error) {
      health.storage = false;
    }

    return health;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Ensure engine is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Update session statistics after a review
   */
  private updateSessionStats(response: ReviewResponse, progress: ReviewProgress): void {
    if (!this.currentSession) return;

    const stats = this.currentSession.stats;
    stats.totalReviewed++;

    // Update correct answers count
    if (response.rating >= ReviewRating.GOOD) {
      stats.correctAnswers++;
    }

    // Update average response time
    const totalTime = stats.averageResponseTime * (stats.totalReviewed - 1) + response.responseTime;
    stats.averageResponseTime = totalTime / stats.totalReviewed;

    // Update rating distribution
    stats.ratingDistribution[response.rating]++;

    // Update study mode stats
    const modeStats = stats.studyModeStats[response.studyMode];
    modeStats.attempts++;
    if (response.rating >= ReviewRating.GOOD) {
      modeStats.successes++;
      modeStats.streak++;
    } else {
      modeStats.streak = 0;
    }
    
    // Update average time for this mode
    const modeTime = modeStats.averageTime * (modeStats.attempts - 1) + response.responseTime;
    modeStats.averageTime = modeTime / modeStats.attempts;
  }

  /**
   * Estimate next review time
   */
  private async estimateNextReviewTime(): Promise<Date> {
    if (this.config.userId === 'anonymous') {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: tomorrow
    }

    const dueItems = await this.storage.getDueItems(this.config.userId, { limit: 1 });
    if (dueItems.length > 0) {
      return dueItems[0].nextReview;
    }

    // No items due, use golden time for next optimal time
    const goldenTime = await this.getGoldenTimeAssessment();
    return goldenTime.nextOptimalTime || new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  /**
   * Generate performance suggestions
   */
  private generatePerformanceSuggestions(session: SessionState): string[] {
    const suggestions: string[] = [];
    const stats = session.stats;
    
    if (stats.totalReviewed === 0) {
      return suggestions;
    }

    const accuracy = stats.correctAnswers / stats.totalReviewed;
    const avgResponseTime = stats.averageResponseTime;

    // Accuracy suggestions
    if (accuracy < 0.6) {
      suggestions.push('Consider reviewing items more thoroughly before rating them as known');
    } else if (accuracy > 0.9) {
      suggestions.push('Great accuracy! You might benefit from more challenging content');
    }

    // Response time suggestions
    if (avgResponseTime > 8) {
      suggestions.push('Try to answer more quickly to improve retention through active recall');
    } else if (avgResponseTime < 2) {
      suggestions.push('Take a moment to ensure you fully understand each item');
    }

    // Rating distribution suggestions
    const againRate = stats.ratingDistribution[ReviewRating.AGAIN] / stats.totalReviewed;
    if (againRate > 0.3) {
      suggestions.push('Many items were marked as forgotten - consider more frequent review sessions');
    }

    return suggestions;
  }

  /**
   * Get empty statistics for anonymous users
   */
  private getEmptyStats(): EngineStats {
    return {
      totalItems: 0,
      itemsByType: {} as Record<ContentType, number>,
      itemsByAlgorithm: {} as Record<AlgorithmType, number>,
      dueToday: 0,
      overdue: 0,
      averageMastery: 0,
      studyStreak: 0,
      totalReviews: 0,
      retentionRate: 0
    };
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[URE] ${message}`);
    }
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    if (this.syncService) {
      this.syncService.destroy();
    }
    
    this.dbManager.close();
    this.currentSession = null;
    this.initialized = false;
    
    this.log('Engine destroyed');
  }
}