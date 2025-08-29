/**
 * Multi-tier Cache Manager
 * Implements L1 (Memory), L2 (IndexedDB), and L3 (Redis) caching
 */

import { LRUCache } from 'lru-cache';
import { IndexedDBAdapter } from '../review-store/adapters/IndexedDBAdapter';
import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, EventPriority, ReviewSource } from '../review-events/types';

export interface CacheOptions {
  enableMemoryCache?: boolean;
  enableIndexedDBCache?: boolean;
  enableRedisCache?: boolean;
  memoryCacheSize?: number;
  memoryCacheTTL?: number;
  indexedDBTTL?: number;
  redisTTL?: number;
  warmupOnInit?: boolean;
  compressionThreshold?: number;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number;
  size?: number;
  compressed?: boolean;
  hits?: number;
  lastAccess?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
  itemCount: number;
  avgAccessTime: number;
}

export enum CacheTier {
  MEMORY = 'memory',
  INDEXED_DB = 'indexedDB',
  REDIS = 'redis'
}

class CacheManager {
  private static instance: CacheManager;
  
  // L1 Cache - Memory (fastest)
  private memoryCache: LRUCache<string, CacheEntry>;
  
  // L2 Cache - IndexedDB (persistent local)
  private indexedDBCache: IndexedDBAdapter | null = null;
  
  // L3 Cache - Redis (distributed)
  private redisClient: any = null;
  
  private stats: Map<CacheTier, CacheStats> = new Map();
  private options: CacheOptions;
  private eventBus = getEventBus();
  private warmupInProgress = false;
  private compressionWorker?: Worker;

  private constructor(options: CacheOptions = {}) {
    this.options = {
      enableMemoryCache: true,
      enableIndexedDBCache: true,
      enableRedisCache: false, // Disabled by default (requires server setup)
      memoryCacheSize: 1000,
      memoryCacheTTL: 5 * 60 * 1000, // 5 minutes
      indexedDBTTL: 24 * 60 * 60 * 1000, // 24 hours
      redisTTL: 7 * 24 * 60 * 60, // 7 days (in seconds for Redis)
      warmupOnInit: true,
      compressionThreshold: 1024, // Compress if > 1KB
      ...options
    };

    // Initialize L1 - Memory Cache
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: this.options.memoryCacheSize!,
      ttl: this.options.memoryCacheTTL!,
      sizeCalculation: (entry) => entry.size || 1,
      dispose: (entry, key) => {
        this.recordEviction(CacheTier.MEMORY, key);
      },
      updateAgeOnGet: true,
      updateAgeOnHas: false
    });

    // Initialize stats
    Object.values(CacheTier).forEach(tier => {
      this.stats.set(tier as CacheTier, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        evictions: 0,
        size: 0,
        itemCount: 0,
        avgAccessTime: 0
      });
    });

    this.initialize();
  }

  static getInstance(options?: CacheOptions): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(options);
    }
    return CacheManager.instance;
  }

  /**
   * Initialize cache layers
   */
  private async initialize(): Promise<void> {
    // Initialize IndexedDB
    if (this.options.enableIndexedDBCache) {
      try {
        this.indexedDBCache = new IndexedDBAdapter('review-hub-cache');
        await this.indexedDBCache.initialize();
        console.log('[CacheManager] IndexedDB cache initialized');
      } catch (error) {
        console.error('[CacheManager] Failed to initialize IndexedDB:', error);
        this.options.enableIndexedDBCache = false;
      }
    }

    // Initialize Redis (if enabled and available)
    if (this.options.enableRedisCache) {
      await this.initializeRedis();
    }

    // Setup compression worker
    if (typeof Worker !== 'undefined') {
      // Would create a worker for compression in production
      // this.compressionWorker = new Worker('/workers/compression.worker.js');
    }

    // Warm up cache if requested
    if (this.options.warmupOnInit) {
      this.warmupCache();
    }

    console.log('[CacheManager] Initialized with tiers:', this.getEnabledTiers());
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      // In a real implementation, this would connect to Redis
      // For now, we'll use a mock or API endpoint
      const response = await fetch('/api/cache/redis/status');
      if (response.ok) {
        console.log('[CacheManager] Redis cache available');
        // Setup Redis client
        // this.redisClient = new Redis(config);
      } else {
        console.warn('[CacheManager] Redis not available, disabling L3 cache');
        this.options.enableRedisCache = false;
      }
    } catch (error) {
      console.error('[CacheManager] Redis initialization failed:', error);
      this.options.enableRedisCache = false;
    }
  }

  /**
   * Get value from cache (checks all tiers)
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();

    // L1 - Memory Cache
    if (this.options.enableMemoryCache) {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        this.recordHit(CacheTier.MEMORY, performance.now() - startTime);
        memoryEntry.hits = (memoryEntry.hits || 0) + 1;
        memoryEntry.lastAccess = Date.now();
        return this.decompressValue(memoryEntry.value);
      }
      this.recordMiss(CacheTier.MEMORY);
    }

    // L2 - IndexedDB Cache
    if (this.options.enableIndexedDBCache && this.indexedDBCache) {
      try {
        const idbEntry = await this.indexedDBCache.get(`cache:${key}`);
        if (idbEntry && this.isValidEntry(idbEntry)) {
          this.recordHit(CacheTier.INDEXED_DB, performance.now() - startTime);
          
          // Promote to L1
          if (this.options.enableMemoryCache) {
            this.memoryCache.set(key, idbEntry);
          }
          
          return this.decompressValue(idbEntry.value);
        }
      } catch (error) {
        console.error('[CacheManager] IndexedDB get error:', error);
      }
      this.recordMiss(CacheTier.INDEXED_DB);
    }

    // L3 - Redis Cache
    if (this.options.enableRedisCache && this.redisClient) {
      try {
        const redisValue = await this.getFromRedis(key);
        if (redisValue) {
          this.recordHit(CacheTier.REDIS, performance.now() - startTime);
          
          const entry: CacheEntry<T> = {
            key,
            value: redisValue,
            timestamp: Date.now(),
            ttl: this.options.redisTTL! * 1000
          };
          
          // Promote to L1 and L2
          await this.promoteToCaches(key, entry);
          
          return redisValue;
        }
      } catch (error) {
        console.error('[CacheManager] Redis get error:', error);
      }
      this.recordMiss(CacheTier.REDIS);
    }

    return null;
  }

  /**
   * Set value in cache (writes to all tiers)
   */
  async set<T = any>(
    key: string, 
    value: T, 
    options: { ttl?: number; tier?: CacheTier } = {}
  ): Promise<void> {
    const size = this.calculateSize(value);
    const compressed = size > this.options.compressionThreshold!;
    const processedValue = compressed ? await this.compressValue(value) : value;

    const entry: CacheEntry<T> = {
      key,
      value: processedValue as T,
      timestamp: Date.now(),
      ttl: options.ttl,
      size,
      compressed,
      hits: 0,
      lastAccess: Date.now()
    };

    // Write to specified tier or all tiers
    if (!options.tier || options.tier === CacheTier.MEMORY) {
      if (this.options.enableMemoryCache) {
        this.memoryCache.set(key, entry);
      }
    }

    if (!options.tier || options.tier === CacheTier.INDEXED_DB) {
      if (this.options.enableIndexedDBCache && this.indexedDBCache) {
        await this.indexedDBCache.set(`cache:${key}`, entry);
      }
    }

    if (!options.tier || options.tier === CacheTier.REDIS) {
      if (this.options.enableRedisCache && this.redisClient) {
        await this.setInRedis(key, value, options.ttl);
      }
    }

    // Emit cache update event
    this.eventBus.emit({
      type: ReviewEventType.CACHE_UPDATED,
      source: ReviewSource.REVIEW_HUB,
      userId: 'system',
      data: {
        itemId: key,
        itemType: 'cache',
        metadata: {
          size,
          compressed,
          tiers: this.getEnabledTiers()
        }
      },
      priority: EventPriority.LOW
    });
  }

  /**
   * Delete from all cache tiers
   */
  async delete(key: string): Promise<void> {
    if (this.options.enableMemoryCache) {
      this.memoryCache.delete(key);
    }

    if (this.options.enableIndexedDBCache && this.indexedDBCache) {
      await this.indexedDBCache.delete(`cache:${key}`);
    }

    if (this.options.enableRedisCache && this.redisClient) {
      await this.deleteFromRedis(key);
    }
  }

  /**
   * Clear all caches
   */
  async clear(tier?: CacheTier): Promise<void> {
    if (!tier || tier === CacheTier.MEMORY) {
      this.memoryCache.clear();
    }

    if (!tier || tier === CacheTier.INDEXED_DB) {
      if (this.indexedDBCache) {
        await this.indexedDBCache.clear();
      }
    }

    if (!tier || tier === CacheTier.REDIS) {
      if (this.redisClient) {
        await this.clearRedis();
      }
    }

    console.log(`[CacheManager] Cleared ${tier || 'all'} cache tier(s)`);
  }

  /**
   * Warm up cache with frequently accessed items
   */
  private async warmupCache(): Promise<void> {
    if (this.warmupInProgress) return;
    
    this.warmupInProgress = true;
    console.log('[CacheManager] Starting cache warmup...');

    try {
      // Get frequently accessed keys from analytics
      const hotKeys = await this.getHotKeys();
      
      // Pre-load hot items
      for (const key of hotKeys) {
        // This would fetch from the primary data source
        // and populate all cache tiers
        await this.warmupKey(key);
      }

      console.log(`[CacheManager] Warmed up ${hotKeys.length} items`);
    } catch (error) {
      console.error('[CacheManager] Cache warmup failed:', error);
    } finally {
      this.warmupInProgress = false;
    }
  }

  /**
   * Get frequently accessed keys
   */
  private async getHotKeys(): Promise<string[]> {
    // In production, this would query analytics or access patterns
    // For now, return common patterns
    return [
      'user:*:settings',
      'review:*:due',
      'stats:*:daily',
      'kanji:*:common'
    ];
  }

  /**
   * Warm up a specific key
   */
  private async warmupKey(pattern: string): Promise<void> {
    // This would fetch actual data and populate cache
    // For now, just log
    console.log(`[CacheManager] Warming up pattern: ${pattern}`);
  }

  /**
   * Redis operations (mock for now)
   */
  private async getFromRedis(key: string): Promise<any> {
    // In production, this would use actual Redis client
    try {
      const response = await fetch(`/api/cache/redis/get?key=${key}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[CacheManager] Redis get failed:', error);
    }
    return null;
  }

  private async setInRedis(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await fetch('/api/cache/redis/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ttl: ttl || this.options.redisTTL })
      });
    } catch (error) {
      console.error('[CacheManager] Redis set failed:', error);
    }
  }

  private async deleteFromRedis(key: string): Promise<void> {
    try {
      await fetch(`/api/cache/redis/delete?key=${key}`, { method: 'DELETE' });
    } catch (error) {
      console.error('[CacheManager] Redis delete failed:', error);
    }
  }

  private async clearRedis(): Promise<void> {
    try {
      await fetch('/api/cache/redis/clear', { method: 'POST' });
    } catch (error) {
      console.error('[CacheManager] Redis clear failed:', error);
    }
  }

  /**
   * Compression utilities
   */
  private async compressValue(value: any): Promise<any> {
    // In production, use compression worker or library
    // For now, just stringify
    return JSON.stringify(value);
  }

  private async decompressValue(value: any): Promise<any> {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Utility methods
   */
  private calculateSize(value: any): number {
    // Rough estimation of object size
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }

  private isValidEntry(entry: CacheEntry): boolean {
    if (!entry.ttl) return true;
    
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  private async promoteToCaches(key: string, entry: CacheEntry): Promise<void> {
    if (this.options.enableMemoryCache) {
      this.memoryCache.set(key, entry);
    }
    
    if (this.options.enableIndexedDBCache && this.indexedDBCache) {
      await this.indexedDBCache.set(`cache:${key}`, entry);
    }
  }

  private getEnabledTiers(): string[] {
    const tiers = [];
    if (this.options.enableMemoryCache) tiers.push('L1-Memory');
    if (this.options.enableIndexedDBCache) tiers.push('L2-IndexedDB');
    if (this.options.enableRedisCache) tiers.push('L3-Redis');
    return tiers;
  }

  /**
   * Statistics tracking
   */
  private recordHit(tier: CacheTier, accessTime: number): void {
    const stats = this.stats.get(tier)!;
    stats.hits++;
    stats.hitRate = stats.hits / (stats.hits + stats.misses);
    
    // Update average access time
    const n = stats.hits + stats.misses;
    stats.avgAccessTime = ((n - 1) * stats.avgAccessTime + accessTime) / n;
  }

  private recordMiss(tier: CacheTier): void {
    const stats = this.stats.get(tier)!;
    stats.misses++;
    stats.hitRate = stats.hits / (stats.hits + stats.misses);
  }

  private recordEviction(tier: CacheTier, key: string): void {
    const stats = this.stats.get(tier)!;
    stats.evictions++;
    
    console.log(`[CacheManager] Evicted ${key} from ${tier}`);
  }

  /**
   * Get cache statistics
   */
  getStats(tier?: CacheTier): CacheStats | Map<CacheTier, CacheStats> {
    if (tier) {
      return this.stats.get(tier)!;
    }
    return this.stats;
  }

  /**
   * Get cache info
   */
  getInfo(): {
    tiers: string[];
    memory: { size: number; items: number };
    stats: Map<CacheTier, CacheStats>;
  } {
    return {
      tiers: this.getEnabledTiers(),
      memory: {
        size: this.memoryCache.calculatedSize || 0,
        items: this.memoryCache.size
      },
      stats: this.stats
    };
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Export for type usage
export type { CacheManager };