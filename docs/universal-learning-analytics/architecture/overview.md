# Universal Learning Analytics System - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  Kanji   │ │  Vocab   │ │  Games   │ │ Articles │  ...    │
│  │  Display │ │  Search  │ │          │ │          │         │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useLearnTracking Hook                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  • Event Creation                                        │  │
│  │  • Context Enrichment                                    │  │
│  │  • Validation                                            │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Event Queue Manager                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  IndexedDB   │  │   Batching   │  │  Compression │        │
│  │   Storage    │  │   Logic      │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
     ┌──────────▼──────────┐      ┌──────────▼──────────┐
     │   Local Processing   │      │   Cloud Sync        │
     │  (All Users)        │      │  (Premium Users)    │
     └─────────────────────┘      └─────────────────────┘
                                              │
                               ┌──────────────┴──────────────┐
                               │                             │
                    ┌──────────▼──────────┐      ┌──────────▼──────────┐
                    │  Firebase Firestore │      │     BigQuery        │
                    │   (Real-time)       │      │   (Analytics)       │
                    └─────────────────────┘      └─────────────────────┘
                               │                             │
                               └──────────┬──────────────────┘
                                          │
                         ┌────────────────▼─────────────────┐
                         │      Analytics Engine            │
                         │  • Pattern Recognition           │
                         │  • Learning Velocity             │
                         │  • Recommendation Generation    │
                         └────────────────┬─────────────────┘
                                          │
                         ┌────────────────▼─────────────────┐
                         │     Personalization Layer        │
                         │  • Custom Learning Paths         │
                         │  • Smart Reviews                │
                         │  • Content Recommendations      │
                         └──────────────────────────────────┘
```

## Core Components

### 1. Tracking Layer

The tracking layer is implemented as a React hook that can be added to any component:

```typescript
// /src/hooks/useLearnTracking.ts
export function useLearnTracking() {
  const { user } = useAuth();
  const { sessionId } = useSession();
  
  const track = useCallback((event: Partial<LearningEvent>) => {
    const enrichedEvent = enrichEvent(event, {
      userId: user?.id,
      sessionId,
      timestamp: Date.now(),
      context: getCurrentContext()
    });
    
    queueEvent(enrichedEvent);
  }, [user, sessionId]);
  
  return { track };
}
```

### 2. Event Queue Manager

Handles local storage and batching:

```typescript
// /src/services/analytics/EventQueueManager.ts
class EventQueueManager {
  private queue: LearningEvent[] = [];
  private db: IDBDatabase;
  
  async queueEvent(event: LearningEvent) {
    // Add to memory queue
    this.queue.push(event);
    
    // Persist to IndexedDB
    await this.persistToIndexedDB(event);
    
    // Schedule batch sync
    this.scheduleBatchSync();
  }
  
  private scheduleBatchSync() {
    // Batch every 30 seconds or 100 events
    if (this.queue.length >= 100 || !this.syncTimer) {
      this.syncTimer = setTimeout(() => this.syncBatch(), 30000);
    }
  }
}
```

### 3. Storage Strategy

#### Local Storage (IndexedDB)
- All events stored locally first
- Survives page refreshes
- Works offline
- Syncs when online

#### Cloud Storage (Firebase)
- Real-time event stream
- User aggregations
- Cross-device sync
- Premium feature

#### Analytics Storage (BigQuery)
- Bulk analytics
- ML training data
- Historical analysis
- Pattern detection

### 4. Analytics Engine

Processes events to generate insights:

```typescript
// /src/services/analytics/AnalyticsEngine.ts
class AnalyticsEngine {
  async processEvents(events: LearningEvent[]) {
    const insights = await Promise.all([
      this.calculateLearningVelocity(events),
      this.detectPatterns(events),
      this.identifyBlindSpots(events),
      this.generateRecommendations(events)
    ]);
    
    return insights;
  }
}
```

## Data Flow

### 1. Event Generation
```
User views kanji "愛" in article
  ↓
Component calls track()
  ↓
Event created with context
```

### 2. Local Processing
```
Event queued in memory
  ↓
Saved to IndexedDB
  ↓
Batched for sync
```

### 3. Cloud Sync (Premium)
```
Batch compressed
  ↓
Sent to Firebase
  ↓
Processed by Cloud Functions
  ↓
Stored in Firestore/BigQuery
```

### 4. Analytics Generation
```
Events aggregated
  ↓
Patterns detected
  ↓
Insights generated
  ↓
Recommendations created
```

### 5. Personalization
```
User profile updated
  ↓
Learning path adjusted
  ↓
Content personalized
  ↓
UI updated
```

## Event Schema

### Base Event Structure
```typescript
interface LearningEvent {
  // Identity
  id: string;                    // Unique event ID
  userId: string;                 // User who triggered event
  sessionId: string;              // Current session
  timestamp: number;              // Unix timestamp
  
  // Classification
  type: EventType;                // view, search, practice, etc.
  category: ContentCategory;      // kanji, vocab, grammar, etc.
  
  // Content
  content: {
    id: string;                  // Unique content identifier
    value: string;                // The actual content (kanji, word, etc.)
    jlptLevel?: number;           // JLPT level if applicable
    frequency?: number;           // Usage frequency
    metadata?: Record<string, any>; // Additional content data
  };
  
  // Context
  context: {
    page: string;                 // Current page/route
    feature: string;              // Feature being used
    referrer?: string;            // Previous page
    experiment?: string;          // A/B test variant
  };
  
  // Metrics
  metrics: {
    duration?: number;            // Time spent (ms)
    accuracy?: number;            // For tests/quizzes (0-100)
    attempts?: number;            // Number of attempts
    scrollDepth?: number;         // How far scrolled (0-100)
    interaction?: string;         // click, hover, scroll, etc.
  };
}
```

### Event Types
```typescript
type EventType = 
  | 'view'        // Content viewed
  | 'search'      // Search performed
  | 'practice'    // Practice session
  | 'test'        // Test/quiz taken
  | 'success'     // Correct answer
  | 'failure'     // Incorrect answer
  | 'save'        // Content saved
  | 'share'       // Content shared
  | 'complete'    // Section completed
  | 'abandon';    // Section abandoned
```

### Content Categories
```typescript
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
  | 'drill';
```

## Performance Considerations

### Batching Strategy
- Queue events in memory
- Batch every 30 seconds
- Or every 100 events
- Compress before sending

### Storage Limits
- IndexedDB: 50MB per user
- Rotate old events
- Aggregate before deletion
- Cloud backup for premium

### Network Optimization
- Use requestIdleCallback
- Progressive enhancement
- Fallback mechanisms
- Retry with backoff

## Privacy & Security

### User Control
- Opt-in/opt-out settings
- Granular control per category
- Data export functionality
- Complete deletion option

### Data Protection
- Client-side encryption option
- Anonymized aggregations
- GDPR compliance
- No PII in events

### Access Control
- User owns their data
- Admin dashboard separate
- API rate limiting
- Audit logging

## Integration Points

### With Existing Systems
- Three-Pillar Architecture for access control
- Achievement System for milestones
- SRS System for review scheduling
- Notification System for insights

### Future Integrations
- ML Pipeline for predictions
- Social Features for comparisons
- Export to Anki/external tools
- Public API for developers

## Monitoring & Debugging

### Health Metrics
- Events per second
- Queue size
- Sync success rate
- Storage usage

### Debug Tools
- Event inspector
- Queue visualizer
- Sync status dashboard
- Error tracking

## Scalability Plan

### Phase 1: MVP (Current)
- 1K users
- 100K events/day
- Local storage focus

### Phase 2: Growth
- 10K users
- 1M events/day
- Cloud sync for premium

### Phase 3: Scale
- 100K users
- 10M events/day
- Distributed processing
- ML pipeline

---

**Next Steps**: Review [Implementation Plan](../implementation/plan.md) for detailed rollout strategy.