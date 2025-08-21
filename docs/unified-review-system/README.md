# Unified Review Engine (URE) - Technical Documentation

## Overview

The Unified Review Engine (URE) is a comprehensive system that consolidates all review and reminder functionality in Doshi Sensei into a single, extensible architecture. This system replaces the previous fragmented approach where each feature (Kanji, Vocabulary, Flashcards, etc.) had its own review implementation.

## Problem Statement

### Current Issues
- **5 separate review systems** with duplicate code and logic
- **Inconsistent algorithms** (FSRS, SM2, custom implementations)
- **Fragmented storage** (multiple IndexedDB schemas)
- **Inconsistent notifications** (some features have push, others don't)
- **Maintenance overhead** (5x the code to maintain)
- **Poor user experience** (different review interfaces for each content type)

## Architecture

### Core Principles
1. **Content Agnostic** - Works with any type of learning material
2. **Algorithm Flexible** - Supports multiple spaced repetition algorithms
3. **Storage Unified** - Single source of truth for all review data
4. **Notification Centralized** - One notification system for all reminders
5. **Future Proof** - Easy to add new content types and features

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
├─────────────────────────────────────────────────────────┤
│  ReviewDueWidget │ ReviewSession │ ProgressDashboard    │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Review Engine Core                     │
├─────────────────────────────────────────────────────────┤
│  SessionManager │ Scheduler │ NotificationService       │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                    Algorithm Layer                       │
├─────────────────────────────────────────────────────────┤
│     FSRS     │     SM2     │    Anki    │   Custom     │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                    Storage Layer                         │
├─────────────────────────────────────────────────────────┤
│  IndexedDB  │  Firebase Sync  │  Migration Service      │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### ReviewItem
Universal representation of any reviewable content:

```typescript
interface ReviewItem {
  id: string;                    // Unique identifier
  type: ContentType;              // 'kanji' | 'vocabulary' | 'flashcard' | etc.
  content: any;                   // Type-specific content
  metadata: {
    source?: string;              // Origin (textbook, custom, etc.)
    tags?: string[];              // Categorization
    difficulty?: number;          // 1-10 scale
    priority?: number;            // Review priority
    relatedItems?: string[];      // Links to related content
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### ReviewProgress
Tracks user's progress for each item:

```typescript
interface ReviewProgress {
  itemId: string;                 // Reference to ReviewItem
  userId: string;                 // User identifier
  algorithm: AlgorithmType;       // Active algorithm
  algorithmData: any;             // Algorithm-specific state
  
  // Review scheduling
  nextReview: Date;
  lastReview: Date;
  reviewCount: number;
  
  // Performance metrics
  masteryLevel: number;           // 0-100 scale
  retentionRate: number;          // Success rate
  averageResponseTime: number;    // In seconds
  
  // Study modes (recognition, production, etc.)
  studyModes: Map<string, ModeStats>;
  
  // Tracking
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;                // Last cloud sync
}
```

## Algorithm System

### Plugin Architecture
Each algorithm implements the `ReviewAlgorithm` interface:

```typescript
interface ReviewAlgorithm {
  name: string;
  version: string;
  
  // Core methods
  processReview(
    item: ReviewItem, 
    rating: number, 
    progress?: ReviewProgress
  ): ReviewProgress;
  
  calculateNextReview(progress: ReviewProgress): Date;
  
  getDueItems(
    items: ReviewProgress[], 
    limit?: number
  ): ReviewProgress[];
  
  // Optional optimization
  optimizeSchedule?(items: ReviewProgress[]): ReviewProgress[];
  
  // Difficulty adjustment
  adjustDifficulty?(
    item: ReviewItem, 
    performance: PerformanceMetrics
  ): number;
}
```

### Supported Algorithms

#### FSRS (Free Spaced Repetition Scheduler)
- Most advanced algorithm with optimal retention
- Adapts to individual learning patterns
- Supports fuzzing to prevent bunching

#### SM2 (SuperMemo 2)
- Classic algorithm, widely tested
- Simple and predictable
- Good for consistent learners

#### Anki-style
- Based on Anki's modified SM2
- Supports ease factor adjustments
- Popular with flashcard users

#### Simple Intervals
- Fixed intervals (1, 3, 7, 14, 30 days)
- No complexity, easy to understand
- Good for casual learners

## Notification System

### Multi-Channel Support
```typescript
interface NotificationChannel {
  type: 'in-app' | 'push' | 'email' | 'sms';
  
  isAvailable(): Promise<boolean>;
  
  sendReminder(
    items: ReviewItem[], 
    user: User,
    options: NotificationOptions
  ): Promise<void>;
  
  scheduleReminder(
    items: ReviewItem[],
    user: User,
    scheduledTime: Date
  ): Promise<string>; // Returns schedule ID
  
  cancelReminder(scheduleId: string): Promise<void>;
}
```

### Smart Scheduling
- Respects user's preferred study times
- Avoids notification fatigue
- Groups related items
- Adapts to user's engagement patterns

## Session Management

### Review Sessions
Intelligently combines different content types:

```typescript
class ReviewSession {
  // Session configuration
  maxItems: number;
  maxDuration: number; // minutes
  mixStrategy: 'interleaved' | 'blocked' | 'adaptive';
  
  // Start session with mixed content
  async startSession(
    userId: string,
    preferences?: SessionPreferences
  ): Promise<SessionState>;
  
  // Process individual review
  async processReview(
    itemId: string,
    response: ReviewResponse
  ): Promise<ReviewResult>;
  
  // Adaptive difficulty
  adjustDifficulty(): void;
  
  // Session completion
  async completeSession(): Promise<SessionSummary>;
}
```

## Storage Architecture

### IndexedDB Schema
```typescript
// Main stores
const stores = {
  reviewItems: 'id, type, metadata.source, createdAt',
  reviewProgress: 'id, userId, itemId, nextReview, algorithm',
  sessions: 'id, userId, startTime, endTime',
  notifications: 'id, userId, scheduledTime, status',
  settings: 'id, userId'
};
```

### Sync Strategy
- Offline-first approach
- Automatic sync for premium users
- Conflict resolution based on timestamps
- Incremental sync to minimize data transfer

## Migration Plan

### Phase 1: Data Migration
1. Export existing data from all systems
2. Transform to unified schema
3. Import with validation
4. Maintain backward compatibility layer

### Phase 2: Feature Migration
1. Kanji Mastery → URE Kanji Adapter
2. Vocabulary → URE Vocabulary Adapter
3. Flashcards → URE Flashcard Adapter
4. Study Lists → URE List Adapter

### Phase 3: Deprecation
1. Mark old systems as deprecated
2. Monitor usage metrics
3. Remove old code after validation
4. Clean up unused dependencies

## API Reference

### Core APIs
```typescript
// Review Engine
const reviewEngine = new UnifiedReviewEngine();

// Get due items
const dueItems = await reviewEngine.getDueItems(userId, {
  limit: 20,
  types: ['kanji', 'vocabulary'],
  algorithm: 'fsrs'
});

// Start review session
const session = await reviewEngine.startSession(userId, {
  maxItems: 30,
  maxDuration: 15,
  mixStrategy: 'adaptive'
});

// Process review
const result = await session.processReview(itemId, {
  rating: 4,
  responseTime: 3.5,
  hints: false
});

// Schedule notifications
await reviewEngine.scheduleNotifications(userId, {
  channels: ['push', 'in-app'],
  times: ['09:00', '18:00'],
  minInterval: 4 * 60 * 60 * 1000 // 4 hours
});
```

## Performance Considerations

### Optimization Strategies
- Lazy loading of content
- IndexedDB transactions batching
- Virtual scrolling for large lists
- Web Worker for heavy computations
- Caching of frequently accessed data

### Scalability
- Supports 100,000+ items per user
- Sub-second response times
- Minimal memory footprint
- Progressive enhancement

## Testing Strategy

### Unit Tests
- Algorithm correctness
- Storage operations
- Migration scripts
- Notification scheduling

### Integration Tests
- End-to-end review sessions
- Cross-feature compatibility
- Sync operations
- Performance benchmarks

### User Testing
- A/B testing migration
- Performance monitoring
- User feedback collection
- Iterative improvements

## Future Enhancements

### Planned Features
1. **AI-Powered Scheduling** - ML model for optimal review times
2. **Social Reviews** - Compete with friends
3. **Analytics Dashboard** - Detailed learning insights
4. **Custom Algorithms** - User-defined review patterns
5. **Voice Reviews** - Audio-based review sessions
6. **AR Flashcards** - Augmented reality reviews

### Extension Points
- Plugin system for custom content types
- Webhook support for external integrations
- API for third-party apps
- Export/import functionality

## Support & Maintenance

### Monitoring
- Performance metrics dashboard
- Error tracking with Sentry
- User engagement analytics
- System health checks

### Documentation
- User guide
- Developer documentation
- API reference
- Migration guide

### Contact
For questions or support regarding the URE system:
- Technical issues: Create GitHub issue
- Feature requests: Use feedback form
- Security concerns: security@doshisensei.com

---

*Last Updated: January 2025*
*Version: 1.0.0*