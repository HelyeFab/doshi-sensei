# Review Sources - Unified Review Hub

A comprehensive system for managing multiple review sources in the Doshi Sensei application. This architecture provides a unified interface for different content types (Kanji Mastery, Textbook Vocabulary, Flashcards, etc.) while maintaining flexibility for source-specific implementations.

## Architecture Overview

The Unified Review Hub follows a modular architecture with three main components:

1. **Review Source Interface** - Defines the contract that all sources must implement
2. **Registry System** - Central manager for all sources with aggregation capabilities  
3. **Source Implementations** - Individual sources that provide content (Kanji, Vocabulary, etc.)

## Core Features

- ✅ **Unified Interface** - Consistent API across all content types
- ✅ **Source Registry** - Central management with singleton pattern
- ✅ **Priority System** - User-configurable source prioritization
- ✅ **Data Aggregation** - Combined statistics and due item management
- ✅ **Event System** - Inter-source communication and updates
- ✅ **Persistent Settings** - localStorage-based user preferences
- ✅ **Error Handling** - Robust error management and health checks
- ✅ **TypeScript** - Full type safety throughout the system

## Quick Start

### 1. Import the Registry

```typescript
import { ReviewSourceRegistry } from '@/lib/review-sources';

// Get the singleton instance
const registry = ReviewSourceRegistry.getInstance();
await registry.init();
```

### 2. Register Sources

```typescript
import { KanjiMasterySource } from '@/lib/review-sources/sources/kanji-mastery';
import { TextbookVocabularySource } from '@/lib/review-sources/sources/textbook-vocabulary';

// Register sources
await registry.register(new KanjiMasterySource(), SourcePriority.HIGH);
await registry.register(new TextbookVocabularySource(), SourcePriority.MEDIUM);
```

### 3. Get Aggregated Data

```typescript
// Get all due items from all sources
const groupedItems = await registry.getAllDueItems({ limit: 50 });

// Get combined statistics
const stats = await registry.getAggregatedStats();

// Get prioritized sources
const sources = registry.getPrioritizedSources();
```

## Creating a Review Source

To create a new review source, implement the `ReviewSource` interface:

```typescript
import { ReviewSource, SourceStats, ReviewItem } from '@/lib/review-sources';

export class MyCustomSource implements ReviewSource {
  public readonly id = 'my-custom-source';
  public readonly name = 'My Custom Source';
  public readonly type = ReviewSourceType.CUSTOM_LISTS;
  public readonly icon = '🎯';
  public readonly description = 'Description of my source';
  public readonly paths = { main: '/my-source' };
  public readonly supportedContentTypes = [ContentType.VOCABULARY];
  public status = SourceStatus.ACTIVE;
  public config: SourceConfig = { /* ... */ };

  async init(): Promise<void> {
    // Initialize your source
  }

  async getDueItems(options): Promise<ReviewItem[]> {
    // Return items due for review
  }

  async getStats(): Promise<SourceStats> {
    // Return source statistics
  }

  // ... implement other required methods
}
```

See `example-source.ts` for a complete implementation example.

## Registry API

### Core Methods

```typescript
// Source management
await registry.register(source, priority);
await registry.unregister(sourceId);
const source = registry.getSource(sourceId);
const sources = registry.getAllSources();
const prioritized = registry.getPrioritizedSources();

// Data aggregation
const items = await registry.getAllDueItems(options);
const stats = await registry.getAggregatedStats();

// User preferences
registry.updateSourcePriority(sourceId, SourcePriority.HIGH);
registry.setSourceEnabled(sourceId, true);
registry.setSourceItemLimit(sourceId, 30);
```

### Event System

```typescript
// Listen for source events
registry.addEventListener(ReviewSourceEvent.ITEMS_UPDATED, (event) => {
  console.log(`Items updated in ${event.sourceId}`, event.data);
});

// Sources can emit events automatically when their data changes
```

## Configuration

### Source Priorities

Configure how sources are prioritized in review sessions:

```typescript
enum SourcePriority {
  LOW = 1,      // Review when time permits
  MEDIUM = 2,   // Standard frequency  
  HIGH = 3,     // Prioritize in sessions
  URGENT = 4    // Critical - review immediately
}
```

### Content Types

Sources can support multiple content types:

```typescript
enum ContentType {
  KANJI = 'kanji',
  VOCABULARY = 'vocabulary',
  FLASHCARD = 'flashcard', 
  GRAMMAR = 'grammar',
  SENTENCE = 'sentence',
  RADICAL = 'radical',
  CUSTOM = 'custom'
}
```

### Study Modes

Each source can offer different study modes:

```typescript
enum StudyMode {
  RECOGNITION = 'recognition',  // See → Recall meaning
  PRODUCTION = 'production',    // See meaning → Produce
  READING = 'reading',         // See kanji → Recall reading
  LISTENING = 'listening',     // Hear → Recall/identify
  TYPING = 'typing'           // Type the answer
}
```

## Data Structures

### ReviewItem

The universal format for all reviewable content:

```typescript
interface ReviewItem {
  id: string;
  sourceId: string;
  contentType: ContentType;
  content: ReviewItemContent;
  dueDate: Date;
  priority: number;
  availableStudyModes: StudyMode[];
  metadata: {
    source?: Record<string, any>;
    tags?: string[];
    difficulty?: number;
    // ...
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### GroupedReviewItems

Organized view of items from all sources:

```typescript
interface GroupedReviewItems {
  bySource: Record<string, {
    source: ReviewSource;
    items: ReviewItem[];
    stats: SourceStats;
  }>;
  byContentType: Record<ContentType, ReviewItem[]>;
  byPriority: Record<SourcePriority, ReviewItem[]>;
  byDueDate: {
    overdue: ReviewItem[];
    today: ReviewItem[];
    tomorrow: ReviewItem[];
    thisWeek: ReviewItem[];
    later: ReviewItem[];
  };
  totals: {
    items: number;
    sources: number;
    dueToday: number;
    overdue: number;
  };
}
```

### AggregatedStats

Combined statistics from all sources:

```typescript
interface AggregatedStats {
  totals: {
    items: number;
    dueToday: number;
    overdue: number;
    sources: number;
    activeSources: number;
  };
  byContentType: Record<ContentType, StatsBreakdown>;
  bySource: Record<string, SourceStats>;
  performance: {
    averageMastery: number;
    overallRetention: number;
    studyStreak: number;
    lastActivity?: Date;
  };
  distribution: ReviewDistribution;
  insights: {
    mostActiveSource: string;
    strugglingAreas: ContentType[];
    recommendations: string[];
    nextReviewEstimate?: Date;
  };
}
```

## Integration Examples

### React Hook Usage

```typescript
import { useUnifiedReviewSources } from '@/hooks/useUnifiedReviewSources';

function ReviewHub() {
  const { 
    registry, 
    groupedItems, 
    aggregatedStats, 
    isLoading,
    refreshData 
  } = useUnifiedReviewSources();

  return (
    <div>
      <h2>Due Today: {aggregatedStats?.totals.dueToday}</h2>
      <h2>Overdue: {aggregatedStats?.totals.overdue}</h2>
      
      {groupedItems?.bySource && Object.entries(groupedItems.bySource).map(([sourceId, data]) => (
        <SourceCard key={sourceId} source={data.source} items={data.items} />
      ))}
    </div>
  );
}
```

### Source Priority Management

```typescript
import { SourcePriorityManager } from '@/components/SourcePriorityManager';

function SettingsPage() {
  const registry = ReviewSourceRegistry.getInstance();
  const sources = registry.getAllSources();

  return (
    <SourcePriorityManager 
      sources={sources}
      onPriorityChange={(sourceId, priority) => {
        registry.updateSourcePriority(sourceId, priority);
      }}
    />
  );
}
```

## Available Sources

The system is designed to support various content sources:

| Source Type | Status | Description |
|-------------|--------|-------------|
| **Kanji Mastery** | ✅ Ready | FSRS-based kanji learning system |
| **Textbook Vocabulary** | ✅ Ready | Genki & Minna vocabulary with SRS |
| **Flashcards** | 🔄 Planned | Custom user flashcard decks |
| **Grammar Drills** | 🔄 Planned | Conjugation and pattern practice |
| **Custom Lists** | 🔄 Planned | User-created study lists |
| **Shadowing Practice** | 🔄 Planned | YouTube video shadowing |
| **Reading Comprehension** | 🔄 Planned | Article reading with questions |
| **Listening Practice** | 🔄 Planned | Audio-based vocabulary practice |

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
  await registry.init();
  const items = await registry.getAllDueItems();
} catch (error) {
  if (error instanceof SourceError) {
    // Handle source-specific error
    console.error(`Source error: ${error.sourceId} - ${error.message}`);
  } else {
    // Handle general error
    console.error('Registry error:', error);
  }
}
```

## Performance Considerations

- **Statistics Caching**: Stats are cached for 5 minutes to reduce computation
- **Lazy Loading**: Sources are only initialized when first accessed
- **Batch Operations**: Multiple source operations are batched for efficiency
- **Event Debouncing**: Frequent events are debounced to prevent excessive updates

## Development Workflow

1. **Create Source Implementation**: Implement the `ReviewSource` interface
2. **Add Configuration**: Add source config to `constants.ts`
3. **Register Source**: Register in the appropriate initialization code
4. **Test Integration**: Use the example source as a reference
5. **Add UI Components**: Create source-specific UI components

## File Structure

```
src/lib/review-sources/
├── review-source.interface.ts  # Core interfaces and types
├── registry.ts                 # Central registry implementation
├── constants.ts                # Configuration and constants
├── example-source.ts           # Example implementation
├── index.ts                    # Public API exports
└── README.md                   # This documentation

# Future source implementations:
├── sources/
│   ├── kanji-mastery.ts
│   ├── textbook-vocabulary.ts
│   ├── flashcards.ts
│   └── ...
```

## Contributing

When adding new sources:

1. Implement the `ReviewSource` interface completely
2. Add configuration to `constants.ts`
3. Include comprehensive error handling
4. Add TypeScript types for source-specific data
5. Write tests for your implementation
6. Update this README with source information

## Next Steps

1. **Implement Core Sources**: Kanji Mastery and Textbook Vocabulary adapters
2. **Create React Components**: UI components for the unified hub
3. **Add Analytics**: Detailed performance tracking across sources
4. **Enhance Scheduling**: Smart review scheduling across multiple sources
5. **Mobile Optimization**: Ensure excellent mobile experience
6. **Offline Support**: Cache critical data for offline reviews