# Admin Analytics System Design

## Overview

This document outlines the admin-only analytics system for Doshi Sensei that provides aggregated insights into user behavior while maintaining the three-pillar architecture and respecting user privacy.

## Core Principles

1. **Parallel to Three-Pillar System**: Analytics runs separately from the user stats system
2. **Privacy First**: No personally identifiable information for guests
3. **Aggregated Data**: Focus on patterns, not individual actions
4. **Admin Only**: Data visible only through admin dashboard
5. **Cost Effective**: Daily aggregation to minimize Firebase operations

## Architecture

```
User Activity
    ↓
Analytics Events (Client-side)
    ↓
Analytics Tracker (Separate from StatsTracker)
    ↓
Local Aggregation (In-memory batching)
    ↓
Firebase Analytics Collections (Daily sync)
    ↓
Admin Dashboard Views
```

## Data Collection Strategy

### Guest Users
- **No persistent identifiers**
- Track only: Country/region (from IP), device type, screen size
- Session-based counting (resets on page reload)
- Fully anonymous aggregation

### Free & Premium Users
- **User ID included** for better insights
- All guest metrics plus user-specific patterns
- Ability to segment by user type
- Historical trend analysis

## Metrics to Track

### 1. Content Engagement
```typescript
interface ContentMetrics {
  // Articles
  articlesViewed: number;
  articlesCompleted: number;  // Scrolled to 100%
  avgArticleReadTime: number; // In seconds
  articlesByCategory: Record<string, number>;
  
  // Stories
  storiesStarted: number;
  storiesCompleted: number;
  avgStoryReadTime: number;
  storiesByLevel: Record<string, number>;
  
  // Moodboards
  moodboardsViewed: number;
  avgMoodboardViewTime: number;
}
```

### 2. Feature Usage
```typescript
interface FeatureMetrics {
  // Games
  gamesPlayed: Record<string, number>; // By game type
  gameCompletionRate: Record<string, number>;
  avgGameScore: Record<string, number>;
  
  // Drills
  drillsStarted: number;
  drillsCompleted: number;
  drillAccuracy: number; // Percentage
  drillsByType: Record<string, number>;
  
  // Flashcards
  flashcardSessions: number;
  flashcardsReviewed: number;
  flashcardAccuracy: number;
  
  // Study Lists
  listsCreated: number;
  listsUsed: number;
  itemsAddedToLists: number;
}
```

### 3. User Behavior
```typescript
interface BehaviorMetrics {
  // Navigation
  pageViews: Record<string, number>; // By page
  featureDiscovery: Record<string, number>; // First-time feature clicks
  
  // Engagement
  sessionDuration: number; // Average in minutes
  bounceRate: number; // Left within 30 seconds
  returnRate: number; // Came back next day
  
  // Technical
  deviceTypes: Record<string, number>; // mobile/tablet/desktop
  screenSizes: Record<string, number>; // small/medium/large
  browsers: Record<string, number>;
  errors: Record<string, number>; // By error type
}
```

### 4. Conversion Metrics
```typescript
interface ConversionMetrics {
  // Feature limits
  limitReachedEvents: Record<string, number>; // By feature
  upgradeModalShown: number;
  upgradeModalClicked: number;
  
  // User journey
  guestToFreeConversion: number;
  freeToPremuimConversion: number;
  
  // Feature adoption
  featureFirstUse: Record<string, number>;
  featureActiveUsers: Record<string, number>; // Used in last 7 days
}
```

## Firebase Structure

**IMPORTANT UPDATE**: The structure has been simplified for better performance. All daily metrics are now in a single aggregated document:

```
/site-analytics/{date}/
├── daily/
│   └── aggregated/  # Single document with ALL metrics
│       ├── summary: { totalEvents, guestEvents, freeUserEvents, premiumUserEvents }
│       ├── content: { /* all content metrics */ }
│       ├── features: { /* all feature metrics */ }
│       ├── behavior: { /* all behavior metrics */ }
│       ├── conversions: { /* all conversion metrics */ }
│       └── lastUpdated: timestamp
│
└── aggregated/
    ├── weekly/{weekStartDate}/  # (Future: Last 7 days aggregate)
    ├── monthly/{month}/         # (Future: Last 30 days aggregate)
    └── yearly/{year}/          # (Future: Annual summary)
```

### 🔍 How to View Analytics in Firebase Console

1. **Open Firebase Console**:
   ```
   https://console.firebase.google.com/project/doshi-sensei/firestore/data/~2Fsite-analytics
   ```

2. **Navigate to Today's Data**:
   - Click `site-analytics` collection
   - Click today's date (e.g., `2025-01-20`)
   - Click `daily` subcollection
   - Click `aggregated` document

3. **Understanding the Data**:
   - All metrics use Firebase increment operations
   - Numbers only increase throughout the day
   - New document created each day at midnight
   - Data is aggregated in real-time as events occur

4. **Example Data Path**:
   ```
   Firestore Database
   └── site-analytics
       └── 2025-01-20              # Today's date
           └── daily
               └── aggregated      # Click here to see all metrics
                   ├── behavior
                   │   ├── devices.mobile: 45
                   │   ├── pageViews./news: 120
                   │   └── regions.asia: 30
                   ├── content
                   │   ├── articles.viewed.technology: 25
                   │   └── stories.completed.N5: 10
                   ├── conversions
                   │   ├── registrations.total: 5
                   │   └── upgradeModals.shown: 15
                   ├── features
                   │   ├── games.completed.kanji_quest: 20
                   │   └── drills.totalCorrect: 150
                   ├── summary
                   │   ├── freeUserEvents: 200
                   │   ├── guestEvents: 500
                   │   ├── premiumUserEvents: 100
                   │   └── totalEvents: 800
                   └── lastUpdated: January 20, 2025 at 3:45:00 PM UTC
   ```

## Implementation Plan

### Phase 1: Core Analytics Tracker
1. Create `AnalyticsTracker` class (separate from StatsTracker)
2. Implement event batching system
3. Add geographic detection (using timezone/locale, not IP tracking)
4. Set up Firebase collections

### Phase 2: Event Integration
1. Add analytics hooks to all trackable activities
2. Implement completion tracking for content
3. Add error tracking
4. Set up conversion funnel tracking

### Phase 3: Admin Dashboard
1. Create analytics section in admin dashboard
2. Build data visualization components
3. Add date range selectors
4. Implement export functionality

### Phase 4: Optimization
1. Add data retention policies
2. Implement automatic aggregation
3. Optimize Firebase queries
4. Add caching layer

## Privacy & Compliance

### Data Minimization
- Collect only what's needed for insights
- No personal information from guests
- No tracking cookies for guests
- Clear data retention policies

### User Transparency
- Analytics runs parallel to user stats
- No impact on user features
- Guest data is fully anonymous
- Registered users can request their data

### Security
- Admin-only access via Firebase rules
- No client-side access to analytics data
- Encrypted data transmission
- Regular security audits

## Best Practices

### 1. Event Batching
```typescript
// Batch events every 5 minutes or 50 events
const BATCH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 50;
```

### 2. Data Retention
- **Raw events**: Not stored (aggregated immediately)
- **Daily data**: Keep for 90 days
- **Weekly aggregates**: Keep for 1 year
- **Monthly aggregates**: Keep for 3 years
- **Yearly summaries**: Keep indefinitely

### 3. Geographic Data
- Use browser timezone/locale APIs
- Group by region (Americas, Europe, Asia, etc.)
- No precise location tracking
- Respect user privacy settings

### 4. Performance
- Debounce rapid events (e.g., scrolling)
- Use requestIdleCallback for non-critical tracking
- Minimal impact on user experience
- Progressive enhancement approach

## Analytics Events Reference

### Content Events
```typescript
// Article viewing and completion
analytics.track('article_view', { 
  category: 'news',
  articleId: 'article-123'
});

analytics.track('article_complete', { 
  category: 'news',
  readTime: 180, // in seconds
  articleId: 'article-123'
});

// Story viewing and completion
analytics.track('story_view', { 
  level: 'stories.N5',
  storyId: 'story-123'
});

analytics.track('story_complete', { 
  level: 'stories.N5',
  readTime: 300, // in seconds
  storyId: 'story-123'
});

// Moodboard viewing
analytics.track('moodboard_view', { 
  boardId: 'board-123'
});

// Kanji viewing
analytics.track('kanji_viewed', {
  kanji: '食',
  jlptLevel: 'N5',
  source: 'kanji_browser' // or 'moodboard'
});
```

### Feature Events
```typescript
// Game completion tracking
analytics.track('game_complete', { 
  game: 'kanji_quest', // kanji_quest, kana_drop, matching_game, sentence_scramble, kanji_simon, reading_routes
  score: 1500,
  accuracy: 85 
});

// Drill completion tracking
analytics.track('drill_complete', { 
  type: 'conjugation', // conjugation, vocabulary, etc.
  correct: 18,
  total: 20 
});

// Word search tracking
analytics.track('word_search', {
  searchTerm: 'たべる',
  resultsCount: 5,
  source: 'vocabulary' // vocabulary, conjugation_practice
});

// Study list creation
analytics.track('list_created', {
  listType: 'flashcard', // flashcard, drillable, sentence
  listName: 'JLPT N5 Verbs',
  hasDescription: true
});

// Flashcard sessions
analytics.track('flashcard_session_started', {
  mode: 'review',
  selectedLists: 2,
  flipDirection: 'japanese_to_english',
  cardOrder: 'random'
});

analytics.track('flashcard_session_completed', {
  reviewed: 20,
  correct: 18,
  accuracy: 90,
  mode: 'review'
});

// Feature limit tracking
analytics.track('feature_limit_reached', { 
  feature: 'articles_read',
  usage: 3,
  limit: 3
});
```

### Conversion Events
```typescript
// Upgrade flow
analytics.track('upgrade_modal_shown', { 
  trigger: 'feature_limit',
  feature: 'games' 
});

analytics.track('upgrade_plan_selected', {
  plan: 'monthly', // monthly or yearly
  feature: 'games'
});

analytics.track('upgrade_modal_dismissed', {
  feature: 'games'
});

// Registration/Login flow
analytics.track('login_modal_shown', {
  feature: 'vocabulary'
});

analytics.track('registration_started', {
  method: 'google',
  feature: 'vocabulary'
});

analytics.track('registration_completed', {
  method: 'google',
  feature: 'vocabulary'
});

analytics.track('login_modal_dismissed', {
  feature: 'vocabulary'
});
```

## Admin Dashboard Views

### 1. Overview Dashboard
- Daily active users graph
- Top content by engagement
- Feature usage heatmap
- Conversion funnel visualization

### 2. Content Analytics
- Most read articles/stories
- Completion rates by content type
- Time spent per content piece
- Content discovery patterns

### 3. Feature Analytics
- Feature adoption curves
- Usage frequency distributions
- Performance metrics by feature
- Error rates and issues

### 4. User Behavior
- User flow visualization
- Retention cohorts
- Geographic distribution
- Device/browser breakdown

### 5. Conversion Analytics
- Limit reached to upgrade rate
- Feature to subscription correlation
- User journey mapping
- Revenue attribution

## Success Metrics

1. **Implementation Success**
   - Zero impact on user performance
   - <1% Firebase cost increase
   - 100% anonymous guest tracking
   - Complete admin visibility

2. **Business Insights**
   - Identify most engaging content
   - Understand feature adoption
   - Optimize conversion funnels
   - Improve user experience

3. **Technical Excellence**
   - Clean separation from user stats
   - Scalable architecture
   - Privacy-preserving design
   - Maintainable codebase

---

*Document created: January 2025*  
*Status: Design Phase*  
*Last Updated: January 20, 2025*