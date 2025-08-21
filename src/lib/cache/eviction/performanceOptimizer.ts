import { CachedResource } from '@/types/cache';
import { EvictionCandidate } from './types';

/**
 * Performance optimizations for the eviction system
 */
export class EvictionPerformanceOptimizer {
  private static resourceCache = new Map<string, CachedResource[]>();
  private static cacheVersion = 0;

  /**
   * Cache resources by type to avoid repeated DB queries
   */
  static cacheResourcesByType(type: string, resources: CachedResource[]): void {
    this.resourceCache.set(`${type}_v${this.cacheVersion}`, resources);
    
    // Clear old cache entries
    if (this.resourceCache.size > 10) {
      const firstKey = this.resourceCache.keys().next().value;
      this.resourceCache.delete(firstKey);
    }
  }

  /**
   * Get cached resources if available and fresh
   */
  static getCachedResourcesByType(type: string): CachedResource[] | null {
    return this.resourceCache.get(`${type}_v${this.cacheVersion}`) || null;
  }

  /**
   * Invalidate cache when resources change
   */
  static invalidateCache(): void {
    this.cacheVersion++;
  }

  /**
   * Optimize sorting for large arrays using quickselect for top N
   */
  static selectOldestResources(
    resources: EvictionCandidate[], 
    count: number
  ): EvictionCandidate[] {
    if (resources.length <= count) {
      return resources;
    }

    // For small arrays, just sort
    if (resources.length < 100) {
      return resources
        .sort((a, b) => this.getAccessTime(a) - this.getAccessTime(b))
        .slice(0, count);
    }

    // For large arrays, use partial sorting
    const selected = this.quickselect(resources, count, (a, b) => 
      this.getAccessTime(a) - this.getAccessTime(b)
    );

    return selected;
  }

  /**
   * Get access time with fallback
   */
  private static getAccessTime(resource: CachedResource): number {
    return resource.metadata.lastAccessed || resource.metadata.cachedAt;
  }

  /**
   * Quickselect algorithm for finding N smallest elements
   */
  private static quickselect<T>(
    arr: T[], 
    k: number, 
    compare: (a: T, b: T) => number
  ): T[] {
    const result: T[] = [];
    const working = [...arr];

    for (let i = 0; i < Math.min(k, arr.length); i++) {
      const minIndex = this.findMinIndex(working, i, compare);
      [working[i], working[minIndex]] = [working[minIndex], working[i]];
      result.push(working[i]);
    }

    return result;
  }

  private static findMinIndex<T>(
    arr: T[], 
    start: number, 
    compare: (a: T, b: T) => number
  ): number {
    let minIndex = start;
    for (let i = start + 1; i < arr.length; i++) {
      if (compare(arr[i], arr[minIndex]) < 0) {
        minIndex = i;
      }
    }
    return minIndex;
  }

  /**
   * Batch resource operations for better performance
   */
  static createBatchRemover(batchSize: number = 5) {
    const batch: Array<{ type: string; id: string }> = [];
    let flushTimer: NodeJS.Timeout | null = null;

    const flush = async (removeFunction: (type: string, id: string) => Promise<void>) => {
      if (batch.length === 0) return;

      const currentBatch = [...batch];
      batch.length = 0;

      // Process in parallel with concurrency limit
      const promises: Promise<void>[] = [];
      for (let i = 0; i < currentBatch.length; i += batchSize) {
        const chunk = currentBatch.slice(i, i + batchSize);
        promises.push(
          Promise.all(
            chunk.map(item => removeFunction(item.type, item.id))
          ).then(() => {})
        );
      }

      await Promise.all(promises);
    };

    return {
      add: (type: string, id: string) => {
        batch.push({ type, id });

        // Auto-flush after delay
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(() => flush, 100);
      },
      flush,
      size: () => batch.length,
    };
  }

  /**
   * Calculate size more efficiently
   */
  static estimateResourceSize(resource: CachedResource): number {
    // Use cached size if available
    if (resource.metadata.size) {
      return resource.metadata.size;
    }

    // Estimate based on data
    let size = JSON.stringify(resource.data).length;

    // Add asset sizes
    if (resource.assets) {
      if (resource.assets.images) {
        size += resource.assets.images.size * 1024 * 100; // Estimate 100KB per image
      }
      if (resource.assets.audio) {
        size += resource.assets.audio.size * 1024 * 500; // Estimate 500KB per audio
      }
    }

    return size;
  }

  /**
   * Precompute eviction candidates during idle time
   */
  static schedulePrecomputation(
    computeFunction: () => Promise<void>,
    delay: number = 5000
  ): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        computeFunction().catch(console.error);
      }, { timeout: delay });
    } else {
      setTimeout(() => {
        computeFunction().catch(console.error);
      }, delay);
    }
  }

  /**
   * Memory-efficient resource filtering
   */
  static* filterResourcesIterator(
    resources: CachedResource[],
    predicate: (resource: CachedResource) => boolean
  ): Generator<CachedResource> {
    for (const resource of resources) {
      if (predicate(resource)) {
        yield resource;
      }
    }
  }

  /**
   * Debounce eviction checks to prevent excessive calls
   */
  static createDebouncedEvictionCheck(
    checkFunction: () => Promise<boolean>,
    delay: number = 300
  ): () => Promise<boolean> {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastResult: boolean = false;
    let lastCheck: number = 0;

    return async () => {
      const now = Date.now();
      
      // Return cached result if recent
      if (now - lastCheck < delay) {
        return lastResult;
      }

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Perform check after delay
      return new Promise<boolean>((resolve) => {
        timeoutId = setTimeout(async () => {
          lastResult = await checkFunction();
          lastCheck = Date.now();
          resolve(lastResult);
        }, delay);
      });
    };
  }
}