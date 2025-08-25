# PWA Cache Strategy Migration Guide

## Problem Identified
The current PWA caching strategy is too aggressive and causes hydration errors:
- Next.js static assets cached for **1 YEAR** with CacheFirst strategy
- When deploying updates, users get stale JavaScript that doesn't match server HTML
- Results in "Cannot read properties of undefined" and hydration mismatches

## Key Changes in Improved Strategy

### 1. App Code (/_next/*) - Changed to NetworkFirst
- **Old**: CacheFirst for 1 year
- **New**: NetworkFirst with 1 hour cache
- **Impact**: Users always get fresh code when online

### 2. Pages - Reduced Cache Time  
- **Old**: NetworkFirst with 1 day cache
- **New**: NetworkFirst with 1 hour cache
- **Impact**: Faster updates, less stale content

### 3. API Responses - Much Shorter Cache
- **Old**: StaleWhileRevalidate for 1 week
- **New**: NetworkFirst for 5 minutes
- **Impact**: Fresh data, reduced sync issues

### 4. Better Cache Invalidation
- Aggressive cleanup of old version caches
- Hourly automatic cleanup
- Manual cache clear utilities

## Migration Steps

### Option 1: Gradual Migration (Recommended for Production)
1. Keep current `sw.js` as is temporarily
2. Deploy `sw-improved.js` 
3. Create A/B test or feature flag to gradually migrate users
4. Monitor for issues
5. Once stable, replace `sw.js` with improved version

### Option 2: Immediate Migration (For Staging/Dev)
1. Replace `/public/sw.js` with `/public/sw-improved.js` content
2. Increment SW_VERSION to force update
3. Deploy
4. Users will get new SW on next visit
5. Old caches will be cleared automatically

### Option 3: User-Controlled Migration
1. Add cache management UI to settings
2. Let users manually clear cache if experiencing issues
3. Gradually migrate all users over time

## Implementation Checklist

- [x] Created improved service worker (`sw-improved.js`)
- [x] Added cache management utilities
- [x] Created user-facing cache management component
- [ ] Test improved SW in development
- [ ] Deploy to staging environment
- [ ] Monitor cache hit rates and performance
- [ ] Gradual rollout to production
- [ ] Update documentation

## Testing the New Strategy

### In Development:
```bash
# 1. Use sw-improved.js
cp public/sw-improved.js public/sw.js

# 2. Clear existing caches in browser
# DevTools > Application > Storage > Clear site data

# 3. Test the app
npm run dev

# 4. Make changes and verify they appear immediately
```

### Testing Cache Behavior:
1. Load the app (caches populated)
2. Go offline (should still work)
3. Make code changes and deploy
4. Go online and refresh (should get new code immediately)
5. Verify no hydration errors

## Monitoring

Add these metrics to track the improvement:
- Hydration error rate
- Cache hit/miss ratio  
- Page load times (online vs offline)
- User complaints about stale content
- Service worker update frequency

## Rollback Plan

If issues occur:
1. Revert `sw.js` to original version
2. Increment version to force update
3. Users will get old caching strategy back
4. Investigate issues before retry

## Long-term Recommendations

1. **Version all deployments** - Include build hash in SW_VERSION
2. **Monitor cache sizes** - Alert if > 50MB
3. **Regular cache audits** - Review strategy every quarter
4. **User education** - Add help docs about clearing cache
5. **Consider removing PWA** - If cache issues persist, consider web-only

## Cache Management UI

Add to Settings page:
```tsx
import { CacheManagementButton } from '@/components/CacheManagementButton';

// In settings page
<CacheManagementButton />
```

This gives users control when they experience issues.