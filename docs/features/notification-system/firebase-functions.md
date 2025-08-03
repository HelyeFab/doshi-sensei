# Firebase Cloud Functions for Notifications

## Overview

The notification system uses Firebase Cloud Functions to handle scheduled notifications, ensuring reliable delivery based on user preferences and timezones.

## Deployed Functions

### 1. sendStudyReminders
**Schedule**: Every hour (0 * * * *)
**Purpose**: Send study session reminders to users at their preferred times

**Logic**:
- Queries users with study reminders enabled
- Checks each user's timezone to determine if it's time for their reminder
- Respects quiet hours settings
- Skips users who have already studied today (if smart scheduling is enabled)
- Personalizes messages with user name and streak information

### 2. sendReviewReminders
**Schedule**: Every 30 minutes (*/30 * * * *)
**Purpose**: Notify users when they have items due for spaced repetition review

**Logic**:
- Finds users with review reminders enabled
- Checks for items due for review in the user's review queue
- Ensures no duplicate reminders within 4 hours
- Includes count of items due in the notification

### 3. sendStreakReminders
**Schedule**: Daily at 8:00 PM UTC (0 20 * * *)
**Purpose**: Prevent users from breaking their study streaks

**Logic**:
- Runs at the user's configured reminder time (converted to their timezone)
- Only sends to users who haven't studied today
- Only sends if user has an active streak to maintain
- Includes current streak count in the message

### 4. cleanupNotificationLogs
**Schedule**: Weekly on Sunday at midnight (0 0 * * 0)
**Purpose**: Clean up old notification logs to manage storage

**Logic**:
- Deletes notification logs older than 30 days
- Processes in batches of 500 to avoid timeouts
- Maintains recent logs for analytics

### 5. sendTestNotification
**Schedule**: Manual trigger only
**Purpose**: Admin tool for testing notification delivery

**Logic**:
- Can be triggered from Firebase Console or admin dashboard
- Requires userId parameter
- Sends a test notification to verify system functionality

## Deployment

### Prerequisites
1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Authenticated with Firebase (`firebase login`)
3. Environment variables configured

### Deploy All Notification Functions
```bash
cd functions
./deploy-notifications.sh
```

### Deploy Individual Function
```bash
firebase deploy --only functions:sendStudyReminders
```

### Environment Variables Required
```bash
# In Firebase Functions config
firebase functions:config:set \
  stripe.secret_key="your_stripe_secret" \
  stripe.webhook_secret="your_webhook_secret"
```

## Monitoring

### View Logs
```bash
firebase functions:log --only sendStudyReminders
```

### Firebase Console
Monitor function execution at:
https://console.firebase.google.com/project/doshi-sensei/functions

### Key Metrics to Monitor
- Execution count
- Error rate
- Average execution time
- Memory usage

## Error Handling

### Token Management
- Invalid FCM tokens are automatically removed
- Failed sends are logged for debugging
- Retry logic for transient failures

### Timezone Handling
- All times converted to user's local timezone
- Handles daylight saving time transitions
- Fallback to UTC if timezone invalid

### Rate Limiting
- Functions respect FCM rate limits
- Batch processing to avoid quota exhaustion
- Exponential backoff for retries

## Database Structure

### Collections Used

#### notificationPreferences
```typescript
{
  userId: string;
  enabled: boolean;
  fcmToken: string;
  timezone: string;
  preferences: {
    studyReminders: { enabled: boolean; times: string[]; smartScheduling: boolean; };
    reviewReminders: { enabled: boolean; advanceNotice: number; };
    streakReminders: { enabled: boolean; time: string; };
  };
  quietHours: { enabled: boolean; start: string; end: string; };
}
```

#### notificationLogs
```typescript
{
  userId: string;
  type: string;
  sentAt: Timestamp;
  status: 'sent' | 'failed' | 'clicked';
  title?: string;
  error?: string;
  clickedAt?: Timestamp;
}
```

#### userStats
```typescript
{
  userId: string;
  lastActiveDate: Timestamp;
  currentStreak: number;
  hasStudiedToday: boolean;
}
```

## Testing

### Local Testing
```bash
# Run functions locally
npm run serve

# Test with Firebase emulators
firebase emulators:start --only functions,firestore
```

### Production Testing
1. Use admin dashboard to send test notifications
2. Monitor logs for execution
3. Verify notification delivery
4. Check analytics dashboard

## Troubleshooting

### Common Issues

#### Notifications Not Sending
1. Check user has valid FCM token
2. Verify notification preferences enabled
3. Check timezone settings
4. Review function logs for errors

#### Wrong Timing
1. Verify user timezone is correct
2. Check for daylight saving time issues
3. Ensure function schedule is correct

#### High Error Rate
1. Check for invalid FCM tokens
2. Monitor Firebase quotas
3. Review error logs for patterns

### Debug Commands
```bash
# View recent function executions
firebase functions:log --limit 50

# Check function configuration
firebase functions:config:get

# Test function locally
npm run shell
> sendStudyReminders({})
```

## Best Practices

### Performance
- Query only necessary fields
- Use compound indexes for complex queries
- Batch operations when possible
- Implement proper error handling

### Security
- Validate all input data
- Use Firebase Security Rules
- Never log sensitive information
- Rotate secrets regularly

### User Experience
- Respect user preferences
- Handle timezones correctly
- Provide meaningful error messages
- Track delivery metrics

## Future Enhancements

### Planned Features
1. A/B testing for notification content
2. Machine learning for optimal send times
3. Rich media notifications
4. Interactive notification actions
5. Multi-language support

### Performance Optimizations
1. Implement caching for user preferences
2. Use Cloud Tasks for better scaling
3. Optimize database queries
4. Implement request batching