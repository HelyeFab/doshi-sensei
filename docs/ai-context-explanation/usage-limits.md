# Usage Limits & Access Control

## Overview

The AI Context Explanation feature is integrated with Doshi Sensei's Three-Pillar Architecture, providing fair access to all users while managing API costs.

## Daily Limits by User Type

### Guest Users (Not Logged In)
- **Daily Limit**: 3 explanations
- **Features**: Basic explanations only
- **Reset**: Daily at midnight (user's timezone)
- **Storage**: Local browser storage

### Free Users (Registered)
- **Daily Limit**: 3 explanations
- **Features**: Basic explanations + grammar analysis
- **Reset**: Daily at midnight (user's timezone)
- **Storage**: IndexedDB with account sync

### Premium Users (Monthly/Yearly)
- **Daily Limit**: Unlimited
- **Features**: All features including:
  - Basic explanations
  - Detailed grammar analysis
  - Cultural context notes
  - Extended examples
  - Priority API access
- **Storage**: Cloud sync across devices

## How Limits Work

### Tracking Usage

Each AI explanation request counts as one use:
```typescript
// Automatic tracking when user clicks the AI button
const canUse = await checkAndTrack('ai_context_explanation');
```

### What Counts as a Use?
- ✅ Each unique explanation request
- ✅ Retry after error (if new request)
- ❌ Viewing cached explanations
- ❌ Closing and reopening same explanation

### Limit Reset Times
- Daily limits reset at midnight in the user's local timezone
- For server-side tracking, uses UTC midnight as fallback
- Premium users have no daily limits

## Access Control Integration

### Feature Registry Configuration
```typescript
'ai_context_explanation': {
  id: 'ai_context_explanation',
  name: 'AI Context Explanation',
  limitType: 'daily',
  requiresAuth: false,  // Guests can use
  requiresSubscription: false,  // Free users can use
  status: 'active'
}
```

### Entitlement Rules
```typescript
// Guest users
{
  permissions: ['ai_explanations'],
  limits: {
    daily: {
      ai_context_explanation: 3
    }
  }
}

// Free users
{
  permissions: ['ai_explanations'],
  limits: {
    daily: {
      ai_context_explanation: 3
    }
  }
}

// Premium users
{
  permissions: ['ai_explanations'],
  limits: {
    daily: {
      ai_context_explanation: -1  // Unlimited
    }
  }
}
```

## User Experience

### When Limit is Reached

1. **Modal Appears**: Upgrade prompt modal automatically shows
2. **Clear Messaging**: "You've used all 3 daily AI explanations"
3. **Options Provided**:
   - Sign up for free account (for guests)
   - Upgrade to premium
   - Wait until tomorrow

### Checking Remaining Uses

```tsx
import { useFeature } from '@/hooks/useFeature';

function ShowRemaining() {
  const { remaining } = useFeature('ai_context_explanation');
  
  return (
    <p>AI Explanations remaining today: {remaining || 0}</p>
  );
}
```

## Caching Strategy

To maximize value for users with limits:

### What Gets Cached
- All successful explanations
- Cache key: MD5 hash of (text + contextType)
- Cache duration: 30 days
- Popular explanations pre-cached

### Cache Benefits
- Instant responses for common queries
- No usage count for cached results
- Reduced API costs
- Better performance

### Cache Implementation
```typescript
// Check cache first
const cached = await getCachedExplanation(text, contextType);
if (cached) {
  return cached; // No usage tracked
}

// Only track usage for new explanations
const canUse = await checkAndTrack('ai_context_explanation');
if (canUse) {
  const explanation = await fetchFromAPI();
  await cacheExplanation(text, contextType, explanation);
  return explanation;
}
```

## Admin Controls

### Dynamic Limit Adjustment
Admins can modify limits in real-time via the admin dashboard:
1. Navigate to `/admin/features`
2. Find `ai_context_explanation`
3. Click on limit numbers to edit
4. Changes apply immediately

### Monitoring Usage
Track feature usage in admin analytics:
- Total daily requests
- Usage by user type
- Popular explanations
- Error rates
- Cache hit rates

## Best Practices for Implementation

### 1. Show Remaining Uses
```tsx
{remaining > 0 && remaining <= 3 && (
  <p className="text-sm text-amber-600">
    {remaining} AI explanations left today
  </p>
)}
```

### 2. Preemptive Warnings
```tsx
if (remaining === 1) {
  showNotification('This is your last AI explanation for today');
}
```

### 3. Smart Caching
Pre-cache common explanations:
- JLPT vocabulary
- Common phrases
- Grammar patterns

### 4. Batch Requests (Future)
Allow premium users to explain multiple items:
```tsx
// Future enhancement
<AIBatchExplainer items={selectedWords} />
```

## Cost Management

### API Costs
- GPT-4: ~$0.03 per explanation
- GPT-3.5-turbo: ~$0.002 per explanation
- Caching reduces costs by ~70%

### Sustainable Limits
Current limits ensure:
- Guests: Try before signup
- Free: Regular daily use
- Premium: Covers API costs + profit

## Troubleshooting

### Common Issues

**Issue**: "Limit reached but counter shows remaining uses"
- **Cause**: Browser/server sync delay
- **Fix**: Refresh page or wait 30 seconds

**Issue**: "Can't use feature as guest"
- **Cause**: Cookies/storage disabled
- **Fix**: Enable browser storage

**Issue**: "Premium user seeing limits"
- **Cause**: Subscription sync issue
- **Fix**: Log out and back in

### Debug Mode
For developers:
```typescript
// Check current usage
const debug = await debugFeatureUsage('ai_context_explanation');
console.log(debug);
// { used: 3, limit: 5, remaining: 2, resetAt: '2024-01-26T00:00:00Z' }
```

## Future Enhancements

1. **Rollover Minutes**: Unused daily explanations carry over (premium)
2. **Bulk Packages**: Buy 100 explanations for $5
3. **Sharing**: Premium users can gift explanations
4. **Team Plans**: Shared explanation pool for schools
5. **Offline Mode**: Download explanation packs