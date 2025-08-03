# Notification System Quick Reference

## 🚀 Quick Start

### 1. Enable Notifications for a User
```typescript
// In your component
import NotificationPermission from '@/components/notifications/NotificationPermission';

// Show permission prompt
<NotificationPermission />
```

### 2. Send a Test Notification
```bash
# Using curl
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type": "study_reminder"}'
```

### 3. Check User's Notification Status
```typescript
const checkNotificationStatus = async (userId: string) => {
  const prefs = await db
    .collection('notificationPreferences')
    .doc(userId)
    .get();
  
  return prefs.data()?.enabled || false;
};
```

## 📊 Three-Pillar Integration

### Feature Registration
```typescript
// Already added to /src/lib/features/registry.ts
'push_notifications': {
  id: 'push_notifications',
  name: 'Push Notifications',
  description: 'Receive study and review reminders',
  category: 'system',
  icon: '🔔',
  limitType: 'none',
  requiresAuth: true,
  requiresSubscription: false,
  status: 'active'
}
```

### Usage Tracking
```typescript
// Notification sends are tracked automatically
// No need for checkAndTrack() for notifications
```

## 🔧 Common Tasks

### Update User Preferences
```typescript
await db.collection('notificationPreferences').doc(userId).update({
  'studyReminders.times': ['09:00', '19:00'],
  'studyReminders.enabled': true
});
```

### Disable Notifications for a User
```typescript
await db.collection('notificationPreferences').doc(userId).update({
  enabled: false
});
```

### Check Notification Logs
```typescript
const logs = await db
  .collection('notificationLogs')
  .where('userId', '==', userId)
  .orderBy('sentAt', 'desc')
  .limit(10)
  .get();
```

### Clean Up Invalid Tokens
```typescript
// Run periodically
const invalidTokens = await db
  .collection('notificationTokens')
  .where('lastUsed', '<', thirtyDaysAgo)
  .get();

const batch = db.batch();
invalidTokens.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
```

## 📱 Notification Templates

### Study Reminder
```javascript
{
  title: "Good morning, {name}-san! 🌅",
  body: "Ready for today's Japanese practice?",
  data: { type: 'study_reminder', url: '/practice' },
  actions: [
    { action: 'start-practice', title: 'Start Now' },
    { action: 'snooze', title: 'Later' }
  ]
}
```

### Review Reminder
```javascript
{
  title: "{count} items ready for review 📚",
  body: "Quick 5-minute session to reinforce your learning",
  data: { type: 'review_reminder', url: '/review' },
  actions: [
    { action: 'review-now', title: 'Review' },
    { action: 'dismiss', title: 'Not Now' }
  ]
}
```

### Streak Reminder
```javascript
{
  title: "Keep your {streak}-day streak! 🔥",
  body: "Just 5 minutes to maintain your progress",
  data: { type: 'streak_reminder', url: '/practice' },
  requireInteraction: true
}
```

## 🐛 Debugging

### Check FCM Token
```javascript
// In browser console
const messaging = getMessaging();
const token = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_KEY'
});
console.log('FCM Token:', token);
```

### Test Service Worker
```javascript
// In browser console
navigator.serviceWorker.ready.then(registration => {
  registration.showNotification('Test', {
    body: 'Service worker is working!'
  });
});
```

### View Firestore Data
```bash
# Firebase CLI
firebase firestore:get notificationPreferences/USER_ID
```

### Monitor Cloud Function Logs
```bash
# Stream logs
firebase functions:log --only scheduledStudyReminder

# View specific execution
firebase functions:log --only scheduledStudyReminder --lines=100
```

## 🚨 Common Issues

### "Permission Denied"
- Check if user is authenticated
- Verify requiresAuth in feature registry
- Ensure Firebase rules allow access

### "No FCM Token"
- Check if notifications are enabled in browser
- Verify VAPID key is correct
- Service worker must be registered

### "Notifications Not Showing"
- Check browser notification settings
- Verify quiet hours aren't active
- Check if user already studied today
- Look for errors in notification logs

### "Wrong Timezone"
- Ensure user's timezone is set correctly
- Use IANA timezone identifiers
- Test with different timezones

## 📈 Analytics Queries

### Daily Active Users (via notifications)
```sql
SELECT DATE(sentAt) as date, COUNT(DISTINCT userId) as users
FROM notificationLogs
WHERE clicked = true
GROUP BY DATE(sentAt)
ORDER BY date DESC
```

### Best Engagement Times
```sql
SELECT HOUR(sentAt) as hour, 
       COUNT(*) as sent,
       SUM(clicked) as clicked,
       (SUM(clicked) / COUNT(*)) * 100 as click_rate
FROM notificationLogs
GROUP BY HOUR(sentAt)
ORDER BY click_rate DESC
```

### Notification Type Performance
```sql
SELECT notificationType,
       COUNT(*) as sent,
       SUM(delivered) as delivered,
       SUM(clicked) as clicked,
       (SUM(clicked) / SUM(delivered)) * 100 as ctr
FROM notificationLogs
WHERE sentAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY notificationType
```

## 🔐 Security Checklist

- [ ] FCM server key is never exposed to client
- [ ] VAPID keys are in environment variables
- [ ] User can only access their own preferences
- [ ] Rate limiting on API endpoints
- [ ] Token validation before sending
- [ ] Audit logs for all notification sends
- [ ] Regular cleanup of inactive tokens
- [ ] HTTPS only for all endpoints

## 📞 Support Commands

### Reset User's Notifications
```typescript
async function resetUserNotifications(userId: string) {
  // Clear preferences
  await db.collection('notificationPreferences').doc(userId).delete();
  
  // Clear tokens
  const tokens = await db
    .collection('notificationTokens')
    .where('userId', '==', userId)
    .get();
  
  const batch = db.batch();
  tokens.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  
  console.log(`Reset notifications for user ${userId}`);
}
```

### Send Bulk Announcement
```typescript
async function sendAnnouncement(title: string, body: string) {
  const users = await db
    .collection('notificationPreferences')
    .where('enabled', '==', true)
    .get();
  
  const messages = users.docs.map(doc => ({
    token: doc.data().fcmToken,
    notification: { title, body },
    data: { type: 'announcement' }
  }));
  
  // Send in batches of 500
  const chunks = chunk(messages, 500);
  for (const chunk of chunks) {
    await admin.messaging().sendAll(chunk);
  }
}
```