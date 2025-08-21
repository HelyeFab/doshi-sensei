# Phase 3 Implementation Plan - LRU Eviction & Premium Sync

## Overview

Phase 3 completes the storage overhaul by implementing intelligent cache management for free users and seamless background sync for premium users. This plan ensures production-quality implementation while maintaining the three-pillar architecture integrity.

## Priority Decision

**Starting with LRU Eviction** for the following reasons:
1. **Immediate User Impact** - Free users need proper cache management to prevent storage overflow
2. **Foundation for Sync** - Eviction logic helps manage sync conflicts
3. **Simpler Scope** - Can be tested independently without external services
4. **Risk Mitigation** - Prevents potential storage quota issues in production

## Timeline

### Week 1: LRU Eviction Implementation
- Days 1-2: Core eviction engine
- Days 3-4: Integration with existing cache managers
- Day 5: Testing and edge cases

### Week 2: Premium Background Sync
- Days 1-2: Sync infrastructure
- Days 3-4: Firebase integration
- Day 5: Conflict resolution

### Week 3: Integration & Polish
- Days 1-2: Performance optimization
- Days 3-4: Migration and rollout
- Day 5: Documentation and handoff

## Part 1: LRU Eviction Strategy

### 1.1 Architecture

```typescript
// src/lib/cache/eviction/lruEvictionEngine.ts
interface EvictionEngine {
  // Core eviction logic
  enforceLimit(resourceType: ResourceType, userType: UserType): Promise<void>;
  
  // Check if eviction needed before caching
  requiresEviction(resourceType: ResourceType, userType: UserType, newSize: number): Promise<boolean>;
  
  // Get resources sorted by access time
  getEvictionCandidates(resourceType: ResourceType): Promise<CachedResource[]>;
  
  // Perform eviction
  evictResources(resourceIds: string[], reason: EvictionReason): Promise<void>;
}
```

### 1.2 Implementation Details

#### Storage Limits Configuration
```typescript
// src/lib/cache/eviction/storageLimits.ts
export const STORAGE_LIMITS = {
  guest: {
    article: { count: 3, sizeBytes: 10 * 1024 * 1024 }, // 10MB
    story: { count: 3, sizeBytes: 10 * 1024 * 1024 },
    kanji: { count: 100, sizeBytes: 5 * 1024 * 1024 },
    verb: { count: 50, sizeBytes: 2 * 1024 * 1024 },
    adjective: { count: 50, sizeBytes: 2 * 1024 * 1024 },
    audio: { count: 100, sizeBytes: 50 * 1024 * 1024 }
  },
  free: {
    article: { count: 3, sizeBytes: 10 * 1024 * 1024 },
    story: { count: 3, sizeBytes: 10 * 1024 * 1024 },
    kanji: { count: 500, sizeBytes: 25 * 1024 * 1024 },
    verb: { count: 200, sizeBytes: 10 * 1024 * 1024 },
    adjective: { count: 200, sizeBytes: 10 * 1024 * 1024 },
    audio: { count: 500, sizeBytes: 250 * 1024 * 1024 }
  },
  premium: {
    article: { count: 50, sizeBytes: 500 * 1024 * 1024 },
    story: { count: 50, sizeBytes: 500 * 1024 * 1024 },
    kanji: { count: Infinity, sizeBytes: Infinity },
    verb: { count: Infinity, sizeBytes: Infinity },
    adjective: { count: Infinity, sizeBytes: Infinity },
    audio: { count: Infinity, sizeBytes: Infinity }
  }
};
```

#### Eviction Algorithm
```typescript
// Pseudocode for LRU eviction
async function performEviction(type: ResourceType, userType: UserType, bytesNeeded: number) {
  const limits = STORAGE_LIMITS[userType][type];
  const resources = await getCachedResourcesByType(type);
  
  // Sort by lastAccessed (oldest first)
  resources.sort((a, b) => a.metadata.lastAccessed - b.metadata.lastAccessed);
  
  const toEvict: string[] = [];
  let freedBytes = 0;
  let remainingCount = resources.length;
  
  // Evict until we have space AND are under count limit
  for (const resource of resources) {
    if (freedBytes >= bytesNeeded && remainingCount <= limits.count) {
      break;
    }
    
    toEvict.push(resource.id);
    freedBytes += resource.metadata.size;
    remainingCount--;
  }
  
  // Perform eviction
  await evictResources(toEvict, 'lru_limit_exceeded');
}
```

### 1.3 Integration Points

#### Update Existing Cache Managers
Each cache manager needs eviction checks:

```typescript
// Example: ArticleCache integration
async cacheArticle(article: Article, userType: UserType): Promise<boolean> {
  const size = this.calculateArticleSize(article);
  
  // Check if eviction needed
  if (await evictionEngine.requiresEviction('article', userType, size)) {
    await evictionEngine.enforceLimit('article', userType);
  }
  
  // Proceed with caching
  return super.cacheArticle(article, userType);
}
```

### 1.4 Edge Cases & Safeguards

1. **Never Evict Currently Viewing** - Track active resource IDs
2. **Batch Eviction** - Evict multiple items at once for efficiency
3. **Grace Period** - Don't evict items accessed in last 5 minutes
4. **Premium Downgrade** - Special handling when user loses premium
5. **Corruption Recovery** - Handle partially cached resources

## Part 2: Premium Background Sync

### 2.1 Architecture

```typescript
// src/lib/sync/premiumSyncManager.ts
interface PremiumSyncManager {
  // Initialize sync for a user
  initializeSync(userId: string): Promise<void>;
  
  // Perform sync operation
  performSync(): Promise<SyncResult>;
  
  // Handle conflicts
  resolveConflict(local: CachedResource, remote: Resource): Promise<Resolution>;
  
  // Queue changes for sync
  queueForSync(resourceId: string, operation: 'create' | 'update' | 'delete'): Promise<void>;
}
```

### 2.2 Sync Strategy

#### Manifest-Based Sync
```typescript
interface SyncManifest {
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
```

#### Sync Flow
1. **Get Local Manifest** - List all cached resources
2. **Get Server Manifest** - Fetch user's cloud resources
3. **Diff Manifests** - Identify changes
4. **Download Updates** - Fetch newer server versions
5. **Upload Changes** - Push local changes to server
6. **Resolve Conflicts** - Handle concurrent modifications

### 2.3 Firebase Integration

```typescript
// src/lib/sync/firebaseSyncAdapter.ts
class FirebaseSyncAdapter {
  async getUserManifest(userId: string): Promise<SyncManifest> {
    const doc = await firestore
      .collection('userSync')
      .doc(userId)
      .get();
    
    return doc.data() as SyncManifest;
  }
  
  async uploadResource(userId: string, resource: CachedResource): Promise<void> {
    await firestore
      .collection('userResources')
      .doc(`${userId}_${resource.id}`)
      .set({
        ...resource,
        syncedAt: Date.now()
      });
  }
}
```

### 2.4 Background Sync Implementation

```typescript
// Service Worker sync
self.addEventListener('sync', async (event) => {
  if (event.tag === 'premium-content-sync') {
    event.waitUntil(
      performPremiumSync()
        .then(() => console.log('Sync completed'))
        .catch(err => console.error('Sync failed:', err))
    );
  }
});

// Periodic sync registration
async function registerPeriodicSync() {
  if ('periodicSync' in self.registration) {
    await self.registration.periodicSync.register('premium-content-sync', {
      minInterval: 60 * 60 * 1000 // 1 hour
    });
  }
}
```

## Part 3: Critical Integration Points

### 3.1 Three-Pillar Architecture Preservation

#### Feature Registry Updates
```typescript
// Add to src/lib/features/registry.ts
'smart_cache_eviction': {
  id: 'smart_cache_eviction',
  name: 'Smart Cache Management',
  description: 'Intelligent LRU eviction for optimal storage',
  category: 'system',
  icon: '🧹',
  limitType: 'none',
  requiresAuth: false,
  requiresSubscription: false,
  status: 'active'
},

'premium_cloud_sync': {
  id: 'premium_cloud_sync',
  name: 'Premium Cloud Sync',
  description: 'Automatic sync across all devices',
  category: 'system',
  icon: '☁️',
  limitType: 'none',
  requiresAuth: true,
  requiresSubscription: true,
  status: 'active'
}
```

#### Access Control Integration
```typescript
// Ensure sync only runs for premium users
const { isPremium } = useSubscription2();

useEffect(() => {
  if (isPremium && user) {
    PremiumSyncManager.initializeSync(user.uid);
  }
}, [isPremium, user]);
```

### 3.2 Existing Cache Preservation

#### Migration Strategy
1. **Version Check** - Add version field to all cached resources
2. **Lazy Migration** - Update metadata on access
3. **Batch Processing** - Migrate in background during idle
4. **Rollback Plan** - Keep backup of pre-migration state

```typescript
// src/lib/cache/migration/phase3Migration.ts
async function migrateExistingCache() {
  const resources = await getAllCachedResources();
  
  for (const resource of resources) {
    if (!resource.metadata.version) {
      // Add missing metadata
      resource.metadata.version = '1.0';
      resource.metadata.lastAccessed = resource.metadata.cachedAt;
      
      await updateResourceMetadata(resource);
    }
  }
}
```

## Part 4: Testing Strategy

### 4.1 Unit Tests

```typescript
// LRU Eviction Tests
describe('LRUEvictionEngine', () => {
  test('evicts oldest items first', async () => {
    // Setup cache with 3 articles
    // Add 4th article
    // Verify oldest was evicted
  });
  
  test('respects size limits', async () => {
    // Add large resource
    // Verify multiple small resources evicted
  });
  
  test('never evicts active resources', async () => {
    // Mark resource as active
    // Fill cache
    // Verify active resource retained
  });
});

// Premium Sync Tests
describe('PremiumSyncManager', () => {
  test('syncs new local resources', async () => {
    // Cache resource locally
    // Run sync
    // Verify uploaded to Firebase
  });
  
  test('resolves conflicts correctly', async () => {
    // Create conflict scenario
    // Run sync
    // Verify resolution strategy
  });
});
```

### 4.2 Integration Tests

1. **Three-Pillar Preservation**
   - Verify feature flags work
   - Check access control integration
   - Ensure usage tracking continues

2. **Cache Integrity**
   - Test migration doesn't corrupt data
   - Verify resources remain accessible
   - Check performance metrics

3. **User Experience**
   - No data loss during eviction
   - Smooth sync without UI freezing
   - Proper offline handling

### 4.3 Performance Benchmarks

Target metrics:
- Eviction operation: <100ms
- Sync manifest diff: <50ms
- Resource sync: <500ms per item
- No UI thread blocking

## Part 5: Rollout Plan

### 5.1 Feature Flags

```typescript
// Enable gradual rollout
const FEATURE_FLAGS = {
  lruEviction: {
    enabled: process.env.NEXT_PUBLIC_LRU_EVICTION === 'true',
    rolloutPercentage: 10 // Start with 10% of users
  },
  premiumSync: {
    enabled: process.env.NEXT_PUBLIC_PREMIUM_SYNC === 'true',
    rolloutPercentage: 5 // Start with 5% of premium users
  }
};
```

### 5.2 Monitoring

```typescript
// Analytics events
Analytics.track('cache_eviction', {
  userType: 'free',
  resourceType: 'article',
  evictedCount: 2,
  reason: 'count_limit_exceeded'
});

Analytics.track('premium_sync_complete', {
  userId: user.uid,
  resourcesSynced: 15,
  duration: 2500,
  conflicts: 0
});
```

### 5.3 Rollback Strategy

1. **Feature Toggle** - Disable via environment variable
2. **Cache Version** - Revert to previous version
3. **Data Recovery** - Restore from sync backup
4. **User Communication** - In-app notification of issues

## Part 6: Success Criteria

### Technical Metrics
- ✅ Zero data loss during eviction
- ✅ Sync success rate >99%
- ✅ Performance targets met
- ✅ No increase in error rates

### User Experience
- ✅ Seamless cache management
- ✅ No UI freezing during sync
- ✅ Clear storage indicators
- ✅ Smooth premium experience

### Business Impact
- ✅ Reduced server costs (fewer API calls)
- ✅ Improved user satisfaction
- ✅ Premium feature differentiation
- ✅ Increased offline usage

## Risk Analysis & Mitigation

### High Risks
1. **Data Loss** - Mitigated by extensive testing and gradual rollout
2. **Sync Conflicts** - Clear resolution strategy with user preference
3. **Performance Impact** - Background processing and optimization

### Medium Risks
1. **Browser Compatibility** - Fallback strategies for older browsers
2. **Storage Quota** - Clear user communication and management
3. **Network Issues** - Retry logic and offline queuing

### Low Risks
1. **Migration Issues** - Lazy migration reduces impact
2. **Feature Adoption** - Clear benefits communicated to users

## Conclusion

This plan provides a comprehensive approach to implementing Phase 3 with production-quality standards. The LRU eviction ensures sustainable storage for all users, while premium sync delivers a compelling premium feature. Both components integrate seamlessly with the existing three-pillar architecture while preserving all cached content.

**Estimated Total Time**: 3 weeks
**Confidence Level**: High
**Risk Level**: Low to Medium

---

*Document Version: 1.0*  
*Created: January 2025*  
*Author: Storage Architecture Team*