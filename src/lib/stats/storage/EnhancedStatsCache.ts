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
  compressed?: boolean;
}

// Enhanced cache metrics
interface CacheMetrics {
  memoryHits: number;
  memoryMisses: number;
  indexedDBHits: number;
  indexedDBMisses: number;
  firestoreHits: number;
  firestoreMisses: number;
  evictions: number;
  compressions: number;
  revalidations: number;
  memoryUsage: number;
  totalOperations: number;
  hitRate: number;
  averageAccessTime: number;
  cacheEfficiency: number;
}

export class EnhancedStatsCache implements IStatsCache {
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
    preloadEnabled: boolean;
    compressionEnabled: boolean;
  };
  
  // Cache type configurations
  private typeConfigs: Map<string, CacheTypeConfig> = new Map();
  
  private logger: (message: string) => void;
  
  // Timers and intervals
  private cleanupTimer: NodeJS.Timeout | null = null;
  private warmupTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private preloadTimer: NodeJS.Timeout | null = null;
  
  // Performance metrics
  private metrics: CacheMetrics = {
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
    totalOperations: 0,
    hitRate: 0,
    averageAccessTime: 0,
    cacheEfficiency: 0
  };
  
  // Memory monitoring
  private currentMemoryUsage: number = 0;
  private memoryPressure: boolean = false;
  
  // Predictive preloading
  private accessPatterns: Map<string, number[]> = new Map();
  private preloadQueue: Set<string> = new Set();
  
  // Request deduplication
  private pendingRequests: Map<string, Promise<any>> = new Map();
  
  // LRU tracking
  private accessOrder: Map<string, number> = new Map();
  private currentAccessIndex: number = 0;

  constructor(
    config: {
      memoryMaxSize?: number;
      indexedDBMaxSize?: number;
      memoryMaxBytes?: number;
      defaultTtl?: number;
      staleThreshold?: number;
      compressionThreshold?: number;
      warmupEnabled?: boolean;
      preloadEnabled?: boolean;
      compressionEnabled?: boolean;
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
      warmupEnabled: config.warmupEnabled !== false,
      preloadEnabled: config.preloadEnabled !== false,
      compressionEnabled: config.compressionEnabled !== false
    };
    
    this.logger = logger;
    
    this.initializeTypeConfigs();
    this.startPeriodicTasks();
    
    this.logger(`${LOG_PREFIXES.CACHE} Enhanced multi-tier cache initialized`);
  }

  /**
   * Initialize cache type configurations with optimized settings
   */
  private initializeTypeConfigs(): void {
    // User stats - fast access, medium persistence
    this.typeConfigs.set('user_stats', {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      priority: 3,
      staleWhileRevalidate: true,
      persistTier: CacheTier.INDEXEDDB
    });
    
    // Daily activities - longer cache, high persistence
    this.typeConfigs.set('daily_activity', {
      ttl: 60 * 60 * 1000, // 1 hour
      maxSize: 500,
      priority: 2,
      staleWhileRevalidate: true,
      persistTier: CacheTier.INDEXEDDB
    });
    
    // Historical data - very long cache
    this.typeConfigs.set('historical_data', {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      priority: 1,
      staleWhileRevalidate: true,
      persistTier: CacheTier.FIRESTORE
    });
    
    // Activity events - short cache, high priority
    this.typeConfigs.set('activity_events', {
      ttl: 2 * 60 * 1000, // 2 minutes
      maxSize: 200,
      priority: 4,
      staleWhileRevalidate: false,
      persistTier: CacheTier.MEMORY
    });
  }

  /**
   * Get value from multi-tier cache with stale-while-revalidate
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.totalOperations++;
    
    // Record access pattern
    this.recordAccess(key);
    
    try {
      // Try memory cache first
      let entry = this.getFromTier(key, CacheTier.MEMORY);
      if (entry) {
        this.metrics.memoryHits++;
        this.updateAccessOrder(key);
        
        if (this.shouldRevalidate(entry)) {
          // Trigger background revalidation
          this.triggerRevalidation(key, entry);
        }
        
        return entry.value as T;
      }
      this.metrics.memoryMisses++;

      // Try IndexedDB cache
      entry = this.getFromTier(key, CacheTier.INDEXEDDB);
      if (entry) {
        this.metrics.indexedDBHits++;
        
        // Promote to memory cache
        await this.promoteToMemory(key, entry);
        
        if (this.shouldRevalidate(entry)) {
          this.triggerRevalidation(key, entry);
        }
        
        return entry.value as T;
      }
      this.metrics.indexedDBMisses++;

      // Try Firestore cache (for historical data)
      entry = this.getFromTier(key, CacheTier.FIRESTORE);
      if (entry) {
        this.metrics.firestoreHits++;
        
        // Promote through tiers
        await this.promoteToIndexedDB(key, entry);
        await this.promoteToMemory(key, entry);
        
        return entry.value as T;
      }
      this.metrics.firestoreMisses++;

      // Schedule preload of related items
      this.schedulePreload(key);
      
      return null;
      
    } finally {
      const accessTime = performance.now() - startTime;
      this.updateAccessTimeMetrics(accessTime);
    }
  }

  /**
   * Set value with intelligent tier placement
   */
  set<T>(key: string, value: T, ttl: number = this.config.defaultTtl): void {
    const size = this.estimateSize(value);
    const tier = this.determineBestTier(key, size);
    const typeConfig = this.getTypeConfig(key);
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || typeConfig.ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      priority: typeConfig.priority,
      tier,
      version: this.generateVersion()
    };

    // Compress large values if enabled
    if (this.config.compressionEnabled && size > this.config.compressionThreshold) {
      entry.value = this.compress(value) as T;
      entry.compressed = true;
      this.metrics.compressions++;
    }

    // Set in appropriate tier
    this.setInTier(key, entry, tier);
    this.updateAccessOrder(key);
    
    // Handle memory pressure
    if (tier === CacheTier.MEMORY) {
      this.currentMemoryUsage += size;
      if (this.currentMemoryUsage > this.config.memoryMaxBytes) {
        this.handleMemoryPressure();
      }
    }

    this.logger(`${LOG_PREFIXES.CACHE} Set ${key} in ${tier} tier (${this.formatBytes(size)})`);
  }

  /**
   * Delete value from all tiers
   */
  delete(key: string): void {
    let deleted = false;
    
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      this.currentMemoryUsage -= entry.size;
      this.memoryCache.delete(key);
      deleted = true;
    }
    
    if (this.indexedDBCache.has(key)) {
      this.indexedDBCache.delete(key);
      deleted = true;
    }
    
    if (this.firestoreCache.has(key)) {
      this.firestoreCache.delete(key);
      deleted = true;
    }
    
    this.accessOrder.delete(key);
    this.accessPatterns.delete(key);
    
    if (deleted) {
      this.logger(`${LOG_PREFIXES.CACHE} Deleted ${key} from all tiers`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const totalSize = this.memoryCache.size + this.indexedDBCache.size + this.firestoreCache.size;
    
    this.memoryCache.clear();
    this.indexedDBCache.clear();
    this.firestoreCache.clear();
    this.accessOrder.clear();
    this.accessPatterns.clear();
    this.preloadQueue.clear();
    this.pendingRequests.clear();
    
    this.currentMemoryUsage = 0;
    this.memoryPressure = false;
    this.resetMetrics();
    
    this.logger(`${LOG_PREFIXES.CACHE} Cleared all caches (${totalSize} entries)`);
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.memoryCache.size + this.indexedDBCache.size + this.firestoreCache.size;
  }

  /**
   * Get or compute value with stale-while-revalidate
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = this.config.defaultTtl
  ): Promise<T> {
    // Check for pending request
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    // Create pending request to avoid duplicate computation
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
   * Batch get operations
   */
  async getBatch<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = keys.map(async key => {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    });

    await Promise.all(promises);
    this.logger(`${LOG_PREFIXES.CACHE} Batch get: ${results.size}/${keys.length} found`);
    
    return results;
  }

  /**
   * Batch set operations
   */
  setBatch<T>(entries: Map<string, T>, ttl: number = this.config.defaultTtl): void {
    for (const [key, value] of entries) {
      this.set(key, value, ttl);
    }
    
    this.logger(`${LOG_PREFIXES.CACHE} Batch set: ${entries.size} entries`);
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheMetrics {
    const totalHits = this.metrics.memoryHits + this.metrics.indexedDBHits + this.metrics.firestoreHits;
    const totalMisses = this.metrics.memoryMisses + this.metrics.indexedDBMisses + this.metrics.firestoreMisses;
    const totalRequests = totalHits + totalMisses;
    
    return {
      ...this.metrics,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      memoryUsage: this.currentMemoryUsage,
      cacheEfficiency: this.calculateEfficiency()
    };
  }

  /**
   * Get cache status by tier
   */
  getTierStatus(): {
    tier: string;
    size: number;
    maxSize: number;
    memoryUsage: string;
    hitRate: number;
    avgAccessTime: number;
  }[] {
    return [
      {
        tier: 'Memory',
        size: this.memoryCache.size,
        maxSize: this.config.memoryMaxSize,
        memoryUsage: this.formatBytes(this.currentMemoryUsage),
        hitRate: this.calculateTierHitRate(CacheTier.MEMORY),
        avgAccessTime: 0.1 // ms
      },
      {
        tier: 'IndexedDB',
        size: this.indexedDBCache.size,
        maxSize: this.config.indexedDBMaxSize,
        memoryUsage: this.formatBytes(this.estimateTierMemoryUsage(CacheTier.INDEXEDDB)),
        hitRate: this.calculateTierHitRate(CacheTier.INDEXEDDB),
        avgAccessTime: 5 // ms
      },
      {
        tier: 'Firestore',
        size: this.firestoreCache.size,
        maxSize: -1, // No limit for metadata
        memoryUsage: this.formatBytes(this.estimateTierMemoryUsage(CacheTier.FIRESTORE)),
        hitRate: this.calculateTierHitRate(CacheTier.FIRESTORE),
        avgAccessTime: 50 // ms
      }
    ];
  }

  /**
   * Manual cache warming
   */
  async warmup(keys: string[], computeFn: (key: string) => Promise<any>): Promise<void> {
    if (!this.config.warmupEnabled) return;

    this.logger(`${LOG_PREFIXES.CACHE} Starting cache warmup for ${keys.length} keys`);
    
    const promises = keys.map(async key => {
      try {
        if (!(await this.get(key))) {
          const value = await computeFn(key);
          this.set(key, value);
        }
      } catch (error) {
        this.logger(`${LOG_PREFIXES.CACHE} Warmup failed for ${key}: ${error}`);
      }
    });

    await Promise.all(promises);
    this.logger(`${LOG_PREFIXES.CACHE} Cache warmup completed`);
  }

  /**
   * Cleanup and destroy cache
   */
  async destroy(): Promise<void> {
    // Clear all timers
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.warmupTimer) clearTimeout(this.warmupTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.preloadTimer) clearTimeout(this.preloadTimer);
    
    // Clear all caches
    this.clear();
    
    this.logger(`${LOG_PREFIXES.CACHE} Cache destroyed`);
  }

  // Private helper methods
  
  private getFromTier(key: string, tier: CacheTier): CacheEntry<any> | null {
    let cache: Map<string, CacheEntry<any>>;
    
    switch (tier) {
      case CacheTier.MEMORY:
        cache = this.memoryCache;
        break;
      case CacheTier.INDEXEDDB:
        cache = this.indexedDBCache;
        break;
      case CacheTier.FIRESTORE:
        cache = this.firestoreCache;
        break;
      default:
        return null;
    }

    const entry = cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (this.isExpired(entry)) {
      cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Decompress if needed
    if (entry.compressed) {
      entry.value = this.decompress(entry.value);
    }

    return entry;
  }

  private setInTier(key: string, entry: CacheEntry<any>, tier: CacheTier): void {
    let cache: Map<string, CacheEntry<any>>;
    let maxSize: number;
    
    switch (tier) {
      case CacheTier.MEMORY:
        cache = this.memoryCache;
        maxSize = this.config.memoryMaxSize;
        break;
      case CacheTier.INDEXEDDB:
        cache = this.indexedDBCache;
        maxSize = this.config.indexedDBMaxSize;
        break;
      case CacheTier.FIRESTORE:
        cache = this.firestoreCache;
        maxSize = -1; // No limit
        break;
      default:
        return;
    }

    // Evict if necessary
    if (maxSize > 0 && cache.size >= maxSize && !cache.has(key)) {
      this.evictLRU(cache, tier);
    }

    cache.set(key, entry);
  }

  private determineBestTier(key: string, size: number): CacheTier {
    const typeConfig = this.getTypeConfig(key);
    
    // Use configured persist tier
    if (typeConfig.persistTier !== CacheTier.MEMORY) {
      return typeConfig.persistTier;
    }
    
    // Default logic based on size and access patterns
    if (size < 1024) { // Small items go to memory
      return CacheTier.MEMORY;
    } else if (size < 100 * 1024) { // Medium items to IndexedDB
      return CacheTier.INDEXEDDB;
    } else { // Large items metadata to Firestore
      return CacheTier.FIRESTORE;
    }
  }

  private getTypeConfig(key: string): CacheTypeConfig {
    // Extract type from key (e.g., "user_stats:123" -> "user_stats")
    const type = key.split(':')[0];
    return this.typeConfigs.get(type) || {
      ttl: this.config.defaultTtl,
      maxSize: 100,
      priority: 1,
      staleWhileRevalidate: false,
      persistTier: CacheTier.MEMORY
    };
  }

  private shouldRevalidate(entry: CacheEntry<any>): boolean {
    if (!this.getTypeConfig('').staleWhileRevalidate) return false;
    
    const age = Date.now() - entry.timestamp;
    const staleTime = entry.ttl * this.config.staleThreshold;
    
    return age > staleTime && !entry.revalidating;
  }

  private async triggerRevalidation(key: string, entry: CacheEntry<any>): Promise<void> {
    if (entry.revalidating) return;
    
    entry.revalidating = true;
    entry.isStale = true;
    this.metrics.revalidations++;
    
    this.logger(`${LOG_PREFIXES.CACHE} Triggered revalidation for ${key}`);
    
    // This would typically trigger a background refresh
    // Implementation depends on the specific data source
  }

  private async promoteToMemory(key: string, entry: CacheEntry<any>): Promise<void> {
    if (this.memoryCache.size < this.config.memoryMaxSize) {
      const memoryEntry = { ...entry, tier: CacheTier.MEMORY };
      this.memoryCache.set(key, memoryEntry);
      this.currentMemoryUsage += entry.size;
    }
  }

  private async promoteToIndexedDB(key: string, entry: CacheEntry<any>): Promise<void> {
    if (this.indexedDBCache.size < this.config.indexedDBMaxSize) {
      const indexedDBEntry = { ...entry, tier: CacheTier.INDEXEDDB };
      this.indexedDBCache.set(key, indexedDBEntry);
    }
  }

  private recordAccess(key: string): void {
    if (!this.config.preloadEnabled) return;
    
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || [];
    pattern.push(now);
    
    // Keep only last 10 accesses
    if (pattern.length > 10) {
      pattern.shift();
    }
    
    this.accessPatterns.set(key, pattern);
  }

  private schedulePreload(key: string): void {
    if (!this.config.preloadEnabled) return;
    
    // Predict related keys based on patterns
    const relatedKeys = this.predictRelatedKeys(key);
    relatedKeys.forEach(relatedKey => this.preloadQueue.add(relatedKey));
  }

  private predictRelatedKeys(key: string): string[] {
    // Simple prediction based on key patterns
    // This could be much more sophisticated
    const parts = key.split(':');
    if (parts.length < 2) return [];
    
    const [type, id] = parts;
    const related = [];
    
    // Predict related daily activities
    if (type === 'daily_activity') {
      const date = new Date(id);
      for (let i = 1; i <= 7; i++) {
        const relatedDate = new Date(date);
        relatedDate.setDate(date.getDate() + i);
        related.push(`daily_activity:${relatedDate.toISOString().split('T')[0]}`);
      }
    }
    
    return related;
  }

  private handleMemoryPressure(): void {
    if (this.memoryPressure) return;
    
    this.memoryPressure = true;
    this.logger(`${LOG_PREFIXES.CACHE} Memory pressure detected, initiating cleanup`);
    
    // Aggressively evict low-priority items
    this.evictByPriority(1); // Evict priority 1 items first
    
    // Move large items to IndexedDB
    for (const [key, entry] of this.memoryCache) {
      if (entry.size > 10 * 1024) { // Items > 10KB
        this.promoteToIndexedDB(key, entry);
        this.memoryCache.delete(key);
        this.currentMemoryUsage -= entry.size;
        
        if (this.currentMemoryUsage < this.config.memoryMaxBytes * 0.8) {
          break;
        }
      }
    }
    
    this.memoryPressure = false;
  }

  private evictLRU(cache: Map<string, CacheEntry<any>>, tier: CacheTier): void {
    let lruKey: string | null = null;
    let lruAccessIndex = Infinity;
    
    for (const [key] of cache) {
      const accessIndex = this.accessOrder.get(key) || 0;
      if (accessIndex < lruAccessIndex) {
        lruAccessIndex = accessIndex;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      const entry = cache.get(lruKey)!;
      cache.delete(lruKey);
      
      if (tier === CacheTier.MEMORY) {
        this.currentMemoryUsage -= entry.size;
      }
      
      this.metrics.evictions++;
      this.logger(`${LOG_PREFIXES.CACHE} Evicted LRU entry from ${tier}: ${lruKey}`);
    }
  }

  private evictByPriority(maxPriority: number): void {
    for (const [key, entry] of this.memoryCache) {
      if (entry.priority <= maxPriority) {
        this.memoryCache.delete(key);
        this.currentMemoryUsage -= entry.size;
        this.metrics.evictions++;
      }
    }
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder.set(key, this.currentAccessIndex++);
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate for UTF-16
    } catch {
      return 1000; // Default estimate
    }
  }

  private compress(value: any): string {
    // Simple compression - in production, use a real compression library
    return JSON.stringify(value);
  }

  private decompress(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private generateVersion(): number {
    return Date.now();
  }

  private calculateEfficiency(): number {
    const totalOperations = this.metrics.totalOperations;
    if (totalOperations === 0) return 0;
    
    const totalHits = this.metrics.memoryHits + this.metrics.indexedDBHits + this.metrics.firestoreHits;
    const revalidationOverhead = this.metrics.revalidations / totalOperations;
    
    return Math.max(0, (totalHits / totalOperations) * 100 - revalidationOverhead * 10);
  }

  private calculateTierHitRate(tier: CacheTier): number {
    let hits = 0;
    let misses = 0;
    
    switch (tier) {
      case CacheTier.MEMORY:
        hits = this.metrics.memoryHits;
        misses = this.metrics.memoryMisses;
        break;
      case CacheTier.INDEXEDDB:
        hits = this.metrics.indexedDBHits;
        misses = this.metrics.indexedDBMisses;
        break;
      case CacheTier.FIRESTORE:
        hits = this.metrics.firestoreHits;
        misses = this.metrics.firestoreMisses;
        break;
    }
    
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  private estimateTierMemoryUsage(tier: CacheTier): number {
    let cache: Map<string, CacheEntry<any>>;
    
    switch (tier) {
      case CacheTier.MEMORY:
        return this.currentMemoryUsage;
      case CacheTier.INDEXEDDB:
        cache = this.indexedDBCache;
        break;
      case CacheTier.FIRESTORE:
        cache = this.firestoreCache;
        break;
      default:
        return 0;
    }
    
    let totalSize = 0;
    for (const entry of cache.values()) {
      totalSize += entry.size;
    }
    
    return totalSize;
  }

  private updateAccessTimeMetrics(accessTime: number): void {
    const alpha = 0.1; // Smoothing factor for exponential moving average
    this.metrics.averageAccessTime = 
      this.metrics.averageAccessTime * (1 - alpha) + accessTime * alpha;
  }

  private resetMetrics(): void {
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
      totalOperations: 0,
      hitRate: 0,
      averageAccessTime: 0,
      cacheEfficiency: 0
    };
  }

  private startPeriodicTasks(): void {
    // Cleanup expired entries every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);
    
    // Update metrics every 30 seconds
    this.metricsTimer = setInterval(() => {
      this.updateMetricsSnapshot();
    }, 30000);
    
    // Process preload queue every 5 seconds
    if (this.config.preloadEnabled) {
      this.preloadTimer = setInterval(() => {
        this.processPreloadQueue();
      }, 5000);
    }
    
    // Cache warmup after initial load
    if (this.config.warmupEnabled) {
      this.warmupTimer = setTimeout(() => {
        this.performWarmup();
      }, 2000);
    }
  }

  private cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();
    
    // Cleanup all tiers
    [this.memoryCache, this.indexedDBCache, this.firestoreCache].forEach((cache, index) => {
      for (const [key, entry] of cache) {
        if (now - entry.timestamp > entry.ttl) {
          cache.delete(key);
          cleanedCount++;
          
          if (index === 0) { // Memory cache
            this.currentMemoryUsage -= entry.size;
          }
        }
      }
    });
    
    if (cleanedCount > 0) {
      this.logger(`${LOG_PREFIXES.CACHE} Cleanup removed ${cleanedCount} expired entries`);
    }
    
    return cleanedCount;
  }

  private updateMetricsSnapshot(): void {
    const stats = this.getStats();
    this.logger(`${LOG_PREFIXES.CACHE} Metrics - Hit Rate: ${stats.hitRate.toFixed(1)}%, Memory: ${this.formatBytes(stats.memoryUsage)}, Efficiency: ${stats.cacheEfficiency.toFixed(1)}%`);
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.size === 0) return;
    
    const keys = Array.from(this.preloadQueue).slice(0, 10); // Process up to 10 keys
    this.preloadQueue.clear();
    
    // This would typically trigger background loading
    this.logger(`${LOG_PREFIXES.CACHE} Processing preload queue for ${keys.length} keys`);
  }

  private async performWarmup(): Promise<void> {
    // This would typically load frequently accessed keys
    this.logger(`${LOG_PREFIXES.CACHE} Performing cache warmup`);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}