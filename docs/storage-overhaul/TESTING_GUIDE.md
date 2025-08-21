# Phase 1 Testing Guide

## Setup Instructions

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:3000/test-cache
   ```

## Testing Checklist

### 1. Service Worker Registration ✓
- Open Chrome DevTools → Application → Service Workers
- Verify service worker is registered at `/service-worker.js`
- Status should show "Activated and is running"

### 2. Cache System Initialization ✓
- On the test page, verify "Cache Initialized: ✅ Yes"
- Check browser console for `[CacheSystem] Initialized successfully`
- No errors should appear in console

### 3. Article Caching ✓
- Click "Cache Test Article" button
- Should see "✅ Article cached successfully" in test results
- Cache count should update (e.g., "1 / 3")

### 4. Limit Enforcement ✓
**As Guest/Free User (3 article limit):**
1. Cache 3 articles by clicking "Cache Test Article" 3 times
2. Try to cache a 4th article
3. Should see upgrade modal or "Failed to cache article (limit reached)"

### 5. Cache Retrieval ✓
- After caching an article, click "Get Cached Article"
- Should see "✅ Retrieved cached article: Test Article for Cache System"

### 6. Offline Testing ✓
1. Cache at least one article
2. Open DevTools → Network → Set to "Offline"
3. Navigate to cached article
4. Article should load from cache
5. Navigate to `/offline` - should see offline page

### 7. Storage Statistics ✓
- Click "Check Storage" button
- Should show storage usage (e.g., "Storage: 0.50 MB used of 1000.00 MB quota")

### 8. LRU Eviction ✓
**Test as Free User:**
1. Clear cache first
2. Cache 3 articles with different IDs
3. Access them in order: A, B, C
4. Cache a new article D
5. Article A should be evicted (check cache stats)

### 9. Different User Types ✓
- Test as Guest (3 limit)
- Test as Free user (3 limit)
- Test as Premium user (50 limit)

## Known Issues & Solutions

### Issue: Service Worker Not Registering
**Solution**: 
- Ensure you're using HTTPS or localhost
- Clear browser cache and reload
- Check for console errors

### Issue: Cache Not Working
**Solution**:
- Check IndexedDB in DevTools → Application → Storage
- Clear all site data and try again
- Verify EnhancedStorageManager2 initialized

### Issue: Offline Page Not Loading
**Solution**:
- Ensure service worker is active
- Check if `/offline.html` is cached in static-cache-v1
- Try unregistering and re-registering service worker

## Manual Testing Scripts

### Test Complete User Journey:
1. Visit site as new user
2. Read an article
3. Try to cache it (should work as guest)
4. Cache 2 more articles
5. Try 4th (should see limit modal)
6. Go offline
7. Verify cached articles work
8. Come back online
9. Clear cache
10. Repeat as logged-in free user

### Performance Testing:
1. Cache an article
2. Note load time from network
3. Clear browser cache (not app cache)
4. Load same article
5. Should load in <50ms from cache

## Console Commands for Testing

```javascript
// Check cache stats
await CacheInitializer.getCacheStats()

// Check service worker
navigator.serviceWorker.controller

// Check IndexedDB stores
const dbs = await indexedDB.databases()
console.log(dbs)

// Force cache clear
await caches.keys().then(names => names.forEach(name => caches.delete(name)))
```

## Success Criteria

✅ Service worker registered and active
✅ Cache system initializes without errors  
✅ Articles cache successfully with assets
✅ Limits enforced (3 for free, 50 for premium)
✅ LRU eviction works correctly
✅ Offline access works for cached content
✅ Three-pillar integration shows correct modals

---

*Last Updated: January 2025*