# Quick Fix: Account Page Error

## Problem
When accessing the account page, you were getting:
```
TypeError: Cannot read properties of undefined (reading 'maxLists')
```

## Root Cause
The `SubscriptionPlans.tsx` component was still using the old subscription system and trying to access `userSubscription.limits.maxLists` when `userSubscription` could be undefined.

## Solution
Updated `SubscriptionPlans.tsx` to use the new subscription system:

1. **Imported new hooks**:
   - `useSubscription2` for subscription data
   - `useFeature` for feature-specific limits

2. **Replaced old data access**:
   - Old: `userSubscription.limits.maxLists`
   - New: `listFeature?.limit || 3`

3. **Added loading state**:
   - Shows spinner while subscription data loads
   - Prevents undefined errors

4. **Updated all limit displays**:
   - Word Lists: Shows dynamic limit from feature registry
   - Daily Drills: Shows dynamic limit from feature registry
   - Cloud Sync: Based on premium status

## Result
The account page should now load without errors and show:
- Current subscription plan
- Dynamic limits based on user type
- Upgrade options for free users
- Cancel option for premium users

## Testing
1. Navigate to `/account`
2. Should see your current plan (Yearly)
3. Should show "Unlimited" for all limits
4. Should have cancel subscription option

The page now uses the new subscription system and will automatically reflect any limit changes made in the admin dashboard!