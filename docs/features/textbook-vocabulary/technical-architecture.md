# Textbook Vocabulary Technical Architecture

## System Overview

The Textbook Vocabulary feature is a self-contained module within Doshi Sensei that provides interactive vocabulary learning from popular Japanese textbooks. It uses static data imported from the MCP server and implements a sophisticated spaced repetition system using the FSRS (Free Spaced Repetition Scheduler) algorithm via the ts-fsrs library.

## Current Implementation Status (January 2025)

✅ **Fully Implemented** with:
- 9,635 vocabulary cards imported from MCP server
- FSRS-based spaced repetition using ts-fsrs library
- IndexedDB storage with Firebase sync structure
- Three-Pillar Architecture integration
- Interactive flip card UI with Framer Motion
- Real-time progress tracking and session management

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Homepage Card  →  Textbook Selection  →  Learning View      │
│                                                               │
│  page.tsx → VocabularyLearningView → InteractiveCard        │
│       ↓              ↓                    ↓                  │
│  FilterPanel    StudyProgress      GoldenTimeScheduler       │
└────────────┬───────────────┬────────────────┬────────────────┘
             │               │                │
┌────────────▼───────────────▼────────────────▼────────────────┐
│                      Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  useVocabularyData    useFilteredVocab    useAccess          │
│  spacedRepetition     vocabStorage        Three-Pillar API   │
└────────────┬───────────────┬────────────────┬────────────────┘
             │               │                │
┌────────────▼───────────────▼────────────────▼────────────────┐
│                       Data Access Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Static JSON Files    IndexedDB         Firebase (Ready)      │
│  (9,635 cards)       (All Users)        (Premium Only)       │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture (As Implemented)

### File Structure
```typescript
/src/app/tools/textbook-vocabulary/
├── page.tsx                        // Main page with textbook selection
├── components/
│   ├── VocabularyLearningView.tsx  // Main learning interface
│   ├── VocabularyGrid.tsx          // Grid view of vocabulary cards
│   ├── FilterPanel.tsx             // Lesson, JLPT, tag filtering
│   ├── InteractiveCard.tsx         // Flip card with animations
│   ├── GoldenTimeScheduler.tsx     // Due card management
│   ├── ProgressTracker.tsx         // Visual progress display
│   └── StudyProgress.tsx           // Real-time session stats
├── hooks/
│   ├── useVocabularyData.ts        // Dynamic JSON data loading
│   └── useFilteredVocab.ts         // Client-side filtering
└── types.ts                        // TypeScript definitions

/src/services/textbook-vocabulary/
├── index.ts                        // Service exports
├── storage.ts                      // IndexedDB management
└── spaced-repetition.ts            // FSRS algorithm implementation

/src/data/textbook-vocabulary/      // Static vocabulary data
├── genki-1/                        // 317 cards, 1 lesson
├── genki-2/                        // 0 cards
├── minna-1/                        // 7,096 cards, 27 lessons
├── minna-2/                        // 2,222 cards, 25 lessons
└── index.json                      // Master index
```

## Data Flow

### 1. Initial Load & Access Control
```typescript
// page.tsx
export default function TextbookVocabularyPage() {
  const { checkAndTrack } = useAccess();
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook>(null);
  
  useEffect(() => {
    // Track feature usage with Three-Pillar Architecture
    checkAndTrack('textbook_vocabulary');
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {!selectedTextbook ? (
        <motion.div className="px-4 pb-20">
          {/* Textbook selection cards */}
          {textbooks.map(textbook => (
            <motion.button
              onClick={() => handleTextbookSelect(textbook.id)}
              className="group relative bg-white rounded-2xl p-6"
            >
              {/* Gradient design with real card counts */}
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <VocabularyLearningView 
          textbook={selectedTextbook} 
          onBack={() => setSelectedTextbook(null)}
        />
      )}
    </div>
  );
}
```

### 2. Vocabulary Data Loading
```typescript
// hooks/useVocabularyData.ts
export function useVocabularyData(textbook: string, lesson?: number) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (lesson) {
          // Load specific lesson
          const module = await import(
            `@/data/textbook-vocabulary/${textbook}/lesson-${lesson}.json`
          );
          setVocabulary(module.default);
        } else {
          // Load all lessons
          const metadata = await import(
            `@/data/textbook-vocabulary/${textbook}/metadata.json`
          );
          
          const allVocab = [];
          for (const lessonNum of metadata.lessons) {
            const lessonModule = await import(
              `@/data/textbook-vocabulary/${textbook}/lesson-${lessonNum}.json`
            );
            allVocab.push(...lessonModule.default);
          }
          setVocabulary(allVocab);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [textbook, lesson]);
  
  return { data: vocabulary, loading, error };
}
```

### 3. Study Session Management
```typescript
// components/VocabularyLearningView.tsx
export function VocabularyLearningView({ textbook, onBack }) {
  const [viewMode, setViewMode] = useState<'grid' | 'study' | 'golden-time'>('grid');
  const [studyQueue, setStudyQueue] = useState<VocabularyItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ studied: 0, correct: 0 });
  
  const handleStartStudy = async (cards: VocabularyItem[]) => {
    setStudyQueue(cards);
    setViewMode('study');
    
    // Start study session
    const newSessionId = await vocabStorage.startStudySession(textbook);
    setSessionId(newSessionId);
  };
  
  const handleCardComplete = async (quality: number) => {
    const currentCard = studyQueue[currentCardIndex];
    
    // Process with FSRS algorithm
    await spacedRepetition.processReview(currentCard.id, quality, currentCard);
    
    // Update session stats
    const newStats = {
      studied: sessionStats.studied + 1,
      correct: sessionStats.correct + (quality >= 3 ? 1 : 0)
    };
    setSessionStats(newStats);
    
    // Next card or complete session
    if (currentCardIndex < studyQueue.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      await vocabStorage.updateStudySession(sessionId, { endTime: new Date() });
      setViewMode('grid');
    }
  };
}
```

## FSRS Spaced Repetition Implementation

### Algorithm Integration
```typescript
// services/textbook-vocabulary/spaced-repetition.ts
import { fsrs, generatorParameters, Rating, Card } from 'ts-fsrs';

class SpacedRepetitionService {
  private f: ReturnType<typeof fsrs>;
  
  constructor() {
    // Initialize FSRS with optimal parameters
    const params = generatorParameters({
      enable_fuzz: true,        // Prevent cards bunching on same day
      maximum_interval: 365,    // Max 1 year between reviews
    });
    this.f = fsrs(params);
  }
  
  async processReview(
    vocabularyId: string,
    rating: number,  // 1-5 from user
    vocabularyItem: VocabularyItem
  ): Promise<ReviewResult> {
    // Get or create card
    let progress = await vocabStorage.getProgress(vocabularyId);
    let card: Card;
    
    if (progress) {
      // Reconstruct FSRS card from saved progress
      card = {
        due: new Date(progress.nextReview),
        stability: progress.easeFactor,
        difficulty: 5,
        elapsed_days: progress.interval,
        scheduled_days: progress.interval,
        reps: progress.reviewCount,
        lapses: 0,
        state: this.getCardState(progress),
        last_review: progress.lastReviewed
      };
    } else {
      card = createEmptyCard(new Date());
    }
    
    // Map rating to FSRS grades
    const fsrsRating = this.mapRatingToFSRS(rating);
    // 1 → Again, 2 → Hard, 3-4 → Good, 5 → Easy
    
    // Calculate next review
    const scheduling_cards = this.f.repeat(card, new Date());
    const nextCard = scheduling_cards[fsrsRating].card;
    
    // Save progress
    await this.saveProgress(vocabularyId, vocabularyItem, nextCard);
    
    return {
      card: nextCard,
      nextReview: nextCard.due,
      interval: nextCard.scheduled_days,
      easeFactor: nextCard.stability
    };
  }
  
  // Calculate mastery level (0-100%)
  private calculateMasteryLevel(card: Card): number {
    const stabilityFactor = Math.min(card.stability / 90, 1) * 50;
    const reviewFactor = Math.min(card.reps / 10, 1) * 30;
    const intervalFactor = Math.min(card.scheduled_days / 30, 1) * 20;
    
    return Math.round(stabilityFactor + reviewFactor + intervalFactor);
  }
}
```

### Golden Time Implementation
```typescript
async getGoldenTimeCards(textbook: string, limit = 20): Promise<VocabularyProgress[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Get all progress for textbook
  const allProgress = await vocabStorage.getProgressByTextbook(textbook);
  
  // Filter cards due within next 24 hours
  const goldenTimeCards = allProgress
    .filter(p => {
      const due = new Date(p.nextReview);
      return due <= tomorrow;
    })
    .sort((a, b) => {
      // Sort by how overdue they are
      return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
    })
    .slice(0, limit);
  
  return goldenTimeCards;
}
```

## Storage Architecture

### IndexedDB Implementation
```typescript
// services/textbook-vocabulary/storage.ts
class TextbookVocabularyStorage {
  private dbName = 'doshi-sensei-textbook-vocab';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    const request = indexedDB.open(this.dbName, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Progress store with indexes
      if (!db.objectStoreNames.contains('progress')) {
        const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
        progressStore.createIndex('userId', 'userId');
        progressStore.createIndex('textbook', 'textbook');
        progressStore.createIndex('nextReview', 'nextReview');
        progressStore.createIndex('composite', ['userId', 'textbook']);
      }
      
      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('userId', 'userId');
        sessionsStore.createIndex('textbook', 'textbook');
        sessionsStore.createIndex('startTime', 'startTime');
      }
    };
  }
  
  async saveProgress(progress: VocabularyProgress): Promise<void> {
    const db = await this.ensureDb();
    const userId = auth.currentUser?.uid || 'anonymous';
    
    const progressWithUser = {
      ...progress,
      userId,
      updatedAt: new Date()
    };
    
    const transaction = db.transaction(['progress'], 'readwrite');
    await transaction.objectStore('progress').put(progressWithUser);
    
    // Sync to Firebase for premium users
    if (userId !== 'anonymous' && await this.isPremiumUser()) {
      this.syncProgressToFirebase(progressWithUser);
    }
  }
}
```

### Storage Tiers
1. **Guest Users**: Session-only (no persistence)
2. **Free Users**: IndexedDB local storage
3. **Premium Users**: IndexedDB + Firebase sync (ready for implementation)

## Interactive Learning Components

### InteractiveCard Implementation
```typescript
// components/InteractiveCard.tsx
export function InteractiveCard({ word, onComplete, mode }) {
  const [revealed, setRevealed] = useState(false);
  const { settings } = useSettings();
  
  const handleQualitySelect = (quality: number) => {
    onComplete(quality);
    setRevealed(false);
  };
  
  return (
    <motion.div className="relative w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <AnimatePresence mode="wait">
          {!revealed ? (
            // Front side - Question
            <motion.div
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 90 }}
              className="p-8"
            >
              <div className="text-5xl font-bold text-gray-900">
                {settings.showFurigana && word.reading !== word.japanese ? (
                  <ruby>
                    {word.japanese}
                    <rt className="text-lg text-gray-500">{word.reading}</rt>
                  </ruby>
                ) : (
                  word.japanese
                )}
              </div>
              <button onClick={() => setRevealed(true)}>Show Answer</button>
            </motion.div>
          ) : (
            // Back side - Answer with quality buttons
            <motion.div
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              className="p-8"
            >
              <div className="text-3xl font-bold">{word.meaning}</div>
              {/* Examples with furigana */}
              <div className="flex gap-3 mt-6">
                <QualityButton quality={1} label="Again" color="bg-red-500" />
                <QualityButton quality={3} label="Good" color="bg-yellow-500" />
                <QualityButton quality={5} label="Easy" color="bg-green-500" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

## Performance Optimizations

### 1. Dynamic Imports
```typescript
// Load vocabulary data on demand
const loadLessonData = async (textbook: string, lesson: number) => {
  const module = await import(
    /* webpackChunkName: "[request]" */
    `@/data/textbook-vocabulary/${textbook}/lesson-${lesson}.json`
  );
  return module.default;
};
```

### 2. Memoized Filtering
```typescript
// hooks/useFilteredVocab.ts
export function useFilteredVocab(vocabulary: VocabularyItem[]) {
  const filteredVocab = useMemo(() => {
    return vocabulary.filter(item => {
      if (filters.lesson && item.lesson !== filters.lesson) return false;
      if (filters.jlptLevel && item.jlptLevel !== filters.jlptLevel) return false;
      if (filters.partOfSpeech && !item.partOfSpeech.includes(filters.partOfSpeech)) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          item.japanese.includes(searchLower) ||
          item.reading.includes(searchLower) ||
          item.meaning.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [vocabulary, filters]);
  
  return { filteredVocab, filters, updateFilter };
}
```

### 3. Session-Based Caching
```typescript
// Cache vocabulary data in session
const vocabularyCache = new Map<string, VocabularyItem[]>();

export async function getCachedVocabulary(textbook: string, lesson: number) {
  const cacheKey = `${textbook}-${lesson}`;
  
  if (vocabularyCache.has(cacheKey)) {
    return vocabularyCache.get(cacheKey)!;
  }
  
  const data = await loadLessonData(textbook, lesson);
  vocabularyCache.set(cacheKey, data);
  
  return data;
}
```

## Three-Pillar Integration

### Feature Registration
```typescript
// lib/features/registry.ts
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
// lib/entitlements/rules.ts
permissions: {
  guest: ['textbook_vocabulary'],
  free: ['textbook_vocabulary'],
  monthly: ['textbook_vocabulary'],
  yearly: ['textbook_vocabulary']
}

limits: {
  guest: { textbook_vocabulary: 20 },     // 20 words/day
  free: { textbook_vocabulary: 50 },      // 50 words/day
  monthly: { textbook_vocabulary: -1 },   // Unlimited
  yearly: { textbook_vocabulary: -1 }     // Unlimited
}
```

### Usage Tracking
```typescript
// Automatic tracking in VocabularyLearningView
useEffect(() => {
  checkAndTrack('textbook_vocabulary');
}, []);
```

## Error Handling

### Graceful Fallbacks
```typescript
// Handle missing lessons
const loadVocabularyWithFallback = async (textbook: string, lesson: number) => {
  try {
    return await import(`@/data/textbook-vocabulary/${textbook}/lesson-${lesson}.json`);
  } catch (error) {
    console.warn(`Lesson ${lesson} not found, loading metadata`);
    const metadata = await import(`@/data/textbook-vocabulary/${textbook}/metadata.json`);
    return { default: [] }; // Return empty array
  }
};
```

### User-Friendly Error States
```typescript
if (error) {
  return (
    <div className="text-center p-8">
      <p className="text-red-500">Error loading vocabulary: {error.message}</p>
      <button onClick={onBack} className="mt-4 text-primary hover:underline">
        Go back
      </button>
    </div>
  );
}
```

## Testing Considerations

### Key Test Areas
1. **FSRS Algorithm**: Verify correct interval calculations
2. **Storage Operations**: Test IndexedDB transactions
3. **Access Control**: Verify daily limits work correctly
4. **Data Loading**: Test dynamic imports and fallbacks
5. **Session Management**: Verify stats tracking

### Example Test
```typescript
describe('SpacedRepetition', () => {
  it('should calculate correct next review time', async () => {
    const service = new SpacedRepetitionService();
    const result = await service.processReview('test-id', 5, mockVocabItem);
    
    expect(result.interval).toBeGreaterThan(0);
    expect(result.nextReview).toBeInstanceOf(Date);
    expect(result.easeFactor).toBeGreaterThan(1);
  });
});
```

## Future Enhancements

### Immediate Priorities
1. **Audio Integration**: Add pronunciation audio files
2. **Achievement System**: Implement streak tracking and badges
3. **Firebase Sync**: Enable for premium users
4. **More Textbooks**: Import Tobira, JLPT-specific lists

### Technical Improvements
1. **Web Workers**: Move FSRS calculations off main thread
2. **Service Worker**: Enable offline learning
3. **WebAssembly**: Optimize filtering for large datasets
4. **IndexedDB Encryption**: Secure local storage

This architecture provides a robust, scalable foundation that has been successfully implemented and is ready for future enhancements.