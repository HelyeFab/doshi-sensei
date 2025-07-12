# 📊 Doshi Sensei Stats System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Integration Guide](#integration-guide)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Extending the System](#extending-the-system)
8. [Troubleshooting](#troubleshooting)
9. [Performance Considerations](#performance-considerations)
10. [Migration Guide](#migration-guide)

---

## 🎯 Overview

The Doshi Sensei Stats System is a production-ready, event-driven analytics platform that tracks user activities, calculates metrics, and provides real-time insights into learning progress.

### How Accuracy is Calculated

The overall accuracy percentage shown in the stats bar is calculated using this formula:

```
Overall Accuracy = (Total Correct Answers / Total Questions Answered) × 100
```

This metric aggregates performance across all activities that track correct/incorrect responses:
- **Drill Practice**: Conjugation questions answered correctly
- **Kana Practice**: Hiragana/Katakana recognition accuracy
- **Games**: Performance in Kana Drop, Kanji Quest, etc.
- **Kanji Study**: Correct identification in mood boards
- **Flashcards**: Review session accuracy

Activities without scoring components (like reading stories or browsing articles) do not affect the accuracy percentage.

### Key Features

- **Event-Driven Architecture**: Every user action triggers a stats update
- **Local-First Storage**: Uses IndexedDB with cloud backup for premium users
- **Real-Time Updates**: Components receive live stats updates via subscriptions
- **Automatic Validation**: Streak calculations verified against activity history
- **Type-Safe**: Full TypeScript support with comprehensive interfaces
- **Performance Optimized**: In-memory caching, batched updates, background sync

### System Goals

1. **Accuracy**: Track every user interaction precisely
2. **Performance**: Minimal impact on app responsiveness
3. **Reliability**: Survive browser crashes and network issues
4. **Extensibility**: Easy to add new metrics and events

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Components                       │
│         (useStats hook, StatsBar, Activities)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  StatsTracker (Singleton)                │
│    • Event Processing    • State Management             │
│    • Validation         • Update Broadcasting           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Storage Layer (IndexedDB)                   │
│    • Stats Store        • Daily Activities              │
│    • Local Persistence  • Fallback to localStorage      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│            Cloud Sync (Premium Users)                    │
│    • Firestore Backup   • Cross-Device Sync            │
│    • Conflict Resolution • Background Updates           │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** → Component calls tracking function
2. **Event Creation** → ActivityEvent object with metadata
3. **Processing** → StatsTracker updates metrics
4. **Storage** → Save to IndexedDB and queue for sync
5. **Broadcasting** → Notify all subscribed components
6. **UI Update** → Components re-render with new stats

---

## 🔧 Core Components

### 1. StatsTracker (`/src/lib/stats/statsTracker.ts`)

The central singleton that manages all stats operations.

```typescript
class StatsTracker {
  // Singleton instance
  static getInstance(): StatsTracker

  // Initialize with user context
  async initialize(user: User | null, isPremium: boolean): Promise<void>

  // Track an activity
  async trackActivity(type: ActivityType, details: ActivityDetails): Promise<void>

  // Get current stats
  getStats(): UserStatsV2

  // Subscribe to updates
  subscribe(listener: StatsUpdateListener): UnsubscribeFn

  // Force cloud sync
  async forceSync(): Promise<void>
}
```

### 2. Activity Events

```typescript
interface ActivityEvent {
  id: string;                    // Unique event ID
  type: ActivityType;            // Event category
  timestamp: number;             // Unix timestamp
  userId?: string;               // User ID (if logged in)
  details: {
    itemId?: string;           // Related item ID
    itemTitle?: string;        // Human-readable title
    score?: number;            // Numeric score
    duration?: number;         // Time spent (ms)
    correct?: number;          // Correct answers
    total?: number;            // Total questions
    gameType?: string;         // Game identifier
    feature?: string;          // Feature used
  };
}

type ActivityType = 
  | 'drill'      // Conjugation practice
  | 'story'      // Story reading
  | 'article'    // News article
  | 'kanji'      // Kanji study
  | 'game'       // Games (Kana Drop, Kanji Quest)
  | 'vocab'      // Vocabulary study
  | 'flashcard'  // Flashcard review
  | 'practice';  // General practice
```

### 3. User Stats Structure

```typescript
interface UserStatsV2 {
  // User identification
  userId: string;               // User ID for cloud sync
  
  // Streak tracking
  currentStreak: number;        // Days in a row
  longestStreak: number;        // Record streak
  totalDaysActive: number;      // Total unique days
  lastActiveDate: string;       // YYYY-MM-DD format
  firstActiveDate: string;      // YYYY-MM-DD format
  
  // Activity counts
  totalActivities: number;
  drillsCompleted: number;
  storiesRead: number;
  articlesRead: number;
  kanjiStudySessions: number;
  gamesPlayed: number;
  vocabStudied: number;
  flashcardsReviewed: number;
  
  // Performance metrics
  overallAccuracy: number;      // Percentage (0-100) - Calculated as (totalCorrectAnswers / totalQuestionsAnswered) × 100
  drillAccuracy: number;        // Drill-specific accuracy (future implementation)
  kanjiAccuracy: number;        // Kanji-specific accuracy (future implementation)
  gameAccuracy: number;         // Game-specific accuracy (future implementation)
  
  // Totals
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalKanjiLearned: number;
  totalWordsLearned: number;
  totalGameScore: number;
  pokemonCaught: number;
  
  // Metadata
  lastUpdated: number;          // Unix timestamp
  version: string;              // Stats version
}
```

### 4. Daily Activity Tracking

```typescript
interface DailyActivity {
  date: string;                 // YYYY-MM-DD
  activities: ActivityEvent[];  // All events for this day
  summary: {
    totalActivities: number;
    drillsCompleted: number;
    storiesRead: number;
    articlesRead: number;
    kanjiStudied: number;
    gamesPlayed: number;
    vocabStudied: number;
    flashcardsReviewed: number;
    totalScore: number;
    totalCorrect: number;
    totalQuestions: number;
  };
}
```

---

## 🔌 Integration Guide

### Basic Setup

1. **Import the hook in your component:**

```typescript
import { useStats } from '@/hooks/useStats';
```

2. **Use stats in your component:**

```typescript
function MyComponent() {
  const { stats, loading, trackActivity } = useStats();
  
  if (loading) return <div>Loading stats...</div>;
  
  return (
    <div>
      <h2>Your streak: {stats.currentStreak} days</h2>
      <p>Total drills: {stats.drillsCompleted}</p>
    </div>
  );
}
```

### Tracking Activities

Use the pre-built tracking functions for consistency:

```typescript
import { 
  trackDrillCompleted,
  trackStoryRead,
  trackKanjiStudy,
  trackGamePlayed 
} from '@/lib/stats/trackingEvents';

// After completing a drill
await trackDrillCompleted(
  'conjugation-drill',
  questionsAnswered,
  correctAnswers,
  wordsStudied
);

// When user finishes reading a story
await trackStoryRead(storyId, storyTitle, readingTime);

// After studying a kanji
await trackKanjiStudy(kanjiCharacter, wasCorrect, 'mood-board');

// When game ends
await trackGamePlayed('kana-drop', finalScore, questions, correct);
```

### Using StatsBar Component

```typescript
import { StatsBar } from '@/components/stats/StatsBar';

function HomePage() {
  return (
    <div>
      <h1>Welcome Back!</h1>
      <StatsBar className="mb-8" />
      {/* Rest of your content */}
    </div>
  );
}
```

---

## 📚 API Reference

### useStats Hook

```typescript
interface UseStatsReturn {
  stats: UserStatsV2;           // Current stats
  loading: boolean;             // Loading state
  error: string | null;         // Error message
  trackActivity: (             // Track custom activity
    type: ActivityType, 
    details?: any
  ) => Promise<void>;
  forceSync: () => Promise<void>;      // Force cloud sync
  refreshStats: () => Promise<void>;   // Reload stats
}
```

### Tracking Functions

All tracking functions return `Promise<void>` and handle errors internally.

```typescript
// Drill tracking
trackDrillCompleted(
  drillType: string,
  questionsAnswered: number,
  correctAnswers: number,
  wordsStudied?: string[]
)

// Story tracking
trackStoryRead(
  storyId: string,
  storyTitle: string,
  completionTime?: number
)

// Article tracking  
trackArticleRead(
  articleId: string,
  articleTitle: string,
  completionTime?: number
)

// Kanji tracking
trackKanjiStudy(
  kanjiCharacter: string,
  correct: boolean,
  sessionType: 'mood' | 'browser' | 'flashcard'
)

// Game tracking
trackGamePlayed(
  gameType: 'kana-drop' | 'kanji-quest',
  score: number,
  questionsAnswered?: number,
  correctAnswers?: number
)

// Pokemon tracking
trackPokemonCaught(
  pokemonId: string,
  pokemonName: string
)

// Vocabulary tracking
trackVocabStudied(
  wordId: string,
  word: string,
  studyType: 'list' | 'practice' | 'browse'
)

// Flashcard tracking
trackFlashcardReviewed(
  cardId: string,
  correct: boolean,
  difficulty: number
)

// Practice tracking
trackPracticeSession(
  verbForm: string,
  duration: number
)
```

---

## 💻 Usage Examples

### Example 1: Drill Component

```typescript
function DrillPage() {
  const { trackActivity } = useStats();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [score, setScore] = useState(0);
  
  const completeDrill = async () => {
    // Track the drill completion
    await trackDrillCompleted(
      'verb-conjugation',
      questions.length,
      score,
      questions.map(q => q.wordId)
    );
    
    // Navigate to results
    router.push('/drill/results');
  };
  
  return (
    <div>
      {/* Drill UI */}
      <button onClick={completeDrill}>
        Complete Drill
      </button>
    </div>
  );
}
```

### Example 2: Real-time Stats Display

```typescript
function StatsWidget() {
  const { stats } = useStats();
  
  // Stats update automatically when activities are tracked
  return (
    <div className="stats-widget">
      <div className="stat">
        <span className="icon">🔥</span>
        <span className="value">{stats.currentStreak}</span>
        <span className="label">Day Streak</span>
      </div>
      <div className="stat">
        <span className="icon">📊</span>
        <span className="value">{stats.overallAccuracy}%</span>
        <span className="label">Accuracy</span>
      </div>
    </div>
  );
}
```

### Example 3: Custom Activity Tracking

```typescript
function CustomFeature() {
  const { trackActivity } = useStats();
  
  const handleCustomAction = async () => {
    // Track a custom activity
    await trackActivity('practice', {
      feature: 'custom-grammar-tool',
      duration: 300000, // 5 minutes
      itemId: 'grammar-lesson-1',
      itemTitle: 'Particles Practice'
    });
  };
  
  return (
    <button onClick={handleCustomAction}>
      Complete Custom Activity
    </button>
  );
}
```

---

## 🚀 Extending the System

### For Developers: Adding New Features

#### 1. Adding a New Activity Type

**Step 1:** Update the ActivityType in `statsTracker.ts`:

```typescript
export type ActivityType = 
  | 'drill' 
  | 'story'
  // ... existing types
  | 'writing'      // NEW: Writing practice
  | 'listening';   // NEW: Listening exercises
```

**Step 2:** Create a tracking function in `trackingEvents.ts`:

```typescript
export async function trackWritingPractice(
  promptId: string,
  wordCount: number,
  timeSpent: number,
  accuracy?: number
): Promise<void> {
  await statsTracker.trackActivity('writing', {
    itemId: promptId,
    score: wordCount,
    duration: timeSpent,
    correct: accuracy ? Math.round(accuracy * 100) : undefined,
    total: 100
  });
}
```

**Step 3:** Update stats processing in `StatsTracker`:

```typescript
private updateOverallStats(event: ActivityEvent): void {
  // ... existing code
  
  switch (event.type) {
    // ... existing cases
    
    case 'writing':
      this.stats.writingSessionsCompleted++;
      this.stats.totalWordsWritten += event.details.score || 0;
      break;
      
    case 'listening':
      this.stats.listeningExercisesCompleted++;
      break;
  }
}
```

**Step 4:** Add to UserStatsV2 interface:

```typescript
interface UserStatsV2 {
  // ... existing fields
  
  // New writing stats
  writingSessionsCompleted: number;
  totalWordsWritten: number;
  
  // New listening stats
  listeningExercisesCompleted: number;
  listeningAccuracy: number;
}
```

#### 2. Adding Custom Metrics

**Example: Time-based metrics**

```typescript
// Add to UserStatsV2
interface UserStatsV2 {
  // ... existing fields
  
  // Time tracking
  totalStudyTime: number;        // Total milliseconds
  averageSessionDuration: number; // Average ms per session
  studyTimeByActivity: {
    [key in ActivityType]?: number;
  };
}

// Update activity processing
private updateTimeMetrics(event: ActivityEvent): void {
  if (event.details.duration) {
    this.stats.totalStudyTime += event.details.duration;
    
    // Update activity-specific time
    const activityTime = this.stats.studyTimeByActivity[event.type] || 0;
    this.stats.studyTimeByActivity[event.type] = 
      activityTime + event.details.duration;
    
    // Recalculate average
    this.stats.averageSessionDuration = 
      this.stats.totalStudyTime / this.stats.totalActivities;
  }
}
```

#### 3. Creating Custom Stats Components

**Example: Weekly Progress Chart**

```typescript
import { useStats } from '@/hooks/useStats';
import { useEffect, useState } from 'react';

interface WeeklyData {
  day: string;
  activities: number;
  accuracy: number;
}

export function WeeklyProgressChart() {
  const { stats } = useStats();
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  
  useEffect(() => {
    // Load daily activities for the past week
    loadWeeklyActivities().then(setWeeklyData);
  }, [stats.lastUpdated]);
  
  return (
    <div className="weekly-chart">
      <h3>This Week's Progress</h3>
      <div className="chart-container">
        {weeklyData.map(day => (
          <div key={day.day} className="day-bar">
            <div 
              className="activity-bar"
              style={{ height: `${day.activities * 10}px` }}
            />
            <span className="day-label">{day.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4. Adding Achievement System

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserStatsV2) => boolean;
  unlockedAt?: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-drill',
    name: 'First Steps',
    description: 'Complete your first drill',
    icon: '🎯',
    condition: (stats) => stats.drillsCompleted >= 1
  },
  {
    id: 'week-streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    condition: (stats) => stats.currentStreak >= 7
  },
  {
    id: 'accuracy-master',
    name: 'Accuracy Master',
    description: 'Achieve 90% overall accuracy',
    icon: '🎯',
    condition: (stats) => stats.overallAccuracy >= 90
  }
];

// Check achievements after each activity
private checkAchievements(): void {
  const stats = this.getStats();
  
  ACHIEVEMENTS.forEach(achievement => {
    if (!achievement.unlockedAt && achievement.condition(stats)) {
      // Unlock achievement
      achievement.unlockedAt = Date.now();
      this.notifyAchievement(achievement);
    }
  });
}
```

#### 5. Advanced Analytics

**Example: Learning velocity tracking**

```typescript
interface LearningVelocity {
  wordsPerDay: number;
  kanjiPerWeek: number;
  accuracyTrend: 'improving' | 'stable' | 'declining';
  projectedMasteryDate: Date;
}

class AnalyticsEngine {
  static calculateVelocity(
    stats: UserStatsV2, 
    activities: DailyActivity[]
  ): LearningVelocity {
    // Calculate rolling averages
    const daysActive = stats.totalDaysActive || 1;
    const wordsPerDay = stats.totalWordsLearned / daysActive;
    const kanjiPerWeek = (stats.totalKanjiLearned / daysActive) * 7;
    
    // Analyze accuracy trend
    const recentAccuracy = this.getRecentAccuracy(activities, 7);
    const olderAccuracy = this.getRecentAccuracy(activities, 14, 7);
    
    let accuracyTrend: 'improving' | 'stable' | 'declining';
    if (recentAccuracy > olderAccuracy + 5) {
      accuracyTrend = 'improving';
    } else if (recentAccuracy < olderAccuracy - 5) {
      accuracyTrend = 'declining';
    } else {
      accuracyTrend = 'stable';
    }
    
    // Project mastery (simplified)
    const remainingWords = 10000 - stats.totalWordsLearned;
    const daysToMastery = remainingWords / wordsPerDay;
    const projectedMasteryDate = new Date();
    projectedMasteryDate.setDate(
      projectedMasteryDate.getDate() + daysToMastery
    );
    
    return {
      wordsPerDay,
      kanjiPerWeek,
      accuracyTrend,
      projectedMasteryDate
    };
  }
}
```

### Best Practices for Extensions

1. **Always maintain backwards compatibility**
   - Don't remove or rename existing fields
   - Use optional fields for new features
   - Increment version numbers

2. **Follow the event pattern**
   - Create specific tracking functions
   - Use consistent event details
   - Document new event types

3. **Consider performance**
   - Batch updates when possible
   - Use debouncing for frequent events
   - Limit stored history

4. **Test thoroughly**
   - Unit test new calculations
   - Test data migration
   - Verify cloud sync

5. **Document changes**
   - Update this documentation
   - Add JSDoc comments
   - Create migration guides

---

## 🔍 Troubleshooting

### Debug Panel

The stats system includes an integrated debug panel accessible throughout the application. To use it:

1. **Enable Debug Mode**: Click the yellow "🐛 Debug" button in the bottom-right corner
2. **View Stats**: The panel displays key metrics including streak, activities, and accuracy
3. **Export Data**: Click "📥 Export Debug Data" to download a JSON file with:
   - Current stats with all fields
   - Recent activities (last 100 events)
   - Environment information
   - Error states and loading status
   - Stats version information
4. **Admin Access**: Quick link to the admin panel for advanced management
5. **Reset Stats**: Clear all stats data (use with caution - this cannot be undone)

The debug panel automatically shows error states and provides real-time updates as activities are tracked.

### Common Issues

#### 1. Stats Not Updating

```typescript
// Debug stats updates
const { stats, trackActivity } = useStats();

// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('Current stats:', stats);
  console.log('Stats version:', stats.version);
  console.log('Last updated:', new Date(stats.lastUpdated));
}

// Force refresh
await refreshStats();
```

#### 2. Streak Calculation Issues

```typescript
// Use the admin recovery tool
// Navigate to /admin and use Stats Recovery

// Or programmatically:
import { statsTracker } from '@/lib/stats/statsTracker';

// Reset and rebuild
await statsTracker.resetStats();
await statsTracker.initialize(user, isPremium);
```

#### 3. Cloud Sync Problems

```typescript
// Check sync status
const lastSync = localStorage.getItem('lastStatsSync');
console.log('Last sync:', lastSync);

// Force sync
await forceSync();

// Verify Firebase permissions
// Check Firebase console for permission errors
```

### Debug Mode

Enable verbose debug logging programmatically:

```typescript
// Enable verbose logging
localStorage.setItem('STATS_DEBUG', 'true');
localStorage.setItem('STATS_VERBOSE', 'true');

// The stats system will now log detailed information
// Check browser console for [StatsTracker] messages
```

---

## ⚡ Performance Considerations

### Optimization Strategies

1. **Batched Updates**
   - Activities are queued and processed in batches
   - UI updates are debounced to prevent excessive renders

2. **Selective Sync**
   - Only sync changed data
   - Use timestamps to track modifications
   - Implement delta sync for large datasets

3. **Memory Management**
   - Limit in-memory activity cache
   - Use IndexedDB for historical data
   - Implement LRU eviction for old activities

4. **Query Optimization**
   ```typescript
   // Bad: Loading all activities
   const allActivities = await loadAllActivities();
   
   // Good: Load only what's needed
   const recentActivities = await loadActivitiesRange(
     startDate,
     endDate,
     limit
   );
   ```

### Performance Metrics

Monitor these metrics in production:

- Stats calculation time: < 50ms
- UI update latency: < 100ms
- Sync completion: < 2 seconds
- Memory usage: < 10MB

---

## 🔄 Migration Guide

### Migrating from Stats v1

1. **Backup existing data**
   ```typescript
   const oldStats = localStorage.getItem('doshi_sensei_user_stats');
   const backup = JSON.parse(oldStats);
   ```

2. **Run migration script**
   ```typescript
   import { migrateStatsV1ToV2 } from '@/lib/stats/migration';
   
   await migrateStatsV1ToV2(backup);
   ```

3. **Verify data integrity**
   - Check streak calculations
   - Verify activity counts
   - Confirm accuracy metrics

4. **Clean up old data**
   ```typescript
   localStorage.removeItem('doshi_sensei_user_stats');
   localStorage.removeItem('doshi_sensei_drill_sessions');
   ```

### Database Schema Updates

When updating the schema:

1. Increment DB version in `indexedDB.ts`
2. Add migration logic in `initializeDB`
3. Test upgrade path thoroughly
4. Document schema changes

### Firebase Rules

The stats system requires specific Firestore rules for cloud sync:

```javascript
match /userStats/{userId} {
  // Users can read their own stats
  allow read: if request.auth != null &&
    (isAdmin() || request.auth.uid == userId);

  // Users can create/update with validation
  allow create: if request.auth != null &&
    request.auth.uid == userId;
    
  allow update: if request.auth != null &&
    request.auth.uid == userId &&
    request.resource.data.keys().hasAll(['version', 'userId', 'lastUpdated']) &&
    request.resource.data.version == '2.0' &&
    request.resource.data.userId == userId &&
    request.resource.data.lastUpdated is timestamp;

  // Daily activities subcollection
  match /dailyActivities/{date} {
    allow read, write: if request.auth != null &&
      request.auth.uid == userId;
  }
}

---

## 📝 Conclusion

The Doshi Sensei Stats System provides a robust foundation for tracking user progress and engagement. By following the patterns and practices outlined in this documentation, developers can easily extend the system with new metrics, visualizations, and insights.

### Key Takeaways

- **Event-driven**: All tracking flows through consistent events
- **Type-safe**: Full TypeScript support prevents errors
- **Extensible**: Easy to add new metrics and features
- **Performant**: Optimized for real-time updates
- **Reliable**: Local-first with cloud backup

### Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [React Performance](https://react.dev/learn/render-and-commit)

---

*Last Updated: January 2025*
*Version: 2.0*