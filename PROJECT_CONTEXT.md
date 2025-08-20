# Doshi Sensei Clean Rebuild - Project Context

## Project Overview
**Name**: Doshi Sensei  
**Description**: Comprehensive Japanese language learning application  
**Status**: Clean rebuild from existing production app  
**Domain**: doshisensei.com (already live on Netlify)  
**Repository**: Will replace existing git repo once complete  

## Reason for Rebuild
After 3 months of intensive development with numerous patches and fixes, the codebase has accumulated technical debt that makes it feel unstable for production release. This clean rebuild will:
- Implement proper architecture from the start
- Ensure production stability
- Maintain cleaner, more maintainable code
- Build confidence in the release

## Migration Strategy
1. **Incremental Component Migration**: Move components one by one from old project (/home/mate/Dev/NextProjects/doshi-sensei-old)
2. **Test Each Step**: Verify both development and production builds after each addition
3. **Maintain Both Projects**: Keep old project as reference until new one is complete
4. **Atomic Replacement**: Replace entire git repo contents when ready

## Core Features to Migrate

### Essential Features (Phase 1 - Core Functionality)
- [x] Homepage with user greeting and stats (Basic version implemented)
- [x] Authentication (Firebase Auth)
  - Firebase client configuration
  - AuthContext with subscription tracking
  - Account page with login/signup/reset password
  - Google OAuth integration
  - Account deletion API
- [x] Basic navigation structure (Bottom nav implemented)
- [x] Theme system (dark/light mode) (12 color schemes with CSS variables)
- [ ] Japanese/English language toggle

### Learning Features (Phase 2 - Primary Features)
- [x] Hiragana practice with interactive charts
- [x] Katakana practice with interactive charts
- [ ] Verb conjugation practice
- [ ] Vocabulary search (JMdict integration)
- [ ] Kanji browser
- [ ] Study lists
- [ ] Practice modes (partially complete)

### Advanced Features (Phase 3 - Enhanced Features)
- [ ] YouTube shadowing with transcript caching
- [ ] Textbook vocabulary (Genki/Minna no Nihongo)
- [ ] Games (Snake, Kanji Battle, etc.)
- [ ] News reader
- [ ] AI story generation

### Infrastructure (Phase 4 - Production Ready)
- [ ] PWA configuration
- [ ] Offline support
- [ ] Firebase Firestore sync
- [ ] Subscription system (Stripe/PayPal)
- [ ] Analytics and tracking
- [ ] SEO optimization

## Technical Stack

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Font**: Rubik for Latin, Noto Sans JP for Japanese

### Data & Storage
- **Dictionary**: JMdict Simplified (22,569 entries)
- **Database**: Firebase Firestore
- **Local Storage**: IndexedDB for offline data
- **Authentication**: Firebase Auth

### Third-Party Services
- **Payments**: Stripe & PayPal
- **Hosting**: Netlify
- **YouTube Transcripts**: SupaData AI API
- **AI**: OpenAI API for story generation
- **TTS**: Edge-TTS for audio

## Design System

### Colors
- **IMPORTANT**: NO hardcoded colors - use CSS variables exclusively
- All colors must use theme system CSS variables (e.g., `bg-background`, `text-foreground`)
- Only exception: unique app design elements that don't change with themes
- Theme system supports 12 color schemes with CSS variables
- Each theme defines its own color palette through CSS variables

### Layout Patterns
- Mobile-first responsive design
- Bottom navigation bar (mobile)
- Card-based component layout
- Consistent spacing: `px-4` on mobile

### UI Components
- Clean, minimal interface
- Smooth animations with Framer Motion
- Loading skeletons for async content
- Toast notifications for user feedback
- **SmartHeader** component for all pages (consistent navigation)

### Available Shared Components
A comprehensive set of reusable UI components is available in `src/components/`:

#### Feedback & Notifications
- **Toast** (`Toast.tsx`) - Temporary notification messages with success/error/warning/info types
- **AlertBanner** (`AlertBanner.tsx`) - Persistent page-top notifications with dismiss option
- **ConfirmDialog** (`ConfirmDialog.tsx`) - Modal confirmation dialogs for user actions

#### Loading States
- **Spinner** (`Spinner.tsx`) - Animated hourglass emoji spinner in multiple sizes
- **InlineSpinner** - For buttons and inline loading states
- **PageSpinner** - Full-page loading overlay

#### Form Controls
- **Switch** (`Switch.tsx`) - Toggle switches with 3 sizes and label options
- **SearchBar** (`SearchBar.tsx`) - Search input with autocomplete suggestions and debouncing

#### Layout Components
- **Accordion** (`Accordion.tsx`) - Expandable content sections with smooth animations
- **Collapsible** - Simple show/hide content component
- **SmartHeader** (`SmartHeader.tsx`) - Standard page header with back navigation

All components are:
- Fully responsive (mobile-first)
- Theme-aware (adapt to 12 color schemes and dark/light mode)
- Accessible (ARIA attributes, keyboard navigation)
- TypeScript typed

See `docs/AppUIComponents.md` for detailed component documentation.

## File Structure Convention
```
doshi-sensei/
├── app/                    # Next.js app router pages
├── components/             # Reusable React components
├── lib/                    # Utility functions and helpers
│   ├── features/          # Feature registry (Pillar 1)
│   ├── entitlements/      # User entitlements (Pillar 2)
│   └── access/            # Access control (Pillar 3)
├── hooks/                  # Custom React hooks
│   └── useAccess.ts       # Main access control hook
├── contexts/              # React context providers
├── services/              # API and external service integrations
├── types/                 # TypeScript type definitions
├── data/                  # Static data files
└── public/                # Static assets
```

## Development Guidelines

### Code Standards
- Use TypeScript for all new code
- **NEVER use hardcoded colors** - always use CSS variables from theme system
- **Always use SmartHeader component** for page headers (not custom headers)
- Follow existing patterns from clean examples
- Implement proper error boundaries
- Add loading states for async operations
- Mobile-first responsive design

### Testing Strategy
- Test each component in isolation first
- Verify development build
- Test production build (`npm run build`)
- Check mobile responsiveness
- Validate offline functionality

### Performance Targets
- Lighthouse score > 90
- First contentful paint < 1.5s
- Time to interactive < 3.5s
- Bundle size monitoring

## Environment Variables Needed
```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# OpenAI
OPENAI_API_KEY=

# YouTube Transcripts
SUPA_YOUTUBE_API_KEY=
```

## Migration Checklist

### Before Starting Each Component
- [ ] Review original implementation
- [ ] Identify dependencies
- [ ] Check for hardcoded values
- [ ] Plan the clean implementation

### After Migrating Each Component
- [ ] Test in development
- [ ] Build for production
- [ ] Check console for errors
- [ ] Verify mobile responsiveness
- [ ] **CHECK AND MIGRATE ALL SEO INFORMATION** (metadata, structured data, Open Graph, etc.)
- [ ] Update this document

## Current Status
- **Date Started**: January 20, 2025
- **Current Phase**: Phase 2 - Learning Features
- **Last Updated**: January 20, 2025
- **Completed**:
  - ✅ Homepage with exact layout from old app
    - User avatar placeholder with greeting
    - Today's date with thin progress bar
    - Sectioned feature cards (Foundation, Core Learning, Practice & Review, Immersion, Tools & Resources)
  - ✅ Navigation system
    - StunningBottomNavbar for mobile
    - DesktopNavMenu for desktop (floating menu button)
  - ✅ Theme system foundation
    - Color palettes defined
    - Theme utilities created
    - Support for 12 color schemes (default, ocean, forest, sunset, purple, rose, emerald, amber, vercel, acnh, zelda, mario)
  - ✅ Static assets migrated
    - All icons and flat-icons copied
    - Fonts directory (Rubik, Geist, etc.)
    - Kanji data files
    - Textbook vocabulary data
    - PWA manifest and icons
  - ✅ Project structure matching old app
    - src/app for pages
    - src/components for components
    - src/utils for utilities
    - src/types for TypeScript types
    - src/contexts for React contexts
    - src/data for data files
  - ✅ Language Context system
    - English-only implementation with architecture for future expansion
    - Centralized strings management
    - useStrings() hook for all components
    - SEO content integrated
  - ✅ Virtual Companion system
    - VirtualCompanion modal with random characters
    - CompanionTrigger floating button (giraffe icon)
    - Global availability via VirtualCompanionContext
    - Encouraging quotes and animations
  - ✅ Buy Me a Coffee (Donation) system
    - FloatingDonateButton component
    - DonationModal with amount selection
    - Integrated with Language Context for strings
    - Placeholder Stripe integration
  - ✅ Settings System
    - Settings Context with localStorage persistence
    - Theme switching (light/dark/system)
    - Color scheme selection (12 themes)
    - Learning preferences (romaji, furigana)
    - Virtual companion toggle
    - Navigation gestures toggle
    - Daily goal configuration
    - Settings page with clean UI
    - SEO metadata and structured data
  - ✅ Shared UI Component Library
    - Toast notifications with useToast() hook
    - Alert banners for persistent messages
    - Confirm dialogs for user actions
    - Loading spinners (hourglass emoji animation)
    - Switch/toggle components
    - Search bar with autocomplete
    - Accordion and collapsible sections
    - All components theme-aware and responsive
  - ✅ Hiragana & Katakana Practice Pages
    - Interactive kana charts with audio support
    - Character selection system with localStorage persistence
    - Study modal with recognition/recall modes
    - Full SEO implementation with structured data
    - Responsive design for mobile and desktop
    - Switch between Hiragana/Katakana views
    - SelectionActionBar for batch operations
  - ✅ Authentication System
    - Firebase Auth integration with email/password
    - Google OAuth sign-in
    - AuthContext with user type tracking (guest/free/premium)
    - Account page with login/signup/reset password flows
    - Account deletion API endpoint
    - Firestore rules configured
  - ✅ Three-Pillar Architecture
    - Feature Registry with all app features defined
    - Entitlement Rules for guest/free/premium users
    - Access Permission Mapping
    - useAccess hook for checking and tracking usage
    - Integration with AuthContext for user type detection
- **Next Steps**:
  - Test authentication flow with different user types
  - Add subscription management (Stripe integration)
  - Migrate verb conjugation practice
  - Add vocabulary search feature
  - Implement kanji browser
  - Add Kana Drop game functionality

## Notes for Claude/AI Assistant
When working on this project:
1. Always check this document first for context
2. Follow the incremental migration strategy
3. Test thoroughly after each change
4. Keep code clean and well-organized
5. Update this document as features are completed
6. Prioritize stability over features
7. Ask for clarification if unsure about implementation details
8. **MANDATORY: Check and migrate ALL SEO information from old project for every page/component import**

## Communication Protocol
- Always mention which phase/component you're working on
- Report any issues or concerns immediately
- Suggest improvements to architecture when noticed
- Keep track of completed items in this document