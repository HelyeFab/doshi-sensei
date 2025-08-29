# Unified Review Hub MVP Documentation

**Date**: January 2025  
**Priority**: Critical  
**Impact**: Complete transformation of review experience  
**Dependencies**: Unified Review Engine, Multiple review sources

## 🎯 Executive Summary

The Unified Review Hub consolidates ALL review types (textbook vocabulary, kanji lists, custom flashcards, etc.) into ONE central dashboard. Users can see everything that needs review, set priorities, configure notifications, and navigate directly to each feature's review page. This becomes the single source of truth for all spaced repetition activities.

## 📋 Core Requirements

### User Requirements (From Conversation)
1. **Option B Architecture**: Display separate review categories with quick navigation to each feature's review page
2. **User-Controlled Priority**: Users choose which review types to prioritize
3. **Navigation Flow**: Click review type → Navigate to feature page → Complete review → Return to hub
4. **Shared Review Engine**: All features use the same Unified Review Engine
5. **Combined Notifications**: Aggregate all review types in notifications (no per-type preferences)
6. **Preview Cards**: Show sample items from each review category
7. **Hub as Single Entry Point**: Make Review Hub the ONLY place to access reviews

## 🏗️ Technical Architecture

### 1. Data Aggregation System

```typescript
interface ReviewSource {
  id: string;                    // 'textbook-vocab' | 'kanji-lists' | 'custom-flashcards'
  name: string;                   // Display name
  icon: string;                   // Emoji or icon component
  path: string;                   // Navigation path (e.g., '/tools/textbook-vocabulary')
  reviewPath: string;             // Path with review mode (e.g., '/tools/textbook-vocabulary?mode=review')
  returnPath: string;             // Always '/review'
  getDueItems: () => Promise<ReviewItem[]>;
  getStats: () => Promise<SourceStats>;
  color: string;                  // Theme color for cards
  priority: number;               // User-defined priority (1-5)
}

interface ReviewItem {
  id: string;
  content: string;
  type: 'kanji' | 'vocabulary' | 'sentence' | 'grammar';
  source: string;                 // Which review source
  dueDate: Date;
  difficulty: number;
  lastReviewed?: Date;
  reviewCount: number;
  isGoldenTime?: boolean;         // Optimal review timing
}

interface SourceStats {
  totalItems: number;
  dueToday: number;
  overdue: number;
  upcoming: number;
  averageAccuracy: number;
  lastReviewDate?: Date;
  estimatedTime: number;          // Minutes to complete
}
```

### 2. Review Source Registry

```typescript
// src/lib/review-sources/registry.ts
class ReviewSourceRegistry {
  private sources: Map<string, ReviewSource> = new Map();
  
  register(source: ReviewSource): void {
    this.sources.set(source.id, source);
  }
  
  async getAllDueItems(): Promise<GroupedReviewItems> {
    const grouped: GroupedReviewItems = {};
    
    for (const [id, source] of this.sources) {
      const items = await source.getDueItems();
      grouped[id] = items;
    }
    
    return grouped;
  }
  
  async getAggregatedStats(): Promise<AggregatedStats> {
    // Combine stats from all sources
  }
  
  getPrioritizedSources(): ReviewSource[] {
    return Array.from(this.sources.values())
      .sort((a, b) => a.priority - b.priority);
  }
}
```

### 3. Review Source Implementations

#### Textbook Vocabulary Source
```typescript
// src/lib/review-sources/textbook-vocabulary.ts
export const textbookVocabularySource: ReviewSource = {
  id: 'textbook-vocab',
  name: 'Textbook Vocabulary',
  icon: '📚',
  path: '/tools/textbook-vocabulary',
  reviewPath: '/tools/textbook-vocabulary?mode=review&returnTo=/review',
  returnPath: '/review',
  color: 'orange',
  priority: 1,
  
  async getDueItems() {
    // Query IndexedDB for due vocabulary items
    const db = await openDB('textbook-vocabulary');
    const items = await db.getAllFromIndex('reviews', 'dueDate');
    return items.filter(item => item.dueDate <= new Date());
  },
  
  async getStats() {
    // Get stats from IndexedDB
    return {
      totalItems: 1476,  // Example from Genki 1
      dueToday: 15,
      overdue: 3,
      upcoming: 25,
      averageAccuracy: 0.87,
      lastReviewDate: new Date('2025-01-28'),
      estimatedTime: 8
    };
  }
};
```

#### Kanji Lists Source
```typescript
// src/lib/review-sources/kanji-lists.ts
export const kanjiListsSource: ReviewSource = {
  id: 'kanji-lists',
  name: 'Kanji Study Lists',
  icon: '🈷️',
  path: '/kanji-browser',
  reviewPath: '/kanji-browser?mode=review&list=saved&returnTo=/review',
  returnPath: '/review',
  color: 'purple',
  priority: 2,
  
  async getDueItems() {
    // Query saved kanji lists
    const lists = await getUserKanjiLists();
    const dueItems = [];
    
    for (const list of lists) {
      const items = await getListDueItems(list.id);
      dueItems.push(...items);
    }
    
    return dueItems;
  },
  
  async getStats() {
    // Aggregate stats from all lists
  }
};
```

### 4. Hub Component Structure

```typescript
// src/app/review/UnifiedReviewHub.tsx
export default function UnifiedReviewHub() {
  const [sources, setSources] = useState<ReviewSource[]>([]);
  const [dueItems, setDueItems] = useState<GroupedReviewItems>({});
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load all review sources
  useEffect(() => {
    const loadSources = async () => {
      const registry = ReviewSourceRegistry.getInstance();
      
      // Register all sources
      registry.register(textbookVocabularySource);
      registry.register(kanjiListsSource);
      registry.register(customFlashcardsSource);
      registry.register(sentenceBankSource);
      
      // Get prioritized list
      const prioritized = registry.getPrioritizedSources();
      setSources(prioritized);
      
      // Load due items
      const items = await registry.getAllDueItems();
      setDueItems(items);
      
      // Load stats
      const aggregated = await registry.getAggregatedStats();
      setStats(aggregated);
      
      setLoading(false);
    };
    
    loadSources();
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header with total stats */}
      <TotalStatsHeader stats={stats} />
      
      {/* Priority selector */}
      <PriorityControls 
        sources={sources}
        onPriorityChange={handlePriorityChange}
      />
      
      {/* Review source cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {sources.map(source => (
          <ReviewSourceCard
            key={source.id}
            source={source}
            dueItems={dueItems[source.id] || []}
            onNavigate={() => navigateToReview(source)}
            showPreview={true}
          />
        ))}
      </div>
      
      {/* Notification settings */}
      <NotificationSettingsCard />
      
      {/* Quick actions */}
      <QuickActionsBar />
    </div>
  );
}
```

### 5. Review Source Card Component

```typescript
// src/components/review/ReviewSourceCard.tsx
interface ReviewSourceCardProps {
  source: ReviewSource;
  dueItems: ReviewItem[];
  onNavigate: () => void;
  showPreview: boolean;
}

export function ReviewSourceCard({ source, dueItems, onNavigate, showPreview }: ReviewSourceCardProps) {
  const goldenTimeItems = dueItems.filter(item => item.isGoldenTime);
  const overdueItems = dueItems.filter(item => item.dueDate < new Date(Date.now() - 24*60*60*1000));
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-card rounded-xl shadow-lg border-2 border-${source.color}-200 overflow-hidden`}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r from-${source.color}-500 to-${source.color}-600 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{source.icon}</span>
            <div>
              <h3 className="text-white font-bold text-lg">{source.name}</h3>
              <p className="text-white/80 text-sm">
                {dueItems.length} items due • ~{Math.ceil(dueItems.length * 0.5)} min
              </p>
            </div>
          </div>
          {goldenTimeItems.length > 0 && (
            <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
              ⏰ Golden Time!
            </div>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-2 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{dueItems.length}</div>
          <div className="text-xs text-muted-foreground">Due Now</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{overdueItems.length}</div>
          <div className="text-xs text-muted-foreground">Overdue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {goldenTimeItems.length}
          </div>
          <div className="text-xs text-muted-foreground">Optimal</div>
        </div>
      </div>
      
      {/* Preview Cards */}
      {showPreview && dueItems.length > 0 && (
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
          {dueItems.slice(0, 3).map(item => (
            <div key={item.id} className="bg-muted rounded-lg p-2">
              <div className="font-medium text-sm">{item.content}</div>
              <div className="text-xs text-muted-foreground">
                Last reviewed: {item.lastReviewed ? formatTimeAgo(item.lastReviewed) : 'Never'}
              </div>
            </div>
          ))}
          {dueItems.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{dueItems.length - 3} more items...
            </p>
          )}
        </div>
      )}
      
      {/* Action Button */}
      <div className="p-4">
        <button
          onClick={onNavigate}
          disabled={dueItems.length === 0}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            dueItems.length > 0
              ? `bg-${source.color}-500 text-white hover:bg-${source.color}-600`
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {dueItems.length > 0 ? 'Start Review' : 'No Items Due'}
        </button>
      </div>
    </motion.div>
  );
}
```

### 6. Navigation System

```typescript
// src/hooks/useReviewNavigation.ts
export function useReviewNavigation() {
  const router = useRouter();
  
  const navigateToReview = (source: ReviewSource) => {
    // Store return information in sessionStorage
    sessionStorage.setItem('reviewReturn', JSON.stringify({
      returnTo: '/review',
      sourceId: source.id,
      startTime: Date.now()
    }));
    
    // Navigate to the review page
    router.push(source.reviewPath);
  };
  
  const returnFromReview = (summary?: ReviewSummary) => {
    const returnInfo = sessionStorage.getItem('reviewReturn');
    
    if (returnInfo) {
      const { returnTo, sourceId, startTime } = JSON.parse(returnInfo);
      
      // Track completion
      if (summary) {
        trackReviewCompletion(sourceId, summary, Date.now() - startTime);
      }
      
      // Clear return info
      sessionStorage.removeItem('reviewReturn');
      
      // Navigate back to hub
      router.push(returnTo);
    }
  };
  
  return { navigateToReview, returnFromReview };
}
```

### 7. Notification Aggregation

```typescript
// src/services/notifications/ReviewNotificationAggregator.ts
export class ReviewNotificationAggregator {
  async checkAndSendNotifications(): Promise<void> {
    const registry = ReviewSourceRegistry.getInstance();
    const allDueItems = await registry.getAllDueItems();
    
    // Aggregate counts
    const totalDue = Object.values(allDueItems)
      .flat()
      .length;
    
    if (totalDue === 0) return;
    
    // Build notification message
    const breakdown = Object.entries(allDueItems)
      .filter(([_, items]) => items.length > 0)
      .map(([sourceId, items]) => {
        const source = registry.getSource(sourceId);
        return `${items.length} ${source.name}`;
      })
      .join(', ');
    
    // Send combined notification
    await notificationService.send({
      title: `📚 ${totalDue} Items Ready for Review!`,
      body: `You have: ${breakdown}. Keep your streak alive! 🔥`,
      data: {
        type: 'review_reminder',
        path: '/review',
        totalDue,
        breakdown: allDueItems
      }
    });
  }
}
```

### 8. Priority Management

```typescript
// src/components/review/PriorityManager.tsx
export function PriorityManager({ sources, onUpdate }: PriorityManagerProps) {
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(sources);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update priorities based on new order
    const newPriorities = {};
    items.forEach((source, index) => {
      newPriorities[source.id] = index + 1;
    });
    
    setPriorities(newPriorities);
    savePriorities(newPriorities);
    onUpdate(newPriorities);
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="priority-list">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {sources.map((source, index) => (
              <Draggable key={source.id} draggableId={source.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`priority-item ${snapshot.isDragging ? 'dragging' : ''}`}
                  >
                    <span className="text-lg">#{index + 1}</span>
                    <span>{source.icon}</span>
                    <span>{source.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {priorities[source.id] || source.priority} priority
                    </span>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

## 🎨 UI/UX Design Specifications

### Visual Hierarchy
1. **Total Stats Header**: Large, prominent display of total due items
2. **Priority Indicator**: Visual cues showing user-defined priorities
3. **Source Cards**: Color-coded with gradients matching each feature
4. **Golden Time Badges**: Yellow indicators for optimal review timing
5. **Preview Items**: 3 sample items per source with "more" indicator
6. **Progress Bars**: Visual representation of completion status

### Responsive Design
- **Mobile**: Single column, stacked cards, bottom navigation
- **Tablet**: 2-column grid, side navigation
- **Desktop**: 3-column grid, full navigation

### Animations
- Card hover: Scale 1.02 with shadow increase
- Navigation: Slide transitions between pages
- Completion: Confetti animation on review completion
- Golden Time: Pulsing animation for urgent items

## 📊 Data Flow

### Review Session Flow
```
1. User opens Review Hub
2. Hub queries all registered sources
3. Sources return due items from their storage
4. Hub displays aggregated view
5. User clicks source card
6. Navigation to feature page with return URL
7. User completes review
8. Feature page redirects back to hub
9. Hub refreshes data
10. Shows completion toast/modal
```

### Storage Architecture
```
Unified Review Engine (Shared)
    ├── IndexedDB (Primary Storage)
    │   ├── textbook-vocabulary
    │   ├── kanji-lists
    │   ├── custom-flashcards
    │   └── sentence-bank
    └── Firebase (Premium Sync)
        └── users/{uid}/reviews/
```

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure (Days 1-2)
- [ ] Create ReviewSource interface and registry
- [ ] Implement source registration system
- [ ] Build aggregation logic
- [ ] Set up navigation system with return handling

### Phase 2: Source Adapters (Days 3-4)
- [ ] Adapt textbook vocabulary to ReviewSource
- [ ] Adapt kanji lists to ReviewSource
- [ ] Create custom flashcards adapter
- [ ] Add sentence bank adapter

### Phase 3: Hub UI (Days 5-6)
- [ ] Build UnifiedReviewHub component
- [ ] Create ReviewSourceCard component
- [ ] Implement priority management
- [ ] Add preview card system

### Phase 4: Navigation & Flow (Day 7)
- [ ] Modify feature pages to accept review mode
- [ ] Implement return navigation
- [ ] Add completion tracking
- [ ] Create transition animations

### Phase 5: Notifications (Day 8)
- [ ] Build notification aggregator
- [ ] Implement combined notifications
- [ ] Add scheduling system
- [ ] Create notification preview

### Phase 6: Polish & Testing (Days 9-10)
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Create success animations
- [ ] Write integration tests

## 🔌 Integration Points

### Modified Pages
1. `/tools/textbook-vocabulary` - Add review mode support
2. `/kanji-browser` - Add review mode for saved lists
3. `/flashcards` - Create review interface
4. `/review` - Replace with UnifiedReviewHub

### New Components
1. `ReviewSourceCard` - Display individual source
2. `PriorityManager` - Drag-and-drop priority setting
3. `ReviewStatsHeader` - Aggregated statistics
4. `GoldenTimeIndicator` - Optimal timing badge
5. `PreviewCardList` - Sample items display

### API Endpoints
1. `GET /api/review/sources` - List all sources
2. `GET /api/review/due` - Get all due items
3. `POST /api/review/complete` - Mark items reviewed
4. `PUT /api/review/priority` - Update priorities

## 🎯 Success Metrics

### User Metrics
- Review completion rate > 80%
- Average time to complete reviews < 10 minutes
- Return rate to hub after review > 95%
- User satisfaction score > 4.5/5

### Technical Metrics
- Page load time < 1 second
- Data aggregation < 500ms
- Navigation transition < 300ms
- Zero data loss during navigation

## 🚨 Critical Considerations

### Performance
- Lazy load source data
- Cache aggregated stats
- Debounce priority updates
- Optimize preview queries

### User Experience
- Clear navigation breadcrumbs
- Progress persistence across sessions
- Offline support for all features
- Accessibility compliance

### Data Integrity
- Atomic review transactions
- Conflict resolution for concurrent reviews
- Backup review state
- Recovery from interruptions

## 📝 Notes for Developers

### Quick Start
```bash
# Install dependencies
npm install

# Create new review source
npm run generate:review-source

# Test review flow
npm run test:review-flow

# Build for production
npm run build
```

### Key Files
- `/src/lib/review-sources/` - All source implementations
- `/src/app/review/UnifiedReviewHub.tsx` - Main hub component
- `/src/hooks/useReviewNavigation.ts` - Navigation logic
- `/src/services/notifications/ReviewNotificationAggregator.ts` - Notification system

### Testing Checklist
- [ ] All sources return correct due items
- [ ] Navigation works bi-directionally
- [ ] Priorities persist across sessions
- [ ] Notifications aggregate correctly
- [ ] Preview cards display properly
- [ ] Golden time calculations are accurate
- [ ] Return navigation preserves state
- [ ] Completion tracking works

## 🎉 Expected Outcome

Users will have a single, beautiful dashboard showing ALL their review items across the entire application. They can prioritize what to study, see preview cards, get combined notifications, and seamlessly navigate to complete reviews. This creates a unified, cohesive review experience that maximizes learning retention through proper spaced repetition.

---

**This MVP document provides everything needed for any developer to implement the Unified Review Hub. The architecture is modular, extensible, and follows the existing codebase patterns.**