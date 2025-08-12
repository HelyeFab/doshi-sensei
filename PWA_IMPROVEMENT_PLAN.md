# PWA Improvement Plan - Doshi Sensei

## Executive Summary
This document outlines critical improvements needed for the PWA implementation, prioritized by impact and urgency.

## Priority 1: Fix Duplicate Notification Systems (Immediate)

### Issue
Multiple PWA components are handling the same events, causing:
- Duplicate install prompts
- Browser notifications appearing instead of custom UI
- Update banner showing immediately after updates

### Solution Steps

#### Step 1: Remove Legacy Components
```bash
# Remove old PWA components from layout.tsx
# Lines to remove:
# - import PWAInstaller 
# - import PWAUpdateNotification
# - <PWAInstaller /> component
# - <PWAUpdateNotification /> component
```

#### Step 2: Fix Unified Notification Handler
Update `src/hooks/useUnifiedNotifications.ts`:
- Add debouncing for install prompt (only show once per session)
- Implement proper update cooldown (24 hours minimum)
- Store installation state properly

#### Step 3: Update Layout Integration
Ensure only `UnifiedNotificationProvider` is active in layout.tsx

## Priority 2: Fix Service Worker Update Strategy

### Current Issues
- `skipWaiting: true` causes immediate, disruptive updates
- No version control for service worker
- Missing update UX flow

### Recommended Configuration
```typescript
// next.config.ts
const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: false, // CHANGE: Don't skip waiting
  reloadOnOnline: false,
  runtimeCaching: [
    // Add custom runtime caching strategies
    {
      urlPattern: /^https:\/\/api\./,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    }
  ]
});
```

### Implement Controlled Updates
```typescript
// New update flow
1. Detect update available
2. Show notification with "Update" and "Later" options
3. If "Update": 
   - Show loading state
   - Post SKIP_WAITING message
   - Wait for controllerchange
   - Reload page
4. If "Later": 
   - Hide notification
   - Re-prompt after 24 hours
```

## Priority 3: Enhance Install Experience

### Current Issues
- Install prompt shows even after dismissal
- No progressive enhancement for iOS
- Missing app capabilities promotion

### Improvements

#### Custom Install UI Component
```typescript
interface InstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
  platform: 'android' | 'ios' | 'desktop';
}

// Features to highlight:
- Offline access
- Home screen convenience  
- Push notifications (if implemented)
- Native app-like experience
```

#### iOS-Specific Instructions
For iOS users, show manual install instructions:
1. Detect iOS Safari
2. Show custom banner with "Add to Home Screen" instructions
3. Include visual guide with screenshots

## Priority 4: Improve Offline Experience

### Current State
- Basic offline.html fallback page
- No dynamic content caching
- No offline indicator in app

### Enhancements

#### Implement Network-First Strategy for Content
```javascript
// Custom service worker additions
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone and cache successful responses
          const responseClone = response.clone();
          caches.open('api-cache-v1').then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Serve from cache if network fails
          return caches.match(event.request);
        })
    );
  }
});
```

#### Enhanced Offline Page
- Show cached content list
- Enable offline reading for articles
- Provide sync queue for user actions

## Priority 5: Performance Optimizations

### Cache Strategy Improvements
1. **Implement Versioned Caches**
   - Add version numbers to cache names
   - Clean old caches on activation

2. **Optimize Precache List**
   - Remove unnecessary files from precache
   - Use runtime caching for dynamic content

3. **Implement Background Sync**
   - Queue failed API calls
   - Retry when connection restored

### Bundle Size Optimization
```typescript
// Lazy load PWA components
const PWAComponents = dynamic(
  () => import('@/components/PWAComponents'),
  { ssr: false }
);
```

## Priority 6: Add PWA Analytics

### Metrics to Track
- Install prompt shown/accepted/dismissed
- Update notifications shown/accepted
- Offline page views
- Cache hit rates
- Service worker errors

### Implementation
```typescript
// Enhanced analytics in pwaAnalytics.ts
export const pwaAnalytics = {
  trackInstall: (outcome: 'shown' | 'accepted' | 'dismissed') => {
    // Send to analytics service
  },
  trackUpdate: (action: 'available' | 'installed' | 'dismissed') => {
    // Track update lifecycle
  },
  trackOffline: (duration: number) => {
    // Monitor offline usage
  }
};
```

## Priority 7: Advanced PWA Features

### Web Share API
Enable content sharing:
```typescript
if (navigator.share) {
  await navigator.share({
    title: 'Japanese Lesson',
    text: 'Check out this lesson',
    url: window.location.href
  });
}
```

### Background Sync
Queue actions while offline:
```typescript
// Register sync event
await registration.sync.register('sync-user-data');

// Handle in service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});
```

### Periodic Background Sync
Update content in background:
```typescript
await registration.periodicSync.register('update-content', {
  minInterval: 24 * 60 * 60 * 1000 // Daily
});
```

## Implementation Timeline

### Week 1
- [ ] Fix duplicate notification systems
- [ ] Implement proper update flow
- [ ] Test on multiple devices

### Week 2
- [ ] Enhance install experience
- [ ] Add iOS-specific instructions
- [ ] Improve offline page

### Week 3
- [ ] Optimize caching strategies
- [ ] Implement analytics
- [ ] Add background sync

### Week 4
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Documentation update

## Testing Checklist

### Installation Flow
- [ ] First visit shows install prompt after engagement
- [ ] Dismissal is remembered for 24 hours
- [ ] iOS users see manual instructions
- [ ] Installation completes successfully

### Update Flow
- [ ] Updates detected correctly
- [ ] Notification shows once
- [ ] Update applies after user action
- [ ] No immediate re-prompt after update

### Offline Functionality
- [ ] Offline page loads when disconnected
- [ ] Cached content is accessible
- [ ] Online restoration is smooth
- [ ] No duplicate notifications

### Performance
- [ ] Lighthouse PWA score > 90
- [ ] Service worker activates < 1s
- [ ] Cache-first for static assets
- [ ] Network-first for API calls

## Best Practices Alignment

### Google's PWA Checklist
- ✅ HTTPS enabled
- ✅ Valid manifest.json
- ✅ Service worker registered
- ⚠️ Offline functionality (needs improvement)
- ⚠️ Install experience (needs refinement)
- ✅ Responsive design

### Apple's PWA Guidelines
- ⚠️ iOS-specific meta tags
- ⚠️ Apple touch icons
- ⚠️ Splash screens for iOS
- ⚠️ Status bar styling

### Microsoft Edge PWA Requirements
- ✅ Manifest icons
- ✅ Theme color
- ⚠️ Handle protocol activation
- ⚠️ Title bar customization

## Monitoring & Maintenance

### Key Metrics
1. Install conversion rate
2. Update acceptance rate
3. Offline usage percentage
4. Cache efficiency
5. Service worker errors

### Regular Audits
- Weekly: Lighthouse PWA audit
- Monthly: User feedback review
- Quarterly: Performance analysis

## Resources & References

- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)

## Contact for Implementation Support
For implementation assistance, refer to the technical specifications above or consult with the development team.