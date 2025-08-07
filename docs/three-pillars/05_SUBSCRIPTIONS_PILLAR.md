# Subscription and Stripe Integration Flow Documentation

> **🎯 SINGLE SOURCE OF TRUTH**: Firebase Functions Webhook Handler (`/functions/src/index.ts`)  
> **Last Updated**: January 2025  
> **Structure**: FLAT (NOT nested) - `user.subscription.plan`

## Table of Contents
1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [Subscription Data Flow](#subscription-data-flow)
4. [Key Components and Files](#key-components-and-files)
5. [Stripe Integration Details](#stripe-integration-details)
6. [User Type Determination](#user-type-determination)
7. [Feature Access Control](#feature-access-control)
8. [Implementation Details](#implementation-details)
9. [Troubleshooting](#troubleshooting)

## Overview

Doshi Sensei uses a subscription-based monetization model integrated with Stripe for payment processing. The system supports three user types:
- **Guest**: No authentication, limited features
- **Free**: Authenticated users with basic features
- **Premium**: Paid subscribers (monthly/yearly) with full access

### ⚠️ Historical Context: Migration from Netlify to Firebase Functions
We migrated from Netlify Functions to Firebase Functions in late 2024 to achieve:
- **Single Source of Truth**: Only Firebase Functions writes subscription data
- **Flat Structure**: Eliminated nested `subscription.subscription` structure
- **Better Reliability**: Direct integration with Firestore
- **Atomic Updates**: Transaction-based updates for consistency

## Architecture Overview

```mermaid
graph TD
    A[User] --> B{Authentication Status}
    B -->|Not Logged In| C[Guest User]
    B -->|Logged In| D[Firebase Auth]
    
    D --> E[SubscriptionContext]
    E --> F[Firestore Listener]
    F --> G[users/userId Document]
    
    H[Stripe Checkout] --> I[Payment Complete]
    I --> J[Stripe Webhook]
    J --> K[/api/stripe-webhook]
    K --> L[Update Firestore]
    L --> G
    
    G --> M[Real-time Updates]
    M --> E
    E --> N[UI Components]
```

## Subscription Data Flow

### 1. Initial Load (User Login)
When a user logs in, the subscription data is loaded through the following process:

**Location**: `src/contexts/SubscriptionContext.tsx:98-141`

1. **Firebase Authentication** triggers the subscription context
2. **Firestore Listener** is set up on `users/{userId}` document
3. **Subscription Data** is retrieved from the user document
4. If no subscription exists, a **default free subscription** is initialized

### 2. Stripe Payment Flow

#### Checkout Session Creation
**Location**: `src/app/api/create-checkout-session/route.ts`

1. User clicks upgrade button
2. `createCheckoutSession()` is called from SubscriptionContext
3. API creates Stripe checkout session with:
   - Price ID (monthly/yearly)
   - User ID in metadata
   - Success/Cancel URLs
4. User is redirected to Stripe checkout

#### Webhook Processing
**Location**: `src/app/api/stripe-webhook/route.ts`

After payment completion, Stripe sends webhooks:

1. **Event Types Handled**:
   - `checkout.session.completed` - Initial payment success
   - `customer.subscription.created/updated` - Subscription changes
   - `customer.subscription.deleted` - Cancellations
   - `invoice.payment_succeeded/failed` - Recurring payments

2. **Webhook Security**:
   - Signature verification using webhook secret
   - Idempotency checks to prevent duplicate processing
   - Event logging for audit trail

3. **Data Update Process** (lines 114-175):
   ```typescript
   // Determine plan from price ID
   const priceId = subscription.items.data[0]?.price.id;
   let plan: 'monthly' | 'yearly' = 'monthly';
   
   // Update Firestore with transaction
   await runTransaction(db, async (transaction) => {
     // Update subscription data
     // Update limits based on plan
     // Preserve usage counters
   });
   ```

### 3. Real-time Updates
The SubscriptionContext uses Firestore's real-time listeners to immediately reflect subscription changes in the UI without requiring a page refresh.

## Key Components and Files

### Core Files
| File | Purpose |
|------|---------|
| `src/contexts/SubscriptionContext.tsx` | Main subscription state management |
| `src/types/subscription.ts` | TypeScript definitions and plan configurations |
| `src/lib/stripe.ts` | Stripe SDK initialization and configuration |
| `src/app/api/stripe-webhook/route.ts` | Webhook handler for Stripe events |
| `src/app/api/create-checkout-session/route.ts` | Checkout session creation |
| `src/app/api/cancel-subscription/route.ts` | Subscription cancellation |

### Firebase Structure (CURRENT - FLAT)
```javascript
// ✅ CORRECT - This is what we use in production (FLAT structure)
// users/{userId} document structure
{
  subscription: {
    status: 'active' | 'inactive' | 'past_due' | 'canceled',
    plan: 'free' | 'monthly' | 'yearly',
    stripeSubscriptionId: 'sub_xxx',
    stripeCustomerId: 'cus_xxx',
    stripePriceId: 'price_xxx',
    currentPeriodEnd: Timestamp,
    cancelAtPeriodEnd: false,
    metadata: {
      source: 'stripe',
      createdAt: Timestamp,
      updatedAt: Timestamp
    }
  },
  // Note: limits and currentUsage are managed by the Three-Pillar Architecture
  // See /docs/SUPERPOWERS-V-III.md for entitlements system
}
```

### ❌ OLD Structure (DEPRECATED - DO NOT USE)
```javascript
// This nested structure was used before Firebase Functions migration
// Some old documentation may still show this - IGNORE IT
{
  subscription: {
    subscription: {  // ❌ WRONG - double nesting
      status: 'active',
      plan: 'monthly',
      // ... other fields
    },
    limits: {
      maxLists: 3 | -1,  // -1 = unlimited
      maxDrillsPerDay: 3 | -1,
      maxKanjiQuestPerDay: 3 | -1,
      maxStoriesPerDay: 3 | -1,
      maxArticlesPerDay: 3 | -1,
      canSync: boolean,
      canSave: boolean
    },
    currentUsage: {
      listsCount: 0,
      drillsToday: 0,
      lastDrillDate: '2025-01-01',
      kanjiQuestToday: 0,
      lastKanjiQuestDate: '2025-01-01',
      // ... other usage counters
    }
  }
}
```

## Stripe Integration Details

### Configuration
**Location**: `src/lib/stripe.ts`

```typescript
// Environment variables needed:
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
STRIPE_WEBHOOK_SECRET
```

### Webhook Security
**Location**: `src/app/api/stripe-webhook/route.ts:23-35`

1. **Idempotency**: Prevents duplicate event processing
2. **Signature Verification**: Ensures webhook authenticity
3. **Event Logging**: Tracks all webhook events for debugging

### Subscription Management

#### Creating Subscriptions
1. User metadata includes Firebase UID
2. Subscription metadata links to user account
3. Success URL returns user to app

#### Updating Subscriptions
- Plan changes update limits immediately
- Usage counters are preserved
- Transaction ensures atomic updates

#### Canceling Subscriptions
- Sets `cancelAtPeriodEnd` flag
- User retains access until period ends
- Automatic downgrade to free plan

## User Type Determination

**Location**: `src/contexts/SubscriptionContext.tsx:259-277`

The system determines user type based on:

```typescript
// ✅ CORRECT - Using FLAT structure
const userType: UserType = (() => {
  // No user = guest
  if (!user) return 'guest';
  
  // Loading state = temporary free
  if (loading || !userSubscription) return 'free';
  
  // Check premium status (FLAT access - no double nesting!)
  if (userSubscription.status === 'active' &&
      (userSubscription.plan === 'monthly' ||
       userSubscription.plan === 'yearly')) {
    return 'premium';
  }
  
  // Default to free
  return 'free';
})();
```

## Feature Access Control

### Access Check Function
**Location**: `src/contexts/SubscriptionContext.tsx:288-376`

```typescript
isFeatureAvailable(feature: 'lists' | 'drills' | 'sync' | 'save' | 'kanjiquest'): boolean
```

### Feature Limits by User Type

| Feature | Guest | Free | Premium |
|---------|-------|------|---------|
| Lists | 0 | 3 | Unlimited |
| Drills/Day | 3 | 3 | Unlimited |
| Kanji Quest/Day | 3 | 3 | Unlimited |
| Stories/Day | 3 | 3 | Unlimited |
| Articles/Day | 3 | 3 | Unlimited |
| Cloud Sync | ❌ | ❌ | ✅ |
| Save Progress | ❌ | ✅ | ✅ |

### Usage Tracking

#### Logged-in Users
- Stored in Firestore under user document
- Real-time updates via listeners
- Server-side validation available

#### Guest Users
- Stored in localStorage
- Client-side only
- Resets on browser clear

## Implementation Details

### Daily Usage Reset
Usage counters reset at midnight based on date comparison:

```typescript
const today = new Date().toISOString().split('T')[0];
const isToday = usage.lastDrillDate === today;

if (!isToday) {
  usage.drillsToday = 0;
  usage.lastDrillDate = today;
}
```

### Premium Detection
Multiple checks throughout the codebase ensure accurate premium detection:

```typescript
// ✅ CORRECT - Using FLAT structure
const isPremium = userSubscription?.status === 'active' &&
  (userSubscription?.plan === 'monthly' ||
   userSubscription?.plan === 'yearly');

// ❌ WRONG - Old nested structure (if you see this, it needs updating!)
// const isPremium = userSubscription?.subscription?.status === 'active' && ...
```

### Error Handling
- Offline fallback subscriptions
- Graceful degradation
- Retry mechanisms for failed updates

## Troubleshooting

### Common Issues

1. **Subscription Not Updating**
   - Check Stripe webhook logs
   - Verify webhook secret
   - Check Firestore permissions

2. **User Shows as Free Despite Payment**
   - Verify Firebase UID in Stripe metadata
   - Check webhook processing logs
   - Ensure Firestore listener is active

3. **Usage Limits Not Enforcing**
   - Check date/timezone handling
   - Verify counter increment logic
   - Review feature access checks

### Debug Logging
The SubscriptionContext includes extensive logging:

```typescript
// ✅ CORRECT debug logging with FLAT structure
console.log('Doshi Sensei Debug: Raw user data from Firestore:', userData);
console.log('Doshi Sensei Debug: Subscription plan:', userData.subscription?.plan);
console.log('Doshi Sensei Debug: Subscription status:', userData.subscription?.status);
console.log('🔑 isFeatureAvailable check:', { feature, user, plan, limits });
```

### Webhook Event Tracking
All webhook events are logged to Firestore:
- `webhook_events/{eventId}` - Idempotency tracking
- `webhook_logs/{logId}` - Detailed event logs

This allows administrators to track payment flows and debug subscription issues.

## Security Considerations

1. **Server-side Validation**: All subscription checks should be validated server-side for critical features
2. **Firestore Rules**: Ensure users can only read/write their own subscription data
3. **Webhook Security**: Always verify Stripe signatures
4. **Price IDs**: Never trust client-side price information

## Critical Implementation Notes

### 🎯 SINGLE SOURCE OF TRUTH
The Firebase Functions webhook handler (`/functions/src/index.ts`) is the **ONLY** place that should write subscription data to Firestore. This ensures:
- Consistent data structure (FLAT, not nested)
- Secure payment validation
- Atomic updates with proper timestamps
- No client-side manipulation of payment data

### Known Issues & Cleanup
If you encounter:
1. **Nested subscription structure** - Run: `npm run tsx scripts/clean-invalid-subscriptions.ts`
2. **Invalid test subscription IDs** - Same cleanup script removes these
3. **Firestore index errors** - Run: `firebase deploy --only firestore:indexes`

## Future Enhancements

1. **Grace Period**: Allow access for a few days after failed payment
2. **Trial Periods**: Implement free trial functionality
3. **Proration**: Handle plan upgrades/downgrades mid-cycle
4. **Team Plans**: Support for multiple users under one subscription
5. **Usage Analytics**: Detailed reporting on feature usage patterns