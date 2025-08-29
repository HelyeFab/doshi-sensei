# Review Notification Aggregator - Usage Guide

## Overview

The `ReviewNotificationAggregator` combines all review notifications from different sources into a single, unified notification system for the Review Hub. Instead of users getting separate notifications from Kanji Mastery, Textbook Vocabulary, and Flashcards, they get one comprehensive notification.

## Features

- **Unified Notifications**: Aggregates due items from all review sources
- **Golden Time Integration**: Special notifications during optimal learning windows (8-10 AM, 7-9 PM)
- **Smart Scheduling**: Respects user preferences, quiet hours, and notification frequency
- **Red Panda Integration**: Ready for mascot system integration
- **Motivation**: Encouraging messages to maintain study streaks

## Basic Integration

```typescript
import { ReviewSourceRegistry } from '@/lib/review-sources/registry';
import { NotificationService } from '@/services/notifications/NotificationService';
import { 
  reviewNotificationAggregator,
  initializeReviewNotifications,
  enableReviewNotifications 
} from '@/services/notifications/ReviewNotificationAggregator';

// In your app initialization (e.g., layout.tsx or main context)
async function initializeApp() {
  const registry = ReviewSourceRegistry.getInstance();
  const notificationService = NotificationService.getInstance();
  
  // Initialize the aggregator
  await initializeReviewNotifications(registry, notificationService);
  
  // Enable for current user (when user enables notifications)
  await enableReviewNotifications(currentUser.uid);
}
```

## Notification Examples

### Basic Notification
```
Title: "📚 23 Items Ready for Review!"
Body: "You have: 12 Textbook Vocab, 8 Kanji, 3 Flashcards. Keep your streak alive! 🔥"
```

### Golden Time Notification
```
Title: "🌅 Golden Time! 15 Items Ready!"
Body: "Perfect timing for peak learning! 🧠✨"
```

### Overdue Items
```
Title: "⏰ 18 Items Due (5 overdue)"
Body: "You have: 10 Textbook Vocab, 8 Kanji. Keep your streak alive! 🔥"
```

## User Flow Integration

### In Review Hub (UnifiedReviewHub.tsx)
```typescript
import { reviewNotificationAggregator } from '@/services/notifications/ReviewNotificationAggregator';

// In useEffect after registry initialization
useEffect(() => {
  if (registry && user?.uid) {
    // Check if we should show an immediate notification
    reviewNotificationAggregator.triggerNotificationCheck(user.uid);
  }
}, [registry, user?.uid]);
```

### In Settings Page
```typescript
// Enable/disable review notifications
const handleNotificationToggle = async (enabled: boolean) => {
  if (enabled) {
    await enableReviewNotifications(user.uid);
  } else {
    await disableReviewNotifications(user.uid);
  }
};
```

### Testing Notifications
```typescript
// Test the aggregation system
const handleTestNotification = async () => {
  await reviewNotificationAggregator.triggerNotificationCheck();
};
```

## Configuration

### Default Schedule
- Checks at user's preferred times (default: 9 AM, 7 PM)
- Respects quiet hours (default: 10 PM - 7 AM)
- Minimum 30 minutes between notifications
- Golden time bonus notifications

### Notification Triggers
- New items become due
- Overdue items increase
- Golden time windows open
- Manual user trigger

## Red Panda Integration (Future)

The system is ready for Red Panda mascot integration:

```typescript
// In notification message building
if (goldenTimeInfo.isActive && hasRedPandaMascot) {
  body += "Akira the Red Panda is here to help! 🐾";
}
```

## Data Flow

1. **Review sources** → Update items/stats
2. **Registry** → Fires events (ITEMS_UPDATED, STATS_UPDATED)
3. **Aggregator** → Receives events, aggregates data
4. **Decision logic** → Should we notify?
5. **Message builder** → Creates user-friendly message
6. **Notification service** → Sends notification
7. **User** → Receives single unified notification

## Advanced Features

### Custom Notification Messages
The system supports customizable notification formats based on:
- Source types and counts
- User study patterns
- Time of day
- Streak status
- Achievement milestones

### Analytics Integration
Track notification effectiveness:
- Click-through rates
- Study session starts from notifications
- User engagement patterns
- Optimal timing analysis

## Migration from Individual Notifications

1. **Phase 1**: Install aggregator alongside existing notifications
2. **Phase 2**: Gradually disable individual source notifications
3. **Phase 3**: Full migration to unified system
4. **Phase 4**: Remove old notification code

## Performance Considerations

- Debounced registry updates (1 second)
- Cached aggregation results
- Minimal notification frequency
- Efficient source querying
- Memory-efficient scheduling

## Error Handling

- Graceful degradation if sources fail
- Fallback to in-app notifications
- User preference validation
- Registry connection monitoring
- Automatic retry mechanisms