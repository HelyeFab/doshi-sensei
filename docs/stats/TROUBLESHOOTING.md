# 🔧 Stats System Troubleshooting Guide

## Common Issues & Solutions

### 1. Stats Not Showing / Always Zero

**Symptoms:**
- All stats show as 0
- Streak doesn't update
- Activities aren't tracked

**Solutions:**

```typescript
// 1. Check if stats are initializing
const { stats, loading, error } = useStats();
console.log({ stats, loading, error });

// 2. Verify user is logged in
const { profile } = useUserProfile();
console.log('User profile:', profile);

// 3. Check IndexedDB
// In browser DevTools > Application > IndexedDB > DoshiSenseiDB
// Look for statsV2 and dailyActivities stores

// 4. Force re-initialization
await statsTracker.initialize(profile, isPremium);
```

### 2. Streak Not Calculating Correctly

**Problem:** User has been active for 30+ days but streak shows 0 or wrong number

**Solution:** Use the Admin Recovery Tool

1. Navigate to `/admin`
2. Scroll to "Stats Recovery Tool" section
3. Click "Recover Stats" button
4. Check the recovery log for issues

**Manual Fix:**
```typescript
// In browser console
const { statsTracker } = await import('/src/lib/stats/statsTracker');
await statsTracker.resetStats();
// Then use the app normally - stats will rebuild
```

### 3. Stats Not Syncing to Cloud (Premium Users)

**Symptoms:**
- Stats different on different devices
- Stats reset after logout/login

**Debug Steps:**

```typescript
// 1. Check premium status
const { subscription } = useSubscription2();
console.log('Premium?', subscription?.status === 'active');

// 2. Force sync
const { forceSync } = useStats();
await forceSync();

// 3. Check Firebase permissions
// Firebase Console > Firestore > Rules
// Ensure userStats collection allows read/write for authenticated users
```

**Firebase Rules Fix:**
```javascript
match /userStats/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 4. Activities Not Being Tracked

**Problem:** Completing drills/games but stats don't update

**Debug Checklist:**

```typescript
// 1. Verify tracking is called
console.log('Before tracking');
await trackDrillCompleted('test', 10, 8);
console.log('After tracking');

// 2. Check for errors
try {
  await trackDrillCompleted('test', 10, 8);
} catch (error) {
  console.error('Tracking error:', error);
}

// 3. Enable debug logging
localStorage.setItem('STATS_DEBUG', 'true');
// Reload page and check console
```

### 5. Performance Issues

**Symptoms:**
- App feels slow after adding stats
- Page freezes when loading stats

**Solutions:**

```typescript
// 1. Check activity count
const activities = await statsTracker.getRecentActivities();
console.log('Activity count:', activities.length);

// 2. Clear old data (keeps last 90 days)
await statsTracker.cleanupOldActivities();

// 3. Disable real-time updates temporarily
const unsubscribe = statsTracker.subscribe(() => {});
// Do heavy operations
unsubscribe(); // Re-enable updates
```

### 6. Database Errors

**Error:** "Failed to execute 'put' on 'IDBObjectStore'"

**Fix:**
```typescript
// Clear and rebuild database
if (confirm('Reset stats database? This will clear local stats.')) {
  const deleteDB = window.indexedDB.deleteDatabase('DoshiSenseiDB');
  deleteDB.onsuccess = () => {
    console.log('Database deleted');
    window.location.reload();
  };
}
```

### 7. Date/Time Issues

**Problem:** Activities showing wrong dates or future dates

**Fix:**
```typescript
// Check system time
console.log('System time:', new Date().toISOString());
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Stats use YYYY-MM-DD format in local timezone
const today = new Date().toISOString().split('T')[0];
console.log('Today in stats:', today);
```

---

## Debug Mode

### Enable Comprehensive Logging

```typescript
// In browser console
localStorage.setItem('STATS_DEBUG', 'true');
localStorage.setItem('STATS_VERBOSE', 'true');

// Reload page
window.location.reload();
```

### Stats Inspector Tool

```typescript
// Paste in console to inspect current stats state
(async () => {
  const { statsTracker } = await import('/src/lib/stats/statsTracker');
  const stats = statsTracker.getStats();
  
  console.group('📊 Stats Inspector');
  console.log('Current Stats:', stats);
  console.log('Streak:', stats.currentStreak, 'days');
  console.log('Last Active:', stats.lastActiveDate);
  console.log('Total Activities:', stats.totalActivities);
  console.log('Accuracy:', stats.overallAccuracy + '%');
  
  console.group('Recent Activities');
  const activities = await statsTracker.getRecentActivities();
  activities.forEach(day => {
    console.log(`${day.date}: ${day.summary.totalActivities} activities`);
  });
  console.groupEnd();
  
  console.groupEnd();
})();
```

---

## Error Reference

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot read property 'uid' of null" | User not logged in | Check auth state before tracking |
| "QuotaExceededError" | IndexedDB full | Clear old data or increase quota |
| "NetworkError" | Firebase offline | Enable offline persistence |
| "Permission denied" | Firebase rules | Update security rules |
| "Version mismatch" | Old stats format | Run migration tool |

---

## Recovery Scripts

### 1. Complete Stats Reset
```typescript
// Nuclear option - clears everything
await statsTracker.resetStats();
localStorage.removeItem('lastStatsSync');
window.location.reload();
```

### 2. Rebuild from Firebase
```typescript
// For premium users - rebuild from cloud
const { profile } = useUserProfile();
await statsTracker.rebuildFromCloud(profile.uid);
```

### 3. Export Stats for Backup
```typescript
const stats = statsTracker.getStats();
const backup = {
  stats,
  exported: new Date().toISOString(),
  version: '2.0'
};
console.log('Backup:', JSON.stringify(backup, null, 2));
// Copy from console and save
```

---

## Contact Support

If none of these solutions work:

1. Export your stats (see script above)
2. Take screenshot of browser console errors
3. Note your subscription type and user ID
4. Create issue at: https://github.com/doshi-sensei/issues

Include:
- Browser and version
- Error messages
- Steps to reproduce
- Stats backup JSON