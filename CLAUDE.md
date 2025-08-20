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
├── hooks/                  # Custom React hooks
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

## Development Guidelines

### UI/UX Patterns
- Mobile-first responsive design
- Card-based component layouts
- Bottom navigation for mobile
- Clean, minimal interface with smooth animations
- Loading skeletons for async content
- Toast notifications for user feedback

### Design System
- Background: `bg-gray-50` (light grey)
- Cards: `bg-white` with `shadow-sm`
- Primary actions: Blue color variants
- Text: `text-gray-900` (primary), `text-gray-600` (secondary)
- Spacing: `px-4` on mobile

### Code Standards
- TypeScript for all new code
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
3. Plan a clean implementation
4. Test thoroughly in both dev and production
5. Update PROJECT_CONTEXT.md with progress