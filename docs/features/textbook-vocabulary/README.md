# Textbook Vocabulary Feature

## Overview

The Textbook Vocabulary feature provides an interactive, Mochidemy-inspired learning experience for Japanese vocabulary from popular textbooks (Genki and Minna no Nihongo). Unlike traditional flashcard systems, this feature offers intelligent content organization, state-of-the-art spaced repetition using the FSRS algorithm, and engaging interactive exercises.

## Current Status (January 2025)

✅ **Fully Implemented and Production-Ready**

The feature has been successfully implemented with all planned functionality, including:
- Complete data import from MCP server (9,635 vocabulary cards)
- Interactive learning interface with animations
- FSRS-based spaced repetition system (using ts-fsrs library)
- IndexedDB persistence with Firebase sync capability
- Three-Pillar Architecture integration with access controls

### Imported Vocabulary Data
- **Total Cards**: 9,635 unique vocabulary items
- **Genki 1**: 317 cards (1 lesson)
- **Genki 2**: 0 cards (no data available in source)
- **Minna no Nihongo 1**: 7,096 cards (27 lessons)
- **Minna no Nihongo 2**: 2,222 cards (25 lessons)

## Key Features

### 1. Textbook-Based Organization
- **Genki Series**: Genki 1 (317 cards, 1 lesson) & Genki 2 (no data available)
- **Minna no Nihongo Series**: Volume 1 (7,096 cards, 27 lessons) & Volume 2 (2,222 cards, 25 lessons)
- Beautiful gradient-based visual design with hover effects
- Real-time progress tracking per textbook

### 2. Intelligent Filtering System
- **By Lesson**: Navigate by textbook lessons/chapters
- **By JLPT Level**: Filter vocabulary by N5-N1 levels
- **By Part of Speech**: Filter by grammatical categories
- **By Tags**: Browse by themes
- **Smart Search**: Full-text search across all vocabulary

### 3. Interactive Learning (Beyond Flashcards)
- **Flip Card Interface**: Smooth animations with quality-based review (1-5 rating)
- **Context Sentences**: Multiple example sentences with furigana support
- **Visual Hints**: Progressive hint system for learning mode
- **Part of Speech Tags**: Clear grammatical categorization
- **Study Progress Display**: Real-time accuracy tracking and session stats
- **Multiple Study Modes**: Grid view, study mode, and Golden Time reviews

### 4. Golden Time Spaced Repetition (FSRS Algorithm)
- **State-of-the-Art Algorithm**: Powered by ts-fsrs library implementing FSRS (Free Spaced Repetition Scheduler)
- **Smart Scheduling**: Scientifically optimal review intervals with fuzz factor to prevent bunching
- **Mastery Tracking**: 0-100% mastery level calculated from stability, review count, and intervals
- **Golden Time Mode**: Shows cards due for review within the next 24 hours
- **Session Management**: Automatic study session tracking with statistics

### 5. Progress & Analytics
- **Session Statistics**: Track cards studied, accuracy rate, and time spent
- **Individual Card Progress**: Review history and next review scheduling per card
- **Visual Progress Indicators**: Progress bars and mastery levels
- **Study History**: Access to past study sessions and performance metrics
- **Achievement System Ready**: Infrastructure in place for future gamification

## Technical Implementation

### Data Architecture

#### ✅ Completed Data Import
The data import from the MCP server has been successfully completed with the following results:

```typescript
// Import Statistics:
- Total Cards Imported: 9,635
- Genki 1: 317 cards (1 lesson)
- Genki 2: 0 cards (no data in source)
- Minna no Nihongo 1: 7,096 cards (27 lessons)
- Minna no Nihongo 2: 2,222 cards (25 lessons)

// JLPT Distribution:
- N5: 9,075 cards (94.2%)
- N4: 560 cards (5.8%)
```

#### Production: Static Data Storage (Implemented)
```
/src/data/textbook-vocabulary/
├── genki-1/
│   ├── metadata.json          # Book info, 1 lesson, 317 cards
│   └── lesson-1.json          # All Genki 1 vocabulary
├── genki-2/
│   └── metadata.json          # Book info, 0 lessons, 0 cards
├── minna-1/
│   ├── metadata.json          # Book info, 27 lessons, 7,096 cards
│   ├── lesson-1.json through lesson-25.json
│   ├── lesson-28.json         # Special lesson
│   └── lesson-41.json         # Special lesson
├── minna-2/
│   ├── metadata.json          # Book info, 25 lessons, 2,222 cards
│   └── lesson-1.json through lesson-25.json
└── index.json                 # Master index with statistics
```

### Vocabulary Data Structure
```typescript
interface VocabularyItem {
  id: string;
  japanese: string;
  reading: string;
  meaning: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null;
  partOfSpeech: string[];
  examples: {
    japanese: string;
    reading: string;
    english: string;
  }[];
  audioFile?: string;  // Path to audio in public/audio/textbook-vocab/
  tags: string[];      // Themes like 'food', 'time', 'school'
  lesson: number;
  textbook: 'genki-1' | 'genki-2' | 'minna-1' | 'minna-2';
  frequency?: number;  // Usage frequency if available
  notes?: string;      // Grammar notes or usage tips
}
```

### Spaced Repetition Implementation

#### FSRS Algorithm Integration
```typescript
// /src/services/textbook-vocabulary/spaced-repetition.ts
import { fsrs, generatorParameters, Rating } from 'ts-fsrs';

class SpacedRepetitionService {
  private f: ReturnType<typeof fsrs>;
  
  constructor() {
    // Initialize with optimized parameters
    const params = generatorParameters({
      enable_fuzz: true,      // Prevent card bunching
      maximum_interval: 365,  // Max 1 year between reviews
    });
    this.f = fsrs(params);
  }
  
  // Process reviews with 1-5 rating system
  // Calculate optimal next review time
  // Track mastery level (0-100%)
}
```

#### Storage Architecture
```typescript
// IndexedDB Stores (All Users)
- progress: Individual card progress with SRS data
- sessions: Study session history and statistics
- settings: User preferences and SRS parameters

// Firebase Sync (Premium Users Only)
- Real-time progress synchronization
- Cross-device learning continuity
- Backup and restore functionality
```

### Component Architecture (Implemented)
```
/src/app/tools/textbook-vocabulary/
├── page.tsx                    # Main page with textbook selection
├── components/
│   ├── VocabularyLearningView.tsx  # Main learning interface
│   ├── VocabularyGrid.tsx      # Grid view of vocabulary cards
│   ├── FilterPanel.tsx         # Lesson, JLPT, and tag filtering
│   ├── InteractiveCard.tsx     # Flip card with animations
│   ├── GoldenTimeScheduler.tsx # Due card management
│   ├── ProgressTracker.tsx     # Visual progress display
│   └── StudyProgress.tsx       # Real-time session stats
├── hooks/
│   ├── useVocabularyData.ts    # Dynamic JSON data loading
│   └── useFilteredVocab.ts     # Client-side filtering logic
└── types.ts                    # TypeScript definitions

/src/services/textbook-vocabulary/
├── index.ts                    # Service exports
├── storage.ts                  # IndexedDB management
└── spaced-repetition.ts        # FSRS algorithm implementation
```

### Data Loading Strategy
```typescript
// useVocabularyData.ts
export function useVocabularyData(textbook: string, lesson?: number) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  
  useEffect(() => {
    // Dynamic import of JSON data
    import(`@/data/textbook-vocabulary/${textbook}/lesson-${lesson}.json`)
      .then(module => setVocabulary(module.default))
      .catch(err => console.error('Failed to load vocabulary:', err));
  }, [textbook, lesson]);
  
  return vocabulary;
}
```

## Storage Strategy (Implemented)

### IndexedDB Storage (All Users)

#### Database: `doshi-sensei-textbook-vocab`

**Progress Store**
```typescript
interface VocabularyProgress {
  id: string;              // vocabulary item ID
  userId?: string;         // 'anonymous' for guests
  textbook: string;
  lesson: number;
  lastReviewed: Date;
  nextReview: Date;        // Calculated by FSRS
  reviewCount: number;
  easeFactor: number;      // FSRS stability factor
  interval: number;        // Days until next review
  quality: number;         // Last review quality (1-5)
  masteryLevel: number;    // 0-100 calculated score
  createdAt: Date;
  updatedAt: Date;
}
```

**Sessions Store**
```typescript
interface StudySession {
  id: string;
  userId?: string;
  textbook: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  cardsCorrect: number;
  avgQuality: number;
}
```

### Firebase Sync (Premium Users)
- Automatic background sync of progress data
- Cross-device learning continuity
- Conflict resolution with last-write-wins
- Ready for implementation when premium features are enabled

## User Experience Flow

### 1. Entry Point
- New feature card on homepage: "Textbook Vocabulary" 📚
- Positioned in "Core Learning" section
- Description: "Learn from Genki & Minna"

### 2. Main Page Layout
```
┌─────────────────────────────────────┐
│      Textbook Vocabulary            │
│   Learn from your favorite books    │
├─────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐        │
│  │ GENKI   │    │ MINNA   │        │
│  │  げんき  │    │ みんな  │        │
│  └─────────┘    └─────────┘        │
├─────────────────────────────────────┤
│  📊 Total Collection: 9,635 words   │
├─────────────────────────────────────┤
│  Golden Time Learning ⏰             │
│  Review at the perfect moment       │
└─────────────────────────────────────┘
```

### 3. Interactive Word View
- **Front**: Japanese word with optional furigana
- **Click/Tap**: Reveals meaning and examples
- **Quality Rating**: 1 (Again), 3 (Good), 5 (Easy)
- **Progress Bar**: Shows session progress
- **Hint System**: Progressive hints in learn mode

### 4. Progress Tracking
- Visual progress bars per lesson
- Mastery level indicators (0-100%)
- Session statistics (accuracy, cards studied)
- Review scheduling based on FSRS algorithm

## Three-Pillar Architecture Integration (Implemented)

### Feature Registration
```typescript
// In /src/lib/features/registry.ts
'textbook_vocabulary': {
  id: 'textbook_vocabulary',
  name: 'Textbook Vocabulary',
  description: 'Learn vocabulary from Genki & Minna textbooks',
  category: 'learning',
  icon: '📚',
  limitType: 'daily',
  requiresAuth: false,
  requiresSubscription: false,
  status: 'active'
}
```

### Entitlement Rules
```typescript
// In /src/lib/entitlements/rules.ts
permissions: {
  guest: ['textbook_vocabulary'],
  free: ['textbook_vocabulary'],
  monthly: ['textbook_vocabulary'],
  yearly: ['textbook_vocabulary']
}

// Daily limits:
limits: {
  guest: { textbook_vocabulary: 20 },
  free: { textbook_vocabulary: 50 },
  monthly: { textbook_vocabulary: -1 },  // Unlimited
  yearly: { textbook_vocabulary: -1 }    // Unlimited
}
```

### Usage Tracking
- Automatic tracking via `checkAndTrack()` in `useAccess` hook
- Daily limit enforcement with reset at midnight
- Access denied modal shown when limits reached

## Development Workflow

### Initial Setup (Completed)
1. ✅ Started MCP server
2. ✅ Ran import script: `npm run import:textbook-vocab`
3. ✅ Verified generated files in `/src/data/textbook-vocabulary/`
4. ✅ Committed static data files to repository

### Development
1. All vocabulary data is now static - no MCP needed
2. Work with local JSON files
3. Test with different user types (guest, free, premium)
4. Dynamic imports optimize bundle size

### Audio Files (Future Enhancement)
- Extract audio from MCP during import
- Store in `/public/audio/textbook-vocabulary/`
- Organize by textbook and lesson
- Use lazy loading for performance

## Implementation Status

### ✅ Completed Features

#### Core Implementation
- [x] Comprehensive documentation and planning
- [x] Data import script (`/scripts/import-textbook-vocabulary.ts`)
- [x] Successfully imported 9,635 vocabulary cards
- [x] Feature card added to homepage
- [x] Full routing and page structure

#### Interactive Features
- [x] Beautiful textbook selector with gradient cards
- [x] Vocabulary grid with real-time filtering
- [x] Smooth flip card animations with Framer Motion
- [x] Furigana support (toggleable in settings)
- [x] Progressive hint system

#### Learning System
- [x] FSRS algorithm integration with ts-fsrs
- [x] Golden Time mode for optimal reviews
- [x] Complete progress tracking with IndexedDB
- [x] Study session management
- [x] Firebase sync structure (ready for premium)

#### Polish & Integration
- [x] Three-Pillar Architecture integration
- [x] Access control with daily limits
- [x] Mobile-responsive design
- [x] Performance optimized with dynamic imports
- [x] TypeScript strict mode compliance

## Bundle Size Considerations

### Optimization Strategies (Implemented)
1. **Code Splitting**: Vocabulary data loaded per lesson
2. **Dynamic Imports**: Only selected textbook data loaded
3. **Lazy Loading**: Components loaded on demand
4. **Tree Shaking**: Unused code eliminated
5. **Efficient State Management**: Minimal re-renders

### Example Implementation
```typescript
// Dynamic import based on user selection
const loadLessonData = async (textbook: string, lesson: number) => {
  const module = await import(
    /* webpackChunkName: "[request]" */
    `@/data/textbook-vocabulary/${textbook}/lesson-${lesson}.json`
  );
  return module.default;
};
```

## Future Enhancements

### Immediate Priorities
1. **Audio Integration**
   - Add pronunciation audio files
   - Text-to-speech fallback
   - Audio playback controls

2. **Achievement System**
   - Streak tracking
   - Milestone badges
   - Learning statistics dashboard

### Additional Textbooks
- Import Tobira vocabulary
- Japanese for Busy People series
- Marugoto series
- Custom vocabulary list import

### Advanced Features
- AI-powered mnemonics generation
- Voice recording for pronunciation practice
- Handwriting recognition integration
- Vocabulary mini-games
- Sentence construction exercises

### Integration Opportunities
- Link vocabulary to conjugation drills
- Connect with kanji browser for character breakdowns
- Export progress to Anki format
- Social features for progress sharing
- Integration with reading comprehension tools

## Technical Details

### Dependencies
- **ts-fsrs** (v4.5.0): State-of-the-art spaced repetition algorithm
- **framer-motion**: Smooth animations and transitions
- **IndexedDB**: Local data persistence
- **Next.js 15**: Framework with App Router

### Performance Considerations
- Dynamic imports for lesson data (reduces initial bundle)
- Lazy loading of vocabulary by lesson
- Efficient filtering with memoization
- Optimized re-renders with React hooks

### Key Files
- `/src/app/tools/textbook-vocabulary/page.tsx`: Main entry point
- `/src/services/textbook-vocabulary/`: Core services
- `/src/data/textbook-vocabulary/`: Static vocabulary data
- `/scripts/import-textbook-vocabulary.ts`: Import script

## References

### Data Source
- MCP anki-word-generator (used for initial import)
- 9,635 vocabulary cards successfully imported
- Genki 1 & 2, Minna no Nihongo 1 & 2

### Algorithm & Design Inspiration
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS): Spaced repetition research
- [Mochidemy](https://mochidemy.com/): Golden Time concept
- [WaniKani](https://www.wanikani.com/): SRS implementation patterns
- [Bunpro](https://bunpro.jp/): Textbook integration approach