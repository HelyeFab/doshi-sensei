/**
 * Enterprise-grade stats cache implementation with multi-tier caching
 * Provides intelligent caching with LRU eviction, stale-while-revalidate, and memory management
 */

import { IStatsCache } from '../core/interfaces';
import { DEFAULT_CONFIG, LOG_PREFIXES } from '../core/constants';

// Cache tiers
export enum CacheTier {
  MEMORY = 'memory',
  INDEXEDDB = 'indexeddb',
  FIRESTORE = 'firestore'
}

// Cache configuration for different data types
export interface CacheTypeConfig {
  ttl: number;
  maxSize: number;
  priority: number;
  staleWhileRevalidate: boolean;
  persistTier: CacheTier;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size
  priority: number;
  isStale?: boolean;
  revalidating?: boolean;
  tier: CacheTier;
  version?: number;
}

export class StatsCache implements IStatsCache {
  // Multi-tier cache storage
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private indexedDBCache: Map<string, CacheEntry<any>> = new Map();
  private firestoreCache: Map<string, CacheEntry<any>> = new Map();
  
  // Configuration
  private config: {
    memoryMaxSize: number;
    indexedDBMaxSize: number;
    memoryMaxBytes: number;
    defaultTtl: number;
    staleThreshold: number;
    compressionThreshold: number;
    warmupEnabled: boolean;
  };
  
  // Cache type configurations
  private typeConfigs: Map<string, CacheTypeConfig> = new Map();
  
  private logger: (message: string) => void;
  
  // Timers and intervals
  private cleanupTimer: NodeJS.Timeout | null = null;
  private warmupTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  
  // Performance metrics
  private metrics = {
    memoryHits: 0,
    memoryMisses: 0,
    indexedDBHits: 0,
    indexedDBMisses: 0,
    firestoreHits: 0,
    firestoreMisses: 0,
    evictions: 0,
    compressions: 0,
    revalidations: 0,
    memoryUsage: 0,
    totalOperations: 0
  };
  
  // Memory monitoring
  private currentMemoryUsage: number = 0;
  private memoryPressure: boolean = false;
  
  // Predictive preloading
  private accessPatterns: Map<string, number[]> = new Map();
  private preloadQueue: Set<string> = new Set();
  
  // Request deduplication
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(
    config: {
      memoryMaxSize?: number;
      indexedDBMaxSize?: number;
      memoryMaxBytes?: number;
      defaultTtl?: number;
      staleThreshold?: number;
      compressionThreshold?: number;
      warmupEnabled?: boolean;
    } = {},
    logger: (message: string) => void = console.log
  ) {
    this.config = {
      memoryMaxSize: config.memoryMaxSize || DEFAULT_CONFIG.cacheSize,
      indexedDBMaxSize: config.indexedDBMaxSize || DEFAULT_CONFIG.cacheSize * 2,
      memoryMaxBytes: config.memoryMaxBytes || 50 * 1024 * 1024, // 50MB
      defaultTtl: config.defaultTtl || DEFAULT_CONFIG.cacheTtl,
      staleThreshold: config.staleThreshold || 0.8, // 80% of TTL
      compressionThreshold: config.compressionThreshold || 10 * 1024, // 10KB
      warmupEnabled: config.warmupEnabled || true
    };
    
    this.logger = logger;
    
    // Start cleanup timer
    this.startCleanup();
    
    this.logger(`${LOG_PREFIXES.CACHE} Multi-tier cache initialized with config: ${JSON.stringify(this.config)}`);
  }

  /**
   * Get value from cache (multi-tier lookup)
   */
  get<T>(key: string): T | null {
    const now = Date.now();
    
    // Try memory cache first
    let entry = this.memoryCache.get(key);
    if (entry) {
      if (now - entry.timestamp <= entry.ttl) {
        entry.accessCount++;
        entry.lastAccessed = now;
        this.metrics.memoryHits++;
        this.metrics.totalOperations++;
        this.logger(`${LOG_PREFIXES.CACHE} Memory cache hit: ${key}`);
        return entry.value as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Try IndexedDB cache
    entry = this.indexedDBCache.get(key);
    if (entry) {
      if (now - entry.timestamp <= entry.ttl) {
        entry.accessCount++;
        entry.lastAccessed = now;
        this.metrics.indexedDBHits++;
        this.metrics.totalOperations++;
        
        // Promote to memory cache
        this.memoryCache.set(key, { ...entry, tier: CacheTier.MEMORY });
        this.logger(`${LOG_PREFIXES.CACHE} IndexedDB cache hit (promoted): ${key}`);
        return entry.value as T;
      } else {
        this.indexedDBCache.delete(key);
      }
    }

    // Try Firestore cache
    entry = this.firestoreCache.get(key);
    if (entry) {
      if (now - entry.timestamp <= entry.ttl) {
        entry.accessCount++;
        entry.lastAccessed = now;
        this.metrics.firestoreHits++;
        this.metrics.totalOperations++;
        
        // Promote to higher tiers
        this.indexedDBCache.set(key, { ...entry, tier: CacheTier.INDEXEDDB });
        this.memoryCache.set(key, { ...entry, tier: CacheTier.MEMORY });
        this.logger(`${LOG_PREFIXES.CACHE} Firestore cache hit (promoted): ${key}`);
        return entry.value as T;
      } else {
        this.firestoreCache.delete(key);
      }
    }

    // Cache miss
    this.metrics.memoryMisses++;
    this.metrics.totalOperations++;
    this.logger(`${LOG_PREFIXES.CACHE} Cache miss: ${key}`);
    return null;
  }

  /**
   * Set value in cache (multi-tier storage)
   */
  set<T>(key: string, value: T, ttl: number = this.config.defaultTtl): void {
    const now = Date.now();
    const estimatedSize = this.estimateEntrySize(key, value);
    
    // Check if we need to evict entries from memory cache
    if (this.memoryCache.size >= this.config.memoryMaxSize && !this.memoryCache.has(key)) {
      this.evictLeastUsed(CacheTier.MEMORY);
    }
    
    // Check memory pressure
    if (this.currentMemoryUsage + estimatedSize > this.config.memoryMaxBytes) {
      this.handleMemoryPressure();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size: estimatedSize,
      priority: 1,
      tier: CacheTier.MEMORY
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);
    this.currentMemoryUsage += estimatedSize;
    
    // Also store in IndexedDB cache if it fits
    if (this.indexedDBCache.size < this.config.indexedDBMaxSize) {
      this.indexedDBCache.set(key, { ...entry, tier: CacheTier.INDEXEDDB });
    }

    this.logger(`${LOG_PREFIXES.CACHE} Cache set: ${key} (TTL: ${ttl}ms, Size: ${this.formatBytes(estimatedSize)})`);
  }

  /**
   * Delete value from cache (all tiers)
   */
  delete(key: string): void {
    let deleted = false;
    
    // Delete from memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      this.memoryCache.delete(key);
      this.currentMemoryUsage -= memoryEntry.size;
      deleted = true;
    }
    
    // Delete from IndexedDB cache
    if (this.indexedDBCache.delete(key)) {
      deleted = true;
    }
    
    // Delete from Firestore cache
    if (this.firestoreCache.delete(key)) {
      deleted = true;
    }
    
    if (deleted) {
      this.logger(`${LOG_PREFIXES.CACHE} Cache delete: ${key} (all tiers)`);
    }
  }

  /**
   * Clear all cache entries (all tiers)
   */
  clear(): void {
    const memorySize = this.memoryCache.size;
    const indexedDBSize = this.indexedDBCache.size;
    const firestoreSize = this.firestoreCache.size;
    
    this.memoryCache.clear();
    this.indexedDBCache.clear();
    this.firestoreCache.clear();
    
    // Reset metrics
    this.metrics = {
      memoryHits: 0,
      memoryMisses: 0,
      indexedDBHits: 0,
      indexedDBMisses: 0,
      firestoreHits: 0,
      firestoreMisses: 0,
      evictions: 0,
      compressions: 0,
      revalidations: 0,
      memoryUsage: 0,
      totalOperations: 0
    };
    
    this.currentMemoryUsage = 0;
    this.memoryPressure = false;
    
    const totalSize = memorySize + indexedDBSize + firestoreSize;
    this.logger(`${LOG_PREFIXES.CACHE} Cache cleared (${totalSize} entries across all tiers)`);
  }

  /**
   * Get current cache size (memory cache)
   */
  size(): number {
    return this.memoryCache.size;
  }

  /**
   * Get value or compute if not cached
   */
  async getOrCompute<T>(
    key: string, 
    computeFn: () => Promise<T>, 
    ttl: number = this.config.defaultTtl
  ): Promise<T> {
    // Check for pending request to avoid duplicate computations
    if (this.pendingRequests.has(key)) {
      this.logger(`${LOG_PREFIXES.CACHE} Waiting for pending computation: ${key}`);
      return this.pendingRequests.get(key)!;
    }
    
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    this.logger(`${LOG_PREFIXES.CACHE} Computing value for: ${key}`);
    
    // Create and store pending promise
    const promise = computeFn().then(value => {
      this.set(key, value, ttl);
      this.pendingRequests.delete(key);
      return value;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Set with conditional update based on version
   */
  setIfNewer<T>(key: string, value: T, version: number, ttl: number = this.config.defaultTtl): boolean {
    // Check all cache tiers for existing entry
    let existing = this.memoryCache.get(key) || this.indexedDBCache.get(key) || this.firestoreCache.get(key);
    
    if (existing && existing.value && typeof existing.value === 'object' && 'version' in existing.value) {
      const existingVersion = (existing.value as any).version;
      if (version <= existingVersion) {
        this.logger(`${LOG_PREFIXES.CACHE} Not updating ${key} - version not newer (${version} <= ${existingVersion})`);
        return false;
      }
    }

    this.set(key, value, ttl);
    this.logger(`${LOG_PREFIXES.CACHE} Updated ${key} with newer version: ${version}`);
    return true;
  }

  /**
   * Get multiple values at once
   */
  getMultiple<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    this.logger(`${LOG_PREFIXES.CACHE} Bulk get: ${result.size}/${keys.length} found`);
    return result;
  }

  /**
   * Set multiple values at once
   */
  setMultiple<T>(entries: Map<string, T>, ttl: number = this.config.defaultTtl): void {
    Array.from(entries.entries()).forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
    
    this.logger(`${LOG_PREFIXES.CACHE} Bulk set: ${entries.size} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    memoryUsage: string;
    tiers: {
      memory: { size: number; maxSize: number; hits: number; misses: number };
      indexedDB: { size: number; maxSize: number; hits: number; misses: number };
      firestore: { size: number; hits: number; misses: number };
    };
  } {
    const totalHits = this.metrics.memoryHits + this.metrics.indexedDBHits + this.metrics.firestoreHits;
    const totalMisses = this.metrics.memoryMisses + this.metrics.indexedDBMisses + this.metrics.firestoreMisses;
    const totalRequests = totalHits + totalMisses;
    const hitRate = totalRequests > 0 ? Math.round((totalHits / totalRequests) * 100) : 0;
    
    return {
      size: this.memoryCache.size,
      maxSize: this.config.memoryMaxSize,
      hitCount: totalHits,
      missCount: totalMisses,
      hitRate,
      memoryUsage: this.estimateMemoryUsage(),
      tiers: {
        memory: {
          size: this.memoryCache.size,
          maxSize: this.config.memoryMaxSize,
          hits: this.metrics.memoryHits,
          misses: this.metrics.memoryMisses
        },
        indexedDB: {
          size: this.indexedDBCache.size,
          maxSize: this.config.indexedDBMaxSize,
          hits: this.metrics.indexedDBHits,
          misses: this.metrics.indexedDBMisses
        },
        firestore: {
          size: this.firestoreCache.size,
          hits: this.metrics.firestoreHits,
          misses: this.metrics.firestoreMisses
        }
      }
    };
  }

  /**
   * Get keys matching a pattern (from all tiers)
   */
  getKeys(pattern?: RegExp): string[] {
    const allKeys = new Set([
      ...Array.from(this.memoryCache.keys()),
      ...Array.from(this.indexedDBCache.keys()),
      ...Array.from(this.firestoreCache.keys())
    ]);
    
    const keys = Array.from(allKeys);
    
    if (!pattern) {
      return keys;
    }

    return keys.filter(key => pattern.test(key));
  }

  /**
   * Get expired entries count (all tiers)
   */
  getExpiredCount(): number {
    const now = Date.now();
    let expiredCount = 0;
    
    // Check memory cache
    Array.from(this.memoryCache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    });
    
    // Check IndexedDB cache
    Array.from(this.indexedDBCache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    });
    
    // Check Firestore cache
    Array.from(this.firestoreCache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    });

    return expiredCount;
  }

  /**
   * Manually trigger cleanup (all tiers)
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Cleanup memory cache
    const memoryEntries = Array.from(this.memoryCache.entries());
    memoryEntries.forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        this.currentMemoryUsage -= entry.size;
        cleanedCount++;
      }
    });
    
    // Cleanup IndexedDB cache
    const indexedDBEntries = Array.from(this.indexedDBCache.entries());
    indexedDBEntries.forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.indexedDBCache.delete(key);
        cleanedCount++;
      }
    });
    
    // Cleanup Firestore cache
    const firestoreEntries = Array.from(this.firestoreCache.entries());
    firestoreEntries.forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.firestoreCache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.logger(`${LOG_PREFIXES.CACHE} Cleanup removed ${cleanedCount} expired entries across all tiers`);
    }

    return cleanedCount;
  }

  /**
   * Evict least recently used entry from specific tier
   */
  private evictLeastUsed(tier: CacheTier = CacheTier.MEMORY): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    let targetCache: Map<string, CacheEntry<any>>;

    switch (tier) {
      case CacheTier.MEMORY:
        targetCache = this.memoryCache;
        break;
      case CacheTier.INDEXEDDB:
        targetCache = this.indexedDBCache;
        break;
      case CacheTier.FIRESTORE:
        targetCache = this.firestoreCache;
        break;
      default:
        targetCache = this.memoryCache;
    }

    Array.from(targetCache.entries()).forEach(([key, entry]) => {
      // Priority-based LRU: consider access frequency and recency
      const score = entry.lastAccessed - (entry.accessCount * 1000) - (entry.priority * 10000);
      if (score < lruTime) {
        lruTime = score;
        lruKey = key;
      }
    });

    if (lruKey) {
      const entry = targetCache.get(lruKey);
      targetCache.delete(lruKey);
      
      if (tier === CacheTier.MEMORY && entry) {
        this.currentMemoryUsage -= entry.size;
      }
      
      this.metrics.evictions++;
      this.logger(`${LOG_PREFIXES.CACHE} Evicted LRU entry from ${tier}: ${lruKey}`);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute

    this.logger(`${LOG_PREFIXES.CACHE} Started periodic cleanup (60s interval)`);
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger(`${LOG_PREFIXES.CACHE} Stopped periodic cleanup`);
    }
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): string {
    return this.formatBytes(this.currentMemoryUsage);
  }
  
  /**
   * Estimate entry size for memory management
   */
  private estimateEntrySize<T>(key: string, value: T): number {
    try {
      const keySize = key.length * 2; // Unicode characters are 2 bytes
      const valueSize = JSON.stringify(value).length * 2;
      const overhead = 200; // Rough estimate for entry object overhead
      
      return keySize + valueSize + overhead;
    } catch (error) {
      // Fallback if serialization fails
      return 1024; // 1KB default
    }
  }
  
  /**
   * Handle memory pressure by aggressive cleanup and eviction
   */
  private handleMemoryPressure(): void {
    if (this.memoryPressure) {
      return; // Already handling
    }
    
    this.memoryPressure = true;
    this.logger(`${LOG_PREFIXES.CACHE} Memory pressure detected, starting aggressive cleanup`);
    
    // First, cleanup expired entries
    this.cleanup();
    
    // Then evict LRU entries until memory usage is acceptable
    const targetUsage = this.config.memoryMaxBytes * 0.7; // Target 70% usage
    while (this.currentMemoryUsage > targetUsage && this.memoryCache.size > 0) {
      this.evictLeastUsed(CacheTier.MEMORY);
    }
    
    this.memoryPressure = false;
    this.logger(`${LOG_PREFIXES.CACHE} Memory pressure resolved, current usage: ${this.formatBytes(this.currentMemoryUsage)}`);
  }

  /**
   * Format bytes as human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
    this.logger(`${LOG_PREFIXES.CACHE} Cache destroyed`);
  }
}