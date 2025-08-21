# Storage Overhaul Plan - Local-First Architecture

> **Goal**: Create a blazing-fast, offline-capable experience by intelligently caching all resources locally while respecting the three-pillar architecture limits.

## Executive Summary

This document outlines a comprehensive overhaul of Doshi Sensei's storage system to implement a local-first architecture that:

- **Eliminates loading times** for previously viewed content
- **Reduces API calls** by 80-90% for returning users
- **Respects user limits** through intelligent LRU eviction
- **Works seamlessly offline** with full functionality
- **Syncs transparently** for premium users

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│                 Cache Manager                            │
│  - Checks local storage first                           │
│  - Falls back to API if not found                       │
│  - Manages eviction for free users                      │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────┴────────┐        ┌─────────┴────────┐
│  IndexedDB     │        │  Service Worker   │
│  - Articles    │        │  - Network proxy  │
│  - Stories     │        │  - Background sync│
│  - Resources   │        │  - Asset caching  │
└────────────────┘        └──────────────────┘
```

## Storage Limits by User Type

| User Type | Articles | Stories | Kanji Sets | Drill Sets | Audio Files |
|-----------|----------|---------|------------|------------|-------------|
| Guest     | 3        | 3       | 100        | 50         | 100         |
| Free      | 3        | 3       | 500        | 200        | 500         |
| Premium   | 50       | 50      | Unlimited  | Unlimited  | Unlimited   |

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Enhanced Storage Manager Upgrade

```typescript
// src/utils/enhancedStorageManager2.ts
interface CachedResource {
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

class EnhancedStorageManager2 {
  private async getCachedResource(
    type: string, 
    id: string
  ): Promise<CachedResource | null> {
    // Check IndexedDB first
    const cached = await this.db.resources.get(`${type}:${id}`);
    
    if (cached) {
      // Update last accessed time
      await this.updateLastAccessed(type, id);
      return cached;
    }
    
    return null;
  }
  
  private async cacheResource(
    resource: CachedResource,
    userType: UserType
  ): Promise<void> {
    // Check if we need to evict (for free/guest users)
    await this.enforceStorageLimits(resource.type, userType);
    
    // Store in IndexedDB
    await this.db.resources.put(resource);
    
    // Queue for sync if premium user
    if (userType === 'premium') {
      await this.queueForSync(resource);
    }
  }
}
```

#### 1.2 Service Worker Setup

```typescript
// src/service-worker.ts
self.addEventListener('fetch', (event) => {
  if (isResourceRequest(event.request)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => getCachedFallback(event.request))
    );
  }
});

// Background sync for premium users
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-premium-content') {
    event.waitUntil(syncPremiumContent());
  }
});
```

### Phase 2: Resource-Specific Caching (Week 3-4)

#### 2.1 Article & Story Caching

```typescript
// src/lib/cache/articleCache.ts
interface CachedArticle {
  id: string;
  title: string;
  content: string;
  images: string[]; // URLs to cached blobs
  audioUrl?: string; // URL to cached audio
  metadata: {
    author: string;
    publishedAt: number;
    readingTime: number;
  };
}

class ArticleCache {
  async cacheArticle(article: Article): Promise<void> {
    // Download and cache all images
    const imageBlobs = await this.downloadImages(article.images);
    
    // Download and cache audio if available
    const audioBlob = article.audioUrl 
      ? await this.downloadAudio(article.audioUrl)
      : null;
    
    // Store everything in IndexedDB
    await EnhancedStorageManager2.cacheResource({
      id: article.id,
      type: 'article',
      data: article,
      metadata: {
        size: this.calculateSize(article, imageBlobs, audioBlob),
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        version: article.version,
        checksum: await this.generateChecksum(article)
      },
      assets: {
        images: imageBlobs,
        audio: audioBlob ? new Map([['main', audioBlob]]) : new Map()
      }
    });
  }
  
  async getArticle(id: string): Promise<Article | null> {
    // Try cache first
    const cached = await EnhancedStorageManager2.getCachedResource('article', id);
    
    if (cached && !this.isStale(cached)) {
      return this.hydrateCachedArticle(cached);
    }
    
    // Fall back to API
    const article = await api.getArticle(id);
    
    // Cache in background
    this.cacheArticle(article).catch(console.error);
    
    return article;
  }
}
```

#### 2.2 Kanji/Verb/Adjective Caching

```typescript
// src/lib/cache/resourceCache.ts
class ResourceCache {
  // Cache entire kanji sets for better performance
  async cacheKanjiSet(level: string): Promise<void> {
    const kanjiList = await api.getKanjiByLevel(level);
    
    // Batch cache for efficiency
    await EnhancedStorageManager2.batchCache(
      kanjiList.map(kanji => ({
        id: kanji.character,
        type: 'kanji',
        data: kanji,
        metadata: {
          size: JSON.stringify(kanji).length,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: this.generateChecksum(kanji)
        }
      }))
    );
  }
  
  // Intelligent pre-caching based on user behavior
  async preCacheRelated(currentKanji: string): Promise<void> {
    const relatedKanji = await this.getRelatedKanji(currentKanji);
    
    // Pre-cache in background without blocking UI
    requestIdleCallback(() => {
      relatedKanji.forEach(kanji => {
        this.cacheKanji(kanji).catch(console.error);
      });
    });
  }
}
```

#### 2.3 Audio Caching Strategy

```typescript
// src/lib/cache/audioCache.ts
class AudioCache {
  private audioContext = new AudioContext();
  
  async cacheKanaSound(kana: string): Promise<void> {
    const audioUrl = `/api/audio/kana/${kana}`;
    const audioBlob = await fetch(audioUrl).then(r => r.blob());
    
    // Store in cache
    await caches.open('audio-cache-v1').then(cache => 
      cache.put(audioUrl, new Response(audioBlob))
    );
    
    // Also store in IndexedDB for offline access
    await EnhancedStorageManager2.cacheResource({
      id: `kana-${kana}`,
      type: 'audio',
      data: { kana, url: audioUrl },
      metadata: {
        size: audioBlob.size,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        version: '1.0',
        checksum: await this.generateChecksum(audioBlob)
      },
      assets: {
        audio: new Map([['main', audioBlob]])
      }
    });
  }
  
  // Pre-cache common kana sounds
  async preCacheCommonSounds(): Promise<void> {
    const commonKana = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'];
    
    // Cache in background
    for (const kana of commonKana) {
      await this.cacheKanaSound(kana).catch(console.error);
      // Small delay to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

### Phase 3: Eviction & Sync Strategy (Week 5)

#### 3.1 LRU Eviction for Free Users

```typescript
// src/lib/cache/evictionStrategy.ts
class LRUEvictionStrategy {
  async enforceLimit(
    resourceType: string, 
    userType: UserType,
    newResourceSize: number
  ): Promise<void> {
    const limits = this.getLimits(userType, resourceType);
    const currentResources = await this.getResourcesByType(resourceType);
    
    if (currentResources.length >= limits.max) {
      // Sort by last accessed time
      const sorted = currentResources.sort((a, b) => 
        a.metadata.lastAccessed - b.metadata.lastAccessed
      );
      
      // Calculate how many to remove
      let bytesToFree = newResourceSize;
      const toRemove: string[] = [];
      
      for (const resource of sorted) {
        if (bytesToFree <= 0) break;
        
        toRemove.push(resource.id);
        bytesToFree -= resource.metadata.size;
      }
      
      // Remove from storage
      await this.removeResources(toRemove);
      
      // Log eviction for analytics
      await this.logEviction(toRemove, userType);
    }
  }
  
  private getLimits(userType: UserType, resourceType: string): StorageLimit {
    const limits = {
      guest: { article: 3, story: 3, kanji: 100, verb: 50, audio: 100 },
      free: { article: 3, story: 3, kanji: 500, verb: 200, audio: 500 },
      premium: { article: 50, story: 50, kanji: Infinity, verb: Infinity, audio: Infinity }
    };
    
    return {
      max: limits[userType][resourceType] || 0,
      type: resourceType
    };
  }
}
```

#### 3.2 Background Sync for Premium Users

```typescript
// src/lib/sync/premiumSync.ts
class PremiumSyncManager {
  private syncQueue: Set<string> = new Set();
  
  async initializeSync(userId: string): Promise<void> {
    // Register periodic sync
    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.register('sync-content', {
        minInterval: 60 * 60 * 1000 // 1 hour
      });
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.syncOnReconnect());
    
    // Initial sync
    await this.performSync(userId);
  }
  
  async performSync(userId: string): Promise<void> {
    try {
      // Get list of cached resources
      const localResources = await this.getLocalResourceManifest();
      
      // Get server manifest
      const serverManifest = await api.getUserResourceManifest(userId);
      
      // Download missing resources
      const toDownload = this.findMissingResources(serverManifest, localResources);
      await this.downloadResources(toDownload);
      
      // Upload local changes
      const toUpload = this.findLocalChanges(localResources, serverManifest);
      await this.uploadResources(toUpload);
      
      // Update sync timestamp
      await this.updateSyncTimestamp();
    } catch (error) {
      console.error('Sync failed:', error);
      // Queue for retry
      this.queueForRetry();
    }
  }
  
  private async downloadResources(resources: Resource[]): Promise<void> {
    // Download in batches to avoid overwhelming the connection
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < resources.length; i += BATCH_SIZE) {
      const batch = resources.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(resource => 
          this.downloadAndCache(resource).catch(console.error)
        )
      );
      
      // Update progress for UI if needed
      this.updateSyncProgress(i + batch.length, resources.length);
    }
  }
}
```

### Phase 4: Integration with Three-Pillar Architecture (Week 6)

#### 4.1 Feature Registry Updates

```typescript
// src/lib/features/registry.ts
export const FEATURE_REGISTRY: FeatureRegistry = {
  // ... existing features
  
  'offline_articles': {
    id: 'offline_articles',
    name: 'Offline Articles',
    description: 'Cache articles for offline reading',
    category: 'storage',
    icon: '📥',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
    metadata: {
      storageType: 'article',
      maxItems: { guest: 3, free: 3, premium: 50 }
    }
  },
  
  'offline_stories': {
    id: 'offline_stories',
    name: 'Offline Stories',
    description: 'Cache stories for offline reading',
    category: 'storage',
    icon: '📚',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
    metadata: {
      storageType: 'story',
      maxItems: { guest: 3, free: 3, premium: 50 }
    }
  },
  
  'resource_caching': {
    id: 'resource_caching',
    name: 'Resource Caching',
    description: 'Cache kanji, verbs, and audio for instant access',
    category: 'storage',
    icon: '💾',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'background_sync': {
    id: 'background_sync',
    name: 'Background Sync',
    description: 'Automatically sync content across devices',
    category: 'system',
    icon: '🔄',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true, // Premium only
    status: 'active'
  }
};
```

#### 4.2 Access Control Integration

```typescript
// src/hooks/useOfflineContent.ts
export function useOfflineContent(resourceType: 'article' | 'story') {
  const { checkAndTrack } = useAccess();
  const { feature, access } = useFeature(`offline_${resourceType}s`);
  const { userType } = useSubscription2();
  
  const cacheResource = useCallback(async (resource: any) => {
    // Check if user can cache this resource
    const canCache = await checkAndTrack(`offline_${resourceType}s`);
    
    if (!canCache) {
      // Access denied modal shown automatically
      return false;
    }
    
    try {
      // Cache the resource
      if (resourceType === 'article') {
        await ArticleCache.cacheArticle(resource);
      } else {
        await StoryCache.cacheStory(resource);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to cache resource:', error);
      return false;
    }
  }, [resourceType, checkAndTrack]);
  
  const getCachedCount = useCallback(async () => {
    const resources = await EnhancedStorageManager2.getResourcesByType(resourceType);
    return resources.length;
  }, [resourceType]);
  
  return {
    cacheResource,
    getCachedCount,
    maxAllowed: access?.remaining || 0,
    userType
  };
}
```

### Phase 5: Performance Optimizations (Week 7)

#### 5.1 Intelligent Pre-fetching

```typescript
// src/lib/cache/prefetchManager.ts
class PrefetchManager {
  private prefetchQueue: PriorityQueue<PrefetchTask> = new PriorityQueue();
  
  async analyzeBehavior(userId: string): Promise<void> {
    // Analyze user patterns
    const patterns = await this.getUserPatterns(userId);
    
    // Queue prefetch tasks based on likelihood of access
    patterns.forEach(pattern => {
      this.prefetchQueue.enqueue({
        resourceId: pattern.resourceId,
        priority: pattern.likelihood,
        type: pattern.resourceType
      });
    });
    
    // Process queue during idle time
    this.processPrefetchQueue();
  }
  
  private async processPrefetchQueue(): Promise<void> {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async (deadline) => {
        while (deadline.timeRemaining() > 0 && !this.prefetchQueue.isEmpty()) {
          const task = this.prefetchQueue.dequeue();
          await this.prefetchResource(task);
        }
        
        // Continue if queue not empty
        if (!this.prefetchQueue.isEmpty()) {
          this.processPrefetchQueue();
        }
      });
    }
  }
}
```

#### 5.2 Storage Optimization

```typescript
// src/lib/cache/storageOptimizer.ts
class StorageOptimizer {
  async optimizeStorage(): Promise<void> {
    // Get storage estimate
    const estimate = await navigator.storage.estimate();
    const usagePercent = (estimate.usage / estimate.quota) * 100;
    
    if (usagePercent > 80) {
      // Aggressive cleanup for free users
      await this.aggressiveCleanup();
    } else if (usagePercent > 60) {
      // Normal cleanup
      await this.normalCleanup();
    }
  }
  
  private async compressAssets(): Promise<void> {
    // Compress images using Canvas API
    const images = await this.getAllCachedImages();
    
    for (const [id, blob] of images) {
      if (blob.size > 500000) { // 500KB
        const compressed = await this.compressImage(blob);
        await this.replaceImage(id, compressed);
      }
    }
  }
}
```

## Migration Strategy

### Step 1: Parallel Implementation
- Build new system alongside existing one
- Test with small group of beta users
- Monitor performance metrics

### Step 2: Gradual Rollout
- Enable for 10% of users initially
- Monitor error rates and performance
- Increase to 50%, then 100% over 2 weeks

### Step 3: Cleanup
- Remove old storage system code
- Update documentation
- Archive migration code

## Performance Metrics

### Target Improvements
- **Initial Load Time**: 80% reduction for cached content
- **API Calls**: 85% reduction for returning users
- **Offline Capability**: 100% for cached content
- **User Satisfaction**: Expect 30% increase in session duration

### Monitoring
```typescript
// Track cache hit rates
Analytics.track('cache_hit', {
  resourceType: 'article',
  hitRate: 0.92,
  loadTime: 45 // ms
});

// Track storage usage
Analytics.track('storage_usage', {
  userType: 'free',
  articlesCount: 3,
  totalSize: 15728640 // 15MB
});
```

## Technical Considerations

### Browser Compatibility
- IndexedDB: 97% global support
- Service Workers: 96% global support
- Fallback to localStorage for older browsers

### Storage Quotas
- Chrome: ~60% of free disk space
- Firefox: 50MB initial, expandable
- Safari: 1GB initial, user prompt for more

### Security
- All cached content encrypted at rest
- Content integrity verification via checksums
- Automatic cleanup of expired content

## Implementation Checklist

- [ ] Update EnhancedStorageManager with caching logic
- [ ] Implement Service Worker with offline support
- [ ] Create resource-specific cache managers
- [ ] Implement LRU eviction strategy
- [ ] Build premium sync functionality
- [ ] Update feature registry with new storage features
- [ ] Create migration utilities
- [ ] Add performance monitoring
- [ ] Update unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Create rollback plan

## Future Enhancements

### Phase 2 (Q2 2025)
- Delta sync for large resources
- P2P sync between user's devices
- Predictive caching based on ML

### Phase 3 (Q3 2025)
- Edge caching integration
- WebRTC for real-time sync
- Compression algorithms for text

## Conclusion

This storage overhaul will transform Doshi Sensei into a truly local-first application, providing users with instant access to their learning materials while respecting the three-pillar architecture limits. The phased approach ensures minimal disruption while delivering immediate performance benefits.

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Author: Storage Architecture Team*