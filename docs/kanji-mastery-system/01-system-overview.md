# 📐 System Overview - Kanji Mastery System

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [Key Algorithms](#key-algorithms)
5. [System Integration](#system-integration)
6. [Performance Considerations](#performance-considerations)

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────┐
│           Presentation Layer (UI/UX)            │
├─────────────────────────────────────────────────┤
│          Business Logic Layer (Core)            │
├─────────────────────────────────────────────────┤
│           Data Processing Layer                 │
├─────────────────────────────────────────────────┤
│            Storage Layer (Multi-tier)           │
└─────────────────────────────────────────────────┘
```

### Component Architecture

```typescript
// Core System Components
interface KanjiMasterySystem {
  // Review Management
  reviewEngine: SRSReviewEngine;
  
  // Learning Intelligence
  adaptiveLearning: AdaptiveLearningEngine;
  leechDetector: LeechDetectionSystem;
  
  // Progress Tracking
  progressTracker: ProgressTrackingSystem;
  masteryCalculator: MasteryLevelCalculator;
  
  // User Engagement
  notificationService: SmartNotificationService;
  gamificationEngine: GamificationEngine;
  
  // Analytics
  insightsGenerator: InsightsGenerator;
  performanceAnalyzer: PerformanceAnalyzer;
}
```

## Core Components

### 1. SRS Review Engine

**Purpose**: Manage spaced repetition scheduling for optimal memory retention

```typescript
class SRSReviewEngine {
  // FSRS Algorithm Implementation
  private fsrs: FSRS;
  
  // Get kanji due for review
  async getDueReviews(userId: string): Promise<ReviewQueue> {
    // 1. Query all kanji progress
    // 2. Filter by dueDate <= now
    // 3. Sort by priority (overdue first)
    // 4. Apply daily limits
    // 5. Return queue
  }
  
  // Process review result
  async processReview(
    kanjiId: string,
    quality: 1-5,
    responseTime: number
  ): Promise<UpdatedProgress> {
    // 1. Calculate new interval
    // 2. Update due date
    // 3. Adjust difficulty
    // 4. Save progress
  }
}
```

**Key Features**:
- Uses FSRS algorithm (state-of-the-art SRS)
- Adaptive intervals based on performance
- Handles overdue items gracefully
- Supports batch reviews

### 2. Adaptive Learning Engine

**Purpose**: Personalize learning based on individual weaknesses and patterns

```typescript
class AdaptiveLearningEngine {
  // Analyze user's weak areas
  async analyzeWeaknesses(userId: string): Promise<WeaknessProfile> {
    return {
      byType: {
        meaning: this.getMeaningWeaknesses(),
        onyomi: this.getOnyomiWeaknesses(),
        kunyomi: this.getKunyomiWeaknesses(),
      },
      byPattern: {
        visuallySimilar: this.findVisualConfusion(),
        similarSound: this.findPhoneticConfusion(),
        similarMeaning: this.findSemanticConfusion(),
      },
      bySpeed: {
        slowRecall: this.findSlowRecallItems(),
        inconsistent: this.findInconsistentItems(),
      }
    };
  }
  
  // Generate targeted practice
  async createAdaptiveSession(
    weaknesses: WeaknessProfile
  ): Promise<PracticeSession> {
    // 1. Select target kanji
    // 2. Choose question types
    // 3. Generate smart distractors
    // 4. Set difficulty level
  }
}
```

**Adaptation Strategies**:
- **Difficulty Scaling**: Easier distractors for struggling learners
- **Question Type Focus**: More questions on weak areas
- **Interval Adjustment**: Shorter intervals for problem items
- **Method Switching**: Try different approaches for leeches

### 3. Leech Detection System

**Purpose**: Identify and treat kanji that resist memorization

```typescript
class LeechDetectionSystem {
  // Leech criteria
  private readonly LEECH_THRESHOLD = {
    minAttempts: 8,
    maxAccuracy: 0.5,
    resetCount: 3,
  };
  
  // Detect leeches
  async detectLeeches(progress: KanjiProgress[]): Promise<Leech[]> {
    return progress
      .filter(k => this.isLeech(k))
      .map(k => this.createLeechProfile(k));
  }
  
  // Suggest treatment
  suggestTreatment(leech: Leech): LeechTreatment {
    // Based on error patterns, suggest:
    // - Mnemonic creation
    // - Radical breakdown
    // - Writing practice
    // - Context sentences
    // - Similar kanji comparison
  }
}
```

**Treatment Methods**:
1. **Mnemonic Method**: Create memorable stories
2. **Component Analysis**: Break into radicals
3. **Kinesthetic Learning**: Writing practice
4. **Contextual Learning**: See in sentences
5. **Comparative Learning**: Study with similar kanji

### 4. Progress Tracking System

**Purpose**: Track and visualize learning progress

```typescript
interface MasteryLevel {
  level: 0-6; // Unseen to Burned
  requirements: {
    accuracy: number;
    streak: number;
    interval: number;
    speed: number;
  };
  visual: {
    color: string;
    icon: string;
    animation: string;
  };
}

class ProgressTrackingSystem {
  // Calculate mastery level
  getMasteryLevel(progress: KanjiProgress): MasteryLevel {
    // Complex calculation based on:
    // - Current SRS interval
    // - Overall accuracy
    // - Response speed
    // - Consistency
  }
  
  // Track milestones
  checkAchievements(userId: string): Achievement[] {
    // Check for:
    // - First 100 kanji learned
    // - 30-day streak
    // - Perfect week
    // - Speed improvements
    // - Level ups
  }
}
```

**Mastery Levels**:
- **Level 0 - Unseen**: Never encountered
- **Level 1 - Introduced**: Seen 1-2 times
- **Level 2 - Familiar**: 60%+ accuracy
- **Level 3 - Learned**: 80%+ accuracy, consistent
- **Level 4 - Master**: 95%+ accuracy, fast recall
- **Level 5 - Enlightened**: Perfect for 30+ days
- **Level 6 - Burned**: Perfect for 180+ days

### 5. Smart Notification Service

**Purpose**: Send timely, personalized reminders

```typescript
class SmartNotificationService {
  // Analyze best times
  async findOptimalTimes(userId: string): Promise<TimeSlots[]> {
    // Analyze historical performance
    // Find peak accuracy times
    // Consider user's schedule
  }
  
  // Generate personalized messages
  createMessage(context: NotificationContext): string {
    // Examples:
    // "Morning! 15 kanji due - your best time! 🌅"
    // "Quick review before you forget! 5 critical kanji"
    // "You're on fire! 7-day streak 🔥"
  }
  
  // Smart scheduling
  async scheduleNotifications(userId: string) {
    // Daily reviews
    // Streak reminders
    // Achievement alerts
    // Forgetting curve interventions
  }
}
```

## Data Flow

### Review Session Flow

```
User Opens App
     ↓
Check Due Reviews → Pull from Firebase
     ↓
Generate Queue → Apply SRS Algorithm
     ↓
Present Question → Adaptive Difficulty
     ↓
User Answers → Track Response Time
     ↓
Update Progress → FSRS Calculation
     ↓
Save to Storage → Firebase + Local
     ↓
Check Achievements → Update if Earned
     ↓
Next Question or Complete
```

### Data Synchronization

```typescript
class DataSyncService {
  // Bi-directional sync
  async sync(userId: string) {
    // 1. Check online status
    // 2. Compare timestamps
    // 3. Merge conflicts (server wins)
    // 4. Update local cache
    // 5. Push local changes
  }
  
  // Offline capability
  queueOfflineChanges(changes: any[]) {
    // Store in IndexedDB
    // Sync when online
  }
}
```

## Key Algorithms

### 1. FSRS (Free Spaced Repetition Scheduler)

```typescript
// Core FSRS algorithm
function calculateNextReview(
  card: Card,
  quality: 1-5,
  now: Date
): UpdatedCard {
  // State variables
  const { difficulty, stability, retrievability } = card;
  
  // Calculate new stability
  const newStability = stability * (
    1 + Math.exp(quality - 3) * 
    (0.1 - (5 - quality) * (0.05 + difficulty * 0.02))
  );
  
  // Calculate interval
  const interval = -newStability * Math.log(0.9) / Math.log(2);
  
  // Update difficulty
  const newDifficulty = difficulty + 0.1 * (quality - 3);
  
  return {
    ...card,
    interval: Math.round(interval),
    dueDate: addDays(now, interval),
    difficulty: clamp(newDifficulty, 0, 1),
    stability: newStability,
  };
}
```

### 2. Weakness Detection Algorithm

```typescript
function detectWeaknesses(history: ReviewHistory[]): Weaknesses {
  // Statistical analysis
  const patterns = {
    // Consistent errors
    systematic: history.filter(h => h.errorRate > 0.4),
    
    // Interference (confuse A with B)
    interference: findInterferencePairs(history),
    
    // Slow but correct
    slowRecall: history.filter(h => 
      h.correct && h.responseTime > 5000
    ),
    
    // Time-based (forget after breaks)
    temporal: findTemporalPatterns(history),
  };
  
  return analyzePatterns(patterns);
}
```

### 3. Confusion Matrix

```typescript
function buildConfusionMatrix(errors: Error[]): Matrix {
  const matrix = new Map<string, Map<string, number>>();
  
  errors.forEach(error => {
    const { correct, selected } = error;
    
    if (!matrix.has(correct)) {
      matrix.set(correct, new Map());
    }
    
    const row = matrix.get(correct)!;
    row.set(selected, (row.get(selected) || 0) + 1);
  });
  
  return matrix;
}
```

## System Integration

### Existing Systems to Connect

```typescript
// Integration points
interface SystemIntegrations {
  // Current progress system
  kanjiStudyProgress: {
    path: '/src/utils/kanjiStudyProgress.ts',
    methods: ['getProgress', 'updateProgress', 'saveSession'],
  };
  
  // Statistics
  statsManager: {
    path: '/src/utils/statsManager.ts',
    methods: ['recordSession', 'getStats'],
  };
  
  // Access control
  featureRegistry: {
    path: '/src/lib/features/registry.ts',
    features: ['daily_reviews', 'adaptive_practice'],
  };
  
  // Notifications
  notificationService: {
    path: '/src/contexts/NotificationServiceContext.tsx',
    methods: ['scheduleNotification', 'sendNotification'],
  };
}
```

### New Services Required

```typescript
// New services to implement
const newServices = {
  '/src/services/masteryService.ts': 'Mastery level calculations',
  '/src/services/reviewQueueService.ts': 'Review queue management',
  '/src/services/adaptiveService.ts': 'Adaptive learning logic',
  '/src/services/leechService.ts': 'Leech detection and treatment',
  '/src/services/insightsService.ts': 'Analytics and insights',
};
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Load kanji data on demand
   - Paginate large result sets
   - Use virtual scrolling for lists

2. **Caching**
   - Cache calculated values (mastery levels)
   - Store frequently accessed data locally
   - Use service workers for offline

3. **Batch Operations**
   - Batch Firebase writes
   - Debounce progress updates
   - Queue background syncs

4. **Progressive Enhancement**
   - Core features work offline
   - Enhanced features when online
   - Graceful degradation

### Performance Targets

```typescript
const performanceTargets = {
  // Response times
  reviewLoad: '< 100ms',
  questionPresentation: '< 50ms',
  progressUpdate: '< 200ms',
  
  // Data limits
  maxActiveKanji: 2000,
  maxHistoryDays: 365,
  maxSessionLength: 100,
  
  // Storage limits
  localStorageMax: '5MB',
  indexedDBMax: '50MB',
  
  // Battery/Network
  backgroundSyncInterval: '30 minutes',
  offlineQueueMax: 1000,
};
```

## Security & Privacy

### Data Protection

```typescript
class SecurityService {
  // Encrypt sensitive data
  encryptProgress(data: any): string {
    // Use Web Crypto API
  }
  
  // Validate inputs
  validateInput(input: any): boolean {
    // Prevent injection attacks
  }
  
  // Rate limiting
  checkRateLimit(userId: string): boolean {
    // Prevent abuse
  }
}
```

### Privacy Considerations

- No sharing of individual progress
- Anonymized analytics only
- User controls data deletion
- Transparent data usage

---

## Next: [Daily Reviews Implementation](./02-daily-reviews.md)

*Last Updated: January 2025*