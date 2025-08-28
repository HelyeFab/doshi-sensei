/**
 * Enhanced Stats Tracker with Enterprise-Grade Performance Optimizations
 * Integrates all performance components: BatchProcessor, Enhanced Cache, Memory Manager, etc.
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
  IStatsValidator,
  StatsError
} from './interfaces';

// Import performance optimizations
import { BatchProcessor, BatchPriority } from '../performance/BatchProcessor';
import { EnhancedStatsCache } from '../storage/EnhancedStatsCache';
import { PaginationManager } from '../performance/PaginationManager';
import { MemoryManager, ObjectType } from '../performance/MemoryManager';
import { StatsWorkerManager, TaskPriority } from '../workers/StatsWorkerManager';

// Import existing implementations
import { StatsStorage } from '../storage/StatsStorage';
import { ActivityProcessor } from '../processing/ActivityProcessor';
import { StreakCalculator } from '../processing/StreakCalculator';
import { StatsSyncManager } from '../sync/StatsSyncManager';
import { StatsAggregator } from '../processing/StatsAggregator';
import { StatsEventBus } from '../events/StatsEventBus';
import { StatsValidator } from '../processing/StatsValidator';
import { StatsFactory } from '../utils/StatsFactory';
import { DebugUtils, ErrorUtils, DateUtils } from '../utils/helpers';

// External dependencies
import { updateTimeBasedStats } from '@/utils/timeBasedStats';
import { getUserSubscription } from '@/lib/subscriptions/helpers';
import { isSystemEnabled } from '@/config/debug';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { DEFAULT_CONFIG, LOG_PREFIXES } from './constants';

/**
 * Enhanced StatsTracker with comprehensive performance optimizations
 */
export class EnhancedStatsTracker {
  private static instance: EnhancedStatsTracker | null = null;
  
  // Core modules
  private storage: IStatsStorage;
  private processor: IActivityProcessor;
  private streakCalculator: IStreakCalculator;
  private syncManager: IStatsSyncManager;
  private aggregator: IStatsAggregator;
  private eventBus: IStatsEventBus;
  private validator: IStatsValidator;
  
  // Performance optimization modules
  private cache: EnhancedStatsCache;
  private batchProcessor: BatchProcessor;
  private memoryManager: MemoryManager;
  private workerManager: StatsWorkerManager;
  private paginationManager: PaginationManager<DailyActivity>;
  
  // State management
  private userContext: UserContext;
  private stats: UserStatsV2 | null = null;
  private activities: Map<string, DailyActivity> = new Map();
  private updateListeners: Set<StatsUpdateListener> = new Set();
  private logger: (message: string) => void;
  
  // Performance monitoring
  private performanceMonitor: ReturnType<typeof DebugUtils.createPerformanceMonitor>;
  private performanceMetrics = {
    trackingCalls: 0,
    averageTrackingTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    workerUtilization: 0
  };
  
  // Initialization state
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Performance timers
  private metricsTimer: NodeJS.Timeout | null = null;
  private optimizationTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.logger = DebugUtils.createLogger(LOG_PREFIXES.STATS);
    this.performanceMonitor = DebugUtils.createPerformanceMonitor();
    
    // Initialize with guest context
    this.userContext = StatsFactory.createUserContext(null);
    
    // Initialize performance modules
    this.initializePerformanceModules();
    
    // Initialize core modules
    this.initializeCoreModules();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    this.logger('Enhanced StatsTracker created with performance optimizations');
  }

  static getInstance(): EnhancedStatsTracker {
    if (!EnhancedStatsTracker.instance) {
      EnhancedStatsTracker.instance = new EnhancedStatsTracker();
    }
    return EnhancedStatsTracker.instance;
  }

  /**
   * Initialize performance optimization modules
   */
  private initializePerformanceModules(): void {
    this.logger('Initializing performance modules...');
    
    // Enhanced multi-tier cache
    this.cache = new EnhancedStatsCache({
      memoryMaxSize: 1000,
      indexedDBMaxSize: 5000,
      memoryMaxBytes: 100 * 1024 * 1024, // 100MB
      compressionEnabled: true,
      preloadEnabled: true
    }, this.logger);
    
    // Memory manager
    this.memoryManager = new MemoryManager({
      maxMemoryUsage: 200 * 1024 * 1024, // 200MB
      warningThreshold: 70,
      criticalThreshold: 90,
      cleanupInterval: 30000
    }, this.logger);
    
    // Web worker manager
    this.workerManager = new StatsWorkerManager({
      maxWorkers: Math.min(navigator.hardwareConcurrency || 2, 4),
      workerTimeout: 30000,
      fallbackToMainThread: true
    }, this.logger);
    
    // Create storage interface for pagination
    const createStorageInterface = () => {
      return {
        load: () => this.storage.getStats(),
        save: (stats: UserStatsV2) => this.storage.saveStats(stats),
        clear: () => this.storage.clearAll(),
        getName: () => 'enhanced_storage'
      };
    };
    
    // Batch processor with intelligent batching
    this.batchProcessor = new BatchProcessor(
      createStorageInterface() as any,
      {
        maxBatchSize: 100,
        maxWaitTime: 2000,
        maxRetries: 3,
        concurrencyLimit: 3,
        debounceTime: 50
      },
      this.logger
    );
    
    // Data loader for pagination
    const dataLoader = async (cursor: any, pageSize: number) => {
      const endDate = cursor?.timestamp ? new Date(cursor.timestamp).toISOString().split('T')[0] : DateUtils.getDateString(Date.now());
      const startDate = DateUtils.getDateString(new Date(endDate).getTime() - (pageSize * 24 * 60 * 60 * 1000));
      
      const activities = await this.storage.getActivitiesRange(startDate, endDate);
      
      return {
        data: activities,
        pageInfo: {
          pageNumber: cursor?.pageNumber || 0,
          cursor,
          nextCursor: activities.length === pageSize ? { 
            timestamp: activities[activities.length - 1]?.date, 
            pageNumber: (cursor?.pageNumber || 0) + 1 
          } : null,
          prevCursor: cursor?.pageNumber > 0 ? { 
            timestamp: activities[0]?.date, 
            pageNumber: cursor.pageNumber - 1 
          } : null,
          hasNextPage: activities.length === pageSize,
          hasPrevPage: (cursor?.pageNumber || 0) > 0,
          loadedAt: Date.now(),
          accessCount: 0,
          isLoading: false
        }
      };
    };
    
    // Pagination manager
    this.paginationManager = new PaginationManager(
      dataLoader,
      {
        pageSize: 50,
        maxCachedPages: 20,
        preloadPages: 2,
        virtualScrollThreshold: 100
      },
      this.logger
    );
    
    this.logger('Performance modules initialized');
  }

  /**
   * Initialize core modules with performance integration
   */
  private initializeCoreModules(): void {
    this.logger('Initializing core modules...');
    
    // Create shared event bus
    this.eventBus = new StatsEventBus(this.logger);
    
    // Create processing modules
    this.validator = new StatsValidator(this.logger);
    this.processor = new ActivityProcessor(this.logger);
    this.streakCalculator = new StreakCalculator(this.logger);
    this.aggregator = new StatsAggregator(this.logger);
    
    // Create storage module
    this.storage = new StatsStorage(this.userContext, this.logger);
    
    // Create sync manager
    this.syncManager = new StatsSyncManager(this.storage, this.userContext, this.logger);
    
    // Set up performance-aware event subscriptions
    this.setupEnhancedEventSubscriptions();
    
    this.logger('Core modules initialized with performance integration');
  }

  /**
   * Set up enhanced event subscriptions with performance monitoring
   */
  private setupEnhancedEventSubscriptions(): void {
    // Subscribe to stats updates with caching
    this.eventBus.subscribe('stats_updated', (stats: UserStatsV2) => {
      // Cache the updated stats
      this.cache.set('current_stats', stats, 5 * 60 * 1000); // 5 minute TTL
      
      // Register with memory manager
      this.memoryManager.register(
        `stats_${stats.userId}`,
        stats,
        ObjectType.USER_STATS,
        { priority: 4, isTemp: false }
      );
      
      this.notifyListeners(stats);
    });
    
    // Subscribe to activity events with batch processing
    this.eventBus.subscribe('activity_processed', (data: any) => {
      const { activity, stats, daily } = data;
      
      // Update memory manager
      this.memoryManager.access(`stats_${stats.userId}`);
      
      // Cache daily activity
      this.cache.set(
        `daily_${daily.date}`,
        daily,
        60 * 60 * 1000 // 1 hour TTL
      );
      
      // Register with memory manager
      this.memoryManager.register(
        `daily_${daily.date}`,
        daily,
        ObjectType.DAILY_ACTIVITY,
        { priority: 3, isTemp: false }
      );
    });
    
    // Subscribe to memory pressure events
    this.memoryManager.on('pressure_detected', (event) => {
      this.logger(`Memory pressure detected: ${event.data.level}`);
      
      // Trigger cache cleanup
      this.performMemoryOptimization();
    });
    
    // Subscribe to sync events with metrics
    this.eventBus.subscribe('sync_completed', (result: SyncResult) => {
      this.logger(`Sync completed: ${result.success ? 'success' : 'failed'} (${result.itemsSynced} items)`);
      
      if (result.success) {
        // Clear cache to force reload of fresh data
        this.cache.clear();
      }
    });
    
    this.logger('Enhanced event subscriptions configured');
  }

  /**
   * Initialize with user and subscription context
   */
  async initialize(user: User | null, subscription?: Subscription | null): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this.performEnhancedInitialization(user, subscription);
    return this.initializationPromise;
  }

  /**
   * Perform enhanced initialization with performance optimization
   */
  private async performEnhancedInitialization(user: User | null, subscription?: Subscription | null): Promise<void> {
    try {
      this.performanceMonitor.start('enhanced_initialization');
      this.logger(`Starting enhanced initialization for user: ${user?.uid?.substr(0, 8) || 'Guest'}`);
      
      // Update user context
      await this.updateUserContext(user, subscription);
      
      // Load user data with caching and workers
      await this.loadUserDataEnhanced();
      
      // Start background services
      this.startEnhancedBackgroundServices();
      
      // Process any pending activities
      await this.batchProcessor.forceFlush();
      
      // Warm up cache with frequently accessed data
      await this.warmupCache();
      
      // Sync Pokemon count if needed (using worker)
      if (user && !this.userContext.isGuest) {
        this.syncPokemonCountAsync();
      }
      
      this.isInitialized = true;
      const duration = this.performanceMonitor.end('enhanced_initialization');
      this.logger(`Enhanced initialization completed in ${duration}ms`);
      
    } catch (error) {
      this.logger(`Enhanced initialization failed: ${ErrorUtils.getErrorMessage(error)}`);
      
      // Fallback to basic functionality
      await this.initializeFallbackMode();
      this.isInitialized = true;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Load user data with performance optimizations
   */
  private async loadUserDataEnhanced(): Promise<void> {
    this.performanceMonitor.start('loadUserDataEnhanced');
    
    try {
      // Try to load stats from cache first
      let cachedStats = await this.cache.get<UserStatsV2>('current_stats');
      
      if (cachedStats) {
        this.stats = cachedStats;
        this.logger('Loaded stats from cache');
      } else {
        // Load from storage
        this.stats = await this.storage.getStats();
        
        if (!this.stats) {
          this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
          await this.storage.saveStats(this.stats);
        }
        
        // Cache the loaded stats
        this.cache.set('current_stats', this.stats, 5 * 60 * 1000);
      }
      
      // Register stats with memory manager
      if (this.stats) {
        this.memoryManager.register(
          `stats_${this.stats.userId}`,
          this.stats,
          ObjectType.USER_STATS,
          { priority: 4, isTemp: false }
        );
      }
      
      // Load recent activities using pagination
      await this.loadRecentActivitiesEnhanced();
      
      // Validate streaks using worker
      if (this.stats) {
        this.validateStreaksAsync();
      }
      
      const duration = this.performanceMonitor.end('loadUserDataEnhanced');
      this.logger(`Enhanced user data loaded in ${duration}ms`);
      
    } catch (error) {
      this.performanceMonitor.end('loadUserDataEnhanced');
      throw new StatsError(`Failed to load enhanced user data: ${ErrorUtils.getErrorMessage(error)}`, 'LOAD_ERROR');
    }
  }

  /**
   * Load recent activities using pagination and caching
   */
  private async loadRecentActivitiesEnhanced(): Promise<void> {
    try {
      // Load first page of recent activities
      const firstPage = await this.paginationManager.loadPage(null);
      
      for (const activity of firstPage.data) {
        this.activities.set(activity.date, activity);
        
        // Cache individual daily activities
        this.cache.set(
          `daily_${activity.date}`,
          activity,
          60 * 60 * 1000 // 1 hour TTL
        );
        
        // Register with memory manager
        this.memoryManager.register(
          `daily_${activity.date}`,
          activity,
          ObjectType.DAILY_ACTIVITY,
          { priority: 3, isTemp: false }
        );
      }
      
      // Preload next page in background
      if (firstPage.pageInfo.hasNextPage) {
        this.paginationManager.loadPage(firstPage.pageInfo.nextCursor).catch(error => {
          this.logger(`Background preload failed: ${ErrorUtils.getErrorMessage(error)}`);
        });
      }
      
      this.logger(`Loaded ${firstPage.data.length} recent activities with pagination`);
      
    } catch (error) {
      this.logger(`Failed to load recent activities: ${ErrorUtils.getErrorMessage(error)}`);
    }
  }

  /**
   * Validate streaks asynchronously using worker
   */
  private async validateStreaksAsync(): Promise<void> {
    if (!this.stats) return;
    
    try {
      const activityDates = Array.from(this.activities.keys()).filter(date => 
        this.activities.get(date)?.summary.totalActivities! > 0
      );
      
      const result = await this.workerManager.calculateStreaks(activityDates);
      
      let updated = false;
      if (this.stats.currentStreak !== result.currentStreak) {
        this.stats.currentStreak = result.currentStreak;
        updated = true;
      }
      
      if (this.stats.longestStreak !== result.longestStreak) {
        this.stats.longestStreak = result.longestStreak;
        updated = true;
      }
      
      if (updated) {
        await this.storage.saveStats(this.stats);
        this.eventBus.emit('stats_updated', StatsFactory.cloneStats(this.stats));
      }
      
    } catch (error) {
      this.logger(`Async streak validation failed: ${ErrorUtils.getErrorMessage(error)}`);
    }
  }

  /**
   * Start enhanced background services
   */
  private startEnhancedBackgroundServices(): void {
    if (this.userContext.isPremium) {
      this.syncManager.startPeriodicSync();
      this.logger('Started enhanced background sync for premium user');
    }
    
    // Start performance optimization
    this.optimizationTimer = setInterval(() => {
      this.performPeriodicOptimization();
    }, 60000); // Every minute
  }

  /**
   * Warmup cache with frequently accessed data
   */
  private async warmupCache(): Promise<void> {
    if (!this.stats) return;
    
    try {
      const warmupKeys = [
        `stats_${this.stats.userId}`,
        `daily_${DateUtils.getDateString(Date.now())}`,
        `daily_${DateUtils.getDateString(Date.now() - 24 * 60 * 60 * 1000)}`,
        `daily_${DateUtils.getDateString(Date.now() - 2 * 24 * 60 * 60 * 1000)}`
      ];
      
      await this.cache.warmup(warmupKeys, async (key) => {
        if (key.startsWith('daily_')) {
          const date = key.replace('daily_', '');
          return await this.storage.getDailyActivity(date);
        }
        return null;
      });
      
      this.logger('Cache warmup completed');
    } catch (error) {
      this.logger(`Cache warmup failed: ${ErrorUtils.getErrorMessage(error)}`);
    }
  }

  /**
   * Track activity with comprehensive performance optimizations
   */
  async trackActivity(type: ActivityType, details: Partial<ActivityEvent['details']> = {}): Promise<void> {
    if (!isSystemEnabled('stats')) {
      return;
    }
    
    const startTime = performance.now();
    this.performanceMetrics.trackingCalls++;
    
    try {
      const event = StatsFactory.createActivityEvent(type, details, this.userContext.user?.uid);
      
      // Validate using worker for complex validation
      let validation;
      try {
        validation = await this.workerManager.validateData(this.stats || {}, []);
      } catch {
        validation = this.validator.validateActivity(event);
      }
      
      if (!validation.isValid) {
        this.eventBus.emit('validation_failed', new Error(validation.errors.join(', ')));
        return;
      }
      
      this.logger(`Tracking activity: ${type}`);
      
      // Add to intelligent batch processor with priority
      const priority = this.determineBatchPriority(type, details);
      await this.batchProcessor.addOperation('write', event, priority);
      
      // Register with memory manager
      this.memoryManager.register(
        `activity_${event.id}`,
        event,
        ObjectType.TEMPORARY,
        { 
          priority: 2, 
          isTemp: true,
          cleanupCallback: () => {
            this.logger(`Cleaned up temporary activity: ${event.id}`);
          }
        }
      );
      
      // Update time-based stats asynchronously for premium users
      if (this.userContext.isPremium && this.userContext.user) {
        this.updateTimeBasedStatsAsync(type, details.score || 0);
      }
      
    } catch (error) {
      this.logger(`Enhanced activity tracking failed: ${ErrorUtils.getErrorMessage(error)}`);
    } finally {
      const duration = performance.now() - startTime;
      this.performanceMetrics.averageTrackingTime = 
        (this.performanceMetrics.averageTrackingTime + duration) / 2;
    }
  }

  /**
   * Determine batch priority based on activity type
   */
  private determineBatchPriority(type: ActivityType, details: any): BatchPriority {
    // High priority for scoring activities
    if (details.score && details.score > 80) {
      return BatchPriority.HIGH;
    }
    
    // Critical priority for streak-maintaining activities
    if (type === 'drill' || type === 'practice') {
      return BatchPriority.HIGH;
    }
    
    // Normal priority for most activities
    return BatchPriority.NORMAL;
  }

  /**
   * Update time-based stats asynchronously
   */
  private async updateTimeBasedStatsAsync(type: ActivityType, score: number): Promise<void> {
    try {
      await updateTimeBasedStats(this.userContext.user!.uid, type, score);
    } catch (error) {
      this.logger(`Async time-based stats update failed: ${ErrorUtils.getErrorMessage(error)}`);
    }
  }

  /**
   * Sync Pokemon count asynchronously
   */
  private async syncPokemonCountAsync(): Promise<void> {
    try {
      await this.syncPokemonCount();
    } catch (error) {
      this.logger(`Async Pokemon sync failed: ${ErrorUtils.getErrorMessage(error)}`);
    }
  }

  /**
   * Perform periodic performance optimization
   */
  private performPeriodicOptimization(): Promise<void> {
    return Promise.all([
      this.performMemoryOptimization(),
      this.optimizeCache(),
      this.optimizePagination()
    ]).then(() => {
      this.logger('Periodic optimization completed');
    }).catch(error => {
      this.logger(`Periodic optimization failed: ${ErrorUtils.getErrorMessage(error)}`);
    });
  }

  /**
   * Perform memory optimization
   */
  private async performMemoryOptimization(): Promise<void> {
    const stats = this.memoryManager.getStats();
    
    if (stats.usagePercentage > 70) {
      const freed = await this.memoryManager.cleanup();
      this.logger(`Memory optimization freed ${freed} bytes`);
    }
  }

  /**
   * Optimize cache performance
   */
  private async optimizeCache(): Promise<void> {
    const stats = this.cache.getStats();
    
    if (stats.hitRate < 70) {
      // Preload frequently accessed data
      await this.warmupCache();
    }
  }

  /**
   * Optimize pagination
   */
  private async optimizePagination(): Promise<void> {
    const status = this.paginationManager.getCacheStatus();
    
    if (status.cachedPages < 5) {
      // Preload additional pages
      const currentPage = await this.paginationManager.loadPage(null);
      if (currentPage.pageInfo.hasNextPage) {
        await this.paginationManager.loadPage(currentPage.pageInfo.nextCursor);
      }
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.metricsTimer = setInterval(() => {
      this.updatePerformanceMetrics();
      this.logPerformanceMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const cacheStats = this.cache.getStats();
    const memoryStats = this.memoryManager.getStats();
    const workerStats = this.workerManager.getMetrics();
    
    this.performanceMetrics.cacheHitRate = cacheStats.hitRate;
    this.performanceMetrics.memoryUsage = memoryStats.usagePercentage;
    this.performanceMetrics.workerUtilization = workerStats.workerUtilization;
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(): void {
    const metrics = this.performanceMetrics;
    
    this.logger(
      `Performance Metrics - ` +
      `Tracking: ${metrics.trackingCalls} calls (avg: ${metrics.averageTrackingTime.toFixed(2)}ms), ` +
      `Cache: ${metrics.cacheHitRate.toFixed(1)}% hit rate, ` +
      `Memory: ${metrics.memoryUsage.toFixed(1)}% usage, ` +
      `Workers: ${metrics.workerUtilization.toFixed(1)}% utilization`
    );
  }

  // Rest of the methods remain the same as the original StatsTracker
  // but with performance optimizations integrated...

  /**
   * Get current stats with caching
   */
  getStats(): UserStatsV2 {
    // Try cache first
    const cached = this.cache.get<UserStatsV2>('current_stats');
    if (cached) {
      this.memoryManager.access(`stats_${cached.userId}`);
      return StatsFactory.cloneStats(cached);
    }
    
    if (!this.stats) {
      this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
    }
    
    return StatsFactory.cloneStats(this.stats);
  }

  /**
   * Get enhanced performance diagnostics
   */
  getDiagnostics(): any {
    return {
      isInitialized: this.isInitialized,
      userContext: this.userContext,
      statsLoaded: this.stats !== null,
      activitiesCount: this.activities.size,
      performance: this.performanceMetrics,
      cache: this.cache.getStats(),
      memory: this.memoryManager.getStats(),
      workers: this.workerManager.getMetrics(),
      pagination: this.paginationManager.getCacheStatus(),
      batch: this.batchProcessor.getMetrics(),
      syncStatus: this.syncManager.getSyncStatus()
    };
  }

  // ... (implement remaining methods with performance optimizations)

  /**
   * Cleanup resources with enhanced cleanup
   */
  async destroy(): Promise<void> {
    this.logger('Destroying Enhanced StatsTracker');
    
    // Clear timers
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.optimizationTimer) clearInterval(this.optimizationTimer);
    
    // Stop background services
    this.syncManager.stopPeriodicSync();
    
    // Cleanup performance modules
    await Promise.all([
      this.batchProcessor.shutdown(),
      this.memoryManager.destroy(),
      this.workerManager.shutdown(),
      this.paginationManager.destroy(),
      this.cache.destroy()
    ]);
    
    // Clear state
    this.updateListeners.clear();
    this.activities.clear();
    this.stats = null;
    this.isInitialized = false;
    
    this.logger('Enhanced StatsTracker destroyed');
  }

  // Implement remaining methods from original StatsTracker...
  async forceSync(): Promise<SyncResult> {
    return this.syncManager.forceSync();
  }

  getSyncStatus(): SyncStatus {
    return this.syncManager.getSyncStatus();
  }

  subscribe(listener: StatsUpdateListener): () => void {
    this.updateListeners.add(listener);
    
    if (this.stats) {
      listener(this.getStats());
    }
    
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  private async updateUserContext(user: User | null, subscription?: Subscription | null): Promise<void> {
    let resolvedSubscription = subscription;
    if (subscription === undefined && user) {
      try {
        resolvedSubscription = await getUserSubscription(user);
      } catch (error) {
        this.logger(`Failed to get subscription: ${ErrorUtils.getErrorMessage(error)}`);
        resolvedSubscription = null;
      }
    }
    
    const newContext = StatsFactory.createUserContext(user, resolvedSubscription);
    const contextChanged = 
      this.userContext.user?.uid !== newContext.user?.uid ||
      this.userContext.isPremium !== newContext.isPremium;
    
    if (contextChanged) {
      this.logger('User context changed, reinitializing modules');
      
      if (this.userContext.user?.uid !== newContext.user?.uid) {
        this.stats = null;
        this.activities.clear();
        this.cache.clear();
        this.memoryManager.register('context_change', {}, ObjectType.TEMPORARY, { isTemp: true });
      }
      
      this.userContext = newContext;
      this.storage.updateUserContext(newContext);
      this.syncManager.updateUserContext(newContext);
    }
  }

  private async initializeFallbackMode(): Promise<void> {
    this.logger('Initializing enhanced fallback mode');
    
    if (!this.stats) {
      this.stats = StatsFactory.createInitialStats(this.userContext.user?.uid);
    }
    
    this.activities.clear();
    this.cache.clear();
    
    this.logger('Enhanced fallback mode initialized');
  }

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
      this.logger(`Enhanced Pokemon sync failed: ${ErrorUtils.getErrorMessage(error)}`);
    }
  }

  private notifyListeners(stats: UserStatsV2): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        this.logger(`Listener error: ${ErrorUtils.getErrorMessage(error)}`);
      }
    });
  }

  // Add remaining methods as needed...
}

// Export enhanced singleton instance
export const enhancedStatsTracker = EnhancedStatsTracker.getInstance();