import { UserType } from "@/types/subscription";
import { CachedResource, ResourceType } from "@/types/cache";
import EnhancedStorageManager2 from "@/utils/enhancedStorageManager2";
import {
  EvictionReason,
  EvictionResult,
  EvictionCandidate,
  EvictionOptions,
  StorageStats,
  EvictionAnalytics,
} from "./types";
import {
  getStorageLimit,
  hasUnlimitedStorage,
  EVICTION_GRACE_PERIOD_MS,
  DEFAULT_EVICTION_BATCH_SIZE,
} from "./storageLimits";
import { EvictionPerformanceOptimizer } from "./performanceOptimizer";
import { evictionFeatureFlag } from "./featureFlag";

export class LRUEvictionEngine {
  private static instance: LRUEvictionEngine;
  private activeResourceIds: Set<string> = new Set();
  private evictionInProgress: Map<string, Promise<EvictionResult>> = new Map();
  private batchRemover = EvictionPerformanceOptimizer.createBatchRemover();
  private debouncedChecks = new Map<string, () => Promise<boolean>>();

  private constructor() {}

  static getInstance(): LRUEvictionEngine {
    if (!LRUEvictionEngine.instance) {
      LRUEvictionEngine.instance = new LRUEvictionEngine();
    }
    return LRUEvictionEngine.instance;
  }

  /**
   * Mark a resource as actively being used (protect from eviction)
   */
  markActive(resourceId: string): void {
    this.activeResourceIds.add(resourceId);
  }

  /**
   * Mark a resource as no longer active
   */
  markInactive(resourceId: string): void {
    this.activeResourceIds.delete(resourceId);
  }

  /**
   * Check if eviction is needed before caching a new resource
   */
  async requiresEviction(
    resourceType: ResourceType,
    userType: UserType,
    newResourceSize: number
  ): Promise<boolean> {
    // Check if eviction is enabled via environment variable (simple approach)
    if (process.env.NEXT_PUBLIC_DISABLE_EVICTION === 'true') {
      return false;
    }

    // Premium users with unlimited storage don't need eviction
    if (hasUnlimitedStorage(userType, resourceType)) {
      return false;
    }

    // Use debounced check for performance
    const key = `${resourceType}-${userType}`;
    if (!this.debouncedChecks.has(key)) {
      this.debouncedChecks.set(
        key,
        EvictionPerformanceOptimizer.createDebouncedEvictionCheck(async () => {
          const stats = await this.getStorageStats(resourceType, userType);
          const limits = getStorageLimit(userType, resourceType);
          
          const wouldExceedCount = stats.currentCount >= limits.count;
          const wouldExceedSize = stats.currentSizeBytes + newResourceSize > limits.sizeBytes;
          
          return wouldExceedCount || wouldExceedSize;
        }, 200)
      );
    }

    return this.debouncedChecks.get(key)!();
  }

  /**
   * Get current storage statistics for a resource type
   */
  async getStorageStats(
    resourceType: ResourceType,
    userType: UserType
  ): Promise<StorageStats> {
    // Try to use cached resources first
    let resources = EvictionPerformanceOptimizer.getCachedResourcesByType(resourceType);
    
    if (!resources) {
      resources = await EnhancedStorageManager2.getResourcesByType(resourceType);
      // Cache for next time
      EvictionPerformanceOptimizer.cacheResourcesByType(resourceType, resources);
    }
    
    const limits = getStorageLimit(userType, resourceType);

    const currentCount = resources.length;
    const currentSizeBytes = resources.reduce(
      (total, resource) => total + (resource.metadata?.size || 0),
      0
    );

    const utilizationPercent = Math.max(
      (currentCount / limits.count) * 100,
      (currentSizeBytes / limits.sizeBytes) * 100
    );

    return {
      resourceType,
      currentCount,
      currentSizeBytes,
      limitCount: limits.count,
      limitSizeBytes: limits.sizeBytes,
      utilizationPercent: Math.min(utilizationPercent, 100),
    };
  }

  /**
   * Perform LRU eviction for a resource type
   */
  async enforceLimit(
    resourceType: ResourceType,
    userType: UserType,
    options: EvictionOptions = {}
  ): Promise<EvictionResult> {
    // Check if eviction is already in progress for this resource type
    const key = `${resourceType}-${userType}`;
    const inProgress = this.evictionInProgress.get(key);
    if (inProgress) {
      return inProgress;
    }

    // Start eviction process
    const evictionPromise = this.performEviction(resourceType, userType, options);
    this.evictionInProgress.set(key, evictionPromise);

    try {
      const result = await evictionPromise;
      return result;
    } finally {
      this.evictionInProgress.delete(key);
    }
  }

  /**
   * Core eviction logic
   */
  private async performEviction(
    resourceType: ResourceType,
    userType: UserType,
    options: EvictionOptions = {}
  ): Promise<EvictionResult> {
    const startTime = Date.now();
    const {
      gracePeriodMs = EVICTION_GRACE_PERIOD_MS,
      preserveActive = true,
      batchSize = DEFAULT_EVICTION_BATCH_SIZE,
      dryRun = false,
    } = options;

    try {
      // Get all resources of this type
      const resources = await EnhancedStorageManager2.getResourcesByType(resourceType);
      if (resources.length === 0) {
        return {
          success: true,
          evictedCount: 0,
          freedBytes: 0,
          evictedIds: [],
          reason: "count_limit_exceeded",
        };
      }

      // Get storage limits
      const limits = getStorageLimit(userType, resourceType);
      const stats = await this.getStorageStats(resourceType, userType);

      // Calculate how much we need to evict
      const countOverLimit = Math.max(0, stats.currentCount - limits.count + 1); // +1 for new item
      const bytesOverLimit = Math.max(0, stats.currentSizeBytes - limits.sizeBytes);

      // Determine eviction reason
      let reason: EvictionReason = "count_limit_exceeded";
      if (bytesOverLimit > 0 && countOverLimit === 0) {
        reason = "size_limit_exceeded";
      }

      // Get eviction candidates
      const candidates = await this.getEvictionCandidates(
        resources,
        gracePeriodMs,
        preserveActive
      );

      // Sort by last accessed time (oldest first)
      candidates.sort((a, b) => 
        (a.metadata.lastAccessed || a.metadata.cachedAt) - 
        (b.metadata.lastAccessed || b.metadata.cachedAt)
      );

      // Select resources to evict
      const toEvict: EvictionCandidate[] = [];
      let freedBytes = 0;
      let remainingCount = stats.currentCount;

      for (const candidate of candidates) {
        // Check if we've evicted enough
        if (
          remainingCount <= limits.count &&
          stats.currentSizeBytes - freedBytes <= limits.sizeBytes &&
          toEvict.length >= countOverLimit
        ) {
          break;
        }

        // Don't evict more than batch size in one operation
        if (toEvict.length >= batchSize) {
          break;
        }

        toEvict.push(candidate);
        freedBytes += candidate.metadata.size || 0;
        remainingCount--;
      }

      // If dry run, return what would be evicted
      if (dryRun) {
        return {
          success: true,
          evictedCount: toEvict.length,
          freedBytes,
          evictedIds: toEvict.map(r => r.id),
          reason,
        };
      }

      // Perform actual eviction
      const evictedIds: string[] = [];
      for (const resource of toEvict) {
        try {
          await EnhancedStorageManager2.removeResource(resource.type, resource.id);
          evictedIds.push(resource.id);
        } catch (error) {
          console.error(`Failed to evict resource ${resource.id}:`, error);
        }
      }

      // Track analytics
      const analytics: EvictionAnalytics = {
        timestamp: Date.now(),
        userType,
        resourceType,
        reason,
        evictedCount: evictedIds.length,
        freedBytes,
        duration: Date.now() - startTime,
      };
      await this.trackEviction(analytics);

      return {
        success: evictedIds.length > 0,
        evictedCount: evictedIds.length,
        freedBytes,
        evictedIds,
        reason,
      };
    } catch (error) {
      console.error("Eviction failed:", error);
      return {
        success: false,
        evictedCount: 0,
        freedBytes: 0,
        evictedIds: [],
        reason: "count_limit_exceeded",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get resources eligible for eviction
   */
  private async getEvictionCandidates(
    resources: CachedResource[],
    gracePeriodMs: number,
    preserveActive: boolean
  ): Promise<EvictionCandidate[]> {
    const now = Date.now();
    const candidates: EvictionCandidate[] = [];

    for (const resource of resources) {
      // Skip if actively being used
      if (preserveActive && this.activeResourceIds.has(resource.id)) {
        continue;
      }

      // Skip if accessed within grace period
      const lastAccessed = resource.metadata.lastAccessed || resource.metadata.cachedAt;
      if (now - lastAccessed < gracePeriodMs) {
        continue;
      }

      candidates.push(resource as EvictionCandidate);
    }

    return candidates;
  }

  /**
   * Track eviction analytics
   */
  private async trackEviction(analytics: EvictionAnalytics): Promise<void> {
    try {
      // Store in IndexedDB for later analysis
      await EnhancedStorageManager2.saveData("evictionAnalytics", analytics);

      // Log for immediate visibility
      if (process.env.NODE_ENV === "development") {
        console.log("Cache eviction performed:", {
          resourceType: analytics.resourceType,
          userType: analytics.userType,
          evictedCount: analytics.evictedCount,
          freedBytes: `${(analytics.freedBytes / 1024).toFixed(2)} KB`,
          reason: analytics.reason,
          duration: `${analytics.duration}ms`,
        });
      }
    } catch (error) {
      console.error("Failed to track eviction analytics:", error);
    }
  }

  /**
   * Clear all eviction analytics
   */
  async clearAnalytics(): Promise<void> {
    await EnhancedStorageManager2.removeData("evictionAnalytics");
  }

  /**
   * Get eviction analytics
   */
  async getAnalytics(): Promise<EvictionAnalytics[]> {
    const data = await EnhancedStorageManager2.loadData("evictionAnalytics");
    return Array.isArray(data) ? data : [];
  }
}

// Export singleton instance
export const evictionEngine = LRUEvictionEngine.getInstance();