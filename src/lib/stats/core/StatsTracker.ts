/**
 * Stats Tracker - Main orchestrator for the modular stats system
 * Coordinates all stats modules and provides the public API
 * 
 * This is a complete rewrite using enterprise patterns:
 * - Dependency injection for modules
 * - Event-driven architecture
 * - Clean separation of concerns
 * - Comprehensive error handling
 * - Performance optimizations
 */

import { User } from 'firebase/auth';
import { Subscription } from '@/lib/subscriptions/types';
import {
  ActivityType,
  ActivityEvent,
  UserStatsV2,
  DailyActivity,
  StatsUpdateListener,
  UserContext,
  SyncResult,
  SyncStatus,
  IStatsStorage,
  IActivityProcessor,
  IStreakCalculator,
  IStatsSyncManager,
  IStatsAggregator,
  IStatsEventBus,
  IStatsCache,
  IStatsValidator,
  StatsError
} from './interfaces';

// Import implementations
import { StatsStorage } from '../storage/StatsStorage';
import { ActivityProcessor } from '../processing/ActivityProcessor';
import { StreakCalculator } from '../processing/StreakCalculator';
import { StatsSyncManager } from '../sync/StatsSyncManager';
import { StatsAggregator } from '../processing/StatsAggregator';
import { StatsEventBus } from '../events/StatsEventBus';
import { StatsCache } from '../storage/StatsCache';
import { StatsValidator } from '../processing/StatsValidator';
import { ActivityBatchProcessor, type ProcessingMetrics } from '../processing/ActivityBatchProcessor';
import { StatsFactory } from '../utils/StatsFactory';
import { DebugUtils, ErrorUtils, PerformanceUtils, DateUtils } from '../utils/helpers';
import { migrateUserStats, needsMigration, type MigrationResult } from '../utils/StatsMigration';
import type { ArrayEvictionMetrics } from '../utils/ArrayManager';

// External dependencies
import { updateTimeBasedStats } from '@/utils/timeBasedStats';
import { getUserSubscription, hasPaidPlan } from '@/lib/subscriptions/helpers';
import { isSystemEnabled } from '@/config/debug';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { DEFAULT_CONFIG, LOG_PREFIXES } from './constants';

/**
 * Main StatsTracker orchestrator
 * Now focused on coordination rather than implementation
 */
export class StatsTracker {
  private static instance: StatsTracker | null = null;
  
  // Core modules
  private storage: IStatsStorage;
  private processor: IActivityProcessor;
  private streakCalculator: IStreakCalculator;
  private syncManager: IStatsSyncManager;
  private aggregator: IStatsAggregator;
  private eventBus: IStatsEventBus;
  private cache: IStatsCache;
  private validator: IStatsValidator;
  
  // State management
  private userContext: UserContext;
  private stats: UserStatsV2 | null = null;
  private activities: Map<string, DailyActivity> = new Map();
  private updateListeners: Set<StatsUpdateListener> = new Set();
  private listenerRegistry: WeakSet<StatsUpdateListener> = new WeakSet();
  private listenerCount: number = 0;
  private logger: (message: string) => void;
  private performanceMonitor: ReturnType<typeof DebugUtils.createPerformanceMonitor>;
  
  // Batch processing with enhanced error recovery
  private activityBatchProcessor: ActivityBatchProcessor;
  
  // Initialization state
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // ADDED: Activity deduplication system to prevent double counting (Issue #9)
  private recentActivityHashes: Map<string, number> = new Map(); // Hash -> timestamp
  private readonly DEDUPLICATION_WINDOW_MS = 5000; // 5 seconds window to prevent double clicks
  private readonly MAX_RECENT_ACTIVITIES = 1000; // Prevent memory leaks

  private constructor() {
    this.logger = DebugUtils.createLogger(LOG_PREFIXES.STATS);
    this.performanceMonitor = DebugUtils.createPerformanceMonitor();
    
    // Initialize with guest context
    this.userContext = StatsFactory.createUserContext(null);
    
    // Initialize modules
    this.initializeModules();
    
    // Set up enhanced batch processing with error recovery
    this.activityBatchProcessor = new ActivityBatchProcessor(
      this.processPendingActivitiesBatch.bind(this),
      {
        batchSize: DEFAULT_CONFIG.batchSize,
        initialDelay: 1000,
        maxRetries: 5,
        maxBackoffDelay: 30000,
        deadLetterThreshold: 3,
        circuitBreakerThreshold: 10,
        circuitBreakerRecoveryTime: 60000,
        maxQueueSize: 10000
      },
      this.logger
    );
    
    this.logger('StatsTracker orchestrator created');
  }

  static getInstance(): StatsTracker {
    if (!StatsTracker.instance) {
      StatsTracker.instance = new StatsTracker();
    }
    return StatsTracker.instance;
  }

  /**
   * Initialize modules with dependency injection
   */
  private initializeModules(): void {
    this.logger('Initializing stats modules...');
    
    // Create shared event bus and cache
    this.eventBus = new StatsEventBus(this.logger);
    this.cache = new StatsCache({
      memoryMaxSize: DEFAULT_CONFIG.cacheSize,
      defaultTtl: DEFAULT_CONFIG.cacheTtl
    }, this.logger);
    
    // Create processing modules
    this.validator = new StatsValidator(this.logger);
    this.processor = new ActivityProcessor(this.logger, this.handleArrayEvictionMetrics.bind(this));
    this.streakCalculator = new StreakCalculator(this.logger);
    this.aggregator = new StatsAggregator(this.logger, this.handleArrayEvictionMetrics.bind(this));
    
    // Create storage module
    this.storage = new StatsStorage(this.userContext, this.logger);
    
    // Create sync manager
    this.syncManager = new StatsSyncManager(this.storage, this.userContext, this.logger);
    
    // Set up event subscriptions
    this.setupEventSubscriptions();
    
    this.logger('All modules initialized successfully');
  }

  /**
   * Set up event-driven communication between modules
   */
  private setupEventSubscriptions(): void {
    // Subscribe to stats updates to notify listeners
    this.eventBus.subscribe('stats_updated', (stats: UserStatsV2) => {
      this.notifyListeners(stats);
    });
    
    // Subscribe to sync events for monitoring
    this.eventBus.subscribe('sync_completed', (result: SyncResult) => {
      this.logger(`Sync completed: ${result.success ? 'success' : 'failed'}`);
    });
    
    // Subscribe to validation failures
    this.eventBus.subscribe('validation_failed', (error: any) => {
      this.logger(`Validation failed: ${ErrorUtils.getErrorMessage(error)}`);
    });
    
    this.logger('Event subscriptions configured');
  }

  /**
   * Handle array eviction metrics for monitoring and logging (Issue #3)
   */
  private handleArrayEvictionMetrics(metrics: ArrayEvictionMetrics): void {
    const { arrayType, originalSize, newSize, itemsEvicted, timestamp } = metrics;
    
    // Log the eviction event
    this.logger(
      `[Array Limit Hit] ${arrayType.toUpperCase()} array reached limit: ` +
      `${originalSize} -> ${newSize} (evicted ${itemsEvicted} oldest items)`
    );
    
    // Emit event for external monitoring
    this.eventBus.emit('array_limit_hit', {
      type: arrayType,
      userId: this.userContext.user?.uid || 'unknown',
      originalSize,
      newSize,
      itemsEvicted,
      timestamp,
      isPremium: this.userContext.isPremium
    });
    
    // Log performance impact warning for large evictions
    if (itemsEvicted > 100) {
      this.logger(
        `[Performance Warning] Large eviction event: ${itemsEvicted} items removed from ${arrayType} array. ` +
        `Consider reviewing user activity patterns.`
      );
    }
    
    // Track metrics for monitoring dashboard
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'array_limit_hit', {
        custom_parameter_1: arrayType,
        custom_parameter_2: itemsEvicted,
        custom_parameter_3: this.userContext.isPremium ? 'premium' : 'free'
      });
    }
  }

  /**
   * Check and migrate stats if needed for backward compatibility (Issue #3)
   */
  private async checkAndMigrateStats(stats: UserStatsV2): Promise<UserStatsV2> {
    if (!needsMigration(stats)) {
      return stats;
    }

    this.logger(`[Migration] User stats need migration - checking arrays`);
    const migrationResult = migrateUserStats(stats, this.logger);
    
    if (migrationResult.migrationPerformed) {
      this.logger(
        `[Migration] Successfully migrated user stats: ` +
        `Kanji: ${migrationResult.beforeStats.kanji} -> ${migrationResult.afterStats.kanji}, ` +
        `Words: ${migrationResult.beforeStats.words} -> ${migrationResult.afterStats.words}, ` +
        `Pokemon: ${migrationResult.beforeStats.pokemon} -> ${migrationResult.afterStats.pokemon}`
      );
      
      // Emit migration completion event
      this.eventBus.emit('array_migration_completed', {
        userId: stats.userId,
        migrationResult,
        timestamp: Date.now()
      });
      
      // Save the migrated stats
      await this.storage.saveStats(stats);
    }
    
    if (migrationResult.errors.length > 0) {
      this.logger(`[Migration] Migration completed with errors: ${migrationResult.errors.join(', ')}`);
    }
    
    return stats;
  }

  /**
   * Initialize with user and subscription context
   */
  async initialize(user: User | null, subscription?: Subscription | null): Promise<void> {
    // Prevent concurrent initialization
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this.performInitialization(user, subscription);
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(user: User | null, subscription?: Subscription | null): Promise<void> {
    try {
      this.performanceMonitor.start('initialization');
      this.logger(`Starting initialization for user: ${user?.uid?.substr(0, 8) || 'Guest'}`);
      
      // Handle user context changes
      await this.updateUserContext(user, subscription);
      
      // Load stats and activities
      await this.loadUserData();
      
      // Start background services
      this.startBackgroundServices();
      
      // Process any pending activities
      await this.activityBatchProcessor.flush();
      
      // Sync Pokemon count if needed
      if (user && !this.userContext.isGuest) {
        try {
          await this.syncPokemonCount();
        } catch (error) {
          this.logger(`Pokemon sync failed: ${ErrorUtils.getErrorMessage(error)}`);
        }
      }
      
      this.isInitialized = true;
      const duration = this.performanceMonitor.end('initialization');
      this.logger(`Initialization completed successfully in ${duration}ms`);
      
    } catch (error) {
      this.logger(`Initialization failed: ${ErrorUtils.getErrorMessage(error)}`);
      
      // Fallback to basic functionality
      await this.initializeFallbackMode();
      
      this.isInitialized = true;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Update user context and reinitialize modules
   */
  private async updateUserContext(user: User | null, subscription?: Subscription | null): Promise<void> {
    // Get subscription if not provided
    let resolvedSubscription = subscription;
    if (subscription === undefined && user) {
      try {
        resolvedSubscription = await getUserSubscription(user);
      } catch (error) {
        this.logger(`Failed to get subscription: ${ErrorUtils.getErrorMessage(error)}`);
        resolvedSubscription = null;
      }
    }
    
    // Create new context
    const newContext = StatsFactory.createUserContext(user, resolvedSubscription);
    
    // Check if context changed significantly
    const contextChanged = 
      this.userContext.user?.uid !== newContext.user?.uid ||
      this.userContext.isPremium !== newContext.isPremium;
    
    if (contextChanged) {
      this.logger('User context changed, reinitializing modules');
      
      // Clear existing data if user changed
      if (this.userContext.user?.uid !== newContext.user?.uid) {
        this.stats = null;
        this.activities.clear();
        // Clear activity queue in batch processor
        this.activityBatchProcessor.clearDeadLetterQueue();
        this.cache.clear();
      }
      
      // Update context
      this.userContext = newContext;
      
      // Update storage strategy
      this.storage.updateUserContext(newContext);
      
      // Update sync manager
      this.syncManager.updateUserContext(newContext);
    }
  }

  /**
   * Load user stats and recent activities
   */
  private async loadUserData(): Promise<void> {
    this.performanceMonitor.start('loadUserData');
    
    try {
      // Load stats
      this.stats = await this.storage.getStats();
      
      if (!this.stats) {
        this.logger('No existing stats found, creating initial stats');
        this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
        await this.storage.saveStats(this.stats);
      } else {
        // Check and migrate stats if arrays are oversized (Issue #3 fix)
        this.stats = await this.checkAndMigrateStats(this.stats);
      }
      
      // Load recent activities
      await this.loadRecentActivities();
      
      // Validate and fix streaks
      if (this.stats) {
        const activityDates = new Set(
          Array.from(this.activities.keys()).filter(date => 
            this.activities.get(date)?.summary.totalActivities! > 0
          )
        );
        
        const streakFixed = this.streakCalculator.validateStreak(this.stats, activityDates);
        if (streakFixed) {
          await this.storage.saveStats(this.stats);
        }
      }
      
      const duration = this.performanceMonitor.end('loadUserData');
      this.logger(`User data loaded successfully in ${duration}ms`);
      
    } catch (error) {
      this.performanceMonitor.end('loadUserData');
      throw new StatsError(`Failed to load user data: ${ErrorUtils.getErrorMessage(error)}`, 'LOAD_ERROR');
    }
  }

  /**
   * Load recent activities with caching
   */
  private async loadRecentActivities(): Promise<void> {
    const thirtyDaysAgo = DateUtils.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = DateUtils.getDateString(Date.now());
    
    const cacheKey = `activities_${thirtyDaysAgo}_${today}`;
    
    try {
      // Try cache first
      const cached = this.cache.get<DailyActivity[]>(cacheKey);
      if (cached) {
        this.logger('Loaded recent activities from cache');
        for (const activity of cached) {
          this.activities.set(activity.date, activity);
        }
        return;
      }
      
      // Load from storage
      const activities = await this.storage.getActivitiesRange(thirtyDaysAgo, today);
      
      for (const activity of activities) {
        this.activities.set(activity.date, activity);
      }
      
      // Cache the results
      this.cache.set(cacheKey, activities, 300000); // 5 minutes TTL
      
      this.logger(`Loaded ${activities.length} recent activities from storage`);
      
    } catch (error) {
      this.logger(`Failed to load recent activities: ${ErrorUtils.getErrorMessage(error)}`);
      // Continue without recent activities - not critical
    }
  }

  /**
   * Start background services
   */
  private startBackgroundServices(): void {
    if (this.userContext.isPremium) {
      this.syncManager.startPeriodicSync();
      this.logger('Started background sync for premium user');
    }
  }

  /**
   * Initialize fallback mode for error recovery
   */
  private async initializeFallbackMode(): Promise<void> {
    this.logger('Initializing fallback mode');
    
    if (!this.stats) {
      this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
    }
    
    // Clear any problematic state
    this.activities.clear();
    // Clear activity queue in batch processor
    this.activityBatchProcessor.clearDeadLetterQueue();
    this.cache.clear();
    
    // Reset listener count to match actual set size (in case of discrepancy)
    this.listenerCount = this.updateListeners.size;
    
    this.logger('Fallback mode initialized');
  }

  /**
   * Track activity with improved error handling, batching, and deduplication
   * FIXED: Added deduplication to prevent double counting from double-clicks (Issue #9)
   */
  async trackActivity(type: ActivityType, details: Partial<ActivityEvent['details']> = {}): Promise<void> {
    if (!isSystemEnabled('stats')) {
      return;
    }
    
    try {
      const event = StatsFactory.createActivityEvent(type, details, this.userContext.user?.uid);
      
      // Validate the event
      const validation = this.validator.validateActivity(event);
      if (!validation.isValid) {
        this.eventBus.emit('validation_failed', new Error(validation.errors.join(', ')));
        return;
      }
      
      // ADDED: Check for duplicate activity (Issue #9)
      const activityHash = this.generateActivityHash(event);
      const now = Date.now();
      const recentTimestamp = this.recentActivityHashes.get(activityHash);
      
      if (recentTimestamp && (now - recentTimestamp) < this.DEDUPLICATION_WINDOW_MS) {
        this.logger(`Duplicate activity detected within ${this.DEDUPLICATION_WINDOW_MS}ms window - skipping: ${type}`);
        return;
      }
      
      // Record this activity to prevent future duplicates
      this.recentActivityHashes.set(activityHash, now);
      
      // Clean up old entries to prevent memory leaks
      this.cleanupOldActivityHashes(now);
      
      this.logger(`Tracking activity: ${type}`);
      
      // Add to batch for processing with improved error recovery
      await this.activityBatchProcessor.add(event);
      
      // Update time-based stats for premium users
      if (this.userContext.isPremium && this.userContext.user) {
        try {
          await updateTimeBasedStats(
            this.userContext.user.uid,
            type,
            details.score || 0
          );
        } catch (error) {
          this.logger(`Time-based stats update failed: ${ErrorUtils.getErrorMessage(error)}`);
        }
      }
      
    } catch (error) {
      this.logger(`Activity tracking failed: ${ErrorUtils.getErrorMessage(error)}`);
      // Don't throw - we don't want to break user workflows
    }
  }

  /**
   * Process pending activities in batch
   */
  private async processPendingActivitiesBatch(activities: ActivityEvent[]): Promise<void> {
    if (activities.length === 0) return;
    
    this.performanceMonitor.start('processBatch');
    this.logger(`Processing batch of ${activities.length} activities`);
    
    try {
      if (!this.stats) {
        this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
      }
      
      let hasChanges = false;
      
      for (const activity of activities) {
        try {
          await this.processActivity(activity);
          hasChanges = true;
        } catch (error) {
          this.logger(`Failed to process activity ${activity.id}: ${ErrorUtils.getErrorMessage(error)}`);
        }
      }
      
      if (hasChanges) {
        // Update timestamp
        this.stats.lastUpdated = Date.now();
        
        // Save stats
        await this.storage.saveStats(this.stats);
        
        // Emit update event
        this.eventBus.emit('stats_updated', StatsFactory.cloneStats(this.stats));
        
        // Trigger sync for premium users
        if (this.userContext.isPremium) {
          this.syncManager.sync().catch(error => {
            this.logger(`Background sync failed: ${ErrorUtils.getErrorMessage(error)}`);
          });
        }
      }
      
      const duration = this.performanceMonitor.end('processBatch');
      this.logger(`Batch processing completed in ${duration}ms`);
      
    } catch (error) {
      this.performanceMonitor.end('processBatch');
      throw new StatsError(`Batch processing failed: ${ErrorUtils.getErrorMessage(error)}`, 'BATCH_ERROR');
    }
  }

  /**
   * Process single activity
   */
  private async processActivity(event: ActivityEvent): Promise<void> {
    if (!this.stats) return;
    
    const date = DateUtils.getDateString(event.timestamp);
    
    // Get or create daily activity
    let daily = this.activities.get(date);
    if (!daily) {
      daily = StatsFactory.createDailyActivity(date);
      this.activities.set(date, daily);
    }
    
    // Process the activity
    await this.processor.processActivity(event, this.stats, daily);
    
    // Update streak
    this.streakCalculator.updateStreak(this.stats, date);
    
    // Save daily activity
    await this.storage.saveDailyActivity(date, daily);
    
    // Emit activity processed event
    this.eventBus.emit('activity_processed', {
      activity: event,
      stats: this.stats,
      daily: daily
    });
  }

  /**
   * Get current stats (public API)
   */
  getStats(): UserStatsV2 {
    if (!this.stats) {
      this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
    }
    return StatsFactory.cloneStats(this.stats);
  }

  /**
   * Subscribe to stats updates with duplicate prevention and proper cleanup
   */
  subscribe(listener: StatsUpdateListener): () => void {
    // Check if this listener is already registered
    if (this.listenerRegistry.has(listener)) {
      this.logger('Duplicate listener subscription attempt prevented');
      
      // Return existing unsubscribe function
      return () => {
        this.unsubscribeListener(listener);
      };
    }
    
    // Register new listener
    this.updateListeners.add(listener);
    this.listenerRegistry.add(listener);
    this.listenerCount++;
    
    this.logger(`Listener subscribed. Total listeners: ${this.listenerCount}`);
    
    // Send current stats immediately if available
    if (this.stats) {
      try {
        listener(this.getStats());
      } catch (error) {
        this.logger(`Error in immediate listener callback: ${ErrorUtils.getErrorMessage(error)}`);
        // Remove problematic listener
        this.unsubscribeListener(listener);
        
        // Return no-op unsubscribe function since listener was removed
        return () => {};
      }
    }
    
    // Return unsubscribe function
    return () => {
      this.unsubscribeListener(listener);
    };
  }
  
  /**
   * Internal method to properly unsubscribe a listener
   */
  private unsubscribeListener(listener: StatsUpdateListener): void {
    const wasPresent = this.updateListeners.delete(listener);
    
    if (wasPresent) {
      this.listenerCount--;
      this.logger(`Listener unsubscribed. Total listeners: ${this.listenerCount}`);
    }
    
    // Note: WeakSet doesn't have delete method, but listeners will be
    // garbage collected automatically when no other references exist
  }

  /**
   * Force sync to cloud
   */
  async forceSync(): Promise<SyncResult> {
    return this.syncManager.forceSync();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncManager.getSyncStatus();
  }

  /**
   * Force reload from cloud using optimistic sync pattern
   * Only clears local data AFTER successful cloud fetch to prevent data loss
   */
  async forceReloadFromCloud(): Promise<void> {
    if (!this.userContext.isPremium || !this.userContext.user) {
      throw new StatsError('Cloud reload not available for current user', 'NOT_ELIGIBLE');
    }
    
    this.logger('Force reloading from cloud using optimistic sync');
    
    // Step 1: Create backup of current local data
    const localStatsBackup = this.stats ? StatsFactory.cloneStats(this.stats) : null;
    const localActivitiesBackup = new Map(this.activities);
    
    try {
      this.logger('Creating backup of local data before cloud fetch');
      
      // Step 2: Attempt to load fresh data from cloud
      // This calls storage.getStats() which tries cloud first, then falls back to local
      const freshStats = await this.storage.getStats();
      
      if (!freshStats) {
        // No data available anywhere - create initial stats
        this.logger('No cloud data available, creating initial stats');
        this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
        await this.storage.saveStats(this.stats);
      } else {
        // Successfully loaded from cloud (or fallback)
        this.stats = freshStats;
        this.logger('Successfully loaded fresh stats');
      }
      
      // Step 3: Load fresh activities
      await this.loadRecentActivities();
      
      // Step 4: Only NOW clear cache since we have fresh data
      this.cache.clear();
      this.logger('Cleared cache after successful data fetch');
      
      // Step 5: Validate and fix streaks with new data
      if (this.stats) {
        const activityDates = new Set(
          Array.from(this.activities.keys()).filter(date => 
            this.activities.get(date)?.summary.totalActivities! > 0
          )
        );
        
        const streakFixed = this.streakCalculator.validateStreak(this.stats, activityDates);
        if (streakFixed) {
          await this.storage.saveStats(this.stats);
          this.logger('Fixed streaks after cloud reload');
        }
      }
      
      // Step 6: Notify listeners of successful update
      if (this.stats) {
        this.eventBus.emit('stats_updated', this.getStats());
      }
      
      this.logger('Force reload completed successfully with optimistic sync');
      
    } catch (error) {
      // Error occurred - restore from backup to prevent data loss
      this.logger(`Cloud fetch failed: ${ErrorUtils.getErrorMessage(error)}, restoring from backup`);
      
      if (localStatsBackup) {
        this.stats = localStatsBackup;
        this.logger('Restored stats from backup');
      }
      
      if (localActivitiesBackup.size > 0) {
        this.activities.clear();
        for (const [date, activity] of localActivitiesBackup) {
          this.activities.set(date, activity);
        }
        this.logger(`Restored ${localActivitiesBackup.size} activities from backup`);
      }
      
      // Re-throw with additional context
      throw new StatsError(
        `Force reload failed but local data preserved: ${ErrorUtils.getErrorMessage(error)}`, 
        'RELOAD_ERROR_RECOVERED'
      );
    }
  }

  /**
   * Get activities data for dashboard
   */
  async getActivitiesData(): Promise<{
    today: DailyActivity | null;
    week: DailyActivity[];
    month: DailyActivity[];
  }> {
    const today = DateUtils.getDateString(Date.now());
    const weekAgo = DateUtils.getDateString(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = DateUtils.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // Ensure we have recent data
      await this.loadRecentActivities();
      
      const todayActivity = this.activities.get(today) || null;
      
      const weekActivities: DailyActivity[] = [];
      const monthActivities: DailyActivity[] = [];
      
      const weekDates = DateUtils.getDateRange(weekAgo, today);
      const monthDates = DateUtils.getDateRange(monthAgo, today);
      
      for (const date of weekDates) {
        const activity = this.activities.get(date);
        if (activity) weekActivities.push(activity);
      }
      
      for (const date of monthDates) {
        const activity = this.activities.get(date);
        if (activity) monthActivities.push(activity);
      }
      
      return {
        today: todayActivity,
        week: weekActivities,
        month: monthActivities
      };
    } catch (error) {
      this.logger(`Failed to get activities data: ${ErrorUtils.getErrorMessage(error)}`);
      return { today: null, week: [], month: [] };
    }
  }

  /**
   * Get recent activities for debugging
   */
  async getRecentActivities(limit: number = 100): Promise<ActivityEvent[]> {
    const allActivities: ActivityEvent[] = [];
    
    const activities = Array.from(this.activities.values())
      .sort((a, b) => b.date.localeCompare(a.date));
    
    for (const daily of activities) {
      allActivities.push(...daily.activities);
      if (allActivities.length >= limit) break;
    }
    
    return allActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Recalculate streak manually
   */
  async recalculateStreak(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      if (!this.stats) {
        throw new Error('Stats not initialized');
      }
      
      const before = {
        currentStreak: this.stats.currentStreak,
        longestStreak: this.stats.longestStreak,
        totalDaysActive: this.stats.totalDaysActive
      };
      
      const activityDates = new Set(
        Array.from(this.activities.keys()).filter(date => 
          this.activities.get(date)?.summary.totalActivities! > 0
        )
      );
      
      this.streakCalculator.validateStreak(this.stats, activityDates);
      
      const after = {
        currentStreak: this.stats.currentStreak,
        longestStreak: this.stats.longestStreak,
        totalDaysActive: this.stats.totalDaysActive
      };
      
      // Save updated stats
      await this.storage.saveStats(this.stats);
      
      if (this.userContext.isPremium) {
        await this.syncManager.sync();
      }
      
      this.eventBus.emit('stats_updated', this.getStats());
      
      return {
        success: true,
        message: 'Streak recalculated successfully',
        stats: { before, after }
      };
    } catch (error) {
      return {
        success: false,
        message: ErrorUtils.getErrorMessage(error),
        stats: null
      };
    }
  }

  /**
   * Reset all stats (for debugging)
   */
  async resetStats(): Promise<void> {
    this.logger('Resetting all stats');
    
    this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
    this.activities.clear();
    // Clear activity queue in batch processor
    this.activityBatchProcessor.clearDeadLetterQueue();
    this.cache.clear();
    
    await this.storage.saveStats(this.stats);
    
    if (this.userContext.isPremium) {
      await this.syncManager.sync();
    }
    
    this.eventBus.emit('stats_updated', this.getStats());
    this.logger('Stats reset completed');
  }

  /**
   * Sync Pokemon count from user data
   */
  private async syncPokemonCount(): Promise<void> {
    if (!this.userContext.user || !this.stats) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', this.userContext.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const pokedex = userData?.pokedex;
        
        if (pokedex && pokedex.caught && Array.isArray(pokedex.caught)) {
          const actualCount = pokedex.caught.length;
          
          if (actualCount !== this.stats.pokemonCaught) {
            this.logger(`Updating Pokemon count: ${this.stats.pokemonCaught} → ${actualCount}`);
            this.stats.pokemonCaught = actualCount;
            this.stats.caughtPokemonSet = [...pokedex.caught];
            this.stats.lastUpdated = Date.now();
            
            await this.storage.saveStats(this.stats);
            this.eventBus.emit('stats_updated', this.getStats());
          }
        }
      }
    } catch (error) {
      this.logger(`Pokemon sync failed: ${ErrorUtils.getErrorMessage(error)}`);
    }
  }

  /**
   * Refresh Pokemon count (public method)
   */
  async refreshPokemonCount(): Promise<void> {
    await this.syncPokemonCount();
  }

  /**
   * Get listener count for monitoring and debugging
   */
  getListenerCount(): number {
    return this.listenerCount;
  }

  /**
   * Force cleanup of all listeners (for debugging/recovery)
   */
  clearAllListeners(): void {
    this.logger(`Force clearing ${this.listenerCount} listeners`);
    this.updateListeners.clear();
    this.listenerCount = 0;
    this.logger('All listeners cleared');
  }

  /**
   * Get batch processing metrics for monitoring
   */
  getBatchProcessorMetrics(): ProcessingMetrics {
    return this.activityBatchProcessor.getMetrics();
  }

  /**
   * Get dead letter queue activities for debugging
   */
  getDeadLetterQueue() {
    return this.activityBatchProcessor.getDeadLetterQueue();
  }

  /**
   * Retry failed activities from dead letter queue
   */
  async retryDeadLetterActivities() {
    return this.activityBatchProcessor.retryDeadLetterActivities();
  }

  /**
   * Reset circuit breaker for batch processor
   */
  resetBatchProcessorCircuitBreaker(): void {
    this.activityBatchProcessor.resetCircuitBreaker();
    this.logger('Batch processor circuit breaker reset');
  }

  /**
   * Notify update listeners with enhanced error handling and cleanup
   */
  private notifyListeners(stats: UserStatsV2): void {
    if (this.updateListeners.size === 0) {
      return;
    }
    
    const listenersToRemove: StatsUpdateListener[] = [];
    let successfulNotifications = 0;
    let errorCount = 0;
    
    this.updateListeners.forEach(listener => {
      try {
        listener(stats);
        successfulNotifications++;
      } catch (error) {
        errorCount++;
        this.logger(`Listener error: ${ErrorUtils.getErrorMessage(error)}`);
        
        // If a listener consistently fails, it might indicate a memory leak
        // or a component that wasn't properly cleaned up
        listenersToRemove.push(listener);
      }
    });
    
    // Remove problematic listeners to prevent memory leaks
    if (listenersToRemove.length > 0) {
      listenersToRemove.forEach(listener => {
        this.logger(`Removing problematic listener to prevent memory leak`);
        this.unsubscribeListener(listener);
      });
    }
    
    if (this.listenerCount > 0) {
      this.logger(`Notified ${successfulNotifications} listeners, ${errorCount} errors, ${this.listenerCount} total active`);
    }
    
    // Warning for excessive listeners (potential memory leak indicator)
    if (this.listenerCount > 20) {
      this.logger(`WARNING: High listener count (${this.listenerCount}) - potential memory leak`);
    }
  }

  /**
   * Get diagnostic information including listener health
   */
  getDiagnostics(): {
    isInitialized: boolean;
    userContext: UserContext;
    statsLoaded: boolean;
    activitiesCount: number;
    pendingCount: number;
    cacheStats: any;
    syncStatus: SyncStatus;
    listenerHealth: {
      activeListeners: number;
      setSize: number;
      memoryLeakRisk: boolean;
    };
    moduleStatus: any;
  } {
    const setSize = this.updateListeners.size;
    const memoryLeakRisk = this.listenerCount > 20 || setSize !== this.listenerCount;
    
    return {
      isInitialized: this.isInitialized,
      userContext: this.userContext,
      statsLoaded: this.stats !== null,
      activitiesCount: this.activities.size,
      pendingCount: this.activityBatchProcessor.getMetrics().pendingActivities,
      cacheStats: this.cache.getStats(),
      syncStatus: this.syncManager.getSyncStatus(),
      listenerHealth: {
        activeListeners: this.listenerCount,
        setSize: setSize,
        memoryLeakRisk: memoryLeakRisk
      },
      moduleStatus: {
        storage: this.storage.getStorageInfo(),
        aggregator: this.aggregator.getDiagnostics(),
        eventBus: this.eventBus.getDiagnostics(),
        batchProcessor: this.activityBatchProcessor.getMetrics()
      }
    };
  }

  /**
   * Cleanup resources with enhanced listener cleanup
   */
  destroy(): void {
    this.logger(`Destroying StatsTracker with ${this.listenerCount} active listeners`);
    
    // Stop background services
    this.syncManager.stopPeriodicSync();
    
    // Clear activity batch processor
    this.activityBatchProcessor.flush();
    
    // Clear cache
    this.cache.destroy();
    
    // Clear event bus
    this.eventBus.clear();
    
    // Clear listener state
    this.updateListeners.clear();
    // Note: listenerRegistry (WeakSet) will be garbage collected
    // No need to manually clear it since WeakSet doesn't have clear()
    this.listenerCount = 0;
    
    // Clear other state
    this.activities.clear();
    // Destroy activity queue in batch processor
    this.activityBatchProcessor.destroy();
    this.stats = null;
    this.isInitialized = false;
    
    // ADDED: Clear deduplication state (Issue #9)
    this.recentActivityHashes.clear();
    
    this.logger('StatsTracker destroyed - all listeners and deduplication state cleared');
  }

  /**
   * Generate a hash for activity deduplication
   * ADDED: Activity deduplication support (Issue #9)
   */
  private generateActivityHash(event: ActivityEvent): string {
    // Create hash from activity type, user ID, and key details (but not timestamp)
    const hashComponents = [
      event.type,
      event.userId || 'guest',
      event.details.score?.toString() || '0',
      event.details.correct?.toString() || '0',
      event.details.total?.toString() || '0',
      event.details.difficulty || 'normal',
      event.details.category || '',
      event.details.subCategory || '',
      // Round timestamp to nearest 100ms to allow for small timing variations
      Math.floor((event.timestamp || Date.now()) / 100).toString()
    ];
    
    // Simple hash function - could be replaced with crypto hash if needed
    const hashString = hashComponents.join('|');
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `activity_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Clean up old activity hashes to prevent memory leaks
   * ADDED: Memory management for deduplication system (Issue #9)
   */
  private cleanupOldActivityHashes(now: number): void {
    // Clean up entries older than the deduplication window
    const cutoffTime = now - this.DEDUPLICATION_WINDOW_MS;
    let cleanedCount = 0;
    
    for (const [hash, timestamp] of this.recentActivityHashes) {
      if (timestamp < cutoffTime) {
        this.recentActivityHashes.delete(hash);
        cleanedCount++;
      }
    }
    
    // If we still have too many entries, remove the oldest ones
    if (this.recentActivityHashes.size > this.MAX_RECENT_ACTIVITIES) {
      const entries = Array.from(this.recentActivityHashes.entries());
      entries.sort((a, b) => a[1] - b[1]); // Sort by timestamp
      
      const excessCount = this.recentActivityHashes.size - this.MAX_RECENT_ACTIVITIES;
      for (let i = 0; i < excessCount; i++) {
        this.recentActivityHashes.delete(entries[i][0]);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger(`Cleaned up ${cleanedCount} old activity hashes, ${this.recentActivityHashes.size} remaining`);
    }
  }
}

// Export singleton instance
export const statsTracker = StatsTracker.getInstance();