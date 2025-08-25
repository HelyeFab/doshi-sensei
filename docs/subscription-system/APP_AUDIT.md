# APP AUDIT

## Audit Date: 2025-08-25

## Scope: User Type and Subscription Tracking

This audit examines how the application tracks user types (guest, free, premium) and manages subscription status throughout the codebase.

---

## 1. USER TYPE TRACKING

### Current Implementation
The app uses a **4-tier user type system**:
- **`guest`**: Not logged in (no Firebase auth)
- **`free`**: Logged in but no paid subscription
- **`monthly`**: Active monthly subscription
- **`yearly`**: Active yearly subscription

User type is determined by the `getUserType()` function in `/src/types/subscription.ts:350-363` which checks:
1. If no subscription exists → `guest`
2. If subscription.plan is `monthly` or `yearly` → returns that plan
3. Otherwise → `free`

### Key Components
- **AuthContext** (`/src/contexts/AuthContext.tsx`): 
  - Manages user authentication state
  - Tracks `userType` and `subscription` in React context
  - Automatically fetches/creates subscription on auth state changes
  - Creates default "free" subscription for new users

- **Subscription Type Definition** (`/src/types/subscription.ts`):
  - Defines `UserSubscription` interface with flattened structure
  - Contains legacy nested structure for backwards compatibility
  - Maps price IDs to plan types

- **Subscription Manager** (`/src/lib/subscriptions/manager.ts`):
  - Singleton class managing subscription data
  - Handles Firestore operations
  - Provides real-time subscription listeners
  - **IMPORTANT**: Returns plan type regardless of status (users keep benefits even if past_due)

### Issues Found
1. **⚠️ CRITICAL: Dual Structure Problem**
   - Subscription data has BOTH flattened AND nested structures
   - Line 64-74 in `/src/types/subscription.ts` shows deprecated nested structure still exists
   - Could cause data consistency issues

2. **⚠️ User Type Confusion**
   - UserType includes both authentication states (`guest`, `free`) and subscription tiers (`monthly`, `yearly`)
   - This mixes authentication concerns with subscription status
   - Line 3 in `/src/types/subscription.ts`: `export type UserType = 'guest' | 'free' | 'monthly' | 'yearly';`

3. **⚠️ Subscription Status Ignored**
   - `getUserType()` only checks `plan`, not `status`
   - Users with `canceled` or `past_due` subscriptions still get premium access
   - Could be intentional for grace periods but needs verification

---

## 2. SUBSCRIPTION MANAGEMENT

### Current Implementation
Subscriptions are managed through a **multi-layered system**:

1. **Stripe Webhooks** (Cloud Functions):
   - Primary source of truth for subscription updates
   - Webhook endpoint: `https://stripewebhook-jtmxvmnera-uc.a.run.app`
   - Old Next.js webhook at `/api/stripe-webhook` is **DISABLED** (returns 410 Gone)

2. **Firebase Firestore Structure**:
   - User documents in `users` collection contain `subscription` field
   - Subscription includes: plan, status, Stripe IDs, period dates, metadata

3. **Three-Pillar Architecture**:
   - **Feature Registry** (`/src/lib/features/registry.ts`)
   - **Entitlement Rules** (`/src/lib/entitlements/rules.ts`)
   - **Access Control** (`/src/lib/access/index.ts`)

### Key Components
- **Cloud Functions** (`/functions/src/index.ts`):
  - `stripeWebhook`: Handles all Stripe events
  - Implements idempotency with `webhook_events` collection
  - Maps price IDs to plan types (hardcoded mapping at line 287-296)

- **Entitlement Rules** (`/src/lib/entitlements/rules.ts`):
  - Defines feature limits for each user type
  - Uses -1 for unlimited, 0 for no access
  - Separate daily and total limits

- **Access Hooks**:
  - `useFeature()` - New unified hook (recommended)
  - `useAccess()` - Legacy hook (still in use)
  - Both check user type and track usage

### Issues Found
1. **⚠️ Hardcoded Price IDs**
   - Price IDs are hardcoded in Cloud Functions (lines 287-296)
   - Same IDs duplicated in environment variables
   - Risk of mismatch between test and production

2. **⚠️ Multiple Access Control Systems**
   - Two different hooks (`useFeature` and `useAccess`) doing similar things
   - Could cause inconsistent behavior across the app
   - Migration from old to new system incomplete

3. **⚠️ Webhook Endpoint Migration Risk**
   - Old webhook disabled but code still present
   - If Stripe Dashboard not updated, webhooks will fail
   - No automatic fallback or monitoring

---

## 3. DATA FLOW

### User Type Determination Flow
```
1. User Authentication State Changes
   ↓
2. AuthContext.onAuthStateChanged triggered
   ↓
3. createOrUpdateUserDocument() called
   ↓
4. Fetches/creates user document in Firestore
   ↓
5. getUserType(subscription) determines type
   ↓
6. Updates context: userType & subscription
   ↓
7. Components re-render with new access rights
```

### Subscription Status Flow
```
1. User completes Stripe Checkout
   ↓
2. Stripe sends webhook to Cloud Function
   ↓
3. stripeWebhook function processes event
   ↓
4. Updates user document in Firestore
   ↓
5. Firestore listener in AuthContext triggers
   ↓
6. refreshSubscription() updates local state
   ↓
7. Entitlement rules applied based on new type
```

### Usage Tracking Flow
```
1. User attempts to use feature
   ↓
2. useFeature/useAccess checks permissions
   ↓
3. Checks entitlement rules for user type
   ↓
4. If allowed, tracks usage in Firestore/localStorage
   ↓
5. Updates usage counters (daily/total)
   ↓
6. Returns access decision to component
```

---

## 4. CRITICAL FINDINGS

### 🔴 HIGH PRIORITY

1. **Data Structure Inconsistency**
   - Mixed flattened/nested subscription structure creates confusion
   - Risk of data corruption if different parts of app use different structures
   - IMPACT: Could cause subscription status mismatches

2. **Webhook Migration Incomplete**
   - Old webhook endpoint disabled but not removed
   - No monitoring to ensure Cloud Functions webhook is receiving events
   - IMPACT: Failed webhooks = lost revenue & angry customers

3. **Hardcoded Configuration**
   - Price IDs hardcoded in multiple places
   - No central configuration management
   - IMPACT: Deployment errors when switching environments

### 🟡 MEDIUM PRIORITY

1. **User Type Semantics**
   - Mixing auth status with subscription tier in single type
   - Makes code harder to understand and maintain
   - IMPACT: Developer confusion, potential bugs

2. **Multiple Access Control Systems**
   - Two hooks doing same job differently
   - Incomplete migration from old to new system
   - IMPACT: Inconsistent behavior, maintenance overhead

3. **Grace Period Handling**
   - Users keep premium access even with canceled/past_due status
   - No clear documentation if this is intentional
   - IMPACT: Revenue loss if unintentional

---

## 5. IMPROVEMENT SUGGESTIONS

### Immediate Actions (Do First)

1. **Fix Subscription Structure**
   ```typescript
   // Remove nested structure from UserSubscription type
   // Migrate all existing data to flattened structure
   // Add Firestore migration script
   ```

2. **Add Webhook Monitoring**
   ```typescript
   // Add health check endpoint for webhook
   // Implement alerting for failed webhooks
   // Add retry mechanism for failed events
   ```

3. **Centralize Price Configuration**
   ```typescript
   // Create pricing config service
   // Load from environment with validation
   // Single source of truth for price IDs
   ```

### Short-term Improvements (This Sprint)

1. **Separate Auth from Subscription**
   ```typescript
   type AuthStatus = 'guest' | 'authenticated';
   type SubscriptionTier = 'free' | 'monthly' | 'yearly';
   type UserProfile = {
     authStatus: AuthStatus;
     subscriptionTier: SubscriptionTier;
   }
   ```

2. **Complete Hook Migration**
   - Deprecate `useAccess` hook
   - Update all components to use `useFeature`
   - Add migration guide for developers

3. **Document Grace Period Policy**
   - Clarify if past_due users should have access
   - Implement proper grace period logic if needed
   - Add user notifications for expiring subscriptions

### Long-term Improvements (Next Quarter)

1. **Implement Subscription Service**
   - Abstract all subscription logic into service layer
   - Handle complex scenarios (upgrades, downgrades, refunds)
   - Add comprehensive testing

2. **Add Subscription Analytics**
   - Track conversion funnel
   - Monitor churn and retention
   - Identify upgrade/downgrade patterns

3. **Improve Developer Experience**
   - Add subscription debugging tools
   - Create subscription state visualizer
   - Implement subscription simulation for testing

### Code Quality Improvements

1. **Add Type Safety**
   ```typescript
   // Use branded types for IDs
   type FirebaseUID = string & { __brand: 'FirebaseUID' };
   type StripeCustomerID = string & { __brand: 'StripeCustomerID' };
   ```

2. **Add Validation**
   ```typescript
   // Validate subscription data on read/write
   // Use zod or similar for runtime validation
   // Prevent invalid states from persisting
   ```

3. **Improve Error Handling**
   ```typescript
   // Add specific error types for subscription failures
   // Implement user-friendly error messages
   // Add automatic recovery where possible
   ```

---

## CONCLUSION

The subscription and user type tracking system is functional but has several architectural issues that could lead to data inconsistencies and maintenance problems. The highest priority should be fixing the dual subscription structure and ensuring webhook reliability. The system would benefit from clearer separation of concerns and completion of the migration to the new Three-Pillar Architecture.