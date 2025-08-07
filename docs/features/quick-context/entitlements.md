# QuickContext Entitlements Documentation

## Overview

QuickContext follows Doshi Sensei's Three-Pillar Architecture for access control. This document details the entitlement rules, limits, and implementation specifics.

## Entitlement Structure

### User Type Matrix

| User Type | Daily Limit | Can Access | Features Available |
|-----------|------------|------------|-------------------|
| **Guest** | 0 | ❌ No | None - Feature completely disabled |
| **Free** | 10 | ✅ Yes | All features with daily limit |
| **Premium Monthly** | Unlimited | ✅ Yes | All features, no restrictions |
| **Premium Yearly** | Unlimited | ✅ Yes | All features, no restrictions |

## Implementation Details

### Feature Registry Configuration

```typescript
// src/lib/features/registry.ts
'quick_context': {
  id: 'quick_context',
  name: 'QuickContext Assistant',
  description: 'Context-aware learning assistant for Japanese text selection',
  category: 'learning',
  icon: '🎯',
  limitType: 'daily',
  requiresAuth: false,        // Guests can see it but can't use it
  requiresSubscription: false, // Free users have access
  status: 'active'
}
```

### Entitlement Rules

```typescript
// src/lib/entitlements/rules.ts

// Guest Users
{
  id: 'guest_basic',
  userTypes: ['guest'],
  permissions: [/* other permissions, NOT quick_context */],
  limits: {
    daily: {
      quick_context: 0  // No access for guests
    }
  }
}

// Free Users
{
  id: 'free_user',
  userTypes: ['free'],
  permissions: [
    // ... other permissions
    'quick_context',  // Permission granted
  ],
  limits: {
    daily: {
      quick_context: 10  // 10 uses per day
    }
  }
}

// Premium Users (Monthly & Yearly)
{
  id: 'premium_monthly',
  userTypes: ['monthly'],
  permissions: ['*'],  // All permissions
  limits: {
    daily: {
      quick_context: -1  // Unlimited (-1 means no limit)
    }
  }
}
```

### Permission Mapping

```typescript
// src/lib/features/permission-map.ts
export const featurePermissionMap: Record<string, string> = {
  // ... other mappings
  'quick_context': 'quick_context',
};
```

## Usage Tracking

### How Limits Are Enforced

1. **Check Before Action**: Every QuickContext action checks entitlements first
2. **Track Usage**: Successful uses are tracked in the database
3. **Daily Reset**: Counters reset at midnight (user's timezone)
4. **Real-time Updates**: Usage is tracked immediately

### Implementation in Component

```typescript
// In QuickContextBubble.tsx
const { checkAndTrack } = useAccess();

const handleAction = useCallback(async () => {
  // Check entitlement and track usage atomically
  const canUse = await checkAndTrack('quick_context');
  
  if (!canUse) {
    // User has exceeded limit or no access
    // useAccess hook automatically shows upgrade modal
    return;
  }
  
  // Proceed with action
  executeAction();
}, [checkAndTrack]);
```

## User Experience by Type

### Guest Users (Not Logged In)

- **Bubble Appears**: ❌ No - Feature is completely hidden
- **Alternative**: Prompted to sign up when trying to select text
- **Messaging**: "Sign up for free to use QuickContext"

### Free Users (Registered)

- **Daily Limit**: 10 uses
- **Bubble Appears**: ✅ Yes
- **All Actions Available**: ✅ Yes (until limit reached)
- **After Limit**: Upgrade modal appears
- **Messaging**: "You've used 10/10 QuickContext actions today. Upgrade to Premium for unlimited access!"

### Premium Users

- **Daily Limit**: None
- **Bubble Appears**: ✅ Yes
- **All Actions Available**: ✅ Always
- **Special Features**: Priority support, faster AI responses

## Analytics & Tracking

### Events Tracked

Each QuickContext action is tracked separately:

```typescript
// Event names and data
'quick_context_save': { text, wordType, listId }
'quick_context_lookup': { text, source }
'quick_context_tts': { text, voice }
'quick_context_ai': { text, contextType }
```

### Usage Statistics

Available in Admin Dashboard:
- Total uses per day
- Most common actions
- User type breakdown
- Peak usage times
- Conversion metrics (free → premium)

## Database Schema

### Usage Tracking Collection

```typescript
// Firestore: userActivity/{userId}/features/quick_context
{
  date: '2025-01-20',        // YYYY-MM-DD format
  count: 7,                   // Uses today
  actions: {
    save: 3,
    lookup: 2,
    tts: 1,
    ai: 1
  },
  lastUsed: Timestamp,        // Last action timestamp
  selections: [               // Optional: track selections
    {
      text: '日本語',
      action: 'save',
      timestamp: Timestamp
    }
  ]
}
```

## Upgrade Paths

### Free to Premium Conversion

When free users hit their limit:

1. **Inline Modal**: Shows current usage and benefits
2. **Clear Value Prop**: "Get unlimited QuickContext with Premium"
3. **Pricing Options**: Monthly ($4.99) or Yearly ($39.99)
4. **Instant Access**: Upgrade immediately continues action

### Guest to Free Conversion

When guests try to use QuickContext:

1. **Sign-up Prompt**: "Create a free account to use QuickContext"
2. **Benefits Listed**: "10 free uses per day"
3. **Quick Registration**: Email or Google sign-in
4. **Immediate Access**: Can use right after signing up

## Configuration

### Adjusting Limits

Limits can be adjusted in admin dashboard or directly:

```typescript
// Admin can override for specific users
// Firestore: userSettings/{userId}
{
  overrides: {
    quick_context_daily_limit: 20  // Custom limit
  }
}
```

### Feature Flags

```typescript
// Disable for maintenance
localStorage.setItem('feature_quick_context_enabled', 'false');

// A/B testing different limits
localStorage.setItem('quick_context_limit_override', '15');
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Usage Rate**: Uses per user per day
2. **Limit Hits**: How many users hit daily limit
3. **Conversion Rate**: Free users upgrading after limit
4. **Error Rate**: Failed actions due to entitlement issues

### Alert Thresholds

- Alert if >50% of free users hit limit before noon
- Alert if conversion rate drops below 5%
- Alert if error rate exceeds 1%

## Best Practices

### For Developers

1. **Always Check Entitlements**: Never bypass `checkAndTrack()`
2. **Handle Failures Gracefully**: Show helpful messages
3. **Cache Entitlement State**: Reduce database calls
4. **Test All User Types**: Guest, Free, Premium flows

### For Product

1. **Monitor Usage Patterns**: Adjust limits based on data
2. **A/B Test Limits**: Find optimal conversion point
3. **Clear Messaging**: Users should understand limits
4. **Smooth Upgrade Flow**: Minimize friction

## Troubleshooting

### Common Issues

#### "QuickContext not working"
- Check user type and remaining uses
- Verify feature is enabled
- Check browser console for errors

#### "Limit not resetting"
- Check timezone settings
- Verify date in database
- Clear local cache

#### "Wrong limit applied"
- Check for user overrides
- Verify entitlement rules
- Check subscription status

### Debug Commands

```javascript
// Check current usage
const usage = await getUserFeatureUsage('quick_context');
console.log('QuickContext usage:', usage);

// Check entitlements
const entitlements = await getUserEntitlements();
console.log('User entitlements:', entitlements);

// Force reset (admin only)
await resetFeatureUsage('quick_context', userId);
```

## Related Documentation

- [Three-Pillar Architecture](../../three-pillars/README.md)
- [Feature Registry](../../three-pillars/04_FEATURES_PILLAR.md)
- [Entitlements System](../../three-pillars/03_ENTITLEMENTS_PILLAR.md)
- [Subscription System](../../three-pillars/05_SUBSCRIPTIONS_PILLAR.md)