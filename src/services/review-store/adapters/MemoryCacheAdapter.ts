/**
 * Memory Cache Adapter
 * In-memory caching with LRU eviction and size limits
 */

import { StorageAdapter, CacheEntry } from '../types';

interface CacheItem<T = any> {
  key: string;
  value: T;
  size: number;
  lastAccessed: number;
  ttl?: number;
  expiresAt?: number;
}

export class MemoryCacheAdapter implements StorageAdapter {
  private cache: Map<string, CacheItem> = new Map();
  private maxSizeMB: number;
  private currentSizeBytes: number = 0;
  private accessOrder: string[] = [];
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSizeMB: number = 100) {
    this.maxSizeMB = maxSizeMB;
    
    // Start cleanup interval for expired items
    this.startCleanupInterval();
  }

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      await this.delete(key);
      return null;
    }
    
    // Update access time and order for LRU
    item.lastAccessed = Date.now();
    this.updateAccessOrder(key);
    
    return item.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Calculate size of the value
    const size = this.calculateSize(value);
    const maxSizeBytes = this.maxSizeMB * 1024 * 1024;
    
    // Check if single item exceeds max size
    if (size > maxSizeBytes) {
      throw new Error(`Item size (${size} bytes) exceeds max cache size (${maxSizeBytes} bytes)`);
    }
    
    // Evict items if necessary to make room
    while (this.currentSizeBytes + size > maxSizeBytes && this.cache.size > 0) {
      await this.evictLRU();
    }
    
    // Remove old item if exists
    if (this.cache.has(key)) {
      await this.delete(key);
    }
    
    // Create new cache item
    const item: CacheItem = {
      key,
      value,
      size,
      lastAccessed: Date.now(),
      ttl,
      expiresAt: ttl ? Date.now() + ttl : undefined
    };
    
    // Add to cache
    this.cache.set(key, item);
    this.currentSizeBytes += size;
    this.updateAccessOrder(key);
  }

  async delete(key: string): Promise<void> {
    const item = this.cache.get(key);
    
    if (item) {
      this.currentSizeBytes -= item.size;
      this.cache.delete(key);
      
      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.currentSizeBytes = 0;
    this.accessOrder = [];
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      await this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const keys: string[] = [];
    const regex = pattern ? this.patternToRegex(pattern) : null;
    
    for (const [key, item] of this.cache.entries()) {
      // Skip expired items
      if (item.expiresAt && item.expiresAt < Date.now()) {
        continue;
      }
      
      if (!regex || regex.test(key)) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    itemCount: number;
    sizeBytes: number;
    sizeMB: number;
    maxSizeMB: number;
    utilizationPercent: number;
    oldestItem?: string;
    newestItem?: string;
  } {
    return {
      itemCount: this.cache.size,
      sizeBytes: this.currentSizeBytes,
      sizeMB: this.currentSizeBytes / (1024 * 1024),
      maxSizeMB: this.maxSizeMB,
      utilizationPercent: (this.currentSizeBytes / (this.maxSizeMB * 1024 * 1024)) * 100,
      oldestItem: this.accessOrder[0],
      newestItem: this.accessOrder[this.accessOrder.length - 1]
    };
  }

  /**
   * Warm the cache with frequently accessed items
   */
  async warmCache(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    for (const item of items) {
      try {
        await this.set(item.key, item.value, item.ttl);
      } catch (error) {
        console.warn(`[MemoryCache] Failed to warm cache with key ${item.key}:`, error);
      }
    }
  }

  /**
   * Calculate size of a value in bytes
   */
  private calculateSize(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    
    // Rough estimation of object size
    const str = JSON.stringify(value);
    // JavaScript strings use UTF-16, so multiply by 2
    return str.length * 2;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used item
   */
  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length === 0) {
      return;
    }
    
    // Get least recently used key
    const lruKey = this.accessOrder[0];
    
    console.log(`[MemoryCache] Evicting LRU item: ${lruKey}`);
    await this.delete(lruKey);
  }

  /**
   * Convert pattern with wildcards to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and ?
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Replace wildcards with regex equivalents
    const regexStr = escaped
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexStr}$`);
  }

  /**
   * Clean up expired items periodically
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Run every minute
  }

  /**
   * Remove all expired items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      console.log(`[MemoryCache] Cleaning up ${expiredKeys.length} expired items`);
      expiredKeys.forEach(key => this.delete(key));
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }
}