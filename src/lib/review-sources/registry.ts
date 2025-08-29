/**
 * Review Source Registry - Unified Review Hub
 * 
 * Central registry that manages all review sources, aggregates data,
 * and provides a unified interface for the review system.
 * 
 * Features:
 * - Singleton pattern for global access
 * - Source registration and lifecycle management
 * - Data aggregation from multiple sources
 * - Priority-based source ordering
 * - Event system for source communication
 * - Persistent settings storage
 */

import {
  ReviewSource,
  ReviewItem,
  SourceStats,
  GroupedReviewItems,
  AggregatedStats,
  SourcePriority,
  SourceStatus,
  ReviewSourceEvent,
  SourceEventData,
  SourceEventListener
} from './review-source.interface';
import { ContentType } from '@/lib/unified-review/types';

// ============================================================================
// Registry Configuration
// ============================================================================

/**
 * Configuration for the review source registry
 */
export interface RegistryConfig {
  /** Maximum number of items to fetch from each source */
  maxItemsPerSource: number;

  /** Default priority for new sources */
  defaultPriority: SourcePriority;

  /** Whether to auto-initialize sources on registration */
  autoInitialize: boolean;

  /** Storage key for persisting user preferences */
  storageKey: string;

  /** Enable debug logging */
  debug: boolean;
}

/**
 * User preferences for source prioritization
 */
export interface SourceUserPreferences {
  /** User-defined priority for each source */
  priorities: Record<string, SourcePriority>;

  /** Whether each source is enabled */
  enabled: Record<string, boolean>;

  /** User's preferred study modes per source */
  studyModePreferences: Record<string, string[]>;

  /** Maximum items per source in review sessions */
  itemLimits: Record<string, number>;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Default registry configuration
 */
const DEFAULT_CONFIG: RegistryConfig = {
  maxItemsPerSource: 50,
  defaultPriority: SourcePriority.MEDIUM,
  autoInitialize: true,
  storageKey: 'doshi-review-source-preferences',
  debug: false
};

/**
 * Default user preferences
 */
const DEFAULT_USER_PREFERENCES: SourceUserPreferences = {
  priorities: {},
  enabled: {},
  studyModePreferences: {},
  itemLimits: {},
  updatedAt: new Date()
};

// ============================================================================
// Review Source Registry Class
// ============================================================================

/**
 * Central registry for managing all review sources
 */
export class ReviewSourceRegistry {
  private static instance: ReviewSourceRegistry | null = null;

  /** Registered review sources */
  private sources: Map<string, ReviewSource> = new Map();

  /** Source initialization status */
  private initializationStatus: Map<string, 'pending' | 'initializing' | 'ready' | 'error'> = new Map();

  /** Event listeners */
  private eventListeners: Map<ReviewSourceEvent, SourceEventListener[]> = new Map();

  /** User preferences */
  private userPreferences: SourceUserPreferences = DEFAULT_USER_PREFERENCES;

  /** Registry configuration */
  private config: RegistryConfig = DEFAULT_CONFIG;

  /** Whether the registry has been initialized */
  private initialized = false;

  /** Cached aggregated stats */
  private cachedStats: AggregatedStats | null = null;
  private statsCacheExpiry: number = 0;
  private readonly STATS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config?: Partial<RegistryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadUserPreferences();
  }

  /**
   * Get or create the singleton instance
   */
  public static getInstance(config?: Partial<RegistryConfig>): ReviewSourceRegistry {
    if (!ReviewSourceRegistry.instance) {
      ReviewSourceRegistry.instance = new ReviewSourceRegistry(config);
    }
    return ReviewSourceRegistry.instance;
  }

  /**
   * Reset the singleton instance (useful for testing or re-initialization)
   */
  public static async reset(): Promise<void> {
    if (ReviewSourceRegistry.instance) {
      await ReviewSourceRegistry.instance.destroy();
    }
  }

  /**
   * Initialize the registry
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.log('Initializing review source registry...');

      // Initialize all registered sources if auto-initialize is enabled
      if (this.config.autoInitialize) {
        await this.initializeAllSources();
      }

      this.initialized = true;
      this.log(`Registry initialized with ${this.sources.size} sources`);

    } catch (error) {
      throw new Error(`Failed to initialize review source registry: ${error}`);
    }
  }

  // ============================================================================
  // Source Management
  // ============================================================================

  /**
   * Register a new review source
   */
  public async register(source: ReviewSource, priority?: SourcePriority): Promise<void> {
    this.log(`Registering source: ${source.name} (${source.id})`);

    if (this.sources.has(source.id)) {
      throw new Error(`Source with ID '${source.id}' is already registered`);
    }

    // Add to sources map
    this.sources.set(source.id, source);
    this.initializationStatus.set(source.id, 'pending');

    // Set default preferences for new source
    if (!this.userPreferences.priorities[source.id]) {
      this.userPreferences.priorities[source.id] = priority || this.config.defaultPriority;
    }
    if (!this.userPreferences.enabled.hasOwnProperty(source.id)) {
      this.userPreferences.enabled[source.id] = true;
    }

    // Save updated preferences
    this.saveUserPreferences();

    // Auto-initialize if enabled and registry is already initialized
    if (this.config.autoInitialize && this.initialized) {
      await this.initializeSource(source.id);
    }

    // Emit registration event
    this.emitEvent(ReviewSourceEvent.ITEMS_UPDATED, source.id, { registered: true });

    // Clear cached stats
    this.invalidateStatsCache();
  }

  /**
   * Unregister a review source
   */
  public async unregister(sourceId: string): Promise<void> {
    this.log(`Unregistering source: ${sourceId}`);

    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source with ID '${sourceId}' is not registered`);
    }

    // Call destroy method if available
    if (source.destroy) {
      await source.destroy();
    }

    // Remove from maps
    this.sources.delete(sourceId);
    this.initializationStatus.delete(sourceId);

    // Remove from user preferences
    delete this.userPreferences.priorities[sourceId];
    delete this.userPreferences.enabled[sourceId];
    delete this.userPreferences.studyModePreferences[sourceId];
    delete this.userPreferences.itemLimits[sourceId];

    // Save updated preferences
    this.saveUserPreferences();

    // Clear cached stats
    this.invalidateStatsCache();
  }

  /**
   * Get all registered sources
   */
  public getAllSources(): ReviewSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get enabled sources sorted by priority
   */
  public getPrioritizedSources(): ReviewSource[] {
    return Array.from(this.sources.values())
      .filter(source => this.userPreferences.enabled[source.id] !== false)
      .sort((a, b) => {
        const priorityA = this.userPreferences.priorities[a.id] || SourcePriority.MEDIUM;
        const priorityB = this.userPreferences.priorities[b.id] || SourcePriority.MEDIUM;
        return priorityB - priorityA; // Higher priority first
      });
  }

  /**
   * Get source by ID
   */
  public getSource(sourceId: string): ReviewSource | null {
    return this.sources.get(sourceId) || null;
  }

  /**
   * Check if source is registered
   */
  public hasSource(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  /**
   * Check if registry has any sources registered
   */
  public hasAnySources(): boolean {
    return this.sources.size > 0;
  }

  /**
   * Get count of registered sources
   */
  public getSourceCount(): number {
    return this.sources.size;
  }

  /**
   * Get source initialization status
   */
  public getInitializationStatus(sourceId: string): string {
    return this.initializationStatus.get(sourceId) || 'unregistered';
  }

  // ============================================================================
  // Data Aggregation
  // ============================================================================

  /**
   * Get all due items from all enabled sources
   */
  public async getAllDueItems(options?: {
    limit?: number;
    priorityFilter?: SourcePriority[];
    contentTypeFilter?: ContentType[];
  }): Promise<GroupedReviewItems> {
    this.log('Fetching all due items from sources...');

    const enabledSources = this.getPrioritizedSources();
    const itemsBySource: Record<string, { source: ReviewSource; items: ReviewItem[]; stats: SourceStats }> = {};
    const itemsByContentType: Record<ContentType, ReviewItem[]> = {} as Record<ContentType, ReviewItem[]>;
    const itemsByPriority: Record<SourcePriority, ReviewItem[]> = {} as Record<SourcePriority, ReviewItem[]>;

    let totalItems = 0;
    let dueToday = 0;
    let overdue = 0;

    const byDueDate = {
      overdue: [] as ReviewItem[],
      today: [] as ReviewItem[],
      tomorrow: [] as ReviewItem[],
      thisWeek: [] as ReviewItem[],
      later: [] as ReviewItem[]
    };

    // Process each enabled source
    for (const source of enabledSources) {
      try {
        // Check if source is initialized
        const status = this.initializationStatus.get(source.id);
        if (status !== 'ready') {
          this.log(`Skipping source ${source.id} (status: ${status})`);
          continue;
        }

        // Calculate limit for this source
        const sourceLimit = Math.min(
          options?.limit ? Math.ceil(options.limit / enabledSources.length) : this.config.maxItemsPerSource,
          this.userPreferences.itemLimits[source.id] || this.config.maxItemsPerSource
        );

        // Fetch items from source
        const items = await source.getDueItems({
          limit: sourceLimit,
          contentTypes: options?.contentTypeFilter,
        });

        // Get source stats
        const stats = await source.getStats();

        // Store source data
        itemsBySource[source.id] = { source, items, stats };

        // Categorize items
        for (const item of items) {
          totalItems++;

          // By content type
          if (!itemsByContentType[item.contentType]) {
            itemsByContentType[item.contentType] = [];
          }
          itemsByContentType[item.contentType].push(item);

          // By priority
          const priority = this.userPreferences.priorities[source.id] || SourcePriority.MEDIUM;
          if (!itemsByPriority[priority]) {
            itemsByPriority[priority] = [];
          }
          itemsByPriority[priority].push(item);

          // By due date
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

          if (item.dueDate < today) {
            overdue++;
            byDueDate.overdue.push(item);
          } else if (item.dueDate < tomorrow) {
            dueToday++;
            byDueDate.today.push(item);
          } else if (item.dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
            byDueDate.tomorrow.push(item);
          } else if (item.dueDate < weekFromNow) {
            byDueDate.thisWeek.push(item);
          } else {
            byDueDate.later.push(item);
          }
        }

      } catch (error) {
        this.log(`Error fetching items from source ${source.id}: ${error}`);
        // Continue with other sources
      }
    }

    this.log(`Fetched ${totalItems} items from ${enabledSources.length} sources`);

    return {
      bySource: itemsBySource,
      byContentType: itemsByContentType,
      byPriority: itemsByPriority,
      byDueDate,
      totals: {
        items: totalItems,
        sources: enabledSources.length,
        dueToday,
        overdue
      }
    };
  }

  /**
   * Get aggregated statistics from all sources
   */
  public async getAggregatedStats(): Promise<AggregatedStats> {
    // Return cached stats if still valid
    if (this.cachedStats && Date.now() < this.statsCacheExpiry) {
      return this.cachedStats;
    }

    this.log('Calculating aggregated statistics...');

    const enabledSources = this.getPrioritizedSources();
    const bySource: Record<string, SourceStats> = {};
    const byContentType: Record<ContentType, any> = {} as Record<ContentType, any>;

    let totalItems = 0;
    let totalDueToday = 0;
    let totalOverdue = 0;
    let totalMastery = 0;
    let totalRetention = 0;
    let activeSources = 0;
    let lastActivity: Date | undefined;
    let longestStreak = 0;

    // Content type aggregation
    for (const contentType of Object.values(ContentType)) {
      byContentType[contentType] = {
        total: 0,
        dueToday: 0,
        overdue: 0,
        averageMastery: 0,
        retentionRate: 0
      };
    }

    // Collect stats from each source
    for (const source of enabledSources) {
      try {
        const status = this.initializationStatus.get(source.id);
        if (status !== 'ready') continue;

        const stats = await source.getStats();
        bySource[source.id] = stats;

        // Aggregate totals
        totalItems += stats.totalItems;
        totalDueToday += stats.dueToday;
        totalOverdue += stats.overdue;
        totalMastery += stats.averageMastery * stats.totalItems; // Weighted average
        totalRetention += stats.retentionRate * stats.totalItems; // Weighted average
        activeSources++;

        if (stats.studyStreak > longestStreak) {
          longestStreak = stats.studyStreak;
        }

        if (stats.lastReviewSession) {
          if (!lastActivity || stats.lastReviewSession > lastActivity) {
            lastActivity = stats.lastReviewSession;
          }
        }

        // Aggregate by content type (simplified - real implementation would need more detail)
        for (const [contentType, count] of Object.entries(stats.itemsByType)) {
          if (byContentType[contentType as ContentType]) {
            byContentType[contentType as ContentType].total += count;
            // Note: This is simplified - real implementation would aggregate detailed stats
          }
        }

      } catch (error) {
        this.log(`Error getting stats from source ${source.id}: ${error}`);
      }
    }

    // Calculate weighted averages
    const averageMastery = totalItems > 0 ? totalMastery / totalItems : 0;
    const overallRetention = totalItems > 0 ? totalRetention / totalItems : 0;

    // Generate insights
    const insights = this.generateInsights(bySource);

    // Create aggregated stats
    this.cachedStats = {
      totals: {
        items: totalItems,
        dueToday: totalDueToday,
        overdue: totalOverdue,
        sources: enabledSources.length,
        activeSources
      },
      byContentType,
      bySource,
      performance: {
        averageMastery,
        overallRetention,
        studyStreak: longestStreak,
        lastActivity
      },
      distribution: {
        today: totalDueToday,
        tomorrow: 0, // Would need more detailed calculation
        thisWeek: 0,
        nextWeek: 0,
        later: 0
      },
      insights
    };

    // Set cache expiry
    this.statsCacheExpiry = Date.now() + this.STATS_CACHE_DURATION;

    this.log(`Generated aggregated stats: ${totalItems} total items from ${activeSources} active sources`);

    return this.cachedStats;
  }

  // ============================================================================
  // User Preferences Management
  // ============================================================================

  /**
   * Update user preferences for source prioritization
   */
  public updateSourcePriority(sourceId: string, priority: SourcePriority): void {
    this.userPreferences.priorities[sourceId] = priority;
    this.userPreferences.updatedAt = new Date();
    this.saveUserPreferences();
    this.invalidateStatsCache();

    this.emitEvent(ReviewSourceEvent.CONFIG_CHANGED, sourceId, { priority });
  }

  /**
   * Enable or disable a source
   */
  public setSourceEnabled(sourceId: string, enabled: boolean): void {
    this.userPreferences.enabled[sourceId] = enabled;
    this.userPreferences.updatedAt = new Date();
    this.saveUserPreferences();
    this.invalidateStatsCache();

    this.emitEvent(ReviewSourceEvent.CONFIG_CHANGED, sourceId, { enabled });
  }

  /**
   * Set item limit for a source
   */
  public setSourceItemLimit(sourceId: string, limit: number): void {
    this.userPreferences.itemLimits[sourceId] = Math.max(1, limit);
    this.userPreferences.updatedAt = new Date();
    this.saveUserPreferences();
    this.invalidateStatsCache();

    this.emitEvent(ReviewSourceEvent.CONFIG_CHANGED, sourceId, { itemLimit: limit });
  }

  /**
   * Get user preferences
   */
  public getUserPreferences(): SourceUserPreferences {
    return { ...this.userPreferences };
  }

  /**
   * Bulk update user preferences
   */
  public updateUserPreferences(preferences: Partial<SourceUserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences, updatedAt: new Date() };
    this.saveUserPreferences();
    this.invalidateStatsCache();

    this.emitEvent(ReviewSourceEvent.CONFIG_CHANGED, 'registry', preferences);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Add event listener
   */
  public addEventListener(event: ReviewSourceEvent, listener: SourceEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(event: ReviewSourceEvent, listener: SourceEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ReviewSourceEvent, sourceId: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const eventData: SourceEventData = {
        sourceId,
        event,
        data,
        timestamp: new Date()
      };

      listeners.forEach(listener => {
        try {
          listener(eventData);
        } catch (error) {
          this.log(`Error in event listener: ${error}`);
        }
      });
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Initialize all registered sources
   */
  private async initializeAllSources(): Promise<void> {
    const initPromises = Array.from(this.sources.keys()).map(sourceId =>
      this.initializeSource(sourceId)
    );

    await Promise.allSettled(initPromises);
  }

  /**
   * Initialize a specific source
   */
  private async initializeSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) return;

    this.initializationStatus.set(sourceId, 'initializing');

    try {
      await source.init();
      this.initializationStatus.set(sourceId, 'ready');
      this.log(`Source ${sourceId} initialized successfully`);

      this.emitEvent(ReviewSourceEvent.STATUS_CHANGED, sourceId, { status: 'ready' });

    } catch (error) {
      this.initializationStatus.set(sourceId, 'error');
      this.log(`Failed to initialize source ${sourceId}: ${error}`);

      this.emitEvent(ReviewSourceEvent.ERROR_OCCURRED, sourceId, { error: error.toString() });
    }
  }

  /**
   * Generate insights from aggregated data
   */
  private generateInsights(bySource: Record<string, SourceStats>): AggregatedStats['insights'] {
    let mostActiveSource = '';
    let maxReviews = 0;
    const strugglingAreas: ContentType[] = [];
    const recommendations: string[] = [];

    // Find most active source
    for (const [sourceId, stats] of Object.entries(bySource)) {
      const totalReviews = stats.dueToday + stats.overdue;
      if (totalReviews > maxReviews) {
        maxReviews = totalReviews;
        mostActiveSource = sourceId;
      }

      // Check for struggling areas (low retention rate)
      if (stats.retentionRate < 60) {
        recommendations.push(`Consider reviewing ${sourceId} more frequently - retention rate is ${stats.retentionRate.toFixed(1)}%`);
      }

      // Check for overdue items
      if (stats.overdue > 10) {
        recommendations.push(`You have ${stats.overdue} overdue items in ${sourceId}`);
      }
    }

    // Next review estimate (simplified - would use more sophisticated calculation)
    const nextReviewEstimate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

    return {
      mostActiveSource,
      strugglingAreas,
      recommendations,
      nextReviewEstimate
    };
  }

  /**
   * Load user preferences from localStorage
   */
  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.userPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          ...parsed,
          updatedAt: new Date(parsed.updatedAt || Date.now())
        };
      }
    } catch (error) {
      this.log(`Error loading user preferences: ${error}`);
    }
  }

  /**
   * Save user preferences to localStorage
   */
  private saveUserPreferences(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.userPreferences));
    } catch (error) {
      this.log(`Error saving user preferences: ${error}`);
    }
  }

  /**
   * Invalidate cached statistics
   */
  private invalidateStatsCache(): void {
    this.cachedStats = null;
    this.statsCacheExpiry = 0;
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[ReviewSourceRegistry] ${message}`);
    }
  }

  /**
   * Clean up resources and destroy the singleton
   */
  public async destroy(): Promise<void> {
    this.log('Destroying registry...');

    // Destroy all sources
    const destroyPromises = Array.from(this.sources.values())
      .filter(source => source.destroy)
      .map(source => source.destroy!());

    await Promise.allSettled(destroyPromises);

    // Clear all data
    this.sources.clear();
    this.initializationStatus.clear();
    this.eventListeners.clear();
    this.cachedStats = null;
    this.initialized = false;

    // Destroy singleton
    ReviewSourceRegistry.instance = null;
  }
}