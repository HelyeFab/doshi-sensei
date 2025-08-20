# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Doshi Sensei is a comprehensive Japanese language learning application being rebuilt from scratch for production stability. This is a clean rebuild of an existing production app (doshisensei.com) with the goal of implementing proper architecture and eliminating technical debt accumulated over 3 months of rapid development.

## Essential Commands

```bash
# Development
npm run dev         # Start development server on http://localhost:3000

# Build & Production
npm run build       # Build for production
npm run start       # Start production server

# Code Quality
npm run lint        # Run ESLint
```

## Architecture & Structure

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS v4
- **Font System**: Geist (default), will migrate to Rubik + Noto Sans JP

### Project Structure
```
├── app/                    # Next.js App Router pages
├── components/             # Reusable React components
├── lib/                    # Utility functions and helpers
│   ├── features/          # Feature registry (Three-Pillar #1)
│   │   └── registry.ts    # All feature definitions
│   ├── entitlements/      # User entitlements (Three-Pillar #2)
│   │   └── rules.ts       # Limits per user type
│   └── access/            # Access control (Three-Pillar #3)
│       └── index.ts       # Permission mappings
├── hooks/                  # Custom React hooks
│   └── useAccess.ts       # Main access control hook
├── contexts/               # React context providers
├── services/               # API and external service integrations
├── types/                  # TypeScript type definitions
├── data/                   # Static data files (dictionaries, etc.)
└── public/                 # Static assets
```

### Path Aliases
- `@/*` maps to the project root for clean imports

## Migration Strategy

This is an incremental rebuild following these phases:

1. **Phase 1 - Core**: Authentication, navigation, theming, i18n
2. **Phase 2 - Learning**: Verb conjugation, vocabulary, kanji, study lists
3. **Phase 3 - Advanced**: YouTube shadowing, games, AI stories
4. **Phase 4 - Production**: PWA, offline support, payments, analytics

Components are migrated individually from the old project, with testing at each step to ensure both development and production builds work correctly.

## Key Integrations

### External Services
- **Firebase**: Authentication and Firestore database
- **Stripe & PayPal**: Payment processing
- **OpenAI API**: Story generation
- **SupaData AI API**: YouTube transcript fetching
- **JMdict**: Japanese dictionary data (22,569 entries)

### Environment Variables Required
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
OPENAI_API_KEY
SUPA_YOUTUBE_API_KEY
```

## CRITICAL: Three-Pillar Architecture

### Mandatory for ALL Features with Access Control
**Every feature that has usage limits, requires authentication, or has premium restrictions MUST implement the Three-Pillar Architecture:**

### The Three Pillars:

#### 1. Feature Registry (`/src/lib/features/registry.ts`)
```typescript
'feature_name': {
  id: 'feature_name',
  name: 'Feature Display Name',
  description: 'What this feature does',
  category: 'learning', // or 'games', 'tools', etc.
  icon: '📚',
  limitType: 'daily', // 'daily', 'total', or 'none'
  requiresAuth: false,
  requiresSubscription: false,
  status: 'active'
  // NO sharedLimitGroup - each feature tracked individually!
}
```

#### 2. Entitlement Rules (`/src/lib/entitlements/rules.ts`)
```typescript
// Guest users (not logged in)
guest: {
  daily: { feature_name: 0 },
  total: { feature_name: 0 }
}

// Free users (logged in, no subscription)
free: {
  daily: { feature_name: 3 },
  total: { feature_name: 10 }
}

// Premium users (monthly/yearly subscription)
premium: {
  daily: { feature_name: -1 }, // -1 = unlimited
  total: { feature_name: -1 }
}
```

#### 3. Access Permission Mapping (`/src/lib/access/index.ts`)
```typescript
const permissionMap: Record<string, string> = {
  'feature_name': 'appropriate_permission',
  // Examples:
  'drill_practice': 'do_drills',
  'kanji_quest': 'play_games',
  'vocabulary_search': 'search_vocabulary'
};
```

### Implementation in Components:
```typescript
import { useAccess } from '@/hooks/useAccess';

export default function MyFeature() {
  const { checkAndTrack } = useAccess();
  
  const handleFeatureUse = async () => {
    // This ONE line handles EVERYTHING:
    // - Checks user authentication
    // - Verifies subscription status
    // - Checks usage limits
    // - Tracks usage automatically
    // - Shows appropriate modals if access denied
    if (await checkAndTrack('feature_name')) {
      // User has access - perform the action
      doTheFeatureWork();
    }
    // No else needed - modals handled automatically
  };
}
```

### Adding a New Feature - Complete Checklist:
1. **Register the feature** in `/src/lib/features/registry.ts`
2. **Set limits** for each user type in `/src/lib/entitlements/rules.ts`
3. **Map to permission** in `/src/lib/access/index.ts`
4. **Use `checkAndTrack()`** in your component
5. **Test** with Guest, Free, and Premium users
6. **Update admin dashboard** if needed

### Common Feature Categories:
- **Learning**: drill_practice, vocabulary_search, kanji_study
- **Games**: kanji_quest, kana_drop, memory_match
- **Tools**: ai_stories, youtube_shadowing, news_reader
- **Storage**: study_lists, saved_items, bookmarks

### Important Rules:
- **NEVER** hardcode limits in components
- **NEVER** use shared limit groups
- **ALWAYS** use `checkAndTrack()` for usage tracking
- **ALWAYS** test with all three user types
- Each feature gets its own individual tracking

## Development Guidelines

### CRITICAL: SEO Migration Requirements
**MANDATORY**: After importing ANY page or component from the old project, you MUST:
1. **Check the old project** for ALL SEO-related information including:
   - Metadata (title, description, keywords)
   - Structured data (JSON-LD schema)
   - Open Graph tags
   - Twitter cards
   - Canonical URLs
   - Any SEO-specific content or comments
2. **Migrate ALL SEO information** to the new project
3. **This must be done automatically** - WITHOUT being asked - for every import
4. **Update both CLAUDE.md and PROJECT_CONTEXT.md** to track SEO migrations

### UI/UX Patterns
- Mobile-first responsive design
- Card-based component layouts
- Bottom navigation for mobile
- Clean, minimal interface with smooth animations
- Loading skeletons for async content
- Toast notifications for user feedback

### Design System
- **IMPORTANT**: NO hardcoded colors - use CSS variables exclusively
- All colors must use theme system CSS variables:
  - Background: `bg-background` (not `bg-gray-50`)
  - Cards: `bg-card` (not `bg-white`)
  - Text: `text-foreground` (primary), `text-muted` (secondary)
  - Borders: `border-border`
  - Primary actions: `bg-primary`, `text-primary`
- Theme system supports 12 color schemes with automatic switching
- Spacing: `px-4` on mobile

### Code Standards
- TypeScript for all new code
- **NEVER use hardcoded colors** (e.g., `gray-50`, `blue-500`, `white`, `black`)
  - Always use CSS variables from theme system (e.g., `bg-background`, `text-foreground`, `border-border`)
  - Only exception: unique app design elements that don't change with themes
- Implement error boundaries for robustness
- Add loading states for all async operations
- Test both development and production builds after changes
- Follow existing patterns from clean examples

### Performance Targets
- Lighthouse score > 90
- First contentful paint < 1.5s
- Time to interactive < 3.5s

## Important Context

Refer to PROJECT_CONTEXT.md for detailed migration checklist, feature list, and current status. The project is currently in the initial setup phase, with the next step being to create the basic homepage structure.

When implementing features:
1. Review the original implementation in the old project
2. Identify all dependencies
3. **Determine if feature needs access control** (limits, auth, premium)
4. If yes, implement Three-Pillar Architecture FIRST
5. Plan a clean implementation
6. Use `checkAndTrack()` for all access-controlled actions
7. Test thoroughly in both dev and production with all user types
8. Update PROJECT_CONTEXT.md with progress

## Quick Reference: User Types & Typical Limits

| Feature Type | Guest | Free | Premium |
|-------------|-------|------|------|
| Games | 0-1/day | 3-5/day | Unlimited |
| Drills | 0/day | 3-5/day | Unlimited |
| AI Features | 0/day | 1-3/day | Unlimited |
| Study Lists | 0 | 3 total | Unlimited |
| Saved Items | 0 | 10-20 total | Unlimited |
| YouTube Shadowing | 0/day | 3/day | Unlimited |
| News Articles | 1/day | 5/day | Unlimited |