# Sync and Eviction Integration Patch

## Issue Identified

The junior developer's sync implementation doesn't integrate with the LRU eviction engine. It directly uses `storageManager.cacheResource()` which has its own basic eviction logic that doesn't respect the sophisticated LRU eviction system we built.

## Problems Found

1. **No Integration with LRU Eviction**: The sync manager bypasses the eviction engine
2. **Wrong Import Path**: Uses `@/lib/cache/EnhancedStorageManager2` instead of `@/utils/enhancedStorageManager2`
3. **No Resource Protection**: Doesn't protect syncing resources from eviction
4. **No Pre-flight Checks**: Doesn't check if sync will exceed limits before starting
5. **No User Type Awareness**: Doesn't properly determine user type for eviction limits

## Solution

Created `SyncEvictionIntegration` class that:
- Bridges sync and eviction systems
- Checks eviction requirements before caching
- Protects syncing resources from eviction
- Handles batch operations efficiently
- Provides storage info for sync planning

## Required Changes to PremiumSyncManager

### 1. Fix Import Path

```typescript
// OLD
import { EnhancedStorageManager2 } from '@/lib/cache/EnhancedStorageManager2';

// NEW
import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { SyncEvictionIntegration } from './syncEvictionIntegration';
```

### 2. Add Integration Property

```typescript
export class PremiumSyncManager {
  // ... existing properties
  private syncEvictionIntegration: SyncEvictionIntegration;

  constructor() {
    this.firebaseAdapter = new FirebaseSyncAdapter();
    this.storageManager = EnhancedStorageManager2.getInstance();
    this.syncEvictionIntegration = SyncEvictionIntegration.getInstance();
  }
```

### 3. Update processSyncOperations Method

Replace the download case:

```typescript
case 'download':
  const downloadedResource = await this.firebaseAdapter.downloadResource(userId, resourceId);
  if (downloadedResource) {
    // OLD: await this.storageManager.cacheResource(downloadedResource);
    
    // NEW: Use integration layer
    await this.syncEvictionIntegration.cacheResourceWithEviction(
      downloadedResource,
      userId
    );
    downloaded++;
  }
  break;
```

### 4. Update performInitialSync Method

```typescript
private async performInitialSync(userId: string, localManifest: SyncManifest): Promise<void> {
  const resources = await this.getAllLocalResources();
  const resourcesToUpload = resources.filter(r => r.id in localManifest.resources);
  
  // Check if we have space for initial sync
  const storageInfo = await this.syncEvictionIntegration.getSyncStorageInfo(userId);
  
  // Upload in batches for efficiency
  await this.firebaseAdapter.uploadResourcesBatch(userId, resourcesToUpload);
  
  // Save manifest
  await this.firebaseAdapter.saveUserManifest(userId, localManifest);
}
```

### 5. Add Pre-sync Storage Check

Add this method to PremiumSyncManager:

```typescript
/**
 * Check if sync can proceed without hitting storage limits
 */
private async checkSyncFeasibility(
  userId: string,
  operations: Map<string, SyncOperation>
): Promise<{ canProceed: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  const downloadOps = Array.from(operations.entries())
    .filter(([_, op]) => op === 'download' || op === 'conflict');
  
  if (downloadOps.length === 0) {
    return { canProceed: true, warnings };
  }

  const storageInfo = await this.syncEvictionIntegration.getSyncStorageInfo(userId);
  
  // Group by resource type
  const downloadsByType: Record<string, number> = {};
  for (const [resourceId] of downloadOps) {
    const type = resourceId.split('-')[0]; // Assumes format like 'article-123'
    downloadsByType[type] = (downloadsByType[type] || 0) + 1;
  }

  // Check each type
  for (const [type, count] of Object.entries(downloadsByType)) {
    const available = storageInfo.available[type as ResourceType];
    if (available && count > available.count) {
      warnings.push(
        `Downloading ${count} ${type}s will exceed your limit. ` +
        `${count - available.count} existing items will be removed.`
      );
    }
  }

  return { canProceed: true, warnings };
}
```

## Testing Requirements

1. Run the new integration test: `sync-eviction.integration.test.ts`
2. Test sync with free user at storage limit
3. Test sync with premium user with many resources
4. Test sync failure scenarios
5. Test resource protection during sync

## Benefits

1. **Consistent Eviction**: All storage operations use the same LRU algorithm
2. **Better UX**: Users see consistent behavior across cache and sync
3. **Resource Protection**: Active resources won't be evicted during sync
4. **Storage Awareness**: Sync knows about storage limits before starting
5. **Error Handling**: Better error messages when storage is full

## Next Steps

1. Apply these patches to `premiumSyncManager.ts`
2. Update the sync hooks to show storage warnings
3. Add UI indicators for storage usage during sync
4. Test the integration thoroughly
5. Update documentation