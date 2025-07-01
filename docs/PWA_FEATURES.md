# PWA Features Documentation

## Overview
Doshi Sensei is now a fully-featured Progressive Web App (PWA) with production-ready capabilities including offline support, automatic updates, and advanced caching strategies.

## Key Features

### 1. **Offline Support**
- Custom offline page at `/offline`
- Intelligent caching of previously visited content
- Service worker handles network failures gracefully
- Offline notification component alerts users of connectivity status

### 2. **Installation**
- One-click installation prompt for supported browsers
- Custom install UI component (`PWAInstaller`)
- Platform-specific install instructions
- Installation analytics tracking

### 3. **Update Notifications**
- Automatic detection of app updates
- User-friendly update prompt (`PWAUpdateNotification`)
- Skip waiting functionality for immediate updates
- Background update checks every hour

### 4. **Advanced Caching Strategies**
- **Pages**: Network First (3s timeout) - ensures fresh content when online
- **Static Assets**: Cache First - JS/CSS cached for 30 days
- **Images**: Cache First - cached for 30 days with 200 item limit
- **API Calls**: Network First - 5 minute cache for API responses
- **External Fonts**: Cache First - 1 year cache for Google Fonts

### 5. **App Shortcuts**
Quick access to key features from the app icon:
- Practice Drills
- Study Lists
- Dictionary

### 6. **PWA Analytics**
- Installation tracking
- Update event monitoring
- Cache size reporting
- Platform and display mode metrics
- Event history (last 100 events)

## Technical Implementation

### SSR-Safe Navigator Access
All navigator/window references use the `browserCheck` utility:
```typescript
import { safeNavigator, runInBrowser } from '@/utils/browserCheck';

// Safe navigator access
if (safeNavigator?.onLine) {
  // Online-only code
}

// Browser-only code execution
runInBrowser(() => {
  // This only runs in browser
});
```

### Service Worker Configuration
- Powered by Workbox via next-pwa
- Automatic cleanup of outdated caches
- Fallback routes for offline scenarios
- Skip waiting for immediate updates

### Manifest Configuration
- Full manifest.json with all required fields
- Multiple icon sizes for different devices
- Theme color: #6366f1 (Indigo)
- Display mode: standalone
- Orientation: portrait-primary

## Development

### Building with PWA
```bash
# PWA is disabled in development for faster builds
npm run dev

# Production build includes full PWA
npm run build
```

### Testing PWA Features
1. Build the app: `npm run build`
2. Serve locally: `npm run start`
3. Open Chrome DevTools > Application tab
4. Check Service Workers, Manifest, and Storage

### Debugging
- Check PWA metrics: `pwaAnalytics.getMetrics()`
- View cache stats: `pwaAnalytics.getCacheStats()`
- Generate report: `pwaAnalytics.generateReport()`

## Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Partial support (no install prompt)
- iOS Safari: Add to Home Screen supported

## Performance Benefits
- Faster subsequent loads via intelligent caching
- Reduced server load from cached resources
- Works offline for previously visited content
- Background sync for data updates
- Optimized asset loading strategies

## Future Enhancements
- Push notifications support
- Background sync API integration
- Periodic background sync
- Web Share API implementation
- Advanced offline data sync