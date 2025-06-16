# Progressive Web App (PWA) Implementation Plan for Doshi Sensei

## Overview

This document outlines recommendations for implementing service workers and PWA features to enhance Doshi Sensei's user experience. These improvements will enable offline access, faster loading times, and make the application installable on user devices.

## Key Benefits

1. **Offline Access**: Users can access the app even without an internet connection
2. **Faster Loading**: Key resources are cached, reducing load times on repeat visits
3. **Dictionary Caching**: Language resources available offline through specialized caching
4. **Installable Experience**: Users can add the app to their home screen
5. **Automatic Updates**: Service worker updates cached resources when new versions are available

## Implementation Steps

### 1. Add PWA Dependencies

```bash
npm install next-pwa
```

### 2. Create Web App Manifest

Create a file at `/public/manifest.json`:

```json
{
  "name": "Doshi Sensei",
  "short_name": "Doshi",
  "description": "Japanese language learning tool",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/doshi.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/doshi.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3. Update Next.js Configuration

Modify your `next.config.ts` to include PWA configuration:

```typescript
import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WANIKANI_API_TOKEN: process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN,
  },
  // Configure for static export (Netlify compatibility)
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);

export default config;
```

### 4. Custom Service Worker Implementation

Create a file at `/public/sw.js` for custom service worker logic:

```javascript
// This is the service worker with the combined offline experience (Offline page + Offline copy of pages)

const CACHE = "doshi-sensei-cache-v1";
const offlineFallbackPage = "/";

// Install stage sets up the offline page in the cache and opens a new cache
self.addEventListener("install", function (event) {
  console.log("[PWA] Install Event processing");

  event.waitUntil(
    caching()
  );

  self.skipWaiting();
});

async function caching() {
  const cache = await caches.open(CACHE);
  console.log("[PWA] Cached offline page");
  
  // Cache core app assets
  return cache.addAll([
    offlineFallbackPage,
    "/",
    "/settings/",
    "/practice/",
    "/vocabulary/",
    "/drill/",
    "/doshi.png",
    "/globals.css",
    // Add your critical JS and CSS files here
  ]);
}

// If any fetch fails, it will show the offline page
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // If request was successful, add result to cache
        event.waitUntil(updateCache(event.request, response.clone()));
        return response;
      })
      .catch(function (error) {
        console.log("[PWA] Network request Failed. Serving content from cache: " + error);
        return fromCache(event.request);
      })
  );
});

// Cache dictionary files for offline use
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/dict/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open('doshi-dict-cache').then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
    );
  }
});

function fromCache(request) {
  // Check to see if you have it in the cache
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (matching) {
      if (!matching || matching.status === 404) {
        // If the page is not in the cache, try to fetch the offline page
        return cache.match(offlineFallbackPage);
      }

      return matching;
    });
  });
}

function updateCache(request, response) {
  return caches.open(CACHE).then(function (cache) {
    return cache.put(request, response);
  });
}

// This is an event that can be fired from your page to tell the SW to update the offline page
self.addEventListener("refreshOffline", function () {
  const offlinePageRequest = new Request(offlineFallbackPage);

  return fetch(offlineFallbackPage).then(function (response) {
    return caches.open(CACHE).then(function (cache) {
      console.log("[PWA] Offline page updated from refreshOffline event");
      return cache.put(offlinePageRequest, response);
    });
  });
});
```

### 5. Update `layout.tsx` to Include PWA Meta Tags

Add the following meta tags to your `layout.tsx` file within the `<head>` section:

```tsx
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="application-name" content="Doshi Sensei" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Doshi Sensei" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#6366f1" />
  
  {/* Existing script */}
  <script dangerouslySetInnerHTML={{ __html: `...` }} />
</head>
```

## Dictionary Caching Strategy

The implementation includes a specialized caching strategy for dictionary files in the `/dict/` directory. This ensures that:

1. Dictionary resources are available offline
2. Updates to dictionary files are fetched when available
3. Network requests are minimized for better performance

## Testing PWA Implementation

After implementation, test the following:

1. **Offline Functionality**: Turn off network access and verify the app still loads
2. **Install Prompts**: Check that the app can be installed on desktop and mobile devices
3. **Cache Updates**: Verify that updated content appears after deployment
4. **Performance**: Measure loading time improvements with tools like Lighthouse

## Lighthouse PWA Score

Use Google's Lighthouse tool to assess your PWA implementation. Aim for:
- 100% score in the PWA category
- Green across all PWA audit items
- Verification of all installability requirements

## Considerations for Netlify Deployment

Since Doshi Sensei is deployed on Netlify with static export, ensure that:
1. The service worker is properly included in the build output
2. Headers are configured to allow service worker registration
3. Cache-control headers are set appropriately for static assets

## Future Enhancements

After basic PWA implementation, consider these advanced features:

1. **Background Sync**: Allow users to submit data when offline
2. **Push Notifications**: Send study reminders and updates
3. **Periodic Sync**: Update dictionary content in the background
4. **Workbox Integration**: More sophisticated caching strategies
