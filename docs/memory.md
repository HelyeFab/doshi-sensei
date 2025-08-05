# Memory: The Great RSC 502 Error Saga

## The Nightmare

This document chronicles the journey of debugging and fixing persistent 502 Bad Gateway errors that plagued the Doshi Sensei application, particularly affecting React Server Component (RSC) requests.

## Initial Symptoms

1. **Multiple 502 Bad Gateway errors** appearing in the console for various pages:
   - `/vocabulary?_rsc=...`
   - `/drill?_rsc=...`
   - `/practice?_rsc=...`
   - `/admin?_rsc=...`
   - `/news?_rsc=...`
   - `/stories?_rsc=...`
   - `/kanji-browser?_rsc=...`

2. **NetworkError when attempting to fetch resources**
3. **Service Worker precaching errors**
4. **Errors appearing on fresh page load** (no cache involved)

## The Misdiagnosis Phase

Initially, we went down the wrong path thinking the Service Worker was the culprit:

### Emergency Fix Attempts (Wrong Direction)
1. **Disabled PWA entirely** - This didn't fix the issue
2. **Modified Service Worker caching** - Added RSC bypass logic
3. **Created aggressive middleware** - Added cache prevention headers
4. **Added error handler scripts**:
   - `sw-update-force.js` - Intercepted all fetch requests
   - `rsc-error-handler.js` - Wrapped fetch calls with retry logic
   - `sw-precache-fix.js` - Attempted to fix precache errors

### User Feedback
The user correctly identified that disabling the service worker wasn't the right approach and requested to have PWA functionality restored.

## The Real Issue

After extensive research and a comprehensive analysis document provided by the user (`/docs/netlify-issues.md`), we discovered:

### Root Cause: Serverless Function Timeouts
- **Netlify's 10-second timeout limit** for serverless functions
- **Heavy server-side processing** on certain pages
- **Next.js prefetching behavior** creating a "thundering herd" problem
- Multiple concurrent prefetch requests overwhelming the system

## The Proper Solution

### 1. SmartLink Component
Created `/src/components/SmartLink.tsx` to automatically disable prefetching for heavy pages:

```typescript
const HEAVY_PAGES = [
  '/vocabulary',
  '/drill', 
  '/practice',
  '/admin',
  '/news',
  '/stories',
  '/kanji-browser'
];
```

### 2. Implementation
- Updated `Home.tsx` to use SmartLink
- Modified `StunningBottomNavbar` to import SmartLink
- Replaced Link components for heavy pages throughout the app

### 3. Cleanup
Removed all the emergency "overkill" fixes:
- Simplified middleware to only basic security headers
- Removed fetch-intercepting scripts
- Kept only essential PWA management

## Additional Issues Fixed Along the Way

### 1. Font Preload Warnings
- Reduced font files from ~49 to ~10
- Only load essential weights initially
- Added `display: 'swap'` for better performance

### 2. Webpack Build Error
- Fixed `next/font` configuration syntax error
- Changed from object to string format for single font files

### 3. Login Page 502 Error
- Caused by overly aggressive middleware
- Fixed by removing all RSC-specific middleware logic

## Current Status

### Fixed ✅
1. Resource preload warnings for static assets
2. 502 errors for RSC requests on initial load
3. Font optimization
4. Cookie warning for stripe_mid
5. Removed all overkill emergency fixes

### Still Pending
1. N2/N3 kanji data preload error (currently working on)
2. Apple Touch Icon 404 errors

## Lessons Learned

1. **Don't jump to conclusions** - The service worker wasn't the problem
2. **Understand the infrastructure** - Netlify's serverless function limits were key
3. **Simple solutions are often best** - Disabling prefetch was more effective than complex error handling
4. **Clean up after emergency fixes** - Temporary solutions can cause more problems

## Key Commits

- `a39436b1` - Implemented SmartLink solution
- `cb7d02ed` - Fixed webpack font configuration  
- `a2f87c8c` - Removed aggressive middleware
- `d8620786` - Cleaned up overkill scripts

## The Kanji Issue (Current)

We're now addressing the N2/N3 kanji preload errors, which appear to be related to:
- API endpoint redirects (308 status with trailing slashes)
- The kanji preloader trying to load all levels sequentially
- Need to verify the intended behavior (only preload N5, background load others)

## Stripe.js Loading Issues (January 2025)

### Problem
Multiple Stripe.js loading attempts causing CSP violations and console errors:
- Aggressive retry logic causing multiple load attempts
- Console errors appearing in production
- CSP violations for stripe.com domains

### Solution Implemented
1. **Created Stripe Singleton** (`/src/lib/stripe-singleton.ts`)
   - Ensures Stripe.js is only loaded once
   - Tracks loading state globally
   - Prevents multiple concurrent load attempts
   - Provides methods to check availability without triggering loads

2. **Updated stripe.ts**
   - Removed aggressive retry logic
   - Implemented smart loading with environment checks
   - Only logs in development mode
   - Returns null gracefully on failure

3. **Updated stripe-loader.tsx**
   - Uses singleton pattern instead of direct stripePromise
   - Checks availability before attempting to load
   - Handles failures gracefully

4. **CSP Headers Updated** (in `next.config.ts`)
   - Added all necessary Stripe domains
   - Includes WebSocket support for Stripe checkout
   - Proper image and script sources configured

### Key Files Modified
- `/src/lib/stripe-singleton.ts` - New singleton manager
- `/src/lib/stripe.ts` - Simplified loading logic
- `/src/lib/stripe-loader.tsx` - Updated to use singleton
- `/next.config.ts` - Enhanced CSP headers

---

*This document serves as a memory of the debugging journey and a reference for similar issues in the future.*