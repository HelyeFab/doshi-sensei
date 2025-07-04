# Flashcard System Implementation Plan

## Overview

This document outlines the implementation of a comprehensive flashcard system for Doshi Sensei, allowing users to review all saved words (including nouns, adverbs, particles, etc.) using spaced repetition and memory techniques.

## Feature Requirements

### Core Functionality
- **Flashcard Review System**: Interactive cards showing Japanese words with meanings
- **Spaced Repetition Algorithm**: Intelligent scheduling based on memory performance
- **Universal Word Support**: Works with all word types (nouns, verbs, adjectives, adverbs, particles)
- **Integration with Word Lists**: Use existing saved word lists as flashcard decks
- **Progress Tracking**: Monitor learning progress and retention rates
- **Cloud Sync**: Synchronize flashcard progress across devices

### User Experience
- **Dual Mode Drill Page**: Conjugation drills + Flashcard review
- **Card Interactions**: Flip cards, rate difficulty, mark as known/unknown
- **Study Sessions**: Timed sessions with performance feedback
- **Visual Feedback**: Progress indicators, streak counters, mastery levels

## Technical Architecture

### Data Models

#### FlashcardSession
```typescript
interface FlashcardSession {
  id: string;
  userId: string;
  wordListIds: string[];
  startTime: Date;
  endTime?: Date;
  cardsReviewed: number;
  cardsCorrect: number;
  sessionType: 'review' | 'learn' | 'practice';
  avgResponseTime: number;
}
```

#### FlashcardProgress
```typescript
interface FlashcardProgress {
  id: string;
  userId: string;
  wordId: string;
  easeFactor: number; // 1.3 - 2.5 (SuperMemo algorithm)
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews
  nextReviewDate: Date;
  lastReviewDate: Date;
  difficulty: 'learning' | 'reviewing' | 'mastered';
  totalReviews: number;
  correctReviews: number;
  averageResponseTime: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### FlashcardReview
```typescript
interface FlashcardReview {
  id: string;
  userId: string;
  wordId: string;
  sessionId: string;
  reviewDate: Date;
  responseTime: number; // milliseconds
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SuperMemo quality rating
  wasCorrect: boolean;
  cardType: 'kanji-to-meaning' | 'meaning-to-kanji' | 'reading-recognition';
  previousInterval: number;
  newInterval: number;
}
```

### Spaced Repetition Algorithm

#### SuperMemo SM-2 Implementation
- **Quality Scale**: 0-5 rating system
  - 0: Complete mental block
  - 1: Incorrect response, correct answer seemed familiar
  - 2: Incorrect response, correct answer seemed easy to recall
  - 3: Correct response, but required significant difficulty
  - 4: Correct response, after some hesitation
  - 5: Correct response, perfect recall

#### Algorithm Formula
```typescript
function calculateNextReview(quality: number, repetitions: number, easeFactor: number, interval: number) {
  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return { interval, repetitions, easeFactor };
}
```

## Implementation Phases

### Phase 1: Core Data Layer (3-4 days)
1. **Database Schema Updates**
   - Add flashcard tables to IndexedDB schema
   - Create Firebase Firestore collections
   - Update storage utilities for flashcard data

2. **Progress Tracking System**
   - Implement FlashcardProgress manager
   - Create review scheduling algorithm
   - Add performance analytics

### Phase 2: Flashcard Engine (4-5 days)
1. **Card Generation System**
   - Create flashcard from word data
   - Support multiple card types (kanji→meaning, meaning→kanji)
   - Word difficulty assessment

2. **Review Algorithm**
   - Implement SuperMemo SM-2 algorithm
   - Schedule next review dates
   - Handle quality rating updates

3. **Session Management**
   - Track review sessions
   - Performance analytics
   - Time-based limits

### Phase 3: User Interface (5-6 days)
1. **Drill Page Restructure**
   - Split into two main sections
   - Tab-based navigation (Conjugation | Flashcards)
   - Unified styling and UX

2. **Flashcard Components**
   - Interactive card component with flip animation
   - Quality rating interface
   - Progress indicators and stats

3. **Study Session Interface**
   - Session setup (deck selection, time limits)
   - Real-time progress tracking
   - Session results and feedback

### Phase 4: Integration & Sync (3-4 days)
1. **Cloud Synchronization**
   - Sync flashcard progress to Firebase
   - Handle offline/online state transitions
   - Conflict resolution for progress data

2. **Statistics Integration**
   - Update stats system for flashcard data
   - Dashboard analytics
   - Progress visualization

3. **Subscription Integration**
   - Apply usage limits to flashcard sessions
   - Premium features (unlimited reviews, advanced analytics)

### Phase 5: Polish & Testing (2-3 days)
1. **Performance Optimization**
   - Efficient data queries for due cards
   - Memory management for large word lists
   - Background sync optimization

2. **Testing & Validation**
   - Unit tests for algorithm accuracy
   - Integration tests for data sync
   - User experience testing

## File Structure

### New Files
```
src/
├── utils/
│   ├── flashcards.ts           # Core flashcard engine
│   ├── spacedRepetition.ts     # SM-2 algorithm implementation
│   └── flashcardSync.ts        # Cloud sync utilities
├── components/
│   ├── flashcards/
│   │   ├── FlashcardDeck.tsx   # Deck management
│   │   ├── FlashcardReview.tsx # Review session component
│   │   ├── FlashcardCard.tsx   # Individual card component
│   │   └── FlashcardStats.tsx  # Progress visualization
└── hooks/
    └── useFlashcards.ts        # Flashcard state management
```

### Modified Files
```
src/
├── app/drill/page.tsx          # Add flashcard section
├── types/index.ts              # Add flashcard interfaces
├── utils/
│   ├── indexedDB.ts           # Add flashcard stores
│   ├── storage.ts             # Add flashcard methods
│   └── stats.ts               # Include flashcard analytics
└── contexts/
    └── SubscriptionContext.tsx # Add flashcard limits
```

## Database Schema Updates

### IndexedDB Stores
```typescript
interface FlashcardSchema extends DatabaseSchema {
  flashcardProgress: FlashcardProgress;
  flashcardSessions: FlashcardSession;
  flashcardReviews: FlashcardReview;
}
```

### Firebase Collections
```
/users/{userId}/flashcardProgress/{wordId}
/users/{userId}/flashcardSessions/{sessionId}
/users/{userId}/flashcardReviews/{reviewId}
```

## User Experience Flow

### Study Session Workflow
1. **Deck Selection**: Choose word lists to review
2. **Session Setup**: Set time limits, card types
3. **Card Review**:
   - Show question side (kanji or meaning)
   - User attempts recall
   - Flip to show answer
   - Rate difficulty (1-5 scale)
4. **Session Summary**: Performance feedback, next session scheduling

### Card Types
1. **Kanji Recognition**: Show kanji → recall reading + meaning
2. **Meaning Recognition**: Show meaning → recall kanji + reading
3. **Reading Recognition**: Show reading → recall kanji + meaning

## Success Metrics

### User Engagement
- Daily active flashcard users
- Average session duration
- Cards reviewed per session
- User retention rates

### Learning Effectiveness
- Accuracy improvement over time
- Spaced repetition efficiency
- Long-term retention rates
- Time to mastery tracking

## Technical Considerations

### Performance
- **Lazy Loading**: Load cards on-demand during sessions
- **Background Processing**: Calculate due cards in background
- **Efficient Queries**: Index-optimized database queries
- **Memory Management**: Limit active cards in memory

### Scalability
- **Batch Operations**: Bulk update progress data
- **Data Partitioning**: Separate hot/cold flashcard data
- **Caching Strategy**: Cache frequently accessed cards
- **Progressive Sync**: Incremental cloud synchronization

### Error Handling
- **Offline Resilience**: Continue sessions without network
- **Data Corruption**: Validate and repair inconsistent states
- **Sync Conflicts**: Merge progress from multiple devices
- **Algorithm Fallbacks**: Handle edge cases in SM-2 calculations

## Future Enhancements

### Advanced Features
- **Custom Card Types**: User-defined question formats
- **Audio Integration**: Pronunciation practice
- **Spaced Writing**: Kanji stroke order practice
- **Collaborative Decks**: Shared community flashcard sets

### Analytics & AI
- **Learning Pattern Analysis**: Identify difficulty patterns
- **Adaptive Algorithms**: Personalized spaced repetition
- **Predictive Scheduling**: Optimize review timing
- **Performance Insights**: Detailed learning analytics

---

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 3-4 days | Data layer, database schema |
| Phase 2 | 4-5 days | Flashcard engine, algorithms |
| Phase 3 | 5-6 days | UI components, drill page update |
| Phase 4 | 3-4 days | Cloud sync, integrations |
| Phase 5 | 2-3 days | Testing, optimization |
| **Total** | **17-22 days** | **Complete flashcard system** |

## Risk Assessment

### Technical Risks
- **Algorithm Complexity**: SM-2 implementation accuracy
- **Data Migration**: Existing user data compatibility
- **Performance Impact**: Large word list handling
- **Sync Reliability**: Cross-device data consistency

### Mitigation Strategies
- **Incremental Testing**: Validate algorithm with small datasets
- **Gradual Rollout**: Feature flags for controlled deployment
- **Performance Monitoring**: Real-time performance metrics
- **Backup Systems**: Data recovery and rollback procedures

---

*Last Updated: January 2025 | Doshi Sensei Flashcard System v1.0*
