import { AppSettings, JLPTLevel, JapaneseWord } from '@/types';
import {
  SettingsManager,
  ProgressManager,
  RecentlyViewedManager,
  VocabularyCacheManager,
  isIndexedDBAvailable,
  initializeDB,
  performDBOperation
} from './indexedDB';
import EnhancedStorageManager from './storage';

// Types for the new caching system
export interface CachedResource {
  id: string;
  type: 'article' | 'story' | 'kanji' | 'verb' | 'adjective' | 'audio';
  data: any;
  metadata: {
    size: number;
    cachedAt: number;
    lastAccessed: number;
    version: string;
    checksum: string;
  };
  assets?: {
    images: Map<string, Blob>;
    audio: Map<string, Blob>;
  };
}

export interface StorageLimit {
  max: number;
  type: string;
}

export type UserType = 'guest' | 'free' | 'monthly' | 'yearly' | 'premium';

// Storage limits configuration
const STORAGE_LIMITS = {
  guest: {
    article: 3,
    story: 3,
    kanji: 100,
    verb: 50,
    adjective: 50,
    audio: 100
  },
  free: {
    article: 3,
    story: 3,
    kanji: 500,
    verb: 200,
    adjective: 200,
    audio: 500
  },
  monthly: {
    article: 50,
    story: 50,
    kanji: Infinity,
    verb: Infinity,
    adjective: Infinity,
    audio: Infinity
  },
  yearly: {
    article: 50,
    story: 50,
    kanji: Infinity,
    verb: Infinity,
    adjective: Infinity,
    audio: Infinity
  },
  premium: {
    article: 50,
    story: 50,
    kanji: Infinity,
    verb: Infinity,
    adjective: Infinity,
    audio: Infinity
  }
};

export class EnhancedStorageManager2 extends EnhancedStorageManager {
  private static db: IDBDatabase | null = null;

  /**
   * Initialize the enhanced storage manager with caching capabilities
   */
  static async initialize(): Promise<void> {
    // Call parent initialization
    await super.initialize();

    // Initialize our database connection
    try {
      this.db = await initializeDB();

      // Create new object stores for caching if they don't exist
      await this.initializeCacheStores();
    } catch (error) {
      console.error('Failed to initialize EnhancedStorageManager2:', error);
    }
  }

  /**
   * Initialize cache-specific object stores
   */
  private static async initializeCacheStores(): Promise<void> {
    // This will be handled by updating the indexedDB schema version
    // For now, we'll use existing stores and extend them
  }

  /**
   * Get a cached resource
   */
  static async getCachedResource(
    type: string,
    id: string
  ): Promise<CachedResource | null> {
    try {
      const cacheKey = `${type}:${id}`;

      // Try to get from existing apiCache store for now
      const cached = await performDBOperation('apiCache', 'readonly', (store) =>
        store.get(cacheKey)
      );

      if (cached && this.isResourceValid(cached)) {
        // Update last accessed time
        await this.updateLastAccessed(type, id);
        return this.transformToCachedResource(cached);
      }

      return null;
    } catch (error) {
      console.error('Error getting cached resource:', error);
      return null;
    }
  }

  /**
   * Cache a resource with user type checking
   */
  static async cacheResource(
    resource: CachedResource,
    userType: UserType
  ): Promise<void> {
    try {
      // Check if we need to evict resources for free/guest users
      await this.enforceStorageLimits(resource.type, userType);

      // Store in IndexedDB
      const cacheKey = `${resource.type}:${resource.id}`;
      await performDBOperation('apiCache', 'readwrite', (store) =>
        store.put({
          id: cacheKey,
          endpoint: resource.type,
          params: { id: resource.id },
          response: resource,
          cacheDate: new Date(resource.metadata.cachedAt),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        })
      );

      // Queue for sync if premium user
      if (userType === 'premium') {
        await this.queueForSync(resource);
      }
    } catch (error) {
      console.error('Error caching resource:', error);
      throw error;
    }
  }

  /**
   * Enforce storage limits based on user type
   */
  private static async enforceStorageLimits(
    resourceType: string,
    userType: UserType
  ): Promise<void> {
    const limits = this.getLimits(userType, resourceType);

    if (limits.max === Infinity) {
      return; // No limits for premium users on certain resources
    }

    const currentResources = await this.getResourcesByType(resourceType);

    if (currentResources.length >= limits.max) {
      // Sort by last accessed time (LRU)
      const sorted = currentResources.sort((a, b) =>
        a.metadata.lastAccessed - b.metadata.lastAccessed
      );

      // Remove the least recently used
      const toRemove = sorted.slice(0, currentResources.length - limits.max + 1);

      for (const resource of toRemove) {
        await this.removeResource(resource.type, resource.id);
      }
    }
  }

  /**
   * Get storage limits for a user type and resource type
   */
  private static getLimits(userType: UserType, resourceType: string): StorageLimit {
    const typeKey = resourceType as keyof typeof STORAGE_LIMITS.guest;
    return {
      max: STORAGE_LIMITS[userType][typeKey] || 0,
      type: resourceType
    };
  }

  /**
   * Get all resources of a specific type
   */
  static async getResourcesByType(type: string): Promise<CachedResource[]> {
    console.log(`[Storage] getResourcesByType called for type: ${type}`);
    try {
      const resources: CachedResource[] = [];

      // Get all items and filter in memory since performDBOperation expects IDBRequest
      const allItems = await performDBOperation('apiCache', 'readonly', (store) => 
        store.getAll()
      );
      
      console.log(`[Storage] Filtering ${allItems.length} items for type: ${type}`);
      
      for (const item of allItems) {
        if (item && item.endpoint === type) {
          const resource = this.transformToCachedResource(item);
          if (resource) {
            resources.push(resource);
          }
        }
      }
      
      console.log(`[Storage] Found ${resources.length} resources of type: ${type}`);

      return resources;
    } catch (error) {
      console.error('Error getting resources by type:', error);
      return [];
    }
  }

  /**
   * Clear all resources of a specific type
   */
  static async clearResourcesByType(type: string): Promise<void> {
    try {
      // Get all items first
      const allItems = await performDBOperation('apiCache', 'readonly', (store) => 
        store.getAll()
      );
      
      // Filter items to delete
      const itemsToDelete = allItems.filter(item => item && item.endpoint === type);
      
      if (itemsToDelete.length > 0) {
        // Delete each item
        const db = await initializeDB();
        const transaction = db.transaction(['apiCache'], 'readwrite');
        const store = transaction.objectStore('apiCache');
        
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          
          itemsToDelete.forEach(item => {
            store.delete(item.id);
          });
        });
      }
    } catch (error) {
      console.error('Error clearing resources by type:', error);
      throw error;
    }
  }

  /**
   * Remove a specific resource
   */
  static async removeResource(type: string, id: string): Promise<void> {
    try {
      const cacheKey = `${type}:${id}`;
      await performDBOperation('apiCache', 'readwrite', (store) =>
        store.delete(cacheKey)
      );
    } catch (error) {
      console.error('Error removing resource:', error);
    }
  }

  /**
   * Update last accessed time for a resource
   */
  private static async updateLastAccessed(type: string, id: string): Promise<void> {
    const cacheKey = `${type}:${id}`;
    const cached = await performDBOperation('apiCache', 'readonly', (store) =>
      store.get(cacheKey)
    );

    if (cached) {
      cached.response.metadata.lastAccessed = Date.now();
      await performDBOperation('apiCache', 'readwrite', (store) =>
        store.put(cached)
      );
    }
  }

  /**
   * Check if a cached resource is still valid
   */
  private static isResourceValid(cached: any): boolean {
    if (!cached || !cached.expiryDate) return false;
    return new Date() <= new Date(cached.expiryDate);
  }

  /**
   * Transform API cache data to CachedResource format
   */
  private static transformToCachedResource(cached: any): CachedResource | null {
    if (!cached) return null;

    // If it has a response property, use that (from getCachedResource)
    if (cached.response) {
      return cached.response as CachedResource;
    }

    // Otherwise, try to construct from the raw data (from getResourcesByType)
    if (cached.data && cached.id && cached.endpoint) {
      try {
        return {
          id: cached.id,
          type: cached.endpoint as ResourceType,
          data: cached.data,
          metadata: {
            size: cached.size || 0,
            cachedAt: cached.timestamp || cached.cacheDate || Date.now(),
            lastAccessed: cached.timestamp || cached.cacheDate || Date.now(),
            expiresAt: cached.expiryDate || Date.now() + 86400000,
            version: 1,
            checksum: cached.checksum || ''
          }
        };
      } catch (error) {
        console.error('Error transforming cached resource:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Queue resource for background sync (premium users)
   */
  private static async queueForSync(resource: CachedResource): Promise<void> {
    // Store sync queue in localStorage for now
    const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    syncQueue.push({
      resourceId: resource.id,
      resourceType: resource.type,
      timestamp: Date.now()
    });
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));

    // Trigger background sync if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_REQUIRED',
        data: { resourceId: resource.id, resourceType: resource.type }
      });
    }
  }

  /**
   * Calculate size of a resource including all assets
   */
  static calculateResourceSize(data: any, images?: Map<string, Blob>, audio?: Map<string, Blob>): number {
    let size = JSON.stringify(data).length;

    if (images) {
      images.forEach(blob => {
        size += blob.size;
      });
    }

    if (audio) {
      audio.forEach(blob => {
        size += blob.size;
      });
    }

    return size;
  }

  /**
   * Generate checksum for data integrity
   */
  static async generateChecksum(data: any): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(userType: UserType): Promise<{
    usage: Record<string, number>;
    limits: Record<string, number>;
    percentage: number;
  }> {
    const usage: Record<string, number> = {};
    const limits = STORAGE_LIMITS[userType];

    // Count resources by type
    for (const resourceType of Object.keys(limits)) {
      const resources = await this.getResourcesByType(resourceType);
      usage[resourceType] = resources.length;
    }

    // Calculate overall percentage
    const totalUsed = Object.values(usage).reduce((sum, count) => sum + count, 0);
    const totalLimit = Object.values(limits).reduce((sum, limit) =>
      sum + (limit === Infinity ? 1000 : limit), 0
    );
    const percentage = (totalUsed / totalLimit) * 100;

    return { usage, limits, percentage };
  }

  /**
   * Clear all cached resources
   */
  static async clearAllCachedResources(): Promise<void> {
    await performDBOperation('apiCache', 'readwrite', (store) =>
      store.clear()
    );
  }

  /**
   * Batch cache multiple resources
   */
  static async batchCache(
    resources: CachedResource[],
    userType: UserType
  ): Promise<void> {
    // Process in batches to avoid overwhelming the system
    const BATCH_SIZE = 5;

    for (let i = 0; i < resources.length; i += BATCH_SIZE) {
      const batch = resources.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(resource =>
          this.cacheResource(resource, userType).catch(console.error)
        )
      );
    }
  }

  /**
   * Save data with caching support
   */
  static async saveData(key: string, data: any): Promise<void> {
    // Save to parent storage system
    await super.saveSettings(data);

    // Also cache if it's a cacheable resource type
    const cacheableTypes = ['article', 'story', 'kanji', 'verb', 'adjective'];
    if (cacheableTypes.includes(key)) {
      // Transform to CachedResource format
      const resource: CachedResource = {
        id: data.id || key,
        type: key as any,
        data,
        metadata: {
          size: JSON.stringify(data).length,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: await this.generateChecksum(data)
        }
      };

      // Get user type (would come from auth context in real implementation)
      const userType: UserType = 'free'; // Default for now
      await this.cacheResource(resource, userType);
    }
  }

  /**
   * Load data with cache checking
   */
  static async loadData(key: string): Promise<any> {
    // Check cache first
    const cached = await this.getCachedResource(key, key);
    if (cached) {
      return cached.data;
    }

    // Fall back to parent storage
    return super.loadSettings();
  }

  /**
   * Generic store access methods for StatsTracker
   */
  static async getFromStore(storeName: string, key: string): Promise<any> {
    if (!isIndexedDBAvailable()) {
      // Fallback to localStorage
      const data = localStorage.getItem(`${storeName}_${key}`);
      return data ? JSON.parse(data) : null;
    }

    try {
      const db = await initializeDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error getting from store ${storeName}:`, error);
      // Fallback to localStorage
      const data = localStorage.getItem(`${storeName}_${key}`);
      return data ? JSON.parse(data) : null;
    }
  }

  static async saveToStore(storeName: string, key: string, value: any): Promise<void> {
    if (!isIndexedDBAvailable()) {
      // Fallback to localStorage
      localStorage.setItem(`${storeName}_${key}`, JSON.stringify(value));
      return;
    }

    try {
      const db = await initializeDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ ...value, id: key });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error saving to store ${storeName}:`, error);
      // Fallback to localStorage
      localStorage.setItem(`${storeName}_${key}`, JSON.stringify(value));
    }
  }

  static async deleteFromStore(storeName: string, key: string): Promise<void> {
    if (!isIndexedDBAvailable()) {
      // Fallback to localStorage
      localStorage.removeItem(`${storeName}_${key}`);
      return;
    }

    try {
      const db = await initializeDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error deleting from store ${storeName}:`, error);
      // Fallback to localStorage
      localStorage.removeItem(`${storeName}_${key}`);
    }
  }
}

// Export as default
export default EnhancedStorageManager2;
