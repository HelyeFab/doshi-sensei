/**
 * Comprehensive caching system for articles and TTS audio
 * Supports both memory and IndexedDB storage with size limits and TTL
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  size: number;
  ttl?: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export class CacheManager {
  private static instance: CacheManager;
  private memoryCache = new Map<string, CacheEntry>();
  private dbName = 'DoshiSenseiCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 1000,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      ...config
    };
    
    this.initializeDB();
    this.startCleanupTimer();
  }

  static getInstance(config?: Partial<CacheConfig>): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  private async initializeDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('articles')) {
          db.createObjectStore('articles', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('audio')) {
          const audioStore = db.createObjectStore('audio', { keyPath: 'id' });
          audioStore.createIndex('articleId', 'articleId', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private calculateSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof Blob) {
      return data.size;
    }
    return JSON.stringify(data).length * 2; // Rough estimate for UTF-16
  }

  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const ttl = entry.ttl || this.config.defaultTTL;
    return now - entry.timestamp > ttl;
  }

  // Memory cache operations
  setMemory<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      size: this.calculateSize(data),
      ttl,
      accessCount: 0,
      lastAccessed: now
    };

    this.memoryCache.set(key, entry);
    this.enforceMemoryLimits();
  }

  getMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return entry.data as T;
  }

  private enforceMemoryLimits(): void {
    const entries = Array.from(this.memoryCache.entries());
    
    // Remove expired entries first
    entries.forEach(([key, entry]) => {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    });

    // Check size limits
    const totalSize = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    if (totalSize > this.config.maxSize || this.memoryCache.size > this.config.maxEntries) {
      // Sort by LRU (Least Recently Used)
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      // Remove oldest entries until under limits
      let currentSize = totalSize;
      let currentCount = this.memoryCache.size;

      for (const [key, entry] of sortedEntries) {
        if (currentSize <= this.config.maxSize && currentCount <= this.config.maxEntries) {
          break;
        }
        
        this.memoryCache.delete(key);
        currentSize -= entry.size;
        currentCount--;
      }
    }
  }

  // IndexedDB operations
  async setDB(storeName: string, key: string, data: any, ttl?: number): Promise<void> {
    if (!this.db) await this.initializeDB();
    if (!this.db) throw new Error('IndexedDB not available');

    const now = Date.now();
    const entry = {
      id: key,
      data,
      timestamp: now,
      size: this.calculateSize(data),
      ttl,
      accessCount: 0,
      lastAccessed: now
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getDB<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.initializeDB();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T>;
        if (!entry) {
          resolve(null);
          return;
        }

        if (this.isExpired(entry)) {
          // Remove expired entry
          store.delete(key);
          resolve(null);
          return;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        store.put(entry);

        resolve(entry.data);
      };
    });
  }

  async deleteDB(storeName: string, key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Public API methods
  async cleanup(): Promise<void> {
    console.log('🧹 Running cache cleanup...');
    
    // Clean memory cache
    this.enforceMemoryLimits();

    // Clean IndexedDB
    if (!this.db) return;

    const stores = ['articles', 'audio', 'metadata'];
    
    for (const storeName of stores) {
      try {
        await this.cleanupStore(storeName);
      } catch (error) {
        console.error(`Error cleaning store ${storeName}:`, error);
      }
    }

    console.log('✅ Cache cleanup completed');
  }

  private async cleanupStore(storeName: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      const keysToDelete: string[] = [];

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          if (this.isExpired(entry)) {
            keysToDelete.push(cursor.key as string);
          }
          cursor.continue();
        } else {
          // Delete expired entries
          Promise.all(keysToDelete.map(key => this.deleteDB(storeName, key)))
            .then(() => resolve())
            .catch(reject);
        }
      };
    });
  }

  async getCacheStats(): Promise<{
    memory: { size: number; entries: number };
    db: { size: number; entries: number };
  }> {
    const memoryEntries = Array.from(this.memoryCache.values());
    const memorySize = memoryEntries.reduce((sum, entry) => sum + entry.size, 0);

    let dbSize = 0;
    let dbEntries = 0;

    if (this.db) {
      const stores = ['articles', 'audio', 'metadata'];
      for (const storeName of stores) {
        const storeStats = await this.getStoreStats(storeName);
        dbSize += storeStats.size;
        dbEntries += storeStats.entries;
      }
    }

    return {
      memory: { size: memorySize, entries: this.memoryCache.size },
      db: { size: dbSize, entries: dbEntries }
    };
  }

  private async getStoreStats(storeName: string): Promise<{ size: number; entries: number }> {
    if (!this.db) return { size: 0, entries: 0 };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      
      let size = 0;
      let entries = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          size += entry.size;
          entries++;
          cursor.continue();
        } else {
          resolve({ size, entries });
        }
      };
    });
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.memoryCache.clear();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default CacheManager;