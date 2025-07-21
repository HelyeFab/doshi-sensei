# Project Structure

## Root Directory Organization

```
doshi-sensei/
├── src/                    # Source code
├── docs/                   # Comprehensive documentation
├── public/                 # Static assets and PWA files
├── scripts/                # Build and utility scripts
├── __tests__/              # Test suites
├── netlify/                # Netlify functions
├── data/                   # Database files
├── coverage/               # Test coverage reports
└── [config files]         # Various configuration files
```

## Source Code Structure (`src/`)

### Core Directories

- **`app/`** - Next.js App Router pages and layouts
  - Uses file-based routing with nested layouts
  - Each route can have `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
  - API routes in `app/api/`

- **`components/`** - Reusable React components
  - Organized by feature/domain (e.g., `games/`, `kanji/`, `vocabulary/`)
  - UI components in `ui/` subdirectory
  - Each component should be self-contained with its styles

- **`contexts/`** - React Context providers for global state
  - `SettingsContext.tsx` - User preferences and app settings
  - `AuthContext.tsx` - Firebase authentication state
  - `LanguageContext.tsx` - Internationalization
  - `UserProfileContext.tsx` - User data and subscription status

- **`hooks/`** - Custom React hooks
  - Reusable logic abstraction
  - Hooks for API calls, storage, analytics, etc.
  - Follow `use*` naming convention

- **`lib/`** - Core business logic and utilities
  - `firebase.ts` - Firebase configuration and initialization
  - `stripe.ts` - Payment processing setup
  - Feature-specific modules in subdirectories

- **`utils/`** - Utility functions and API integrations
  - `storage.ts` - Enhanced storage manager (IndexedDB + localStorage)
  - `api.ts` - Main search API with fallbacks
  - `conjugation.ts` - Japanese verb conjugation logic
  - Domain-specific utilities (e.g., `kanjiUtils.ts`, `tts.ts`)

- **`types/`** - TypeScript type definitions
  - `index.ts` - Core application types
  - Feature-specific type files (e.g., `kanji.ts`, `subscription.ts`)

## Key Configuration Files

- **`next.config.ts`** - Next.js configuration with PWA setup
- **`tailwind.config.js`** - Tailwind CSS customization
- **`tsconfig.json`** - TypeScript compiler configuration
- **`jest.config.js`** - Testing framework setup
- **`firebase.json`** - Firebase project configuration
- **`netlify.toml`** - Netlify deployment settings

## Documentation Structure (`docs/`)

Comprehensive documentation organized by system:

- **`admin-system/`** - Admin dashboard documentation
- **`storage-system/`** - Storage architecture and API reference
- **`subscription-system/`** - Payment and entitlements system
- **`kanji-study-system/`** - Kanji learning features
- **`testing-system/`** - Test suite documentation
- **`deployment-system/`** - Production deployment guides

## Asset Organization (`public/`)

- **`audio/`** - Japanese pronunciation files
- **`dict/`** - Dictionary data files
- **`flat-icons/`** - UI icons and graphics
- **`sounds/`** - Game and interaction sounds
- **PWA files** - `manifest.json`, service worker, icons

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (e.g., `VocabularySearch.tsx`)
- **Utilities**: camelCase (e.g., `conjugationUtils.ts`)
- **Pages**: lowercase with hyphens (e.g., `kanji-browser/`)
- **Types**: camelCase with descriptive names (e.g., `userProgress.ts`)

### Code Conventions
- **React Components**: PascalCase function names
- **Hooks**: camelCase starting with `use` (e.g., `useVocabulary`)
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase with descriptive names
- **Enums**: PascalCase with descriptive values

## Import Patterns

Use absolute imports with `@/` alias:
```typescript
import { JapaneseWord } from '@/types';
import { searchWords } from '@/utils/api';
import VocabularyCard from '@/components/vocabulary/VocabularyCard';
```

## Component Organization

### Feature-Based Structure
Components are organized by feature domain:
```
components/
├── vocabulary/         # Vocabulary-related components
├── kanji/             # Kanji study components
├── games/             # Game components
├── ui/                # Reusable UI components
└── [feature]/         # Other feature domains
```

### Component Patterns
- Each component in its own file
- Co-locate related components in feature directories
- Separate complex logic into custom hooks
- Use TypeScript interfaces for props

## State Management

### Context Providers
Global state managed through React Context:
- Wrap app in multiple providers in `layout.tsx`
- Each context handles a specific domain
- Use custom hooks to consume context

### Local State
- Use `useState` for component-local state
- Use `useReducer` for complex state logic
- Lift state up when needed by multiple components

## Testing Organization

Tests are organized to mirror the source structure:
```
__tests__/
├── cache/             # Storage system tests
├── integration/       # Integration tests
└── [feature]/         # Feature-specific tests
```

Follow the pattern: `[ComponentName].test.tsx` or `[utilityName].test.ts`