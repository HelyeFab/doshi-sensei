# 🐼 RedPanda Review System - MVP Specification

## Executive Summary

RedPanda is a smart spaced repetition system that allows users to mark any content (kanji, words, stories) for long-term review through a simple long-press gesture. The system follows a scientifically-backed review schedule with adaptive learning algorithms, full integration with existing systems, and premium-only access.

**Version**: 1.0  
**Status**: MVP Specification  
**Target Users**: Premium subscribers only  
**Core Philosophy**: "Never forget what you've learned"

---

## 🎯 Core Features

### 1. Content Marking System

#### Activation
- **Universal Trigger**: Long-press gesture on any supported content type
- **Visual Feedback**: RedPanda icon (🐼) animation on activation
- **Haptic Feedback**: Vibration on mobile devices
- **Confirmation**: Quick toast notification "Added to RedPanda reviews"

#### Supported Content Types
```typescript
type RedPandaItem = {
  id: string;
  type: 'kanji' | 'word' | 'story' | 'hiragana' | 'katakana';
  content: string; // The actual character/word/title
  originalLink: string; // Deep link to original content
  contextPath: string; // Where it was added from
  addedAt: Date;
  nextReviewDate: Date;
  reviewCount: number;
  currentInterval: number;
  isLearned: boolean;
  streakCount: number;
  successRate: number; // For adaptive scheduling
  difficulty: number; // 1-5 scale for adaptive intervals
};
```

### 2. Review Schedule

#### Fixed Base Intervals
- Day 0: Initial learning
- Day 2: First review
- Day 3: Second review  
- Day 5: Third review
- Day 8: Fourth review
- Day 13: Fifth review
- Day 21: Sixth review
- Day 46: Seventh review
- Monthly thereafter until marked learned or deleted

#### Adaptive Modifications
```typescript
// Adaptive interval calculation based on performance
function calculateNextInterval(baseInterval: number, item: RedPandaItem): number {
  const difficultyModifier = 1 + (item.difficulty - 3) * 0.2; // ±40% max
  const successModifier = item.successRate > 0.8 ? 1.2 : 
                         item.successRate < 0.5 ? 0.8 : 1.0;
  
  return Math.round(baseInterval * difficultyModifier * successModifier);
}
```

### 3. Homepage Integration

#### Review System Card Enhancement
```typescript
// Modify existing Review System card
<ReviewSystemCard>
  {/* Existing review items */}
  
  {/* RedPanda Section */}
  {redPandaItemsDue > 0 && (
    <div className="mt-4 p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐼</span>
          <div>
            <h4 className="font-semibold text-gray-900">
              RedPanda Reviews
            </h4>
            <p className="text-sm text-gray-600">
              {redPandaItemsDue} items due today
            </p>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
      </div>
      
      {/* Scrollable list preview */}
      <ScrollableItemList items={todaysDueItems} />
    </div>
  )}
</ReviewSystemCard>
```

### 4. Review Interface

#### Single-Item Flashcard View
```typescript
interface ReviewSession {
  currentItem: RedPandaItem;
  sessionItems: RedPandaItem[];
  currentIndex: number;
  
  // Actions
  markAsLearned(): void;
  markAsEasy(): void; // Increase interval multiplier
  markAsHard(): void; // Decrease interval multiplier  
  skipForToday(): void;
  deleteItem(): void;
  showOriginal(): void; // Navigate to source
}
```

#### Display Templates
```typescript
// Minimal display for review focus
const displayTemplates = {
  kanji: (item) => ({
    main: item.content, // Just the kanji character
    size: 'text-8xl'
  }),
  word: (item) => ({
    main: item.content, // Just kanji or kana
    size: 'text-6xl'
  }),
  story: (item) => ({
    main: item.content, // Just the title
    size: 'text-2xl'
  })
};
```

### 5. Notification System

#### Daily Review Reminders
```typescript
interface RedPandaNotification {
  type: 'redpanda_review';
  schedule: {
    time: string; // User configurable, default "09:00"
    timezone: string; // User's timezone
  };
  content: {
    title: `🐼 ${itemCount} RedPanda reviews waiting`;
    body: 'Keep your streak alive!';
    url: '/test-panda';
  };
  conditions: {
    minItems: 1;
    respectQuietHours: true;
    stackWithOthers: false; // Always separate notification
  };
}
```

### 6. Progress Tracking

#### Visual Indicators
```typescript
interface ItemProgressIndicators {
  streakIcon: '🔥' | null; // Show if reviewed consistently
  masteryLevel: {
    icon: '🌱' | '🌿' | '🌳'; // Growing based on reviews
    progress: number; // 0-100%
  };
  difficultyBadge: '⚠️' | null; // Show if struggling
}
```

#### Achievements System
```typescript
const redPandaAchievements = {
  firstMark: { id: 'rp_first', name: 'RedPanda Recruit', icon: '🐼' },
  streak7: { id: 'rp_week', name: 'Week Warrior', icon: '🗓️' },
  streak30: { id: 'rp_month', name: 'Monthly Master', icon: '📅' },
  items100: { id: 'rp_100', name: 'Century Club', icon: '💯' },
  learned50: { id: 'rp_graduate', name: 'Graduate', icon: '🎓' },
  perfect10: { id: 'rp_perfect', name: 'Perfect Ten', icon: '⭐' }
};
```

---

## 💾 Data Architecture

### IndexedDB Schema
```typescript
// New store: redPandaItems
interface RedPandaStore {
  name: 'redPandaItems';
  keyPath: 'id';
  indexes: [
    { name: 'byNextReview', keyPath: 'nextReviewDate' },
    { name: 'byType', keyPath: 'type' },
    { name: 'byAddedAt', keyPath: 'addedAt' },
    { name: 'byIsLearned', keyPath: 'isLearned' }
  ];
}

// New store: redPandaStats
interface RedPandaStats {
  userId: string;
  totalItems: number;
  learnedItems: number;
  currentStreak: number;
  longestStreak: number;
  lastReviewDate: Date;
  achievements: string[];
}
```

### Firestore Collections
```typescript
// /users/{userId}/redPandaItems/{itemId}
interface FirestoreRedPandaItem extends RedPandaItem {
  userId: string;
  deviceId?: string; // For sync conflict resolution
  lastModified: Timestamp;
  syncVersion: number;
}

// /users/{userId}/redPandaStats/summary
interface FirestoreRedPandaStats extends RedPandaStats {
  dailyReviewCounts: Map<string, number>; // Date string -> count
  syncedAt: Timestamp;
}
```

---

## 🏗️ Component Architecture

### File Structure
```
/src/
├── components/
│   ├── red-panda/
│   │   ├── RedPandaProvider.tsx
│   │   ├── RedPandaModal.tsx
│   │   ├── RedPandaReviewSession.tsx
│   │   ├── RedPandaItemList.tsx
│   │   ├── RedPandaStats.tsx
│   │   └── RedPandaLongPress.tsx
│   └── RedPandaStudyModal.tsx
├── hooks/
│   ├── useRedPanda.ts
│   ├── useRedPandaReview.ts
│   └── useRedPandaStats.ts
├── services/
│   └── redPanda/
│       ├── RedPandaService.ts
│       ├── RedPandaSyncService.ts
│       └── RedPandaScheduler.ts
├── contexts/
│   └── RedPandaContext.tsx
└── app/
    └── test-panda/
        └── page.tsx
```

### Core Components

#### RedPandaProvider
```typescript
export function RedPandaProvider({ children }: { children: ReactNode }) {
  const { user, subscription } = useAuth();
  const [items, setItems] = useState<RedPandaItem[]>([]);
  const [stats, setStats] = useState<RedPandaStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Only available for premium users
  const isEnabled = subscription?.plan === 'monthly' || 
                   subscription?.plan === 'yearly';

  // Core functions
  const addItem = async (item: Omit<RedPandaItem, 'id' | 'nextReviewDate'>) => {
    // Implementation
  };

  const reviewItem = async (itemId: string, result: ReviewResult) => {
    // Update intervals, stats, etc.
  };

  // ... rest of implementation
}
```

#### RedPandaLongPress (HOC)
```typescript
export function withRedPanda<T extends { content: string; type: string }>(
  Component: React.ComponentType<T>
) {
  return function RedPandaEnabled(props: T) {
    const { addToRedPanda } = useRedPanda();
    const [isLongPressing, setIsLongPressing] = useState(false);
    
    const handleLongPress = useCallback(() => {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      
      // Add to RedPanda
      addToRedPanda({
        type: props.type,
        content: props.content,
        originalLink: window.location.href
      });
      
      // Visual feedback
      setIsLongPressing(true);
      setTimeout(() => setIsLongPressing(false), 500);
    }, [props]);

    return (
      <div 
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        className={isLongPressing ? 'animate-pulse' : ''}
      >
        <Component {...props} />
        {isLongPressing && <RedPandaAnimation />}
      </div>
    );
  };
}
```

---

## 🔌 Integration Points

### 1. Notification Integration
```typescript
// Add to existing notification scheduler
export const sendRedPandaReminders = onSchedule('0 9 * * *', async () => {
  const users = await getUsersWithRedPandaItems();
  
  for (const user of users) {
    const dueItems = await getDueItems(user.id);
    
    if (dueItems.length > 0) {
      await sendNotification(user.fcmToken, {
        title: `🐼 ${dueItems.length} RedPanda reviews waiting`,
        body: `Keep your ${user.currentStreak}-day streak alive!`,
        data: {
          type: 'redpanda_review',
          url: '/test-panda',
          count: dueItems.length.toString()
        }
      });
    }
  }
});
```

### 2. Stats Tracking Integration
```typescript
// Track as study activity
await trackActivity('redpanda_review', {
  itemId: item.id,
  itemType: item.type,
  result: reviewResult,
  timeSpent: sessionDuration,
  streakMaintained: true
});
```

### 3. Three-Pillar Architecture
```typescript
// Register as premium feature
FEATURE_REGISTRY['red_panda'] = {
  id: 'red_panda',
  name: 'RedPanda Review System',
  description: 'Smart spaced repetition for long-term retention',
  category: 'learning',
  icon: '🐼',
  limitType: 'none', // No limits for premium feature
  requiresAuth: true,
  requiresSubscription: true,
  status: 'active'
};
```

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. Create IndexedDB and Firestore schemas
2. Implement RedPandaService with basic CRUD
3. Set up RedPandaProvider and context
4. Create long-press HOC
5. Basic add/remove functionality

### Phase 2: Review System (Week 2)
1. Implement review scheduling algorithm
2. Create review session component
3. Build flashcard interface
4. Add progress tracking
5. Implement adaptive intervals

### Phase 3: Integration (Week 3)
1. Integrate with Review System card
2. Add notification scheduling
3. Connect to stats tracking
4. Implement cross-device sync
5. Add to feature registry

### Phase 4: Polish & Testing (Week 4)
1. Add achievements system
2. Implement visual indicators
3. Performance optimization
4. Accessibility features
5. Comprehensive testing

---

## 🎨 UI/UX Specifications

### Visual Design
- **Primary Color**: Orange (#FFA500) - RedPanda theme
- **Icon**: 🐼 used consistently throughout
- **Animations**: Subtle pulse on long-press, slide transitions
- **Feedback**: Haptic on mobile, visual on desktop

### Accessibility
- **Keyboard Shortcuts**: 
  - `Ctrl/Cmd + R`: Quick add to RedPanda
  - `Space`: Reveal answer in review
  - `1-4`: Rate difficulty
- **Screen Reader**: Full ARIA labels
- **High Contrast**: Support theme system

### Performance
- **Virtual Scrolling**: For lists > 50 items
- **Lazy Loading**: Load items in batches of 20
- **Optimistic Updates**: Immediate UI response
- **Background Sync**: Non-blocking sync operations

---

## 📊 Success Metrics

### Key Performance Indicators
- **Adoption Rate**: % of premium users using RedPanda
- **Retention Rate**: Items reviewed vs abandoned
- **Streak Maintenance**: Average streak length
- **Learning Success**: % items marked as learned
- **Engagement**: Daily active RedPanda users

### Analytics Events
```typescript
const redPandaAnalytics = {
  'redpanda_item_added': { item_type, source },
  'redpanda_review_started': { items_due, streak },
  'redpanda_review_completed': { items_reviewed, time_spent },
  'redpanda_item_learned': { total_reviews, days_to_learn },
  'redpanda_streak_achieved': { streak_length },
  'redpanda_achievement_unlocked': { achievement_id }
};
```

---

## 🔒 Security & Privacy

### Data Protection
- All data encrypted at rest
- User-scoped access only
- No sharing between users
- Secure sync protocols

### Privacy Considerations
- No tracking without consent
- Local-first approach
- Optional cloud sync
- Data deletion on request

---

## 📝 Testing Requirements

### Unit Tests
- Scheduling algorithm accuracy
- Adaptive interval calculations
- State management logic
- Sync conflict resolution

### Integration Tests
- Long-press activation
- Review session flow
- Notification triggering
- Stats tracking

### E2E Tests
- Complete user journey
- Cross-device sync
- Notification delivery
- Achievement unlocking

---

## 🚦 Launch Checklist

### Pre-Launch
- [ ] Database migrations ready
- [ ] Feature flag configured
- [ ] Premium gate implemented
- [ ] Notifications tested
- [ ] Performance benchmarked

### Launch Day
- [ ] Enable for 10% premium users
- [ ] Monitor error rates
- [ ] Check sync performance
- [ ] Verify notifications

### Post-Launch
- [ ] Gather user feedback
- [ ] Analyze usage patterns
- [ ] Optimize based on data
- [ ] Plan v2 features

---

## 🎯 Success Criteria

### Technical
- Review scheduling accuracy > 99%
- Sync success rate > 95%
- Page load time < 500ms
- Notification delivery > 90%

### User Experience
- User satisfaction > 4.5/5
- Daily active usage > 60%
- Streak maintenance > 40%
- Feature retention > 70%

---

## 📚 Dependencies

### External Libraries
- `date-fns` - Date calculations
- `framer-motion` - Animations
- `react-intersection-observer` - Virtualization
- `workbox` - Offline support

### Internal Systems
- Authentication system
- Notification service
- Stats tracker
- Feature registry
- Review system

---

## 🤝 Team Responsibilities

### Frontend Team
- Component implementation
- UI/UX polish
- Accessibility
- Performance optimization

### Backend Team
- Firebase functions
- Sync service
- Notification scheduling
- Analytics pipeline

### QA Team
- Test plan execution
- Bug tracking
- Performance testing
- User acceptance testing

---

*Document Version: 1.0*  
*Created: January 2025*  
*Status: Ready for Implementation*  
*Owner: Development Team*