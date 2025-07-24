# Technology Stack

## Framework & Core Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Primary language for type safety
- **React 19** - UI library with latest features
- **Tailwind CSS** - Utility-first CSS framework
- **PWA (next-pwa)** - Progressive Web App capabilities

## Backend & Database

- **Firebase** - Authentication, Firestore database, and cloud storage
- **Netlify Functions** - Serverless API endpoints
- **Stripe** - Payment processing for subscriptions

## Key Libraries & Dependencies

- **JMdict Simplified** - Japanese dictionary data (22,569 entries)
- **Kuromoji** - Japanese text tokenization and analysis
- **Framer Motion** - Animations and transitions
- **IndexedDB (idb)** - Client-side storage and caching
- **Puppeteer** - Web scraping for news articles
- **OpenAI API** - AI story generation
- **Edge TTS** - Text-to-speech functionality

## Development & Testing

- **Jest** - Testing framework with jsdom environment
- **ESLint** - Code linting with Next.js configuration
- **TypeScript** - Strict type checking enabled

## Common Commands

### Development
```bash
npm run dev              # Start development server
npm run dev:netlify      # Start with Netlify dev environment
```

### Building & Deployment
```bash
npm run build           # Production build with pre-deploy setup
npm run prepare-deploy  # Prepare deployment assets
npm start              # Start production server
```

### Testing
```bash
npm test               # Run test suite
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run test:ci        # CI-friendly test run
npm run test:eviction  # Run cache eviction tests
```

### Utilities
```bash
npm run lint                    # Run ESLint
npm run cleanup:test-articles   # Clean up test data
```

## Architecture Patterns

- **App Router** - Next.js 13+ file-based routing
- **Context Providers** - Global state management (Settings, Auth, Language, etc.)
- **Custom Hooks** - Reusable logic abstraction
- **Component Composition** - Modular UI components
- **Cache-First Strategy** - Offline-first data management
- **Progressive Enhancement** - Works without JavaScript

## Storage Architecture

- **IndexedDB Primary** - Advanced client-side database with 8 object stores
- **localStorage Fallback** - Graceful degradation for older browsers
- **Automatic Migration** - Seamless upgrade from localStorage to IndexedDB
- **Spaced Repetition** - Built-in SRS algorithm for learning optimization
- **Offline Support** - Comprehensive vocabulary and API response caching