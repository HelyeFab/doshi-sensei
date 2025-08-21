# Storage API Reference - Doshi Sensei

## Enhanced Storage Manager v2 API

### Core Methods

#### `getInstance(): EnhancedStorageManager2`
Returns the singleton instance of the Enhanced Storage Manager.

```typescript
const storageManager = EnhancedStorageManager2.getInstance();
```

#### `setItem(key: string, value: any, options?: StorageOptions): Promise<boolean>`
Stores an item using the optimal storage layer based on size and options.

**Parameters:**
- `key`: Unique identifier for the stored item
- `value`: Data to store (will be serialized automatically)
- `options`: Optional configuration object

**Returns:** Promise<boolean> - Success status

**Example:**
```typescript
const success = await storageManager.setItem('user-preferences', {
  theme: 'dark',
  language: 'ja'
}, {
  ttl: 86400, // 24 hours
  syncToCloud: true
});
```

#### `getItem<T>(key: string, options?: GetOptions): Promise<T | null>`
Retrieves an item from storage with automatic type casting.

**Parameters:**
- `key`: Identifier of the item to retrieve
- `options`: Optional configuration for retrieval

**Returns:** Promise<T | null> - The stored item or null if not found

**Example:**
```typescript
interface UserPrefs {
  theme: string;
  language: string;
}

const prefs = await storageManager.getItem<UserPrefs>('user-preferences');
```

#### `removeItem(key: string): Promise<boolean>`
Removes an item from all storage layers.

**Parameters:**
- `key`: Identifier of the item to remove

**Returns:** Promise<boolean> - Success status

#### `clear(pattern?: string): Promise<boolean>`
Clears items from storage, optionally matching a pattern.

**Parameters:**
- `pattern`: Optional regex pattern to match keys

**Returns:** Promise<boolean> - Success status

**Example:**
```typescript
// Clear all cache items
await storageManager.clear('cache:*');

// Clear everything
await storageManager.clear();
```

### Cache-Specific Methods

#### `getCachedResponse<T>(endpoint: string, options?: CacheOptions): Promise<T | null>`
Retrieves a cached API response.

**Parameters:**
- `endpoint`: API endpoint URL
- `options`: Cache configuration options

**Returns:** Promise<T | null> - Cached response or null

#### `setCachedResponse<T>(endpoint: string, response: T, options?: CacheOptions): Promise<boolean>`
Stores an API response in cache.

**Parameters:**
- `endpoint`: API endpoint URL
- `response`: Response data to cache
- `options`: Cache configuration

**Returns:** Promise<boolean> - Success status

#### `invalidateCache(pattern: string): Promise<boolean>`
Invalidates cached items matching a pattern.

**Parameters:**
- `pattern`: Pattern to match for invalidation

**Returns:** Promise<boolean> - Success status

### Advanced Storage Operations

#### `batchSet(items: BatchSetItem[]): Promise<BatchResult>`
Performs multiple set operations in a single transaction.

**Parameters:**
- `items`: Array of items to set

**Returns:** Promise<BatchResult> - Results of batch operation

**Example:**
```typescript
const result = await storageManager.batchSet([
  { key: 'item1', value: 'data1' },
  { key: 'item2', value: 'data2' },
  { key: 'item3', value: 'data3' }
]);
```

#### `batchGet(keys: string[]): Promise<BatchGetResult>`
Retrieves multiple items in a single operation.

**Parameters:**
- `keys`: Array of keys to retrieve

**Returns:** Promise<BatchGetResult> - Retrieved items

#### `exists(key: string): Promise<boolean>`
Checks if an item exists in storage.

**Parameters:**
- `key`: Key to check

**Returns:** Promise<boolean> - Existence status

### Storage Analytics

#### `getStorageInfo(): Promise<StorageInfo>`
Returns detailed information about storage usage.

**Returns:** Promise<StorageInfo> - Storage statistics

**Example:**
```typescript
const info = await storageManager.getStorageInfo();
console.log(`Used: ${info.used}MB of ${info.quota}MB`);
```

#### `getStorageHealth(): Promise<StorageHealth>`
Performs health checks on storage systems.

**Returns:** Promise<StorageHealth> - Health status

### Migration and Maintenance

#### `migrateData(fromVersion: number, toVersion: number): Promise<MigrationResult>`
Migrates data between storage schema versions.

**Parameters:**
- `fromVersion`: Source schema version
- `toVersion`: Target schema version

**Returns:** Promise<MigrationResult> - Migration results

#### `compactStorage(): Promise<CompactionResult>`
Compacts storage by removing expired and orphaned data.

**Returns:** Promise<CompactionResult> - Compaction statistics

#### `repairStorage(): Promise<RepairResult>`
Attempts to repair corrupted storage data.

**Returns:** Promise<RepairResult> - Repair results

## Configuration Interfaces

### StorageOptions

```typescript
interface StorageOptions {
  // Time-to-live in seconds
  ttl?: number;
  
  // Force specific storage layer
  storageLayer?: 'localStorage' | 'indexedDB' | 'memory';
  
  // Enable cloud synchronization
  syncToCloud?: boolean;
  
  // Compression options
  compress?: boolean;
  
  // Encryption options
  encrypt?: boolean;
  
  // Tags for categorization
  tags?: string[];
  
  // Priority for cache eviction
  priority?: 'low' | 'normal' | 'high';
}
```

### GetOptions

```typescript
interface GetOptions {
  // Return default value if not found
  defaultValue?: any;
  
  // Refresh from source if expired
  autoRefresh?: boolean;
  
  // Maximum age to accept (seconds)
  maxAge?: number;
  
  // Include metadata in response
  includeMetadata?: boolean;
}
```

### CacheOptions

```typescript
interface CacheOptions extends StorageOptions {
  // Cache strategy
  strategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
  
  // Stale-while-revalidate settings
  staleWhileRevalidate?: boolean;
  
  // Background refresh settings
  backgroundRefresh?: boolean;
}
```

## Response Interfaces

### StorageInfo

```typescript
interface StorageInfo {
  // Total quota in bytes
  quota: number;
  
  // Used space in bytes
  used: number;
  
  // Available space in bytes
  available: number;
  
  // Usage by storage layer
  breakdown: {
    localStorage: number;
    indexedDB: number;
    memory: number;
  };
  
  // Number of items by layer
  itemCounts: {
    localStorage: number;
    indexedDB: number;
    memory: number;
  };
}
```

### BatchResult

```typescript
interface BatchResult {
  // Number of successful operations
  succeeded: number;
  
  // Number of failed operations
  failed: number;
  
  // Details of failures
  errors: Array<{
    key: string;
    error: string;
  }>;
  
  // Total time taken
  duration: number;
}
```

### StorageHealth

```typescript
interface StorageHealth {
  // Overall health status
  status: 'healthy' | 'warning' | 'critical';
  
  // Individual layer health
  layers: {
    localStorage: LayerHealth;
    indexedDB: LayerHealth;
    memory: LayerHealth;
  };
  
  // Issues found
  issues: Array<{
    severity: 'info' | 'warning' | 'error';
    message: string;
    layer?: string;
  }>;
  
  // Recommendations
  recommendations: string[];
}
```

## Error Handling

### StorageError

```typescript
class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public layer?: string,
    public operation?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

enum StorageErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  CORRUPTION_DETECTED = 'CORRUPTION_DETECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Error Handling Examples

```typescript
try {
  await storageManager.setItem('large-data', hugObject);
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.code) {
      case StorageErrorCode.QUOTA_EXCEEDED:
        // Handle quota exceeded
        break;
      case StorageErrorCode.ACCESS_DENIED:
        // Handle access denied
        break;
      default:
        // Handle other errors
        break;
    }
  }
}
```

## Usage Patterns

### Basic Key-Value Storage

```typescript
// Simple storage
await storageManager.setItem('user-id', '12345');
const userId = await storageManager.getItem<string>('user-id');

// With options
await storageManager.setItem('session-data', sessionObj, {
  ttl: 3600, // 1 hour
  storageLayer: 'memory'
});
```

### API Response Caching

```typescript
// Cache API response
const response = await fetch('/api/data');
const data = await response.json();
await storageManager.setCachedResponse('/api/data', data, {
  ttl: 300, // 5 minutes
  strategy: 'network-first'
});

// Retrieve cached response
const cachedData = await storageManager.getCachedResponse('/api/data');
```

### Batch Operations

```typescript
// Batch set user preferences
await storageManager.batchSet([
  { key: 'theme', value: 'dark' },
  { key: 'language', value: 'ja' },
  { key: 'notifications', value: true }
]);

// Batch get user data
const userData = await storageManager.batchGet([
  'profile',
  'preferences',
  'progress'
]);
```

### Storage Monitoring

```typescript
// Check storage usage
const info = await storageManager.getStorageInfo();
if (info.used / info.quota > 0.8) {
  console.warn('Storage is 80% full');
  await storageManager.compactStorage();
}

// Health monitoring
const health = await storageManager.getStorageHealth();
if (health.status !== 'healthy') {
  console.error('Storage issues detected:', health.issues);
}
```

## Best Practices

### Key Naming Conventions

- Use descriptive, hierarchical keys: `user:123:preferences`
- Include version in schema-sensitive data: `user-profile:v2:123`
- Use consistent prefixes for related data: `cache:api:`, `user:`, `system:`

### Performance Optimization

- Use batch operations for multiple items
- Set appropriate TTL values to prevent stale data
- Use compression for large objects
- Monitor storage usage regularly

### Error Resilience

- Always handle storage errors gracefully
- Provide fallback mechanisms for critical data
- Implement retry logic for transient failures
- Log errors for debugging and monitoring

### Security Considerations

- Encrypt sensitive data before storage
- Validate data integrity on retrieval
- Implement proper access controls
- Regularly audit stored data

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Author: Storage API Team*