# Notification System Testing Guide

## Test Page

Navigate to `/test-notifications` to access the notification testing interface.

## Testing Steps

### 1. Enable Notifications
1. Open the test page at `http://localhost:3003/test-notifications`
2. Click "Enable Notifications" button
3. Accept the browser permission prompt
4. Verify the permission status changes to "granted"

### 2. Test Different Notification Types
Once notifications are enabled:
1. Click "Study Reminder" - Should show a morning greeting notification
2. Click "Review Reminder" - Should show items ready for review
3. Click "Streak Reminder" - Should show streak maintenance reminder

### 3. Test Preferences
1. Toggle different notification types on/off
2. Select different reminder times for study reminders
3. Click "Send Test Notification" to verify preferences

### 4. Verify Service Worker
1. Open Chrome DevTools > Application > Service Workers
2. Verify the service worker is active
3. Check "Push" and "Notification" permissions are granted

### 5. Test Background Notifications
1. Minimize or switch away from the browser tab
2. Send a test notification
3. Verify the notification appears in your system notification center

## Troubleshooting

### Notifications Not Appearing
1. Check browser notification settings
2. Ensure the site is served over HTTPS (or localhost)
3. Check console for errors
4. Verify FCM token is being generated

### Permission Denied
1. Reset site permissions in browser settings
2. Clear browser cache and cookies
3. Try in an incognito window

### Service Worker Issues
1. Unregister existing service workers
2. Clear browser cache
3. Hard refresh the page (Ctrl+Shift+R)

## API Testing

### Test notification endpoint
```bash
# First, get your auth token from the browser
# Then test the endpoint:
curl -X POST http://localhost:3003/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"type": "study_reminder"}'
```

## Production Testing

1. Deploy to a staging environment
2. Test with real devices (mobile and desktop)
3. Verify notifications work across different browsers
4. Test with users in different timezones
5. Monitor notification delivery rates in Firebase Console