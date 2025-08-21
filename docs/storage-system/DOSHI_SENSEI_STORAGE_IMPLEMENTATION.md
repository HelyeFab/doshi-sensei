# Doshi Sensei Storage Implementation Guide

## Project Overview

Doshi Sensei is a comprehensive Japanese language learning platform that requires robust storage capabilities to support offline learning, user progress tracking, and seamless cross-device synchronization. This document outlines the complete storage implementation strategy.

## Storage Requirements Analysis

### Core Data Types

1. **User Generated Content**
   - Study lists and custom vocabulary
   - Learning progress and statistics
   - User preferences and settings
   - Achievement data and streaks

2. **Educational Content**
   - Kanji character data and stroke orders
   - Vocabulary with audio pronunciations
   - Grammar rules and conjugation patterns
   - Example sentences and usage contexts

3. **Media Assets**
   - Audio files for pronunciation
   - Images for visual learning aids
   - Video content for immersive learning
   - Downloadable content for offline use

4. **Application Cache**
   - API response caching
   - Computed results and derived data
   - Temporary state information
   - Session data

### Storage Size Estimations

| Data Type | Per Item | Total Estimate | Storage Method |
|-----------|----------|----------------|----------------|
| User Progress | 1-5KB | 1-10MB | IndexedDB |
| Kanji Data | 2-10KB | 50-100MB | IndexedDB |
| Vocabulary | 1-3KB | 20-50MB | IndexedDB |
| Audio Files | 10-100KB | 500MB-2GB | IndexedDB + Cache |
| Images | 5-50KB | 100-500MB | IndexedDB + Cache |
| App Cache | Variable | 50-200MB | Multiple layers |

## Storage Architecture Implementation

### Layer 1: Memory Cache (Fastest Access)

```typescript
class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 10 * 1024 * 1024; // 10MB
  private currentSize = 0;

  set(key: string, value: any, ttl = 300000): boolean {
    const serialized = JSON.stringify(value);
    const size = new Blob([serialized]).size;
    
    if (size > this.maxSize * 0.1) {
      return false; // Item too large for memory cache
    }
    
    this.evictIfNeeded(size);
    
    this.cache.set(key, {
      value,
      serialized,
      size,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    });
    
    this.currentSize += size;
    return true;
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }
    
    item.accessCount++;
    return item.value;
  }

  private evictIfNeeded(newItemSize: number): void {
    while (this.currentSize + newItemSize > this.maxSize && this.cache.size > 0) {
      // LRU eviction based on access time and frequency
      let oldestKey = '';
      let oldestScore = Infinity;
      
      for (const [key, item] of this.cache) {
        const score = item.timestamp + (item.accessCount * 10000);
        if (score < oldestScore) {
          oldestScore = score;
          oldestKey = key;
        }
      }
      
      this.delete(oldestKey);
    }
  }
}
```

### Layer 2: LocalStorage (Small Persistent Data)

```typescript
class LocalStorageLayer {
  private prefix = 'doshi_';
  private maxKeyLength = 2048; // localStorage key limit
  
  set(key: string, value: any, options: StorageOptions = {}): boolean {
    try {
      const fullKey = this.prefix + key;
      const serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        ttl: options.ttl || 0,
        version: options.version || 1
      });
      
      if (serialized.length > 5 * 1024 * 1024) {
        throw new Error('Item too large for localStorage');
      }
      
      localStorage.setItem(fullKey, serialized);
      return true;
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this.cleanupExpired();
        // Retry once after cleanup
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  get(key: string): any | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      if (parsed.ttl > 0 && Date.now() - parsed.timestamp > parsed.ttl) {
        this.delete(key);
        return null;
      }
      
      return parsed.value;
      
    } catch {
      return null;
    }
  }

  private cleanupExpired(): void {
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key)!);
          if (item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
            keysToDelete.push(key);
          }
        } catch {
          keysToDelete.push(key); // Remove corrupted items
        }
      }
    }
    
    keysToDelete.forEach(key => localStorage.removeItem(key));
  }
}
```

### Layer 3: IndexedDB (Large Persistent Data)

```typescript
class IndexedDBLayer {
  private db: IDBDatabase | null = null;
  private dbName = 'doshi-sensei-db';
  private version = 1;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  private createStores(db: IDBDatabase): void {
    // Main cache store
    if (!db.objectStoreNames.contains('cache')) {
      const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
      cacheStore.createIndex('timestamp', 'timestamp');
      cacheStore.createIndex('category', 'category');
      cacheStore.createIndex('size', 'size');
    }

    // User data store
    if (!db.objectStoreNames.contains('userData')) {
      const userStore = db.createObjectStore('userData', { keyPath: 'id' });
      userStore.createIndex('userId', 'userId');
      userStore.createIndex('type', 'type');
      userStore.createIndex('lastModified', 'lastModified');
    }

    // Educational content store
    if (!db.objectStoreNames.contains('content')) {
      const contentStore = db.createObjectStore('content', { keyPath: 'id' });
      contentStore.createIndex('type', 'type');
      contentStore.createIndex('category', 'category');
      contentStore.createIndex('lastAccessed', 'lastAccessed');
    }

    // Media assets store
    if (!db.objectStoreNames.contains('media')) {
      const mediaStore = db.createObjectStore('media', { keyPath: 'url' });
      mediaStore.createIndex('contentType', 'contentType');
      mediaStore.createIndex('size', 'size');
      mediaStore.createIndex('lastAccessed', 'lastAccessed');
    }
  }

  async set(storeName: string, key: string, value: any, options: StorageOptions = {}): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const item = {
        key,
        value,
        timestamp: Date.now(),
        ttl: options.ttl || 0,
        category: options.category || 'general',
        size: new Blob([JSON.stringify(value)]).size,
        lastAccessed: Date.now(),
        metadata: options.metadata || {}
      };
      
      const request = store.put(item);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName: string, key: string): Promise<any | null> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check TTL
        if (result.ttl > 0 && Date.now() - result.timestamp > result.ttl) {
          this.delete(storeName, key);
          resolve(null);
          return;
        }
        
        // Update last accessed
        this.updateLastAccessed(storeName, key);
        
        resolve(result.value);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async updateLastAccessed(storeName: string, key: string): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(key);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.lastAccessed = Date.now();
        store.put(item);
      }
    };
  }

  async getStorageInfo(): Promise<StorageInfo> {
    if (!this.db) await this.initialize();
    
    const stores = ['cache', 'userData', 'content', 'media'];
    const info: StorageInfo = {
      quota: 0,
      used: 0,
      available: 0,
      breakdown: {},
      itemCounts: {}
    };
    
    // Get quota information
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      info.quota = estimate.quota || 0;
      info.used = estimate.usage || 0;
      info.available = info.quota - info.used;
    }
    
    // Calculate per-store usage
    for (const storeName of stores) {
      const storeInfo = await this.getStoreInfo(storeName);
      info.breakdown[storeName] = storeInfo.totalSize;
      info.itemCounts[storeName] = storeInfo.itemCount;
    }
    
    return info;
  }

  private async getStoreInfo(storeName: string): Promise<{totalSize: number, itemCount: number}> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result;
        const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
        resolve({
          totalSize,
          itemCount: items.length
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}
```

### Layer 4: Firebase Integration (Cloud Sync)

```typescript
class FirebaseStorageLayer {
  private firestore: FirebaseFirestore;
  private storage: FirebaseStorage;
  private auth: FirebaseAuth;

  constructor() {
    this.firestore = getFirestore();
    this.storage = getStorage();
    this.auth = getAuth();
  }

  async syncUserData(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // Get local data that needs syncing
      const localData = await this.getLocalSyncData(userId);
      
      // Get remote data
      const remoteData = await this.getRemoteUserData(userId);
      
      // Resolve conflicts and determine sync operations
      const syncPlan = this.createSyncPlan(localData, remoteData);
      
      // Execute sync operations
      for (const operation of syncPlan.operations) {
        try {
          switch (operation.type) {
            case 'upload':
              await this.uploadData(operation.data);
              result.uploaded++;
              break;
              
            case 'download':
              await this.downloadData(operation.data);
              result.downloaded++;
              break;
              
            case 'conflict':
              await this.resolveConflict(operation.data);
              result.conflicts++;
              break;
          }
        } catch (error) {
          result.errors.push({
            operation: operation.type,
            data: operation.data.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
    } catch (error) {
      result.errors.push({
        operation: 'sync',
        data: 'general',
        error: error instanceof Error ? error.message : 'Sync failed'
      });
    }

    return result;
  }

  private async getRemoteUserData(userId: string): Promise<UserData[]> {
    const snapshot = await getDocs(
      collection(this.firestore, 'users', userId, 'data')
    );
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastModified: doc.data().lastModified?.toMillis() || 0
    })) as UserData[];
  }

  private createSyncPlan(local: UserData[], remote: UserData[]): SyncPlan {
    const localMap = new Map(local.map(item => [item.id, item]));
    const remoteMap = new Map(remote.map(item => [item.id, item]));
    
    const operations: SyncOperation[] = [];
    
    // Check local items
    for (const [id, localItem] of localMap) {
      const remoteItem = remoteMap.get(id);
      
      if (!remoteItem) {
        // Local only - upload
        operations.push({
          type: 'upload',
          data: localItem
        });
      } else if (localItem.lastModified > remoteItem.lastModified) {
        // Local newer - upload
        operations.push({
          type: 'upload',
          data: localItem
        });
      } else if (remoteItem.lastModified > localItem.lastModified) {
        // Remote newer - download
        operations.push({
          type: 'download',
          data: remoteItem
        });
      }
      // If equal, no action needed
    }
    
    // Check remote-only items
    for (const [id, remoteItem] of remoteMap) {
      if (!localMap.has(id)) {
        operations.push({
          type: 'download',
          data: remoteItem
        });
      }
    }
    
    return { operations };
  }
}
```

## Unified Storage Manager Implementation

```typescript
export class EnhancedStorageManager2 {
  private static instance: EnhancedStorageManager2;
  private memoryCache: MemoryCache;
  private localStorageLayer: LocalStorageLayer;
  private indexedDBLayer: IndexedDBLayer;
  private firebaseLayer: FirebaseStorageLayer;
  private isInitialized = false;

  private constructor() {
    this.memoryCache = new MemoryCache();
    this.localStorageLayer = new LocalStorageLayer();
    this.indexedDBLayer = new IndexedDBLayer();
    this.firebaseLayer = new FirebaseStorageLayer();
  }

  static getInstance(): EnhancedStorageManager2 {
    if (!EnhancedStorageManager2.instance) {
      EnhancedStorageManager2.instance = new EnhancedStorageManager2();
    }
    return EnhancedStorageManager2.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.indexedDBLayer.initialize();
    this.isInitialized = true;
  }

  async setItem(key: string, value: any, options: StorageOptions = {}): Promise<boolean> {
    await this.initialize();
    
    const size = this.calculateSize(value);
    const storageLayer = this.selectStorageLayer(size, options);
    
    // Always try memory cache first for small items
    if (size < 100 * 1024) { // 100KB
      this.memoryCache.set(key, value, options.ttl);
    }
    
    // Store in appropriate persistent layer
    switch (storageLayer) {
      case 'localStorage':
        return this.localStorageLayer.set(key, value, options);
        
      case 'indexedDB':
        return this.indexedDBLayer.set('cache', key, value, options);
        
      case 'firebase':
        // Firebase storage implementation
        return this.firebaseLayer.set(key, value, options);
        
      default:
        return false;
    }
  }

  async getItem<T>(key: string, options: GetOptions = {}): Promise<T | null> {
    await this.initialize();
    
    // Check memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== null) {
      return memoryResult as T;
    }
    
    // Check localStorage
    const localResult = this.localStorageLayer.get(key);
    if (localResult !== null) {
      // Cache in memory for future access
      this.memoryCache.set(key, localResult);
      return localResult as T;
    }
    
    // Check IndexedDB
    const indexedDBResult = await this.indexedDBLayer.get('cache', key);
    if (indexedDBResult !== null) {
      // Cache in memory and localStorage if small enough
      this.memoryCache.set(key, indexedDBResult);
      if (this.calculateSize(indexedDBResult) < 5 * 1024) { // 5KB
        this.localStorageLayer.set(key, indexedDBResult, { ttl: 3600000 }); // 1 hour
      }
      return indexedDBResult as T;
    }
    
    // If not found and default value provided
    if (options.defaultValue !== undefined) {
      return options.defaultValue as T;
    }
    
    return null;
  }

  private selectStorageLayer(size: number, options: StorageOptions): StorageLayer {
    // Force specific layer if requested
    if (options.storageLayer) {
      return options.storageLayer;
    }
    
    // Size-based selection
    if (size < 5 * 1024) { // < 5KB
      return 'localStorage';
    } else if (size < 100 * 1024 * 1024) { // < 100MB
      return 'indexedDB';
    } else {
      return 'firebase';
    }
  }

  private calculateSize(value: any): number {
    return new Blob([JSON.stringify(value)]).size;
  }

  async getStorageInfo(): Promise<StorageInfo> {
    await this.initialize();
    return this.indexedDBLayer.getStorageInfo();
  }

  async cleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      itemsRemoved: 0,
      spaceFreed: 0,
      errors: []
    };

    try {
      // Cleanup memory cache
      this.memoryCache.cleanup();
      
      // Cleanup localStorage
      this.localStorageLayer.cleanupExpired();
      
      // Cleanup IndexedDB
      const indexedDBCleanup = await this.indexedDBLayer.cleanup();
      result.itemsRemoved += indexedDBCleanup.itemsRemoved;
      result.spaceFreed += indexedDBCleanup.spaceFreed;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Cleanup failed');
    }

    return result;
  }
}
```

## React Integration Hooks

```typescript
// src/hooks/useStorage.ts
export function useStorage<T>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T | null>(defaultValue || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const storageManager = EnhancedStorageManager2.getInstance();
  
  useEffect(() => {
    let mounted = true;
    
    const loadValue = async () => {
      try {
        setLoading(true);
        const stored = await storageManager.getItem<T>(key, { defaultValue });
        
        if (mounted) {
          setValue(stored);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Storage error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadValue();
    
    return () => {
      mounted = false;
    };
  }, [key, defaultValue]);
  
  const updateValue = useCallback(async (newValue: T, options?: StorageOptions) => {
    try {
      const success = await storageManager.setItem(key, newValue, options);
      if (success) {
        setValue(newValue);
        setError(null);
      } else {
        setError('Failed to save to storage');
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Storage error';
      setError(errorMessage);
      return false;
    }
  }, [key, storageManager]);
  
  return {
    value,
    setValue: updateValue,
    loading,
    error,
    reload: () => loadValue()
  };
}

// src/hooks/useStorageInfo.ts
export function useStorageInfo() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  const storageManager = EnhancedStorageManager2.getInstance();
  
  const refreshInfo = useCallback(async () => {
    setLoading(true);
    try {
      const storageInfo = await storageManager.getStorageInfo();
      setInfo(storageInfo);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    } finally {
      setLoading(false);
    }
  }, [storageManager]);
  
  useEffect(() => {
    refreshInfo();
  }, [refreshInfo]);
  
  return {
    info,
    loading,
    refresh: refreshInfo
  };
}
```

## Performance Optimization Strategies

### 1. Lazy Loading
```typescript
class LazyStorageManager {
  private componentCaches = new Map<string, any>();
  
  async getComponentData(componentId: string, loader: () => Promise<any>): Promise<any> {
    if (this.componentCaches.has(componentId)) {
      return this.componentCaches.get(componentId);
    }
    
    const cached = await this.getItem(`component:${componentId}`);
    if (cached) {
      this.componentCaches.set(componentId, cached);
      return cached;
    }
    
    const data = await loader();
    this.componentCaches.set(componentId, data);
    await this.setItem(`component:${componentId}`, data, { ttl: 3600000 });
    
    return data;
  }
}
```

### 2. Background Sync
```typescript
class BackgroundSyncManager {
  private syncQueue: SyncOperation[] = [];
  private isOnline = navigator.onLine;
  
  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  queueSync(operation: SyncOperation): void {
    this.syncQueue.push(operation);
    
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }
  
  private async processSyncQueue(): Promise<void> {
    while (this.syncQueue.length > 0 && this.isOnline) {
      const operation = this.syncQueue.shift()!;
      
      try {
        await this.executeSync(operation);
      } catch (error) {
        // Re-queue on failure
        this.syncQueue.unshift(operation);
        break;
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('EnhancedStorageManager2', () => {
  let storageManager: EnhancedStorageManager2;
  
  beforeEach(() => {
    storageManager = EnhancedStorageManager2.getInstance();
  });
  
  test('should store and retrieve small items in localStorage', async () => {
    const key = 'test-small';
    const value = { message: 'Hello World' };
    
    await storageManager.setItem(key, value);
    const retrieved = await storageManager.getItem(key);
    
    expect(retrieved).toEqual(value);
  });
  
  test('should store large items in IndexedDB', async () => {
    const key = 'test-large';
    const value = { data: 'x'.repeat(100000) }; // 100KB
    
    await storageManager.setItem(key, value);
    const retrieved = await storageManager.getItem(key);
    
    expect(retrieved).toEqual(value);
  });
  
  test('should handle storage errors gracefully', async () => {
    // Mock quota exceeded error
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    
    const result = await storageManager.setItem('test', { data: 'test' });
    expect(result).toBe(false);
  });
});
```

### Integration Tests
```typescript
describe('Storage Integration', () => {
  test('should sync data between layers', async () => {
    const storageManager = EnhancedStorageManager2.getInstance();
    
    // Store in IndexedDB
    await storageManager.setItem('sync-test', { value: 'test' });
    
    // Should be available from all layers
    const memoryResult = storageManager['memoryCache'].get('sync-test');
    const indexedDBResult = await storageManager.getItem('sync-test');
    
    expect(memoryResult).toEqual({ value: 'test' });
    expect(indexedDBResult).toEqual({ value: 'test' });
  });
});
```

## Deployment and Monitoring

### Performance Monitoring
```typescript
class StorageMonitor {
  private metrics = {
    operationTimes: new Map<string, number[]>(),
    errorCounts: new Map<string, number>(),
    cacheHitRates: new Map<string, { hits: number, misses: number }>()
  };
  
  recordOperation(operation: string, duration: number): void {
    if (!this.metrics.operationTimes.has(operation)) {
      this.metrics.operationTimes.set(operation, []);
    }
    this.metrics.operationTimes.get(operation)!.push(duration);
  }
  
  recordError(operation: string): void {
    const current = this.metrics.errorCounts.get(operation) || 0;
    this.metrics.errorCounts.set(operation, current + 1);
  }
  
  getReport(): PerformanceReport {
    return {
      averageOperationTimes: this.calculateAverages(),
      errorRates: this.calculateErrorRates(),
      cacheEfficiency: this.calculateCacheEfficiency()
    };
  }
}
```

### Health Checks
```typescript
class StorageHealthChecker {
  async performHealthCheck(): Promise<HealthReport> {
    const report: HealthReport = {
      overall: 'healthy',
      layers: {},
      issues: [],
      recommendations: []
    };
    
    // Check each storage layer
    report.layers.localStorage = await this.checkLocalStorage();
    report.layers.indexedDB = await this.checkIndexedDB();
    report.layers.memory = await this.checkMemoryCache();
    
    // Determine overall health
    const layerStatuses = Object.values(report.layers);
    if (layerStatuses.some(status => status === 'critical')) {
      report.overall = 'critical';
    } else if (layerStatuses.some(status => status === 'warning')) {
      report.overall = 'warning';
    }
    
    return report;
  }
}
```

## Security Considerations

### Data Encryption
```typescript
class EncryptionManager {
  private key: CryptoKey | null = null;
  
  async initialize(): Promise<void> {
    if (!crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }
    
    // Generate or retrieve encryption key
    this.key = await this.getOrCreateKey();
  }
  
  async encrypt(data: any): Promise<EncryptedData> {
    if (!this.key) await this.initialize();
    
    const plaintext = JSON.stringify(data);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key!,
      encoder.encode(plaintext)
    );
    
    return {
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      algorithm: 'AES-GCM'
    };
  }
  
  async decrypt(encryptedData: EncryptedData): Promise<any> {
    if (!this.key) await this.initialize();
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
      this.key!,
      new Uint8Array(encryptedData.data)
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}
```

### Access Control
```typescript
class AccessControlManager {
  private userPermissions = new Map<string, Set<string>>();
  
  checkAccess(userId: string, resource: string, operation: 'read' | 'write' | 'delete'): boolean {
    const permissions = this.userPermissions.get(userId);
    if (!permissions) return false;
    
    return permissions.has(`${resource}:${operation}`) || 
           permissions.has(`${resource}:*`) || 
           permissions.has(`*:${operation}`);
  }
  
  async secureSetItem(userId: string, key: string, value: any, options?: StorageOptions): Promise<boolean> {
    if (!this.checkAccess(userId, key, 'write')) {
      throw new Error('Access denied: insufficient permissions');
    }
    
    // Add user context to storage key
    const secureKey = `user:${userId}:${key}`;
    
    return EnhancedStorageManager2.getInstance().setItem(secureKey, value, options);
  }
}
```

## Migration and Versioning

### Schema Migration
```typescript
class MigrationManager {
  private migrations = new Map<number, Migration>();
  
  registerMigration(version: number, migration: Migration): void {
    this.migrations.set(version, migration);
  }
  
  async migrate(fromVersion: number, toVersion: number): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: []
    };
    
    for (let version = fromVersion + 1; version <= toVersion; version++) {
      const migration = this.migrations.get(version);
      if (!migration) {
        result.errors.push(`No migration found for version ${version}`);
        result.success = false;
        continue;
      }
      
      try {
        const migrationResult = await migration.execute();
        result.migratedItems += migrationResult.itemsProcessed;
      } catch (error) {
        result.errors.push(`Migration ${version} failed: ${error}`);
        result.success = false;
      }
    }
    
    return result;
  }
}
```

This comprehensive implementation provides a robust, scalable storage solution for Doshi Sensei that handles all requirements while maintaining performance, security, and user experience standards.

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Author: Storage Implementation Team*