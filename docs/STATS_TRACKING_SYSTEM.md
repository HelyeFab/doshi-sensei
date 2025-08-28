# Doshi Sensei Stats Tracking System Documentation

## Overview

Doshi Sensei features a comprehensive stats tracking system that monitors user progress across all learning activities. The system provides real-time analytics, achievement tracking, and personalized insights to help users improve their Japanese learning journey.

## Table of Contents

- [Architecture](#architecture)
- [Core Components](#core-components)
- [Activity Types](#activity-types)
- [Storage Strategy](#storage-strategy)
- [Implementation Guide](#implementation-guide)
- [API Reference](#api-reference)
- [Reading Analytics](#reading-analytics)
- [Achievement System](#achievement-system)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  (Components using useStats hook)                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    useStats Hook                         │
│  (React hook for reactive stats)                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 StatsTracker Singleton                   │
│  (Core tracking logic and state management)              │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬──────────────┐
         │                       │              │
┌────────▼────────┐   ┌─────────▼──────┐   ┌──▼──────────┐
│   IndexedDB     │   │   Firestore     │   │  Memory     │
│  (Free Users)   │   │ (Premium Users) │   │  (Guests)   │
└─────────────────┘   └─────────────────┘   └─────────────┘
```

### Data Flow

1. **User Action** → Component calls tracking function
2. **Track Event** → StatsTracker processes and validates
3. **Update State** → Local state updated immediately
4. **Persist Data** → Saved to appropriate storage
5. **Sync Cloud** → Premium users get cloud backup
6. **UI Update** → Components re-render with new stats

## Core Components

### StatsTracker (`/src/lib/stats/statsTracker.ts`)

The singleton class that manages all statistics tracking:

```typescript
class StatsTracker {
  // Singleton instance
  static getInstance(): StatsTracker
  
  // Initialize with user context
  async initialize(user: User | null, subscription?: Subscription)
  
  // Track an activity
  async trackActivity(type: ActivityType, details: ActivityDetails)
  
  // Get current stats
  getStats(): UserStatsV2
  
  // Subscribe to updates
  subscribe(listener: StatsUpdateListener): () => void
}
```

### useStats Hook (`/src/hooks/useStats.ts`)

React hook for consuming stats in components:

```typescript
const {
  stats,        // Current user statistics
  activities,   // Daily/weekly/monthly activities
  loading,      // Loading state
  error,        // Error state
  trackActivity, // Function to track new activity
  forceSync,    // Force cloud sync (premium)
  refreshStats  // Manually refresh stats
} = useStats();
```

## Activity Types

### Supported Activity Types

| Type | Description | Tracked Data |
|------|-------------|--------------|
| `article` | News articles read | ID, title, duration |
| `story` | Stories completed | ID, title, JLPT level |
| `drill` | Practice drills | Questions, accuracy |
| `kanji` | Kanji studied | Character, accuracy |
| `game` | Games played | Type, score, accuracy |
| `vocab` | Vocabulary learned | Word, study type |
| `flashcard` | Flashcards reviewed | Card ID, correct/incorrect |
| `practice` | Practice sessions | Type, duration |

### Tracking Functions

Located in `/src/lib/stats/trackingEvents.ts`:

```typescript
// Track article reading
trackArticleRead(articleId, title, duration)

// Track story completion
trackStoryRead(storyId, title, duration)

// Track drill completion
trackDrillCompleted(userId, questions, correct, type)

// Track kanji study
trackKanjiStudy(character, correct, sessionType)

// Track game session
trackGamePlayed(gameType, score, questions, correct)

// Track vocabulary
trackVocabStudied(wordId, word, studyType)

// Track flashcard review
trackFlashcardReviewed(userId, cardId, correct)
```

## Storage Strategy

### Three-Tier Storage System

#### 1. Guest Users (No Authentication)
- **Storage**: In-memory only
- **Persistence**: None (lost on refresh)
- **Features**: Basic tracking for session
- **Use Case**: Try before signup

#### 2. Free Users (Authenticated)
- **Storage**: IndexedDB
- **Persistence**: Local browser storage
- **Features**: Full tracking, local persistence
- **Limitations**: No cross-device sync

#### 3. Premium Users (Paid Subscription)
- **Storage**: IndexedDB + Firestore
- **Persistence**: Local + Cloud
- **Features**: Full tracking, cross-device sync
- **Benefits**: Data backup, multi-device access

### Data Schema

#### UserStatsV2 Structure

```typescript
interface UserStatsV2 {
  // User identification
  userId: string;
  
  // Streak tracking
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string;
  firstActiveDate: string;
  
  // Activity counts
  totalActivities: number;
  articlesRead: number;
  storiesRead: number;
  drillsCompleted: number;
  kanjiStudySessions: number;
  gamesPlayed: number;
  vocabStudied: number;
  flashcardsReviewed: number;
  practiceSessionsCompleted: number;
  
  // Performance metrics
  overallAccuracy: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalKanjiLearned: number;
  totalWordsLearned: number;
  totalGameScore: number;
  
  // Unique items tracking
  learnedKanjiSet: string[];
  learnedWordsSet: string[];
  caughtPokemonSet: string[];
  
  // Metadata
  lastUpdated: number;
  version: string;
}
```

#### Daily Activity Structure

```typescript
interface DailyActivity {
  date: string; // YYYY-MM-DD format
  activities: ActivityEvent[];
  summary: {
    totalActivities: number;
    articlesRead: number;
    storiesRead: number;
    // ... other activity counts
    totalScore: number;
    totalCorrect: number;
    totalQuestions: number;
  };
}
```

### Firestore Collections

```
/userStats/{userId}/current/
├── summary/          # Streaks and totals
├── activities/       # Activity counts
├── performance/      # Accuracy metrics
└── metadata/         # Version and timestamps

/userStats/{userId}/dailyActivities/{date}
└── {daily activity data}
```

## Implementation Guide

### Basic Usage

#### 1. Track an Article Read

```typescript
import { trackArticleRead } from '@/lib/stats/trackingEvents';

// In your article component
const handleArticleComplete = async () => {
  const readingTime = calculateReadingTime(); // in minutes
  await trackArticleRead(article.id, article.title, readingTime);
};
```

#### 2. Display User Stats

```typescript
import { useStats } from '@/hooks/useStats';

export function StatsDisplay() {
  const { stats, loading } = useStats();
  
  if (loading) return <div>Loading stats...</div>;
  
  return (
    <div>
      <p>Articles Read: {stats.articlesRead}</p>
      <p>Current Streak: {stats.currentStreak} days</p>
      <p>Accuracy: {stats.overallAccuracy}%</p>
    </div>
  );
}
```

#### 3. Subscribe to Stats Updates

```typescript
import { useEffect } from 'react';
import { statsTracker } from '@/lib/stats/statsTracker';

useEffect(() => {
  const unsubscribe = statsTracker.subscribe((newStats) => {
    console.log('Stats updated:', newStats);
    // Update UI or trigger animations
  });
  
  return unsubscribe;
}, []);
```

## Reading Analytics

### Reading Session Tracking

The system includes advanced reading analytics (`/src/utils/readingAnalytics.ts`):

#### Features
- **Reading speed calculation** (WPM)
- **Comprehension scoring**
- **Vocabulary tracking**
- **Scroll progress monitoring**
- **Pause detection**
- **Re-read section tracking**

#### Usage

```typescript
import { ReadingAnalyticsManager } from '@/utils/readingAnalytics';

// Start a reading session
const session = ReadingAnalyticsManager.startReadingSession(
  articleId,
  userId
);

// Update progress
ReadingAnalyticsManager.updateReadingSession(session.id, {
  scrollProgress: 0.5, // 50% scrolled
  vocabularyEncountered: ['新しい', '言葉'],
  pauseCount: 2
});

// Complete session
ReadingAnalyticsManager.completeReadingSession(
  session.id,
  comprehensionScore // 0-100
);
```

### Personalized Recommendations

```typescript
// Get reading recommendations
const analytics = ReadingAnalyticsManager.getReadingAnalytics(userId);
const recommendations = ReadingAnalyticsManager.getPersonalizedRecommendations(
  analytics,
  availableArticles
);
```

## Achievement System

### Reading Milestones

Track and celebrate user achievements:

```typescript
const readingAchievements = {
  firstArticle: { 
    threshold: 1, 
    badge: '📰', 
    title: 'First Steps' 
  },
  bookworm: { 
    threshold: 10, 
    badge: '📚', 
    title: 'Bookworm' 
  },
  speedReader: { 
    threshold: 50, 
    badge: '🚀', 
    title: 'Speed Reader' 
  },
  scholar: { 
    threshold: 100, 
    badge: '🎓', 
    title: 'Scholar' 
  }
};
```

### Checking Achievements

```typescript
function checkReadingAchievements(stats: UserStatsV2) {
  const totalReads = stats.articlesRead + stats.storiesRead;
  
  return Object.entries(readingAchievements)
    .filter(([key, achievement]) => totalReads >= achievement.threshold)
    .map(([key, achievement]) => achievement);
}
```

## Best Practices

### 1. Always Track Completion

```typescript
// Good: Track when user actually completes
if (scrolledToEnd && timeSpent > minimumTime) {
  await trackArticleRead(id, title, timeSpent);
}

// Bad: Track on page load
useEffect(() => {
  trackArticleRead(id, title, 0); // Don't do this!
}, []);
```

### 2. Handle Errors Gracefully

```typescript
try {
  await trackActivity('article', details);
} catch (error) {
  console.error('Failed to track activity:', error);
  // Don't break the user experience
}
```

### 3. Batch Updates When Possible

```typescript
// Good: Track once at the end
const sessionResults = {
  correct: correctAnswers,
  total: totalQuestions,
  duration: totalTime
};
await trackDrillCompleted(userId, ...sessionResults);

// Avoid: Multiple tracking calls
for (const question of questions) {
  await trackActivity('drill', question); // Too many calls!
}
```

### 4. Use Appropriate Activity Types

```typescript
// Good: Specific activity types
trackArticleRead() // for news articles
trackStoryRead()   // for stories

// Bad: Generic tracking
trackActivity('content', { type: 'article' }) // Too vague
```

## Reading Goals System

### Setting Goals

```typescript
interface ReadingGoal {
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  activityType: 'articles' | 'stories' | 'both';
  startDate: Date;
  endDate: Date;
}

// Example: Weekly reading goal
const weeklyGoal: ReadingGoal = {
  type: 'weekly',
  target: 5,
  activityType: 'articles',
  startDate: startOfWeek,
  endDate: endOfWeek
};
```

### Tracking Progress

```typescript
function calculateGoalProgress(goal: ReadingGoal, stats: UserStatsV2): number {
  const current = goal.activityType === 'articles' 
    ? stats.articlesRead
    : goal.activityType === 'stories'
    ? stats.storiesRead
    : stats.articlesRead + stats.storiesRead;
    
  return (current / goal.target) * 100;
}
```

## Troubleshooting

### Common Issues

#### Stats Not Updating

**Problem**: Stats don't update after completing an activity

**Solutions**:
1. Check if tracking is disabled in debug config
2. Verify user authentication state
3. Check browser console for errors
4. Clear IndexedDB and reload

```typescript
// Check if stats tracking is enabled
import { isSystemEnabled } from '@/config/debug';

if (!isSystemEnabled('stats')) {
  console.warn('Stats tracking is disabled');
}
```

#### Sync Issues (Premium Users)

**Problem**: Stats not syncing across devices

**Solutions**:
1. Verify premium subscription status
2. Check network connectivity
3. Force sync manually

```typescript
const { forceSync } = useStats();
await forceSync(); // Manual sync for premium users
```

#### Lost Stats After Logout

**Problem**: Stats disappear when user logs out

**Solution**: This is expected behavior. Stats are user-scoped:
- Guest stats are temporary
- Free user stats are stored locally
- Premium stats sync from cloud on login

### Debug Commands

Available in browser console:

```javascript
// Get current stats
const stats = statsTracker.getStats();
console.log(stats);

// Recalculate streak
await statsTracker.recalculateStreak();

// Force refresh from cloud (premium only)
await statsTracker.forceReloadFromCloud();

// Check recent activities
const activities = await statsTracker.getRecentActivities(10);
console.table(activities);

// Reset stats (debugging only!)
await statsTracker.resetStats();
```

## Performance Considerations

### Optimization Strategies

1. **Debounced Updates**: Stats sync to cloud every 30 seconds max
2. **Batch Processing**: Activities are processed in batches
3. **Local-First**: UI updates immediately from local state
4. **Lazy Loading**: Historical data loaded on demand
5. **Efficient Storage**: Only last 90 days kept in active memory

### Memory Management

```typescript
// Activities are pruned automatically
const MAX_DAYS_IN_MEMORY = 30;
const MAX_ACTIVITIES_PER_DAY = 1000;
```

## Future Enhancements

### Planned Features

1. **Export Stats**: Download stats as CSV/JSON
2. **Public Profiles**: Share achievements publicly
3. **Leaderboards**: Compete with other learners
4. **Custom Goals**: User-defined achievement targets
5. **Analytics Dashboard**: Detailed insights and trends
6. **Mobile App Sync**: Native app integration
7. **API Access**: Developer API for stats

### Integration Points

The stats system can be extended with:
- Webhook notifications for milestones
- Email reports for weekly progress
- Social media sharing for achievements
- Third-party analytics platforms
- Learning management system (LMS) integration

## Conclusion

The Doshi Sensei stats tracking system provides comprehensive analytics for Japanese learning progress. With support for multiple user tiers, real-time updates, and cross-device synchronization, it helps learners stay motivated and track their improvement over time.

For additional support or feature requests, please refer to the project's GitHub issues or contact the development team.