# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Doshi Sensei is a Japanese language learning application built with Next.js 15 and TypeScript. It features verb conjugation practice, vocabulary search, kanji mood boards, and a comprehensive admin dashboard. The app uses Firebase for authentication and data storage, with a freemium subscription model.

## Development Commands

```bash
# Development
npm run dev                   # Start development server (port 3000)
npm run build                 # Production build with deployment prep
npm run start                 # Start production server
npm run lint                  # ESLint code checking

# Testing
npm run test                  # Run Jest test suite
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Generate coverage reports
npm run test:ci               # CI/CD test execution

# Utilities
npm run chunk-jmdict          # Process dictionary data
npm run prepare-deploy        # Prepare for deployment
```

## Architecture

### App Router Structure
- `/admin/*` - Admin dashboard with user management and mood board editing
- `/api/*` - API routes for TTS, translation, and Stripe webhooks
- `/drill` - Conjugation practice mode
- `/kanji-moods/[boardId]` - Individual mood board learning
- `/vocabulary` - Dictionary search with multiple data sources
- `/reading` - Reading comprehension with audio

### Key Technologies
- **Next.js 15** with App Router and static export
- **TypeScript** in strict mode
- **Tailwind CSS v4** with @tailwindcss/postcss
- **Firebase Auth & Firestore** for authentication and cloud sync
- **Stripe** for subscription payments
- **next-pwa** for PWA functionality
- **@lixen/edge-tts** for Japanese text-to-speech

### Data Architecture
- **IndexedDB** for offline storage (`src/utils/indexedDB.ts`)
- **Firestore** for cloud sync and user data
- **Multiple dictionaries** - JMdict, Jisho, WaniKani integration
- **Spaced repetition** system for learning progress

## Important Patterns

### Context Providers
The app uses several React contexts:
- `AuthContext` - Firebase authentication state
- `AdminContext` - Admin dashboard state and permissions
- `AppContext` - Global app state and user preferences

### Admin System
Admin functionality is protected by Firebase security rules. Admin users have access to:
- User management and statistics (`src/utils/adminStats.ts`)
- Mood board content creation (`src/components/admin/mood-boards/`)
- System logs and analytics (`src/utils/adminLogs.ts`)

#### Current Admin Dashboard Implementation Status
**✅ Fully Implemented:**
- Real-time user statistics and analytics
- Premium user management with upgrade/downgrade functionality
- Comprehensive mood board CRUD operations
- Activity logging and audit trails
- Mobile-responsive design with proper navbar spacing
- User search, filtering, and management
- Real-time data updates via Firestore listeners

**📋 Missing Features & Enhancement Opportunities:**

**Priority 1 - Business Critical:**
- Revenue analytics and MRR (Monthly Recurring Revenue) tracking
- CSV export functionality for user data and analytics reports
- Bulk user operations (select multiple users for batch premium upgrades)
- User activity timelines (individual user usage history and patterns)

**Priority 2 - Administrative Efficiency:**
- User notes/tags system for admin annotations
- Suspension/ban functionality for user account management
- Bulk mood board operations (mass publish/unpublish, bulk editing)
- Email template management for user communications

**Priority 3 - Advanced Features:**
- System settings page (app-wide configuration, feature flags)
- Database backup/restore controls (currently shows status only)
- Admin notification preferences and system alerts
- Failed login attempt tracking and security monitoring
- Rate limiting controls for API and feature usage

**🎯 Implementation Recommendations:**
1. **Revenue Analytics Dashboard** - Add financial metrics tracking subscription conversions, churn rates, and revenue trends
2. **Data Export System** - Implement CSV/Excel export functionality for user data, analytics, and financial reports
3. **Enhanced User Management** - Add bulk operations, user activity timelines, and communication tools
4. **Security Enhancements** - Implement comprehensive audit trails, failed login tracking, and suspicious activity alerts

**📁 Key Admin Files:**
- `src/app/admin/` - Admin page components
- `src/components/admin/` - Reusable admin UI components
- `src/hooks/useAdminStats.ts` - Real-time statistics management
- `src/utils/adminStats.ts` - Statistics calculation and data aggregation
- `src/utils/adminLogs.ts` - Activity logging and audit functionality
- `src/types/admin.ts` - TypeScript definitions for admin features

### Learning Engine
Core learning functionality in `src/utils/`:
- `conjugationLogic.ts` - Japanese verb conjugation rules
- `spacedRepetition.ts` - SRS algorithm implementation
- `kanjiSearch.ts` - Kanji lookup and analysis
- `kanjiMoods.ts` - Mood board system logic

## Configuration Files

### Firebase
- `firestore.rules` - Security rules with admin permissions
- `firestore.indexes.json` - Database indexes
- `firebase.json` - Hosting and emulator configuration

### Build Configuration
- `next.config.ts` - PWA setup, webpack config, static export
- `jest.config.js` - Test configuration with 95% coverage target
- `postcss.config.mjs` - Tailwind CSS v4 integration

## Testing

Uses Jest with React Testing Library. Test files are located alongside source files with `.test.ts` extension. The test suite covers:
- Core learning algorithms
- UI component behavior
- API endpoint functionality
- Admin dashboard features

Run tests with coverage to ensure 95%+ statement coverage before committing.

## Deployment

The app is configured for static export to Firebase Hosting:
1. `npm run build` - Creates optimized production build
2. `npm run prepare-deploy` - Prepares deployment files
3. Firebase deployment via CI/CD pipeline

## Security Considerations

- All admin routes are protected by Firebase security rules
- User data is isolated per user ID in Firestore
- Subscription status is validated server-side
- API keys and secrets are managed through environment variables

## Logging and Debugging

### Centralized Subscription Logger
The app uses a centralized logging system for subscription state management, located at `src/utils/subscriptionLogger.ts`. This replaces scattered console.log statements throughout the codebase.

**Features:**
- Single point of logging for all subscription state changes
- Automatically logs user login events with complete subscription details
- Structured output using console.table for better readability
- Only active in development mode by default

**Configuration:**
- Set `NODE_ENV=development` to enable logging automatically
- Or set `NEXT_PUBLIC_DEBUG_SUBSCRIPTIONS=true` to force enable in production

**What gets logged:**
- User authentication state (email, uid, login method)
- Subscription details (plan, status, Stripe ID, renewal date)
- User type (guest, free, premium)
- Usage limits and current usage counters
- Timestamps for all events

**Usage:**
The logger is automatically integrated into `SubscriptionContext` and logs:
- User login events
- Subscription updates
- Feature access checks

To view subscription state for any user, simply log in and check the browser console for the structured table output showing complete subscription information.

## Common Tasks

### ⚠️ Adding New Pages/Features - NAVIGATION MAINTENANCE REQUIRED
**CRITICAL:** When adding new pages or features to the app, you MUST update the mobile navigation options:

1. **Add navigation item** to `src/config/navigation.ts` in the `AVAILABLE_NAV_ITEMS` array
2. **Test navigation** in Settings > Mobile Navigation to ensure it appears
3. **Verify functionality** in the mobile bottom navigation
4. **Update documentation** as needed

**Why this matters:** Users can customize their mobile bottom navigation (Home + 3 items). New features won't be discoverable unless added to the navigation options. This is a user-facing feature that directly impacts UX.

**Files to check:**
- `src/config/navigation.ts` - Add new navigation items here
- `src/components/BottomNavigation.tsx` - Dynamic navigation logic
- `src/app/settings/page.tsx` - Navigation customization UI

### Adding New Learning Content
1. Update data in `src/data/` directory
2. Run `npm run chunk-jmdict` to process dictionary updates
3. Update Firestore indexes if needed

### Admin Dashboard Changes
1. Modify components in `src/components/admin/`
2. Update admin context in `src/contexts/AdminContext.tsx`
3. Test with admin permissions enabled

### API Route Development
1. Create routes in `src/app/api/`
2. Update CORS configuration in `next.config.ts`
3. Test with both authenticated and unauthenticated requests

## Session History - June 29, 2025

### Fixed "navigator is not defined" SSR Errors
**Problem:** Netlify deployment was failing with "navigator is not defined" errors occurring randomly on different pages, particularly on kanji-moods pages. The error happened during static site generation when browser APIs were accessed at module level.

**Root Causes:**
1. `cloudSync.ts` was accessing `navigator.onLine` during class initialization
2. Multiple utility files were using `navigator` without SSR checks
3. `useMoodBoards` hook referenced undefined `moodBoardsData` variable

**Solutions Applied:**
1. Added SSR checks (`typeof navigator !== 'undefined'`) to:
   - `/src/utils/cloudSync.ts` - Fixed static initialization and all navigator usage
   - `/src/utils/stats.ts` - Simplified browser environment check
   - `/src/utils/syncQueue.ts` - Added checks before navigator.onLine access
2. Fixed undefined reference in `/src/hooks/useMoodBoards.ts`
3. Temporarily disabled PWA in `next.config.ts` to isolate issues

### Removed Massive Unused Icon Collection
**Problem:** The app had 2,138 flat-icon files in the public folder, causing performance issues and unnecessary bloat.

**Solution:**
1. Identified only 53 icons were actually used in the codebase
2. Removed entire flat-icons folder from public directory
3. Added flat-icons to .gitignore to prevent re-addition
4. Created `flat-icons-needed.txt` documenting all required icons

### Fixed Missing Icons
**Problem:** After removing flat-icons, the virtual companion giraffe icon and help icons were missing.

**Solutions:**
1. Restored giraffe icon:
   - Copied from source to `/public/flat-icons/8376275-wild-animals-flat-1-of-1/png/007-giraffe.png`
   - Updated .gitignore to allow specific needed icons
2. Replaced help whistle icon with ℹ️ emoji in `PageHelpIcon.tsx`

### Key Learnings
- Always check for browser API usage during SSR
- Module-level code runs during static generation
- Large asset folders should be audited for actual usage
- Simple emoji solutions can replace complex icon dependencies

## Session History - June 30, 2025

### Restored and Enhanced PWA to Production Standards
**Problem:** PWA functionality was disabled to fix SSR navigator errors, leaving the app without offline support and modern PWA features.

**Comprehensive Solution:**
1. **Created SSR-Safe Browser Check Utility** (`/src/utils/browserCheck.ts`):
   - `safeNavigator` - Safe access to navigator object
   - `runInBrowser()` - Wrapper for browser-only code
   - `isBrowser` - Boolean check for browser environment

2. **Updated All Navigator References** to use browserCheck utility in:
   - `/src/utils/syncQueue.ts` - Online status checks
   - `/src/utils/cloudSync.ts` - Network monitoring
   - `/src/utils/stats.ts` - Service worker access
   - `/src/components/PWAWrapper.tsx` - PWA detection
   - `/src/components/PWAInstaller.tsx` - Installation handling
   - `/src/components/OfflineNotification.tsx` - Online status
   - `/src/utils/indexedDB.ts` - Storage estimation
   - `/src/contexts/AdminContext.tsx` - User agent access

3. **Re-enabled PWA with Advanced Configuration**:
   - Smart caching strategies (Network First for pages, Cache First for assets)
   - Offline fallback page at `/offline`
   - Automatic update detection and notifications
   - App shortcuts for quick access
   - Enhanced manifest with screenshots and shortcuts

4. **Added Production-Ready PWA Features**:
   - **PWAUpdateNotification Component** - User-friendly update prompts
   - **PWA Analytics** (`/src/utils/pwaAnalytics.ts`) - Installation tracking, metrics, and health monitoring
   - **Enhanced Manifest** - Added shortcuts, screenshots, and proper metadata
   - **Optimized Caching** - Different strategies for pages, assets, images, and API calls

5. **Created Comprehensive Documentation** (`/docs/PWA_FEATURES.md`):
   - Feature overview and technical implementation details
   - Development and testing guidelines
   - Browser support matrix
   - Performance benefits

### Key Technical Improvements
- **Build Performance**: PWA disabled in development for faster builds
- **Cache Strategies**: 
  - Pages: Network First with 3s timeout
  - Static Assets: Cache First (30 days)
  - Images: Cache First (30 days, 200 item limit)
  - API: Network First (5 minute cache)
  - External Fonts: Cache First (1 year)
- **Update Flow**: Automatic detection → User prompt → Skip waiting → Reload
- **Analytics**: Event tracking for install, updates, and offline usage

### Results
- ✅ Build succeeds with all PWA features enabled
- ✅ No more SSR navigator errors
- ✅ Full offline support with intelligent caching
- ✅ Seamless app updates without user friction
- ✅ Production-ready with analytics and monitoring

## Key Background Files for Development

### Files to Review Before Making Changes
When working on features related to user limits, subscriptions, or game access, review these files:

1. **Subscription System**
   - `/src/utils/subscriptionValidator.ts` - Single source of truth for subscription validation
   - `/src/types/subscription.ts` - User types and subscription interfaces
   - `/src/contexts/SubscriptionContext.tsx` - Main subscription state management
   - `/docs/FREEMIUM_SYSTEM_DOCUMENTATION.md` - Comprehensive freemium system docs
   - `/docs/USER_ENTITLEMENTS.md` - Visual guide to user entitlements

2. **Games**
   - `/src/components/games/KanaDropGame/` - KanaDrop game implementation
     - `KanaDropModal.tsx` - Main game container
     - `GameCanvas.tsx` - Game play area
     - `FallingObject.tsx` - Individual falling items
     - `types.ts` - Game types and constants
   - `/src/components/games/KanjiQuest.tsx` - Pokémon-style kanji learning game

3. **Admin System**
   - `/src/types/admin.ts` - Admin user types
   - `/docs/CLAUDE.md` - Section on admin dashboard implementation status

### Understanding User Types
- **Guest**: Non-registered users (3 games/drills per day, no saving)
- **Free**: Registered users (3 games/drills per day, 3 lists max, 5 bookmarks)
- **Monthly/Yearly**: Premium users ($3.99/mo or $39.99/yr, unlimited everything)
- **Admin**: Special role with dashboard access

**Note**: The system currently uses 'monthly' and 'yearly' as distinct user types rather than a generic 'premium'. See `/docs/PREMIUM_TYPE_REFERENCES.md` for all locations that depend on this distinction.

## Entitlements System Migration Plan - January 2025

### Overview
We're migrating from scattered hardcoded user limits to a centralized entitlements system. The new system (`src/utils/userEntitlements.ts`) provides a single source of truth for all feature access controls.

### Current Status
- ✅ Core entitlements system created
- ✅ React hook (`useEntitlements`) implemented
- ✅ Documentation completed
- ✅ KanaDrop game migrated as proof of concept
- 🚧 Other features still using hardcoded limits

### Migration Phases

#### Phase 1: Fix Critical Issues (Priority: HIGH)
**Files to update:**
1. `src/components/UsageLimitDisplay.tsx` - Fix incorrect drill limit (shows 50, should be 3)
2. `src/contexts/SubscriptionContext.tsx` - Replace hardcoded FREE_LIMITS and GUEST limits

**Instructions:**
```typescript
// Replace hardcoded limits with:
import { getEntitlementsForUserType, getFeatureLimit } from '@/utils/userEntitlements';

// Get limits dynamically:
const drillLimit = getFeatureLimit(userType, 'learning.drills', 'daily');
```

#### Phase 2: Update Core Features (Priority: HIGH)
**Features to migrate:**

1. **KanjiQuest** (`src/components/games/KanjiQuest.tsx`)
   - Replace lines 195-196 hardcoded limits
   - Use `useEntitlements().canPlayGame('kanjiQuest')`

2. **Drill System** (`src/app/drill/page.tsx`)
   - Replace line 886 hardcoded display
   - Use `useEntitlements().canDoDrill()`

3. **Story System** 
   - Find and update story limit checks
   - Use `useEntitlements().canReadStory()`

4. **Article System**
   - Find and update article limit checks  
   - Use `useEntitlements().canReadArticle()`

5. **List Creation** (`src/app/practice/page.tsx` line 713)
   - Replace hardcoded alert
   - Use `useEntitlements().canCreateList()`

#### Phase 3: Update Backend/API (Priority: MEDIUM)
**Files to update:**
1. `src/app/api/stripe-webhook/route.ts` - Lines 161-164, 204-207
2. `src/types/subscription.ts` - DEFAULT constants

**Instructions:**
- Import entitlements system in API routes
- Replace hardcoded limit objects with calls to `getEntitlementsForUserType()`

#### Phase 4: Update Documentation & Types (Priority: LOW)
**Files to update:**
1. `src/types/subscription.ts` - SUBSCRIPTION_PLANS descriptions
2. Any remaining documentation references

### Implementation Guidelines

1. **Always use the entitlements hook in components:**
```typescript
const { canAccess, promptForAccess } = useEntitlements();

// Check access
const check = canAccess('feature.path');
if (!check.allowed) {
  promptForAccess('Feature Name', check.reason);
  return;
}
```

2. **For non-React code, use the utility directly:**
```typescript
import { getFeatureLimit, isFeatureEnabled } from '@/utils/userEntitlements';

const limit = getFeatureLimit(userType, 'games.kanjiQuest', 'daily');
```

3. **Test each migration:**
- Test as guest user
- Test as free user  
- Test as premium user
- Verify limits are enforced correctly

### Testing Checklist
- [ ] Guest users see correct limits (3/day for games, drills, etc.)
- [ ] Free users see correct limits (3 lists max, 5 bookmarks max)
- [ ] Premium users have unlimited access
- [ ] Upgrade prompts show correct messages
- [ ] Usage tracking increments properly

### Common Pitfalls to Avoid
1. Don't forget to handle the loading state from `useEntitlements`
2. Remember that KanaDrop shares the KanjiQuest counter (all games share limits)
3. Always reset usage tracking when appropriate (game restart, etc.)
4. Test date-based resets for daily limits

### Branch Information
Working branch: `feature/entitlements-migration`
Main tracking issue: Consolidate all hardcoded user limits into centralized entitlements system