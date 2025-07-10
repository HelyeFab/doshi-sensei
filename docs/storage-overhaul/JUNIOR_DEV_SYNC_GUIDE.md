# Premium Background Sync - Implementation Guide for Junior Developer

## Overview

You'll be implementing the background sync feature that automatically syncs cached content for premium users across their devices. This is a premium-only feature that enhances the user experience by keeping their content synchronized.

## Prerequisites

Before starting, make sure you understand:
- Service Workers basics
- Firebase Firestore operations
- Async/await and Promises
- The existing caching system (read `PHASE_1_IMPLEMENTATION.md` and `PHASE_2_IMPLEMENTATION.md`)

## Your Task

Implement background sync for premium users following the architecture in `PHASE_3_IMPLEMENTATION_PLAN.md` (Part 2: Premium Background Sync).

## Step-by-Step Implementation

### 1. Create Sync Types (`src/lib/sync/types.ts`)

```typescript
export interface SyncManifest {
  userId: string;
  lastSyncTimestamp: number;
  resources: {
    [resourceId: string]: {
      type: ResourceType;
      version: string;
      checksum: string;
      lastModified: number;
    }
  };
}

export interface SyncResult {
  success: boolean;
  resourcesSynced: number;
  resourcesDownloaded: number;
  resourcesUploaded: number;
  conflicts: number;
  error?: string;
}

export type SyncOperation = 'upload' | 'download' | 'conflict';
```

### 2. Create Firebase Sync Adapter (`src/lib/sync/firebaseSyncAdapter.ts`)

This handles all Firebase operations for sync:

```typescript
import { firestore } from '@/firebase/config';
import { SyncManifest } from './types';

export class FirebaseSyncAdapter {
  // Get user's sync manifest from Firestore
  async getUserManifest(userId: string): Promise<SyncManifest | null>
  
  // Save user's sync manifest to Firestore
  async saveUserManifest(userId: string, manifest: SyncManifest): Promise<void>
  
  // Upload a resource to user's cloud storage
  async uploadResource(userId: string, resource: CachedResource): Promise<void>
  
  // Download a resource from user's cloud storage
  async downloadResource(userId: string, resourceId: string): Promise<CachedResource | null>
  
  // Delete a resource from user's cloud storage
  async deleteResource(userId: string, resourceId: string): Promise<void>
}
```

### 3. Create Premium Sync Manager (`src/lib/sync/premiumSyncManager.ts`)

This is the main sync logic:

```typescript
export class PremiumSyncManager {
  private syncInProgress = false;
  private syncQueue: Set<string> = new Set();
  
  // Main sync method
  async performSync(userId: string): Promise<SyncResult>
  
  // Compare local and remote manifests
  private compareManifests(local: SyncManifest, remote: SyncManifest)
  
  // Handle sync conflicts (simple: last-write-wins)
  private resolveConflict(local: CachedResource, remote: Resource)
  
  // Queue changes for next sync
  queueForSync(resourceId: string, operation: SyncOperation)
}
```

### 4. Update Service Worker (`public/service-worker.js`)

Add sync event handling:

```javascript
// Listen for sync events
self.addEventListener('sync', async (event) => {
  if (event.tag === 'premium-content-sync') {
    event.waitUntil(handlePremiumSync());
  }
});

// Register periodic sync for premium users
self.addEventListener('activate', async (event) => {
  // Check if user is premium before registering
  if ('periodicSync' in self.registration) {
    // Register periodic sync
  }
});
```

### 5. Create React Hook (`src/hooks/usePremiumSync.ts`)

```typescript
export function usePremiumSync() {
  const { isPremium, user } = useSubscription2();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  // Initialize sync for premium users
  useEffect(() => {
    if (isPremium && user) {
      initializeSync(user.uid);
    }
  }, [isPremium, user]);
  
  // Manual sync trigger
  const triggerSync = async () => {
    // Trigger manual sync
  };
  
  return { syncStatus, lastSyncTime, triggerSync };
}
```

### 6. Add UI Component (`src/components/sync/SyncStatusIndicator.tsx`)

```typescript
export function SyncStatusIndicator() {
  const { syncStatus, lastSyncTime, triggerSync } = usePremiumSync();
  
  // Show sync status and last sync time
  // Allow manual sync trigger
}
```

## Implementation Order

1. Start with types and interfaces
2. Build Firebase adapter with mock data
3. Implement sync manager with basic logic
4. Add service worker support
5. Create React hook
6. Build UI component
7. Write tests

## Testing Plan

### Unit Tests to Write

1. **FirebaseSyncAdapter**
   - Mock Firestore operations
   - Test error handling
   - Test data transformations

2. **PremiumSyncManager**
   - Test manifest comparison
   - Test conflict resolution
   - Test sync queue

3. **Service Worker**
   - Test sync event handling
   - Test periodic sync registration

### Integration Test

Create a test that:
1. Adds resources locally
2. Triggers sync
3. Verifies resources uploaded
4. Simulates another device
5. Verifies resources downloaded

## Important Considerations

1. **Only for Premium Users** - Always check user type
2. **Network Efficiency** - Batch operations, don't sync one at a time
3. **Error Handling** - Network can fail, handle gracefully
4. **User Privacy** - Only sync user's own content
5. **Performance** - Don't block UI during sync

## Firestore Structure

```
userSync/
  {userId}/
    manifest: SyncManifest
    
userResources/
  {userId}_article_{articleId}/
    resource: CachedResource
  {userId}_story_{storyId}/
    resource: CachedResource
```

## Code Quality Checklist

- [ ] TypeScript types for everything
- [ ] Error handling with try/catch
- [ ] Console logs for debugging (remove for production)
- [ ] Comments explaining complex logic
- [ ] Follow existing code patterns
- [ ] Test coverage >80%

## Getting Help

1. Read the existing phase 1 & 2 implementations
2. Check the Firebase documentation
3. Look at service worker examples
4. Ask questions about the architecture

## Deliverables

1. All source files mentioned above
2. Test files with >80% coverage
3. Brief documentation of any decisions made
4. List of any issues encountered

## Time Estimate

This should take approximately 3-4 days:
- Day 1: Types, Firebase adapter
- Day 2: Sync manager, service worker
- Day 3: React integration, UI
- Day 4: Testing and polish

Good luck! This is a great feature that will really enhance the premium user experience.

---

*Created for: Junior Developer*  
*By: Senior Developer*  
*Date: January 2025*