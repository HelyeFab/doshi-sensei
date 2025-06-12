# Practice Mode Implementation Plan

## Overview

The Practice Mode is a core feature of Doshi Sensei that allows users to view and study detailed conjugations of Japanese verbs and adjectives. This document outlines the implementation plan for this feature.

## Current Status

The application currently has:
- Home page with navigation
- Vocabulary browsing with search and filtering
- Drill mode with multiple choice questions
- Conjugation engine that can generate all forms

The Practice Mode is referenced in the UI but not yet implemented.

## Feature Requirements

Based on the MVP prompt and existing code, the Practice Mode should:

1. Allow users to select words to practice from the vocabulary list
2. Display a detailed conjugation view showing:
   - Word in Kanji, Kana, Romaji, and English
   - Complete list of conjugation forms
   - Visual distinction between different form categories
3. Include explanations of conjugation rules
4. Provide navigation back to vocabulary list
5. Support filtering by conjugation type or JLPT level

## Implementation Phases

### Phase 1: Basic Practice Page Setup

1. Create the practice page component:
   ```
   src/app/practice/page.tsx
   ```

2. Implement basic layout with:
   - Header with back navigation
   - Word selection interface
   - Placeholder for conjugation display

3. Add routing from home page and vocabulary page to practice page

4. Connect to the vocabulary API to fetch words

### Phase 2: Conjugation Display

1. Create a ConjugationTable component to display all forms:
   ```
   src/components/ConjugationTable.tsx
   ```

2. Implement detailed word header showing:
   - Kanji representation
   - Kana reading with furigana
   - Romaji transliteration
   - English meaning
   - Word type and JLPT level

3. Group conjugation forms into logical categories:
   - Basic forms (present, past, negative, etc.)
   - Polite forms
   - Te-form derivatives
   - Potential/Passive/Causative forms
   - Conditional forms

4. Style the conjugation table with:
   - Clear visual hierarchy
   - Proper Japanese font support
   - Responsive design for different screen sizes

### Phase 3: Word Selection and Filtering

1. Create a word selection interface:
   - List view of available words
   - Search functionality
   - Filtering by JLPT level and word type

2. Implement state management to:
   - Track selected word
   - Preserve filters between sessions
   - Handle loading states

3. Add pagination or infinite scrolling for large word lists

### Phase 4: Conjugation Rules and Explanations

1. Add a "Show Rules" toggle to display conjugation rules

2. Create rule explanation components that:
   - Explain the pattern for each conjugation
   - Highlight the changed portion of the word
   - Provide examples for each rule

3. Implement animations for transitions between forms

### Phase 5: Integration and Navigation

1. Connect Practice Mode with other features:
   - Add "Practice" button in Drill Mode results
   - Enable direct navigation from Vocabulary page
   - Allow switching between Practice and Drill for the same word

2. Implement breadcrumb navigation

3. Add keyboard shortcuts for navigation

### Phase 6: Advanced Features and Polish

1. Add audio pronunciation (if scope expands beyond MVP)

2. Implement "favorite words" functionality

3. Add progress tracking:
   - Words viewed
   - Time spent practicing
   - Integration with statistics on home page

4. Final UI polish and animations

## Technical Implementation Details

### Data Flow

1. User selects a word from vocabulary list or search
2. App fetches complete word data if not already cached
3. ConjugationEngine generates all forms
4. UI renders the forms in organized groups
5. User can toggle between different views and explanations

### Component Structure

```
src/app/practice/
├── page.tsx                  # Main practice page
├── components/
│   ├── WordSelector.tsx      # Word selection interface
│   ├── ConjugationTable.tsx  # Table of all conjugation forms
│   ├── ConjugationCard.tsx   # Individual conjugation form card
│   ├── RuleExplanation.tsx   # Conjugation rule explanation
│   └── PracticeHeader.tsx    # Page header with navigation
```

### State Management

The practice page will need to manage:
1. Currently selected word
2. Visible conjugation categories
3. Whether rules are displayed
4. Search and filter state
5. Loading and error states

### API Integration

The practice page will use:
1. `getCommonVerbs()` and `searchWords()` from `api.ts`
2. `ConjugationEngine.conjugate()` from `conjugation.ts`
3. New methods for fetching individual word details if needed

## Next Steps

1. Create the basic practice page structure
2. Implement routing from home and vocabulary pages
3. Build the conjugation display component
4. Add word selection functionality
5. Implement rule explanations
6. Polish UI and integrate with other features

## Timeline Estimate

- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 1-2 days
- Phase 4: 1-2 days
- Phase 5: 1 day
- Phase 6: 2-3 days

Total: 8-13 days depending on complexity and polish requirements
