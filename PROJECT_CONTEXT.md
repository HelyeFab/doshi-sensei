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
1. **Incremental Component Migration**: Move components one by one from old project
2. **Test Each Step**: Verify both development and production builds after each addition
3. **Maintain Both Projects**: Keep old project as reference until new one is complete
4. **Atomic Replacement**: Replace entire git repo contents when ready

## Core Features to Migrate

### Essential Features (Phase 1 - Core Functionality)
- [ ] Homepage with user greeting and stats
- [ ] Authentication (Firebase Auth)
- [ ] Basic navigation structure
- [ ] Theme system (dark/light mode)
- [ ] Japanese/English language toggle

### Learning Features (Phase 2 - Primary Features)
- [ ] Verb conjugation practice
- [ ] Vocabulary search (JMdict integration)
- [ ] Kanji browser
- [ ] Study lists
- [ ] Practice modes

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
- Background: `bg-gray-50` (light grey)
- Cards: `bg-white` with `shadow-sm`
- Primary actions: Blue variants
- Text: `text-gray-900` (primary), `text-gray-600` (secondary)

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

## File Structure Convention
```
doshi-sensei/
├── app/                    # Next.js app router pages
├── components/             # Reusable React components
├── lib/                    # Utility functions and helpers
├── hooks/                  # Custom React hooks
├── contexts/              # React context providers
├── services/              # API and external service integrations
├── types/                 # TypeScript type definitions
├── data/                  # Static data files
└── public/                # Static assets
```

## Development Guidelines

### Code Standards
- Use TypeScript for all new code
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
- [ ] Update this document

## Current Status
- **Date Started**: January 20, 2025
- **Current Phase**: Initial Setup
- **Next Step**: Create basic homepage structure

## Notes for Claude/AI Assistant
When working on this project:
1. Always check this document first for context
2. Follow the incremental migration strategy
3. Test thoroughly after each change
4. Keep code clean and well-organized
5. Update this document as features are completed
6. Prioritize stability over features
7. Ask for clarification if unsure about implementation details

## Communication Protocol
- Always mention which phase/component you're working on
- Report any issues or concerns immediately
- Suggest improvements to architecture when noticed
- Keep track of completed items in this document