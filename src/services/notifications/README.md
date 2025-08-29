# Review Notification System

A comprehensive notification aggregation system for the Unified Review Hub that combines notifications from all review sources into intelligent, unified messages.

## Architecture

### Core Components

1. **ReviewNotificationAggregator** - Main aggregation service
2. **NotificationService** - Firebase/push notification integration  
3. **useReviewNotificationAggregator** - React hook for UI integration
4. **spacedRepetitionNotifications** - Legacy individual notifications (being phased out)

### Key Features

- ✅ **Unified Notifications**: Single notification instead of per-source spam
- ✅ **Golden Time Integration**: Special notifications during optimal learning windows
- ✅ **Smart Scheduling**: Respects user preferences and quiet hours
- ✅ **Source Aggregation**: Combines due items from all review sources
- ✅ **Red Panda Ready**: Architecture ready for mascot system integration
- ✅ **React Integration**: Custom hooks for easy component integration

## Files Overview

```
src/services/notifications/
├── ReviewNotificationAggregator.ts    # Main aggregation service
├── NotificationService.ts              # Firebase integration
├── spacedRepetitionNotifications.ts   # Legacy system (deprecated)
├── example-usage.md                    # Usage examples
├── README.md                          # This file
└── __tests__/
    └── ReviewNotificationAggregator.test.ts

src/hooks/
├── useReviewNotifications.ts          # Basic notification preferences
└── useReviewNotificationAggregator.ts # Aggregation system integration
```

## Quick Start

### 1. Initialize in App

```typescript
// In your main app initialization (layout.tsx or similar)
import { ReviewSourceRegistry } from '@/lib/review-sources/registry';
import { NotificationService } from '@/services/notifications/NotificationService';
import { initializeReviewNotifications } from '@/services/notifications/ReviewNotificationAggregator';

async function initializeApp() {
  const registry = ReviewSourceRegistry.getInstance();
  const notificationService = NotificationService.getInstance();
  
  // Initialize notification aggregation
  await initializeReviewNotifications(registry, notificationService);
}
```

### 2. Use in Components

```typescript
// In Review Hub or other components
import { useReviewNotificationAggregator } from '@/hooks/useReviewNotificationAggregator';

function ReviewHub() {
  const { 
    status, 
    isGoldenTime, 
    dueItemsSummary, 
    triggerCheck,
    enableNotifications 
  } = useReviewNotificationAggregator();

  const handleEnableNotifications = async () => {
    await enableNotifications();
  };

  const handleManualCheck = async () => {
    await triggerCheck();
  };

  return (
    <div>
      {isGoldenTime && (
        <div className="golden-time-banner">
          🌅 Golden Time! Perfect for learning!
        </div>
      )}
      
      {dueItemsSummary && (
        <div>
          <p>{dueItemsSummary.totalDue} items due for review</p>
          <button onClick={handleManualCheck}>
            Check for Updates
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3. Enable for Users

```typescript
import { enableReviewNotifications } from '@/services/notifications/ReviewNotificationAggregator';

// When user enables notifications
await enableReviewNotifications(currentUser.uid);
```

## Notification Examples

### Basic Aggregated Notification
```
📚 23 Items Ready for Review!
You have: 12 Textbook Vocab, 8 Kanji, 3 Flashcards. Keep your streak alive! 🔥
```

### Golden Time Notification  
```
🌅 Golden Time! 15 Items Ready!
Perfect timing for peak learning! 🧠✨
```

### Overdue Items
```
⏰ 18 Items Due (5 overdue)
You have: 10 Textbook Vocab, 8 Kanji. Keep your streak alive! 🔥
```

## Configuration

### Golden Time Windows
- **Morning**: 8:00 AM - 10:00 AM
- **Evening**: 7:00 PM - 9:00 PM
- **Bonus Multiplier**: 1.2x effectiveness

### Notification Triggers
- New items become due (threshold: 5+ new items)
- Overdue items increase
- Golden time windows open
- Manual user trigger
- Minimum 30 minutes between notifications

### User Preferences Integration
Respects existing NotificationService preferences:
- Quiet hours (default: 10 PM - 7 AM)
- Preferred notification times
- Push vs in-app notifications
- Review reminder settings

## Testing

```bash
# Run the test suite
npm test ReviewNotificationAggregator

# Manual testing in browser console
reviewNotificationAggregator.triggerNotificationCheck();
reviewNotificationAggregator.getNotificationStatus();
```

## Integration with Review Sources

The aggregator automatically connects to all registered review sources:
- **Textbook Vocabulary** - `/tools/textbook-vocabulary`
- **Kanji Mastery** - `/tools/kanji-mastery` 
- **Flashcards** - `/drill/flashcards`
- **Grammar Drills** - `/drill/grammar`
- **Custom Lists** - `/vocabulary`

When sources update their items or statistics, the aggregator receives events and can trigger notifications as needed.

## Red Panda Mascot Integration

The system is architected to easily integrate with the Red Panda mascot system:

```typescript
// Future integration example
if (goldenTimeInfo.isActive && userHasRedPanda) {
  payload.body += " Akira the Red Panda is here to help! 🐾";
  payload.icon = "/red-panda-mascot.png";
}
```

## Performance Considerations

- **Debounced Updates**: Registry events are debounced by 1 second
- **Cached Results**: Aggregation results are cached to avoid repeated calculations  
- **Efficient Queries**: Only queries sources with due items
- **Memory Management**: Automatic cleanup of scheduled notifications

## Migration Strategy

1. **Phase 1**: Install alongside existing notifications ✅
2. **Phase 2**: Gradually disable individual source notifications
3. **Phase 3**: Full migration to unified system
4. **Phase 4**: Remove legacy notification code

## Troubleshooting

### Common Issues

1. **Notifications not appearing**: Check browser permissions and quiet hours
2. **Wrong item counts**: Verify review sources are properly initialized
3. **Golden time not working**: Check system time and TIME_CONSTANTS configuration

### Debug Information

```typescript
// Get debug information
const status = reviewNotificationAggregator.getNotificationStatus();
console.log('Aggregator status:', status);

// Manual check
await reviewNotificationAggregator.triggerNotificationCheck();
```

### Event Monitoring

```typescript
// Listen for notification events
window.addEventListener('app-notification', (event) => {
  console.log('Notification sent:', event.detail);
});
```

## Future Enhancements

- [ ] **Email Notifications**: Server-side email integration
- [ ] **SMS Support**: Text message notifications for critical reviews
- [ ] **Advanced Scheduling**: ML-based optimal timing
- [ ] **Streak Integration**: Achievement-based notifications  
- [ ] **Social Features**: Study buddy notifications
- [ ] **Analytics Dashboard**: Notification effectiveness tracking

## Contributing

When adding new notification features:

1. Follow the established patterns in `ReviewNotificationAggregator.ts`
2. Add comprehensive tests in `__tests__/`
3. Update this README with new features
4. Ensure React hooks are updated for new functionality
5. Test with multiple review sources and user scenarios