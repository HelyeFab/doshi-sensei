# 🚀 SUPERPOWERS-V-III.md - The Three-Pillar Architecture Evolved

> **Critical Update: January 2025**  
> *Removing Shared Limit Groups for True Single Source of Truth*

---

## 📋 Table of Contents

1. [Critical Changes Made](#critical-changes-made)
2. [The Shared Limit Group Problem](#the-shared-limit-group-problem)
3. [Updated Three-Pillar Architecture](#updated-three-pillar-architecture)
4. [Complete Feature Implementation Checklist](#complete-feature-implementation-checklist)
5. [Admin Tools & Debugging](#admin-tools--debugging)
6. [Migration Guide](#migration-guide)

---

## 🚨 Critical Changes Made

### What We Just Fixed
We discovered a critical violation of the Single Source of Truth principle caused by **shared limit groups**. The system was showing users had "3/3" usage when Firebase showed empty usage data ({}). This was because features like `kana_study` were sharing limits with `drill_practice`.

### Changes Implemented
1. **Removed ALL `sharedLimitGroup` entries** from feature registry
2. **Created individual limits** for each feature (no more "games" group)
3. **Updated entitlement rules** to specify limits per feature
4. **Fixed permission mappings** in all three pillars
5. **Created admin dashboard** for real-time entitlement inspection

### Why This Matters
- **Clarity**: Each feature now has its own clear limit
- **Debugging**: Easy to see exactly what's being used
- **Flexibility**: Can adjust individual feature limits without affecting others
- **Truth**: Firebase data now matches what users see

---

## 🔴 The Shared Limit Group Problem

### What Went Wrong
```typescript
// OLD (PROBLEMATIC) APPROACH
'kana_study': {
  id: 'kana_study',
  limitType: 'daily',
  sharedLimitGroup: 'drill_practice' // 👈 THE PROBLEM
}

// User does 3 drills → kana_study also blocked!
// Firebase shows: { drill_practice: 3 }
// User sees: "Kana study limit reached (3/3)"
// Admin sees: Kana study 0/3 used ❌ CONFUSING!
```

### The Fix
```typescript
// NEW (CLEAN) APPROACH
'kana_study': {
  id: 'kana_study',
  limitType: 'daily'
  // No sharedLimitGroup! 
}

// Each feature tracked separately
// Firebase shows: { kana_study: 0, drill_practice: 3 }
// Truth everywhere! ✅
```

---

## 🏛️ Updated Three-Pillar Architecture

### The Three Files That Matter

#### 1. **Feature Registry** (`/src/lib/features/registry.ts`)
```typescript
export const FEATURE_REGISTRY: FeatureRegistry = {
  'kana_study': {
    id: 'kana_study',
    name: 'Kana Study',
    description: 'Study hiragana and katakana characters',
    category: 'learning',
    icon: '📖',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
    // NO sharedLimitGroup!
  },
  // ... other features
};
```

#### 2. **Entitlement Rules** (`/src/lib/entitlements/rules.ts`)
```typescript
// Free user limits
daily: {
  drill_practice: 3,
  kana_study: 3,
  // Individual game limits (no more shared "games" limit)
  kanji_quest: 3,
  kana_drop: 3,
  sentence_scramble: 3,
  memory_match: 3,
  reading_routes: 3,
  kanji_simon: 3,
  flashcard_review: 3,
  // ... other features
}
```

#### 3. **Access Permission Mapping** (`/src/lib/access/index.ts`)
```typescript
const permissionMap: Record<string, string> = {
  'drill_practice': 'do_drills',
  'kana_study': 'do_drills',
  'flashcard_review': 'do_drills',
  // All games map to 'play_games' permission
  'kanji_quest': 'play_games',
  'kana_drop': 'play_games',
  'sentence_scramble': 'play_games',
  'memory_match': 'play_games',
  'reading_routes': 'play_games',
  'kanji_simon': 'play_games',
  // ... other mappings
};
```

---

## ✅ Complete Feature Implementation Checklist

When adding a new feature to Doshi Sensei, you MUST update these locations:

### 1. Register the Feature
**File**: `/src/lib/features/registry.ts`
```typescript
'my_new_feature': {
  id: 'my_new_feature',
  name: 'My New Feature',
  description: 'What it does',
  category: 'learning', // or 'games', 'storage', 'system'
  icon: '🌟',
  limitType: 'daily', // or 'total' or 'none'
  requiresAuth: true,
  requiresSubscription: false,
  status: 'active'
  // DO NOT add sharedLimitGroup!
}
```

### 2. Set Default Limits
**File**: `/src/lib/entitlements/rules.ts`
```typescript
// For each user type, add limits:
// Guest
daily: {
  my_new_feature: 0, // or appropriate limit
}

// Free
daily: {
  my_new_feature: 3, // or appropriate limit
}

// Premium (monthly & yearly)
daily: {
  my_new_feature: -1, // -1 = unlimited
}
```

### 3. Map to Permission
**File**: `/src/lib/access/index.ts`
```typescript
const permissionMap: Record<string, string> = {
  // ... existing mappings
  'my_new_feature': 'appropriate_permission',
};
```

### 4. Add to Feature Matrix API
**File**: `/src/app/api/admin/feature-matrix/route.ts`
```typescript
const permissionMap: Record<string, string> = {
  // ... existing mappings
  'my_new_feature': 'appropriate_permission',
};
```

### 5. Use in Your Component
```typescript
export default function MyFeature() {
  const { checkAndTrack } = useAccess();
  
  const handleUse = async () => {
    // This ONE line handles EVERYTHING
    if (await checkAndTrack('my_new_feature')) {
      // User has access AND usage is tracked
      doTheWork();
    }
    // Modals shown automatically if no access
  };
}
```

### 6. Update Dynamic Rules (Post-Deployment)
1. Go to `/admin/features`
2. Click "Edit Limits"
3. Set appropriate limits for each user type
4. Changes apply immediately!

---

## 🔔 Notifications Integration

### Adding Notifications to Features

When implementing notifications for any feature (current or future), follow these patterns:

#### 1. Feature-Specific Notifications
```typescript
// In your feature component
import { useNotifications } from '@/contexts/NotificationServiceContext';
import { useAccess } from '@/hooks/useAccess';

export default function MyFeature() {
  const { checkAndTrack } = useAccess();
  const { testNotification, preferences } = useNotifications();
  
  const handleCompleteSession = async () => {
    // Track feature usage
    if (await checkAndTrack('my_feature')) {
      // Do the work
      await performFeatureAction();
      
      // Send completion notification if enabled
      if (preferences?.preferences.studyReminders?.enabled) {
        await testNotification('study_reminder');
      }
    }
  };
}
```

#### 2. Scheduled Notifications (Firebase Functions)
```typescript
// In functions/src/notifications.ts
export const sendFeatureReminders = functions.pubsub
  .schedule('0 9 * * *') // Daily at 9 AM
  .onRun(async (context) => {
    // Get users with feature access
    const users = await getActiveUsers();
    
    for (const user of users) {
      // Check entitlements
      const entitlements = await getUserEntitlements(user.uid);
      
      // Check if user has feature access AND notifications enabled
      if (entitlements.hasFeature('my_feature') && user.notificationsEnabled) {
        await sendNotification({
          userId: user.uid,
          type: 'feature_reminder',
          title: 'Time for your daily practice!',
          body: `You have ${entitlements.remaining('my_feature')} sessions left today`,
          data: {
            featureId: 'my_feature',
            url: '/my-feature'
          }
        });
      }
    }
  });
```

#### 3. Usage-Based Notifications
```typescript
// Notify when approaching limits
export function useFeatureWithNotifications(featureId: string) {
  const { checkAndTrack, getUsageInfo } = useAccess();
  const { showNotification } = useNotification();
  
  const trackWithNotification = async () => {
    const hasAccess = await checkAndTrack(featureId);
    
    if (hasAccess) {
      const usage = await getUsageInfo(featureId);
      
      // Warn when 80% of limit reached
      if (usage.percentage >= 80 && usage.percentage < 100) {
        showNotification({
          title: 'Approaching Daily Limit',
          message: `You have ${usage.remaining} ${featureId} sessions left today`,
          type: 'warning'
        });
      }
    }
    
    return hasAccess;
  };
  
  return { trackWithNotification };
}
```

#### 4. Achievement Notifications
```typescript
// Integrate with achievement system
import { useAchievements } from '@/hooks/useAchievements';

export function useFeatureAchievements() {
  const { trackProgress } = useAchievements();
  const { preferences, testNotification } = useNotifications();
  
  const completeFeature = async (featureId: string) => {
    const achievement = await trackProgress(featureId);
    
    if (achievement && preferences?.enabled) {
      // Send achievement notification
      await testNotification('achievement', {
        title: `Achievement Unlocked! 🏆`,
        body: achievement.name,
        data: {
          achievementId: achievement.id,
          url: '/achievements'
        }
      });
    }
  };
}
```

### Best Practices for Feature Notifications

#### DO ✅
- **Respect user preferences**: Always check if notifications are enabled
- **Use feature IDs**: Link notifications to specific features for tracking
- **Include context**: Show remaining uses, streaks, or progress
- **Provide value**: Only notify when it benefits the user's learning
- **Track engagement**: Use notification analytics to improve

#### DON'T ❌
- **Spam users**: Limit notifications per feature per day
- **Ignore timezone**: Schedule based on user's local time
- **Skip permission checks**: Always verify notification permissions
- **Hard-code messages**: Use the strings system for i18n
- **Bypass entitlements**: Check feature access before notifying

### Notification Types by Feature Category

#### Learning Features
- Study reminders (morning/evening)
- Review due notifications
- Streak maintenance alerts
- Progress milestones

#### Game Features
- Daily challenge available
- Tournament starts
- Achievement unlocked
- Leaderboard updates

#### System Features
- Subscription expiring
- New features available
- Maintenance windows
- Security alerts

### Integration Checklist

When adding notifications to a feature:

1. **Update Feature Registry** (if needed)
```typescript
'my_feature': {
  // ... existing config
  notificationsEnabled: true, // Optional flag
}
```

2. **Add Notification Preferences**
```typescript
// In NotificationPreferences type
myFeatureReminders: {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
}
```

3. **Create Notification Templates**
```typescript
// In notification service
const templates = {
  my_feature_reminder: {
    title: (data) => `Time for ${data.featureName}!`,
    body: (data) => `You have ${data.remaining} sessions left`,
    icon: '/icons/my-feature.png',
    badge: '/badge-72x72.png',
    actions: [
      { action: 'start', title: 'Start Now' },
      { action: 'later', title: 'Remind Later' }
    ]
  }
};
```

4. **Track Notification Metrics**
```typescript
// In analytics
trackNotificationEvent({
  type: 'feature_notification',
  featureId: 'my_feature',
  action: 'sent' | 'clicked' | 'dismissed',
  userId: user.uid,
  timestamp: new Date()
});
```

### Example: Adding Notifications to a New Vocabulary Feature

```typescript
// 1. Feature component
export default function VocabularyPractice() {
  const { checkAndTrack } = useAccess();
  const { preferences, showNotification } = useNotifications();
  const [wordsLearned, setWordsLearned] = useState(0);
  
  const completeSession = async () => {
    if (await checkAndTrack('vocabulary_practice')) {
      const newWords = await practiceVocabulary();
      setWordsLearned(prev => prev + newWords);
      
      // Milestone notification
      if (wordsLearned >= 100 && wordsLearned < 100 + newWords) {
        showNotification({
          title: '100 Words Learned! 🎉',
          message: 'You\\'re making great progress!',
          type: 'success'
        });
      }
      
      // Schedule review reminder
      if (preferences?.preferences.reviewReminders?.enabled) {
        await scheduleReviewReminder(newWords);
      }
    }
  };
}

// 2. Firebase Function for daily reminders
export const vocabularyReminders = functions.pubsub
  .schedule('0 19 * * *') // 7 PM daily
  .timeZone('user/timezone') // Dynamic timezone
  .onRun(async (context) => {
    const users = await getUsersWithFeature('vocabulary_practice');
    
    for (const user of users) {
      const stats = await getVocabularyStats(user.uid);
      
      if (stats.dailyGoalRemaining > 0) {
        await sendNotification({
          userId: user.uid,
          template: 'vocabulary_reminder',
          data: {
            wordsRemaining: stats.dailyGoalRemaining,
            streak: stats.currentStreak
          }
        });
      }
    }
  });
```

---

## 🛠️ Admin Tools & Debugging

### New User Entitlements Dashboard
Access at `/admin/user-entitlements`

Features:
- **Search users** by email or UID
- **Real-time usage data** from Firebase
- **Visual quota indicators** (progress bars)
- **Reset buttons** for testing
- **Raw data view** for debugging
- **Export functionality** (JSON)

### Key Debug Locations
1. **Firebase Console**: `/config/entitlement_rules_v1`
2. **Admin Dashboard**: `/admin/features` (edit limits)
3. **User Inspector**: `/admin/user-entitlements` (usage tracking)

### Common Issues & Solutions

#### "Limit Reached" But Usage Shows 0
- **Cause**: Shared limit groups (now removed!)
- **Solution**: Each feature now tracked individually

#### Feature Not Appearing
- **Check**: Is it in the feature registry?
- **Check**: Does it have limits in entitlement rules?
- **Check**: Is there a permission mapping?

#### Dynamic Rules Not Working
- **Solution**: Use admin dashboard to update limits
- **Note**: Code defaults are only used on first deployment

---

## 🔄 Migration Guide

### If You Have Existing Shared Limit Groups

1. **Remove `sharedLimitGroup` from all features**
```typescript
// Before
'feature_name': {
  // ...
  sharedLimitGroup: 'some_group'
}

// After
'feature_name': {
  // ...
  // sharedLimitGroup removed
}
```

2. **Update entitlement rules**
Replace group limits with individual limits:
```typescript
// Before
daily: {
  games: 3, // All games share this
}

// After
daily: {
  kanji_quest: 3,
  kana_drop: 3,
  sentence_scramble: 3,
  // ... each game separate
}
```

3. **Test thoroughly**
- Check each feature works independently
- Verify usage tracking is accurate
- Ensure limits are enforced correctly

---

## 🎯 Best Practices Going Forward

### DO ✅
- Give each feature its own limit
- Use descriptive feature IDs
- Test with the admin dashboard
- Keep the three files in sync
- Use dynamic rules for flexibility

### DON'T ❌
- Use shared limit groups
- Hardcode limits in components
- Bypass checkAndTrack()
- Forget to update all three files
- Mix feature IDs and permission names

---

## 🚀 Summary

The Three-Pillar Architecture now truly provides a **Single Source of Truth**:

1. **Features** are registered individually
2. **Limits** are set per feature (no sharing)
3. **Permissions** map features to access rights
4. **Usage** is tracked per feature
5. **Truth** flows from Firebase to UI consistently

No more phantom limits. No more confusing usage counts. Just clean, simple, truthful access control.

---

*Last Updated: July 2025*  
*Version: 3.0*  
*Status: Production Ready*  
*Shared Limit Groups: Eliminated* 🎉