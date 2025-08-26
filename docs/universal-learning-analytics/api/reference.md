# Universal Learning Analytics API Reference

## Core Hook: `useLearnTracking`

### Basic Usage
```typescript
import { useLearnTracking } from '@/hooks/useLearnTracking';

function MyComponent() {
  const { track, getStats, clearEvents } = useLearnTracking();
  
  // Track an event
  track({
    type: 'view',
    category: 'kanji',
    content: { value: '愛' }
  });
}
```

### Hook API

#### `track(event: Partial<LearningEvent>): void`
Tracks a learning event.

```typescript
track({
  type: 'view',
  category: 'kanji',
  content: {
    value: '愛',
    jlptLevel: 3
  },
  metrics: {
    duration: 5000
  }
});
```

#### `getStats(): Promise<UserStats>`
Get current user statistics.

```typescript
const stats = await getStats();
console.log(stats.totalKanjiSeen); // 1247
```

#### `clearEvents(): Promise<void>`
Clear local event cache (privacy).

```typescript
await clearEvents();
```

## Event Types Reference

### View Event
Tracks when content is viewed.

```typescript
track({
  type: 'view',
  category: 'kanji',
  content: {
    id: 'kanji_愛',
    value: '愛',
    jlptLevel: 3,
    metadata: {
      meanings: ['love'],
      readings: ['あい']
    }
  }
});
```

### Search Event
Tracks search queries.

```typescript
track({
  type: 'search',
  category: 'vocabulary',
  content: {
    value: 'たべる',
    metadata: {
      resultsCount: 5,
      selectedIndex: 2
    }
  }
});
```

### Practice Event
Tracks practice sessions.

```typescript
track({
  type: 'practice',
  category: 'grammar',
  content: {
    id: 'te_form',
    value: 'て-form conjugation'
  },
  metrics: {
    duration: 120000,
    accuracy: 85,
    attempts: 10
  }
});
```

### Test Event
Tracks test/quiz attempts.

```typescript
track({
  type: 'test',
  category: 'kanji',
  content: {
    id: 'kanji_test_n3',
    value: 'JLPT N3 Kanji Test'
  },
  metrics: {
    accuracy: 92,
    duration: 300000,
    attempts: 1
  }
});
```

### Success/Failure Events
Track correct/incorrect answers.

```typescript
// Success
track({
  type: 'success',
  category: 'drill',
  content: {
    value: '食べる',
    metadata: {
      questionType: 'conjugation',
      correctAnswer: '食べた'
    }
  }
});

// Failure
track({
  type: 'failure',
  category: 'drill',
  content: {
    value: '食べる',
    metadata: {
      questionType: 'conjugation',
      userAnswer: '食べった',
      correctAnswer: '食べた'
    }
  }
});
```

## Component Integration Examples

### Kanji Display Component
```typescript
function KanjiDisplay({ kanji, details }) {
  const { track } = useLearnTracking();
  const startTime = useRef(Date.now());
  
  useEffect(() => {
    // Track view on mount
    track({
      type: 'view',
      category: 'kanji',
      content: {
        value: kanji,
        jlptLevel: details.jlptLevel,
        metadata: {
          source: 'kanji_browser'
        }
      }
    });
    
    // Track duration on unmount
    return () => {
      track({
        type: 'view',
        category: 'kanji',
        content: { value: kanji },
        metrics: {
          duration: Date.now() - startTime.current
        }
      });
    };
  }, [kanji]);
  
  return <div>{kanji}</div>;
}
```

### Vocabulary Search Component
```typescript
function VocabularySearch() {
  const { track } = useLearnTracking();
  const [query, setQuery] = useState('');
  
  const handleSearch = (searchTerm: string) => {
    track({
      type: 'search',
      category: 'vocabulary',
      content: {
        value: searchTerm,
        metadata: {
          inputMethod: 'keyboard',
          searchType: 'japanese'
        }
      }
    });
  };
  
  return (
    <SearchInput 
      onSearch={handleSearch}
      value={query}
      onChange={setQuery}
    />
  );
}
```

### Article Reader Component
```typescript
function ArticleReader({ article }) {
  const { track } = useLearnTracking();
  const [scrollDepth, setScrollDepth] = useState(0);
  
  useEffect(() => {
    // Track article view
    track({
      type: 'view',
      category: 'article',
      content: {
        id: article.id,
        value: article.title,
        metadata: {
          difficulty: article.difficulty,
          wordCount: article.wordCount
        }
      }
    });
  }, [article.id]);
  
  const handleScroll = (depth: number) => {
    setScrollDepth(depth);
    if (depth >= 90) {
      track({
        type: 'complete',
        category: 'article',
        content: { id: article.id },
        metrics: { scrollDepth: depth }
      });
    }
  };
  
  return <Article onScroll={handleScroll} />;
}
```

### Game Component
```typescript
function KanaDropGame() {
  const { track } = useLearnTracking();
  
  const trackGameStart = () => {
    track({
      type: 'practice',
      category: 'game',
      content: {
        id: 'kana_drop',
        value: 'Kana Drop Game',
        metadata: {
          difficulty: 'medium'
        }
      }
    });
  };
  
  const trackGameEnd = (score: number, level: number) => {
    track({
      type: 'complete',
      category: 'game',
      content: {
        id: 'kana_drop',
        value: 'Kana Drop Game'
      },
      metrics: {
        score,
        level,
        duration: Date.now() - gameStartTime
      }
    });
  };
  
  return <Game onStart={trackGameStart} onEnd={trackGameEnd} />;
}
```

## Analytics Service API

### Get User Statistics
```typescript
import { analyticsService } from '@/services/analytics';

const stats = await analyticsService.getUserStats(userId);
// Returns:
{
  totalEvents: 15234,
  uniqueKanji: 1247,
  uniqueVocab: 3421,
  studyStreak: 15,
  learningVelocity: 1.23,
  strongAreas: ['kanji', 'grammar'],
  weakAreas: ['listening'],
  recommendations: [...]
}
```

### Get Learning Patterns
```typescript
const patterns = await analyticsService.getPatterns(userId);
// Returns:
{
  bestTimeToStudy: '20:00-22:00',
  averageSessionLength: 25, // minutes
  preferredContent: 'articles',
  learningStyle: 'visual',
  commonMistakes: [...]
}
```

### Get Content Recommendations
```typescript
const recommendations = await analyticsService.getRecommendations(userId);
// Returns:
[
  {
    type: 'kanji',
    content: '時',
    reason: 'Seen in 5 contexts, ready to test',
    confidence: 0.92
  },
  {
    type: 'grammar',
    content: 'て-form',
    reason: 'Struggled 3 times, need practice',
    confidence: 0.87
  }
]
```

## Event Schema Types

### Complete TypeScript Definitions
```typescript
interface LearningEvent {
  // Required fields
  id: string;
  userId: string;
  timestamp: number;
  type: EventType;
  category: ContentCategory;
  content: ContentData;
  
  // Optional fields
  sessionId?: string;
  context?: EventContext;
  metrics?: EventMetrics;
  metadata?: Record<string, any>;
}

type EventType = 
  | 'view'        // Content viewed
  | 'search'      // Search performed
  | 'practice'    // Practice session
  | 'test'        // Test taken
  | 'success'     // Correct answer
  | 'failure'     // Incorrect answer
  | 'save'        // Content saved
  | 'share'       // Content shared
  | 'complete'    // Completed
  | 'abandon';    // Abandoned

type ContentCategory = 
  | 'kanji'
  | 'vocabulary'
  | 'grammar'
  | 'kana'
  | 'sentence'
  | 'article'
  | 'video'
  | 'audio'
  | 'game'
  | 'drill'
  | 'flashcard'
  | 'textbook';

interface ContentData {
  id?: string;           // Unique identifier
  value: string;         // The actual content
  jlptLevel?: 1 | 2 | 3 | 4 | 5;
  frequency?: number;    // Usage frequency rank
  difficulty?: 'easy' | 'medium' | 'hard';
  metadata?: {
    meanings?: string[];
    readings?: string[];
    tags?: string[];
    source?: string;
    [key: string]: any;
  };
}

interface EventContext {
  page: string;          // Current route/page
  feature: string;       // Feature being used
  referrer?: string;     // Previous page
  experiment?: string;   // A/B test variant
  device?: 'mobile' | 'tablet' | 'desktop';
  platform?: 'web' | 'ios' | 'android';
}

interface EventMetrics {
  duration?: number;     // Time spent (milliseconds)
  accuracy?: number;     // 0-100 percentage
  attempts?: number;     // Number of tries
  score?: number;        // Game/test score
  level?: number;        // Difficulty level
  scrollDepth?: number;  // 0-100 percentage
  interaction?: InteractionType;
}

type InteractionType = 
  | 'click'
  | 'hover'
  | 'scroll'
  | 'focus'
  | 'keyboard'
  | 'touch'
  | 'voice';
```

## Batch Processing API

### Queue Events for Batch
```typescript
import { batchProcessor } from '@/services/analytics';

// Queue multiple events
batchProcessor.queue([event1, event2, event3]);

// Force immediate sync
await batchProcessor.flush();

// Check queue status
const status = batchProcessor.getStatus();
// Returns: { queued: 47, processing: 0, failed: 2 }
```

## Privacy API

### User Control Functions
```typescript
import { privacyManager } from '@/services/analytics';

// Get tracking preferences
const prefs = await privacyManager.getPreferences();

// Update preferences
await privacyManager.updatePreferences({
  trackKanji: true,
  trackGames: false,
  trackArticles: true
});

// Export user data
const data = await privacyManager.exportUserData(userId);

// Delete user data
await privacyManager.deleteUserData(userId);
```

## Debug API

### Development Tools
```typescript
import { debugTools } from '@/services/analytics';

// Enable debug mode
debugTools.enable();

// Log all events to console
debugTools.logEvents(true);

// Inspect event queue
const queue = debugTools.getEventQueue();

// Simulate events
debugTools.simulateEvents(100);

// Clear all data
debugTools.clearAll();
```

## Error Handling

### Common Error Scenarios
```typescript
try {
  track(event);
} catch (error) {
  if (error.code === 'STORAGE_FULL') {
    // Handle storage limit
    await clearOldEvents();
  } else if (error.code === 'INVALID_EVENT') {
    // Handle validation error
    console.error('Invalid event:', error.details);
  } else if (error.code === 'NETWORK_ERROR') {
    // Events will be queued and retried
    console.log('Offline - events queued');
  }
}
```

## Performance Guidelines

### Best Practices
1. **Batch events** - Don't track in tight loops
2. **Use debouncing** - For scroll/input events
3. **Lazy load** - Analytics code should be async
4. **Selective tracking** - Not everything needs tracking
5. **Compress data** - Use short keys for metadata

### Example: Debounced Tracking
```typescript
import { debounce } from 'lodash';

const trackScroll = debounce((depth: number) => {
  track({
    type: 'view',
    category: 'article',
    metrics: { scrollDepth: depth }
  });
}, 1000);
```

## Migration Guide

### Adding to Existing Component
```typescript
// Before
function KanjiCard({ kanji }) {
  return <div>{kanji}</div>;
}

// After
function KanjiCard({ kanji }) {
  const { track } = useLearnTracking();
  
  useEffect(() => {
    track({
      type: 'view',
      category: 'kanji',
      content: { value: kanji }
    });
  }, [kanji]);
  
  return <div>{kanji}</div>;
}
```

---

**Need Help?** Check the [examples](../examples/components.md) or [architecture overview](../architecture/overview.md).