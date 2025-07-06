# Strings Centralization Plan

## Overview
This document outlines the plan to centralize all embedded text in the Doshi Sensei app into the `src/config/strings.ts` file. Currently, many components have hardcoded text that should be moved to the centralized strings file for better maintainability, internationalization readiness, and consistency.

## Current State
- **Centralized strings file**: `src/config/strings.ts` exists but is incomplete
- **Coverage**: Only covers core conjugation/practice functionality
- **Missing**: News, stories, admin, games, kanji, onboarding, and many other features

## Plan Structure

### Phase 1: Audit and Documentation
1. **Page-by-page audit** of all app routes
2. **Component-by-component audit** of all UI components
3. **Documentation** of all embedded strings found

### Phase 2: Strings File Extension
1. **Extend strings.ts** with new sections for missing features
2. **Organize by feature area** (news, stories, admin, etc.)
3. **Maintain consistency** with existing structure

### Phase 3: Component Refactoring
1. **Refactor components** to use centralized strings
2. **Update imports** to include strings
3. **Test functionality** after each refactor

## Detailed Task Breakdown

### 1. App Pages Audit

#### 1.1 Core Learning Pages
- [ ] **Home Page** (`src/app/page.tsx`)
  - Welcome messages
  - Feature descriptions
  - Call-to-action buttons
  - Status messages

- [ ] **Practice Page** (`src/app/practice/page.tsx`)
  - Practice mode instructions
  - Exercise descriptions
  - Feedback messages

- [ ] **Drill Page** (`src/app/drill/page.tsx`)
  - Drill instructions
  - Question formats
  - Score displays
  - Progress indicators

- [ ] **Vocabulary Page** (`src/app/vocabulary/page.tsx`)
  - Search functionality
  - Filter options
  - Word details
  - Loading states

#### 1.2 Content Pages
- [ ] **News Pages** (`src/app/news/`)
  - Article listings
  - Article reader
  - Navigation elements
  - Reading progress
  - Bookmark functionality

- [ ] **Stories Pages** (`src/app/stories/`)
  - Story listings
  - Story reader
  - Navigation elements
  - Reading progress

- [ ] **Resources Pages** (`src/app/resources/`)
  - Resource listings
  - Resource viewer
  - Category navigation

#### 1.3 Feature Pages
- [ ] **Games Pages** (`src/app/games/page.tsx`)
  - Game instructions
  - Score displays
  - Game states
  - Achievement messages

- [ ] **Kanji Pages** (`src/app/kanji-browser/`, `src/app/kanji-moods/`)
  - Kanji information
  - Study modes
  - Progress tracking
  - Search functionality

- [ ] **Account Pages** (`src/app/account/page.tsx`)
  - User profile
  - Subscription info
  - Usage statistics

#### 1.4 Admin Pages
- [ ] **Admin Dashboard** (`src/app/admin/`)
  - Dashboard metrics
  - User management
  - Content management
  - System status

#### 1.5 Utility Pages
- [ ] **Settings Pages** (`src/app/settings/`)
  - Settings categories
  - Option descriptions
  - Confirmation dialogs

- [ ] **Contact Page** (`src/app/contact/page.tsx`)
  - Contact form
  - Support information

- [ ] **Offline Page** (`src/app/offline/page.tsx`)
  - Offline status
  - Reconnection messages

### 2. Component Audit

#### 2.1 Core UI Components
- [ ] **Navigation Components**
  - `BottomNavigation.tsx`
  - `DesktopNavMenu.tsx`
  - `PageHeader.tsx`

- [ ] **Modal Components**
  - `AuthErrorModal.tsx`
  - `DonationModal.tsx`
  - `LoginPromptModal.tsx`
  - `UpgradePromptModal.tsx`

- [ ] **Feature Components**
  - `FeatureGate.tsx`
  - `SubscriptionPlans.tsx`
  - `UsageLimitDisplay.tsx`

#### 2.2 Content Components
- [ ] **Reading Components** (`src/components/reading/`)
  - Article reader
  - Comprehension quiz
  - Progress indicators

- [ ] **Story Components** (`src/components/story/`)
  - Story reader
  - Navigation elements

- [ ] **Audio Components** (`src/components/audio/`)
  - Player controls
  - Status messages

#### 2.3 Game Components
- [ ] **Game Components** (`src/components/games/`)
  - Game instructions
  - Score displays
  - Game states

#### 2.4 Kanji Components
- [ ] **Kanji Components** (`src/components/kanji/`, `src/components/kanji-moods/`)
  - Kanji information
  - Study modes
  - Progress tracking

#### 2.5 Onboarding Components
- [ ] **Onboarding Components** (`src/components/onboarding/`)
  - Welcome screens
  - Tutorial text
  - Progress indicators

#### 2.6 Admin Components
- [ ] **Admin Components** (`src/components/admin/`)
  - Dashboard elements
  - Management interfaces
  - Status displays

### 3. Strings File Structure

#### 3.1 New Sections to Add
```typescript
export const strings = {
  // Existing sections...

  // News & Articles
  news: {
    title: "News",
    searchPlaceholder: "Search articles...",
    categories: "Categories",
    readingTime: "Reading time",
    difficulty: "Difficulty",
    bookmark: "Bookmark",
    removeBookmark: "Remove bookmark",
    // ... more news strings
  },

  // Stories
  stories: {
    title: "Stories",
    searchPlaceholder: "Search stories...",
    categories: "Categories",
    readingTime: "Reading time",
    difficulty: "Difficulty",
    // ... more story strings
  },

  // Games
  games: {
    title: "Games",
    kanaDrop: "Kana Drop",
    kanjiQuest: "Kanji Quest",
    instructions: "Instructions",
    score: "Score",
    highScore: "High Score",
    // ... more game strings
  },

  // Kanji
  kanji: {
    title: "Kanji",
    searchPlaceholder: "Search kanji...",
    strokeOrder: "Stroke Order",
    readings: "Readings",
    meanings: "Meanings",
    // ... more kanji strings
  },

  // Admin
  admin: {
    title: "Admin",
    dashboard: "Dashboard",
    users: "Users",
    articles: "Articles",
    stories: "Stories",
    // ... more admin strings
  },

  // Onboarding
  onboarding: {
    welcome: "Welcome",
    next: "Next",
    skip: "Skip",
    // ... more onboarding strings
  },

  // PWA
  pwa: {
    install: "Install App",
    update: "Update Available",
    offline: "You're offline",
    // ... more PWA strings
  },

  // Subscription
  subscription: {
    title: "Subscription",
    plans: "Plans",
    features: "Features",
    upgrade: "Upgrade",
    // ... more subscription strings
  }
};
```

## Implementation Guidelines

### 1. Naming Conventions
- Use descriptive, hierarchical keys
- Group related strings under common prefixes
- Use camelCase for keys
- Be consistent with existing patterns

### 2. String Organization
- Group by feature area (news, stories, games, etc.)
- Use nested objects for related strings
- Keep common strings in the `common` section
- Use arrays for dynamic content (like loading messages)

### 3. Component Integration
- Import strings at the top of components
- Use destructuring for cleaner code
- Replace hardcoded strings with string references
- Maintain TypeScript type safety

### 4. Testing Strategy
- Test each component after refactoring
- Verify all strings are properly displayed
- Check for missing translations
- Ensure no functionality is broken

## Success Criteria

### Phase 1 Completion
- [ ] All embedded strings documented
- [ ] Complete audit report generated
- [ ] Strings file structure finalized

### Phase 2 Completion
- [ ] All new string sections added to strings.ts
- [ ] TypeScript types updated
- [ ] No compilation errors

### Phase 3 Completion
- [ ] All components refactored to use centralized strings
- [ ] No hardcoded strings remaining
- [ ] All functionality working correctly
- [ ] Code review completed

## Benefits

1. **Maintainability**: Single source of truth for all app text
2. **Internationalization**: Ready for multi-language support
3. **Consistency**: Uniform text across the app
4. **Developer Experience**: Easier to find and update text
5. **Quality Assurance**: Reduced risk of typos and inconsistencies

## Timeline Estimate

- **Phase 1 (Audit)**: 2-3 days
- **Phase 2 (Strings Extension)**: 1-2 days
- **Phase 3 (Refactoring)**: 5-7 days
- **Total**: 8-12 days

## Next Steps

1. **Review and approve** this plan
2. **Start with Phase 1** - begin auditing pages and components
3. **Create detailed audit reports** for each section
4. **Proceed with Phase 2** - extend the strings file
5. **Execute Phase 3** - refactor components systematically

---

*This plan will be updated as we progress through the implementation.*
