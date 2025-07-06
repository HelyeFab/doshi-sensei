# Subscription System Issues and Fixes

## Issues Identified

### 1. Premium Users Hitting Article Limits
**Problem**: Premium users with yearly subscriptions were being treated as 'guest' users and hitting the 3 article/day limit.

**Root Causes**:
- Race condition where entitlements system checked limits before subscription data loaded
- Admin-upgraded accounts had incomplete subscription data structure

**Fixes Applied**:
- Added loading state check in news page: `if (entitlementsLoading || isPremium)`
- Fixed admin upgrade function to include all required subscription fields

### 2. Stripe Webhook Not Updating Firebase
**Problem**: When users purchase subscriptions through Stripe, payment succeeds but Firebase doesn't update.

**Root Causes**:
- Webhook was looking for firebaseUID in subscription metadata only
- Some subscriptions have firebaseUID in customer metadata instead
- Admin upgrades were missing required fields

**Fixes Applied**:
- Updated webhook to check both subscription AND customer metadata for firebaseUID
- Fixed admin upgrade to create complete subscription objects
- Added proper error logging to identify webhook failures

### 3. Incomplete Subscription Data Structure
**Problem**: Admin dashboard upgrades created incomplete subscription objects missing new fields.

**Missing Fields**:
- `maxKanjiQuestPerDay`, `maxStoriesPerDay`, `maxArticlesPerDay` in limits
- `kanaDropToday`, `storiesToday`, `articlesToday` and dates in currentUsage

**Fix Applied**: Updated `upgradeUserToPremium` in `/src/hooks/useUsers.ts` to include all fields

## How to Fix Existing Broken Subscriptions

### Fixing Bruno Giogoli's Account (Stripe Payment Without Firebase Update)

The bruno.giogoli@gmail.com account has a valid Stripe subscription that was paid for, but Firebase wasn't updated due to the webhook issue. To fix this:

1. **Run the admin fix script**:
```bash
# Create a new script: scripts/fix-bruno-subscription.js
# Copy the fix-emmanuel-subscription.js and modify:
# - userId: 'ZRDRO3brWDO8EKkV5m1u7L1dism2'
# - userEmail: 'bruno.giogoli@gmail.com'
# - plan: 'monthly'
# - renewalDate: Check Stripe dashboard for actual renewal date

node scripts/fix-bruno-subscription.js
```

2. **Or manually in Firebase Console**:
   - Go to users → ZRDRO3brWDO8EKkV5m1u7L1dism2
   - Update subscription object with proper monthly plan structure
   - Make sure to include the Stripe subscription ID from the Stripe dashboard

3. **Verify in Stripe Dashboard**:
   - Customer ID: cus_ScxqzH1n0JGDW
   - Has active monthly subscription ($3.99)
   - Payment was successful

## How to Fix Existing Broken Subscriptions

### Option 1: Use Debug Page (Temporary)
1. Navigate to `/debug-subscription`
2. Click "Fix as Monthly Premium" or "Fix as Yearly Premium"
3. Refresh the page to verify the fix

### Option 2: Admin Dashboard
1. Go to admin dashboard
2. Find the affected user
3. Downgrade to free, then upgrade again (now that code is fixed)

### Option 3: Direct Firebase Fix
1. Go to Firebase Console
2. Navigate to Firestore → users → [affected user]
3. Edit subscription object to match this structure:

```json
{
  "subscription": {
    "plan": "yearly",  // or "monthly"
    "status": "active",
    "renewalDate": "2026-01-05T00:00:00.000Z",
    "stripeSubscriptionId": "sub_xxx",  // if exists
    "stripePriceId": "price_xxx"  // if exists
  },
  "limits": {
    "maxLists": -1,
    "maxDrillsPerDay": -1,
    "maxKanjiQuestPerDay": -1,
    "maxStoriesPerDay": -1,
    "maxArticlesPerDay": -1,
    "canSync": true,
    "canSave": true
  },
  "currentUsage": {
    "listsCount": 0,
    "drillsToday": 0,
    "lastDrillDate": "2025-01-05",
    "kanjiQuestToday": 0,
    "lastKanjiQuestDate": "2025-01-05",
    "kanaDropToday": 0,
    "lastKanaDropDate": "2025-01-05",
    "storiesToday": 0,
    "lastStoryDate": "2025-01-05",
    "articlesToday": 0,
    "lastArticleDate": "2025-01-05"
  }
}
```

## Verifying Stripe Webhook Configuration

1. **Check Webhook Endpoint**:
   - Go to Stripe Dashboard → Webhooks
   - Endpoint should be: `https://yourdomain.com/api/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. **Check Webhook Secret**:
   - Copy webhook signing secret from Stripe
   - Update `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`
   - Restart your application

3. **Check Webhook Logs**:
   - In Stripe Dashboard → Webhooks → Click on endpoint
   - Check "Webhook attempts" for failures
   - Common issues:
     - 400: Invalid signature (wrong secret)
     - 500: Server error (check application logs)
     - Timeout: Endpoint not reachable

## Testing the Fixes

1. **Test Article Access**:
   - Log in as premium user
   - Navigate to /news
   - Should see no article limit message
   - Can access unlimited articles

2. **Test New Subscription**:
   - Create test subscription in Stripe
   - Check Firebase updates within 10 seconds
   - Verify all subscription fields are populated

3. **Test Admin Upgrade**:
   - Use admin dashboard to upgrade a user
   - Verify complete subscription object created
   - Test feature access immediately works

## Monitoring

Add these console logs to debug issues:
```javascript
// In news page
console.log('Article access check:', {
  userType,
  isPremium,
  entitlementsLoading,
  subscription: userSubscription
});

// In webhook
console.log('Webhook received:', event.type);
console.log('Firebase UID:', firebaseUID);
console.log('Subscription data:', subscription);
```

## Clean Up Checklist

After fixing all affected users and confirming everything works:

### Files to Remove
1. **Debug/Fix Pages & APIs**:
   ```bash
   rm src/app/debug-subscription/page.tsx
   rm src/app/api/fix-subscription/route.ts
   ```

2. **This Documentation** (optional):
   ```bash
   # Keep for reference or remove if no longer needed
   rm docs/SUBSCRIPTION_ISSUES_FIXES.md
   ```

### Code to Clean Up

1. **Remove Debug Console Logs** from `/src/app/news/page.tsx`:
   ```typescript
   // Remove this debug logging block (lines ~297-303)
   console.log('News page state update:', {
     userType,
     isPremium,
     entitlementsLoading,
     user: user?.email,
     timestamp: new Date().toISOString()
   });
   
   // Remove this debug log (line ~309-314)
   console.log('checkArticleStatus:', {
     userType,
     isPremium,
     articleCheck,
     entitlementsLoading
   });
   
   // Remove this debug log (line ~375-381)
   console.log('Article access check:', {
     user: user?.email,
     isPremium,
     articleCheck,
     userType,
     entitlementsLoading
   });
   ```

2. **Remove Debug Logs** from `/src/hooks/useEntitlements.ts`:
   ```typescript
   // Remove debug logging (lines ~95-100)
   if (process.env.NODE_ENV === 'development') {
     console.log('useEntitlements - using context userType:', {
       contextUserType,
       normalizedType,
       previousUserType: userType
     });
   }
   
   // Remove debug logging (lines ~113-120)
   if (process.env.NODE_ENV === 'development') {
     console.log('useEntitlements - fallback to validator:', {
       user: user?.email,
       subscription: userSubscription?.subscription,
       validatorUserType: currentUserType,
       isPremium: validation.isPremium,
       previousUserType: userType
     });
   }
   
   // Remove debug logging (lines ~170-178)
   if (process.env.NODE_ENV === 'development' && featurePath.includes('articles')) {
     console.log('canAccess - limit check:', {
       featurePath,
       dailyLimit,
       isUnlimited: result.unlimited,
       currentUsage,
       userType
     });
   }
   
   // Remove debug logging (lines ~301-308)
   if (process.env.NODE_ENV === 'development') {
     console.log('canReadArticle check:', {
       userType,
       dailyUsage,
       result,
       subscription: userSubscription?.subscription
     });
   }
   ```

3. **Clean Up Webhook Logs** from `/src/app/api/stripe-webhook/route.ts`:
   ```typescript
   // Optionally remove or reduce verbosity of these logs after confirming webhooks work:
   // Line ~126
   console.log('Found firebaseUID in customer metadata:', firebaseUID);
   
   // Line ~212
   console.log('Found firebaseUID in customer metadata for deletion:', firebaseUID);
   ```

### Final Testing Checklist
Before removing debug code:
- [ ] All premium users can access articles without limits
- [ ] New Stripe subscriptions update Firebase correctly
- [ ] Admin dashboard upgrades work properly
- [ ] Webhook logs show successful processing
- [ ] No console errors in production

### Keep for Production
These changes should remain:
- ✅ Webhook checking both subscription and customer metadata
- ✅ Admin upgrade creating complete subscription objects  
- ✅ Loading state check in news page (`entitlementsLoading || isPremium`)
- ✅ All entitlements system improvements

### Optional: Add Monitoring
Consider keeping some strategic logging in production:
```typescript
// In webhook only log errors
if (!firebaseUID) {
  console.error('[WEBHOOK ERROR] No Firebase UID found', {
    subscriptionId: subscription.id,
    customerId: subscription.customer
  });
}

// In subscription context only log critical issues
if (validation.isPremium && articleCheck.blocked) {
  console.error('[SUBSCRIPTION ERROR] Premium user blocked', {
    user: user.email,
    feature: 'articles'
  });
}
```

## Production Readiness Assessment

### Is It Safe to Go to Production?

**Short Answer**: Not yet. There are critical issues that must be resolved first.

### Critical Issues That Must Be Fixed

1. **Stripe Webhook Reliability** ⚠️ CRITICAL
   - **Issue**: Webhooks are not reliably updating Firebase when payments are made
   - **Impact**: Users pay real money but don't get premium access
   - **Fix Required**: 
     - Ensure webhook endpoint is properly configured in Stripe
     - Add retry logic and better error handling
     - Implement webhook event logging to Firebase
     - Add monitoring/alerts for failed webhooks

2. **Data Structure Consistency** ⚠️ CRITICAL
   - **Issue**: Subscription data can have incorrect nested structure
   - **Impact**: Premium users lose access randomly
   - **Fix Required**:
     - Run migration script to fix all existing users
     - Add validation when writing subscription data
     - Remove all code that creates nested structures

3. **Admin Dashboard Data Integrity** ⚠️ HIGH
   - **Issue**: Admin upgrades were creating incomplete subscription objects
   - **Impact**: Admin-upgraded users don't get proper access
   - **Fix**: Already applied, but needs testing

### Pre-Production Checklist

- [ ] **Fix all existing user subscriptions** using migration script
- [ ] **Test Stripe webhook** with real payments in test mode
- [ ] **Verify webhook logs** show successful processing
- [ ] **Load test** the subscription system with multiple concurrent users
- [ ] **Add monitoring** for subscription errors
- [ ] **Create runbook** for common subscription issues
- [ ] **Set up alerts** for failed payments or webhook errors
- [ ] **Backup strategy** for subscription data
- [ ] **Customer support tools** to manually fix subscriptions if needed

### Recommended Production Deployment Steps

1. **Phase 1: Data Cleanup** (Do this first)
   ```bash
   # Run migration to fix all users
   node scripts/fix-subscription-structure.js
   
   # Verify no users have nested structures
   # Check in Firebase Console or write a verification script
   ```

2. **Phase 2: Webhook Testing**
   - Create test Stripe account
   - Make several test payments
   - Verify Firebase updates correctly each time
   - Test subscription cancellations
   - Test failed payments

3. **Phase 3: Monitoring Setup**
   - Add error tracking (e.g., Sentry)
   - Set up webhook failure alerts
   - Create dashboard for subscription metrics
   - Log all subscription state changes

4. **Phase 4: Gradual Rollout**
   - Deploy to staging environment first
   - Test with small group of beta users
   - Monitor for 24-48 hours
   - Deploy to production with feature flag
   - Gradually enable for all users

### Emergency Response Plan

If issues occur in production:

1. **Immediate Response**:
   - Have the fix scripts ready to run
   - Know how to manually fix subscriptions in Firebase
   - Have Stripe support contact ready

2. **Communication**:
   - Prepare template for user communications
   - Have refund process ready if needed
   - Clear escalation path for subscription issues

3. **Rollback Plan**:
   - Be ready to disable new subscriptions
   - Keep old subscription code available
   - Have database backups ready

### Risk Assessment

**High Risk Areas**:
- Payment processing (real money involved)
- User access control (premium features)
- Data consistency (subscription states)

**Medium Risk Areas**:
- Admin dashboard operations
- Usage tracking and limits
- Subscription renewals

**Low Risk Areas**:
- Read-only operations
- Free tier features
- UI display of subscription status

### Final Recommendation

**DO NOT go to production until**:
1. All existing subscriptions are fixed
2. Webhook reliability is proven with extensive testing
3. Monitoring and alerts are in place
4. You have tested the complete payment flow multiple times
5. You have a support process for subscription issues

The subscription system handles real money and user access - it must be 100% reliable before production deployment.

## Correct Subscription Data Structure

### The ONLY Correct Structure (What We Want)

```typescript
{
  subscription: {
    status: 'active' | 'inactive' | 'canceled' | 'past_due',
    plan: 'free' | 'monthly' | 'yearly',
    renewalDate?: string,
    stripeSubscriptionId?: string,
    stripeCustomerId?: string,
    cancelAtPeriodEnd?: boolean,
    priceId?: string
  },
  limits: {
    maxLists: number,
    maxDrillsPerDay: number,
    maxKanjiQuestPerDay: number,
    maxStoriesPerDay: number,
    maxArticlesPerDay: number,
    canSync: boolean,
    canSave: boolean
  },
  currentUsage: {
    listsCount: number,
    drillsToday: number,
    lastDrillDate: string,
    kanjiQuestToday: number,
    lastKanjiQuestDate: string,
    kanaDropToday: number,
    lastKanaDropDate: string,
    storiesToday: number,
    lastStoryDate: string,
    articlesToday: number,
    lastArticleDate: string
  }
}
```

### The INCORRECT Structure (What We're Fixing)

```typescript
{
  subscription: {
    subscription: { // ❌ NESTED - This is wrong!
      status: 'active',
      plan: 'yearly',
      ...
    },
    limits: { ... },
    currentUsage: { ... }
  }
}
```

## Temporary Compatibility Code to Remove

Once all users are migrated to the correct structure, remove these compatibility fixes:

### 1. SubscriptionContext.tsx (Lines 280-284)
**Current (with compatibility):**
```typescript
if (userSubscription?.subscription?.status === 'active' &&
  (userSubscription?.subscription?.plan === 'monthly' ||
    userSubscription?.subscription?.plan === 'yearly')) {
  return userSubscription.subscription.plan;
}
```

**Should be:**
```typescript
if (userSubscription?.status === 'active' &&
  (userSubscription?.plan === 'monthly' ||
    userSubscription?.plan === 'yearly')) {
  return userSubscription.plan;
}
```

### 2. SubscriptionContext.tsx (Lines 300-303)
**Current (with compatibility):**
```typescript
if (userSubscription?.subscription?.status === 'active' &&
  (userSubscription?.subscription?.plan === 'monthly' ||
    userSubscription?.subscription?.plan === 'yearly')) {
  return 'premium';
}
```

**Should be:**
```typescript
if (userSubscription?.status === 'active' &&
  (userSubscription?.plan === 'monthly' ||
    userSubscription?.plan === 'yearly')) {
  return 'premium';
}
```

### 3. subscriptionLogger.ts (Lines 45-49)
**Current (with compatibility):**
```typescript
status: data.userSubscription.subscription?.status || data.userSubscription.status || 'N/A',
plan: data.userSubscription.subscription?.plan || data.userSubscription.plan || 'N/A',
// etc...
```

**Should be:**
```typescript
status: data.userSubscription?.status || 'N/A',
plan: data.userSubscription?.plan || 'N/A',
stripeId: data.userSubscription?.stripeSubscriptionId || 'N/A',
cancelAtPeriodEnd: data.userSubscription?.cancelAtPeriodEnd || false,
renewalDate: data.userSubscription?.renewalDate || 'N/A'
```

### 4. Any TypeScript Interfaces
Make sure `UserSubscription` interface in `/src/types/subscription.ts` matches the correct structure with `subscription`, `limits`, and `currentUsage` at the top level.

## Migration Checklist Before Removing Compatibility Code

1. [ ] Run migration script on all users: `node scripts/fix-subscription-structure.js`
2. [ ] Verify no users have nested structure in Firebase
3. [ ] Test with multiple user accounts
4. [ ] Remove all compatibility code listed above
5. [ ] Run full test suite
6. [ ] Deploy with monitoring enabled

## Why This Matters

- **Code Clarity**: Having one structure makes the code easier to understand
- **Performance**: No need to check multiple paths for the same data
- **Type Safety**: TypeScript can better validate a single structure
- **Maintenance**: Less code to maintain and fewer edge cases

The compatibility code is a temporary bridge - remove it as soon as all data is migrated!