# 🔔 Doshi Sensei Notification System

## Overview

The Doshi Sensei notification system is a production-ready implementation designed to enhance user engagement and learning outcomes through timely, intelligent reminders. Built on Firebase Cloud Messaging (FCM) and following Google/Microsoft production standards.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Notification Types](#notification-types)
3. [Technical Implementation](#technical-implementation)
4. [User Experience](#user-experience)
5. [Privacy & Compliance](#privacy--compliance)
6. [Three-Pillar Integration](#three-pillar-integration)
7. [Development Guide](#development-guide)
8. [Testing Strategy](#testing-strategy)
9. [Monitoring & Analytics](#monitoring--analytics)

## Architecture Overview

### Technology Stack
- **Push Service**: Firebase Cloud Messaging (FCM)
- **Backend**: Firebase Cloud Functions
- **Scheduler**: Firebase Cloud Scheduler
- **Database**: Firestore
- **Frontend**: Service Worker + Web Push API

### Key Components
1. **Notification Service** - Core notification logic
2. **Scheduler Service** - Manages notification timing
3. **Preference Manager** - User settings and timezone handling
4. **Analytics Tracker** - Engagement metrics
5. **Service Worker** - Push notification handler

## Notification Types

### 1. Study Session Reminder
- **Purpose**: Remind users to start their daily study session
- **Default Times**: 9:00 AM and 7:00 PM (user's local time)
- **Smart Features**:
  - Adapts to user's typical study times
  - Respects quiet hours (10 PM - 7 AM)
  - Skips if already studied today

### 2. Review Session Reminder
- **Purpose**: Prompt spaced repetition reviews
- **Timing**: Based on SRS algorithm
- **Content**: Number of items due for review
- **Priority**: High (time-sensitive for retention)

### 3. Streak Maintenance
- **Purpose**: Prevent streak breaks
- **Timing**: 8:00 PM if no activity detected
- **Content**: Encouraging message with current streak
- **Frequency**: Max once per day

## Technical Implementation

### Firebase Cloud Messaging Setup
```javascript
// FCM Configuration
const fcmConfig = {
  vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
  messagingSenderId: process.env.NEXT_PUBLIC_FCM_SENDER_ID,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};
```

### Notification Preferences Schema
```typescript
interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  fcmToken: string;
  timezone: string; // IANA timezone (e.g., "Asia/Tokyo")
  preferences: {
    studyReminders: {
      enabled: boolean;
      times: string[]; // ["09:00", "19:00"]
      smartScheduling: boolean;
    };
    reviewReminders: {
      enabled: boolean;
      advanceNotice: number; // minutes before due
    };
    streakReminders: {
      enabled: boolean;
      time: string; // "20:00"
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "07:00"
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Service Worker Integration
```javascript
// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/doshi.png',
    badge: '/badge-72x72.png',
    tag: data.tag,
    data: data.data,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

## User Experience

### Opt-in Flow
1. **Account Creation**: Soft prompt after email verification
2. **Permission Request**: Clear value proposition before browser prompt
3. **Customization**: Immediate access to preference settings
4. **Fallback**: Email reminders if push denied

### Notification Content Guidelines
- **Concise**: Max 50 characters for title, 100 for body
- **Actionable**: Clear CTA (e.g., "Start 5-minute review")
- **Personalized**: Include user name and progress
- **Encouraging**: Positive reinforcement, no guilt

### Example Notifications
```
Title: "Good morning, Takeshi-san! 🌅"
Body: "Ready for today's Japanese practice? You're on a 7-day streak!"
Action: "Start Practice"

Title: "15 items ready for review 📚"
Body: "Quick 5-minute session to maintain your progress"
Action: "Review Now"

Title: "Keep your 14-day streak alive! 🔥"
Body: "Just 5 minutes to maintain your amazing progress"
Action: "Quick Practice"
```

## Privacy & Compliance

### Data Collection
- Minimal data: Only timezone and preferences
- No tracking without consent
- FCM tokens encrypted at rest
- Auto-cleanup of inactive tokens

### GDPR Compliance
- Explicit consent required
- Easy opt-out mechanism
- Data deletion on account removal
- No third-party sharing

### Security Measures
- HTTPS-only communication
- Token rotation every 30 days
- Rate limiting on notification APIs
- Audit logging for all sends

## Three-Pillar Integration

Following the SUPERPOWERS-V-III architecture:

### Feature Registration
```typescript
// In feature registry
'push_notifications': {
  id: 'push_notifications',
  name: 'Push Notifications',
  description: 'Receive study and review reminders',
  category: 'system',
  icon: '🔔',
  limitType: 'none', // No usage limits
  requiresAuth: true, // Only for registered users
  requiresSubscription: false,
  status: 'active'
}
```

### Access Control
- **Guest Users**: No access (requiresAuth: true)
- **Free Users**: Full access to all notification types
- **Premium Users**: Same as free (no additional features)

### Integration with Features
For detailed guidance on integrating notifications with new or existing features, see the **[Notifications Integration section in SUPERPOWERS-V-III.md](/docs/SUPERPOWERS-V-III.md#notifications-integration)**. This includes:
- Feature-specific notification patterns
- Scheduled notifications via Firebase Functions
- Usage-based notifications and alerts
- Achievement and milestone notifications
- Complete code examples and best practices

## Development Guide

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key
NEXT_PUBLIC_FCM_SENDER_ID=your_sender_id
FCM_SERVER_KEY=your_server_key
```

### Key Files
- `/src/services/notifications/` - Core notification logic
- `/src/app/api/notifications/` - API endpoints
- `/functions/notifications/` - Cloud Functions
- `/src/components/NotificationPermission.tsx` - UI components

### Testing Locally
1. Use FCM test messages
2. Chrome DevTools push testing
3. Timezone simulation
4. Rate limit testing

## Testing Strategy

### Unit Tests
- Preference validation
- Timezone calculations
- Message formatting
- Rate limiting logic

### Integration Tests
- FCM token management
- Database operations
- Cloud Function triggers
- Service worker updates

### E2E Tests
- Permission flow
- Preference updates
- Notification delivery
- Click tracking

### Test Results & Coverage
For detailed test results and coverage reports, see **[TEST_RESULTS.md](./TEST_RESULTS.md)**. Current status:
- **Core Service Tests**: 22/22 passing (95%+ coverage)
- **Component Tests**: Comprehensive UI testing
- **API Tests**: Full endpoint coverage
- **Mocking Strategy**: Complete Firebase and browser API mocks

## Monitoring & Analytics

### Key Metrics
- **Opt-in Rate**: % of users enabling notifications
- **Delivery Rate**: Successful deliveries / attempts
- **Click Rate**: Notification interactions
- **Churn**: Users disabling notifications
- **Timing Effectiveness**: Study sessions started within 30min

### Dashboards
- Firebase Console for FCM metrics
- Custom admin dashboard for engagement
- Error tracking with Sentry
- A/B testing framework ready

## Best Practices

### Do's ✅
- Respect user preferences
- Handle timezones correctly
- Batch notifications when possible
- Provide immediate value
- Test across devices/browsers

### Don'ts ❌
- Send during quiet hours
- Spam users
- Use manipulative language
- Track without consent
- Ignore unsubscribes

## Firebase Cloud Functions

The notification system uses Firebase Cloud Functions for reliable scheduled delivery. See **[firebase-functions.md](./firebase-functions.md)** for detailed documentation.

### Deployed Functions
- **sendStudyReminders** - Hourly check for study reminder times
- **sendReviewReminders** - Every 30 minutes for due reviews
- **sendStreakReminders** - Daily streak maintenance alerts
- **cleanupNotificationLogs** - Weekly log cleanup
- **sendTestNotification** - Manual testing function

### Deployment
```bash
cd functions
./deploy-notifications.sh
```

## Admin Dashboard

### Notification Analytics Page
Access at `/admin/notifications` to monitor:

#### Key Metrics
- Total notifications sent/clicked/failed
- Click-through rate
- Opt-in rate
- User preference distribution

#### Visualizations
- Delivery status pie chart
- Daily trend line graph
- Hourly distribution bar chart
- Notification type breakdown

#### Features
- Real-time analytics with time range filtering
- Recent notification logs table
- Test notification sender
- User preference insights

#### Admin API Endpoints
- `POST /api/notifications/admin-test` - Send test notification to any user

## Future Enhancements

### Phase 2
- Rich notifications with images
- Quick actions (e.g., "Snooze 1 hour")
- Weekly progress summaries
- Friend activity notifications

### Phase 3
- AI-powered optimal timing
- Voice notifications
- Wearable device support
- Notification templates

---

Last Updated: January 2025
Version: 1.0
Status: Production Ready