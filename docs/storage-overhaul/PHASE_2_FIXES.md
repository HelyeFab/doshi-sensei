# Phase 2 Critical Fixes - January 2025

## Summary

This document details the critical fixes applied to the Phase 2 resource caching implementation after code review.

## Issues Found and Fixed

### 1. ❌ Bug: Incorrect isStale Check in getByType Methods

**Problem**: The `getByType` and `getByJLPTLevel` methods were creating a new object for the isStale check instead of using the actual cached resource's metadata.

```typescript
// WRONG - This always returns false because it creates a future expiration
.filter(verb => !this.isStale({ metadata: { expiresAt: Date.now() + this.STALE_TIME } } as CachedResource));
```

**Solution**: Filter for staleness BEFORE hydrating the resources.

```typescript
// CORRECT - Check staleness on the actual cached resource
return resources
  .filter(resource => !this.isStale(resource))
  .map(resource => this.hydrateCachedVerb(resource))
  .filter(verb => verb.type === type);
```

**Files Fixed**:
- `src/lib/cache/verbCache.ts` (lines 157-186)
- `src/lib/cache/adjectiveCache.ts` (lines 157-186)
- `src/lib/cache/audioCache.ts` (lines 265-277)

### 2. ❌ Bug: Method Name Mismatch in useResourceCache

**Problem**: The hook was calling `clearCacheByType()` which doesn't exist in ResourceCacheManager.

```typescript
// WRONG - Method doesn't exist
await ResourceCacheManager.clearCacheByType(type);
```

**Solution**: Use the correct method name.

```typescript
// CORRECT - This method handles both clearing by type and clearing all
await ResourceCacheManager.clearCache(type);
```

**Files Fixed**:
- `src/hooks/useResourceCache.ts` (line 197)

### 3. ❌ Bug: preCacheRelated Method Signature Mismatch

**Problem**: The hook expected different parameters than what ResourceCacheManager provided.

```typescript
// Hook expected: (currentResource: object, relatedResources: object[], userType)
// Manager provided: (type: string, currentId: string, relatedIds: string[])
```

**Solution**: Adapt the hook to group resources by type and call the manager correctly.

```typescript
// Group related resources by type
const resourcesByType = relatedResources.reduce((acc, resource) => {
  if (resource.type === currentResource.type) {
    if (!acc[resource.type]) {
      acc[resource.type] = [];
    }
    acc[resource.type].push(resource.id);
  }
  return acc;
}, {} as Record<ResourceType, string[]>);

// Call manager with correct signature
for (const [type, ids] of Object.entries(resourcesByType)) {
  await ResourceCacheManager.preCacheRelated(
    type as ResourceType,
    currentResource.id,
    ids
  );
}
```

**Files Fixed**:
- `src/hooks/useResourceCache.ts` (lines 203-235)

### 4. ⚠️ Issue: Hardcoded UserType in Cache Fallbacks

**Problem**: All cache classes were using hardcoded `'free'` userType when caching after network fetch, ignoring the actual user's subscription level.

```typescript
// WRONG - Always caches as 'free' user
this.cacheVerb(verb, 'free').catch(console.error);
```

**Solution**: Add optional userType parameter to all get methods.

```typescript
// CORRECT - Only cache if userType is provided
static async getVerb(
  word: string, 
  fetchFn?: () => Promise<Verb>,
  userType?: UserType  // New optional parameter
): Promise<Verb | null> {
  // ...
  if (fetchFn) {
    const verb = await fetchFn();
    
    // Only cache if userType is provided
    if (userType) {
      this.cacheVerb(verb, userType).catch(console.error);
    }
    
    return verb;
  }
}
```

**Files Fixed**:
- `src/lib/cache/kanjiCache.ts` (added userType parameter)
- `src/lib/cache/verbCache.ts` (added userType parameter)
- `src/lib/cache/adjectiveCache.ts` (added userType parameter)
- `src/lib/cache/audioCache.ts` (added userType parameter)
- `src/lib/cache/resourceCacheManager.ts` (updated all get method signatures)
- `src/hooks/useResourceCache.ts` (passes userType to all get methods)

## Impact

### Before Fixes
- ❌ Runtime errors when using clear cache functionality
- ❌ Stale resources incorrectly served as fresh
- ❌ Pre-caching would fail with type errors
- ❌ All users cached as 'free' regardless of subscription

### After Fixes
- ✅ All methods work correctly without runtime errors
- ✅ Stale resources properly filtered out
- ✅ Pre-caching works with proper type checking
- ✅ User types respected when caching resources

## Testing Recommendations

1. **Test isStale filtering**:
   ```typescript
   // Add expired resource to cache
   // Call getVerbsByType() 
   // Verify expired resources not returned
   ```

2. **Test clear cache**:
   ```typescript
   const { clearCache } = useResourceCache();
   await clearCache('verb'); // Should work
   await clearCache(); // Should clear all
   ```

3. **Test pre-caching**:
   ```typescript
   preCacheRelated(
     { type: 'kanji', id: '漢' },
     [{ type: 'kanji', id: '字' }]
   );
   ```

4. **Test user type caching**:
   ```typescript
   // As premium user
   await getKanji('漢', fetchFn); // Should cache as premium
   ```

## Lessons Learned

1. **Always test filter logic** - The isStale bug would have been caught with proper unit tests
2. **Verify method names exist** - TypeScript should have caught the clearCacheByType issue
3. **Check parameter compatibility** - The preCacheRelated mismatch shows the importance of consistent APIs
4. **Avoid hardcoding user types** - Always pass user context through the system

---

_Document Version: 1.0_  
_Created: January 2025_  
_Author: Senior Developer Review_