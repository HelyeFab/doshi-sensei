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