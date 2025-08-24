# Stripe System Audit Results
## Doshi Sensei - Complete Stripe Integration Analysis
**Audit Date**: January 23, 2025
**Auditor**: System Audit Agent

---

## Executive Summary

The Doshi Sensei application currently has a **DUAL WEBHOOK IMPLEMENTATION** causing critical issues:
1. **Next.js API Routes** (`/src/app/api/stripe-webhook/route.ts`) - Processing webhooks with complex logic
2. **Google Cloud Functions** (`/functions/src/index.ts`) - Also processing the same webhooks

This dual implementation is causing:
- **Race conditions** between the two webhook endpoints
- **Data inconsistency** with different subscription structures
- **Duplicate event processing** despite idempotency attempts
- **Security concerns** with secrets in multiple locations

---

## 1. API Routes Inventory

### 1.1 Active Stripe API Routes in Next.js

#### `/api/stripe-webhook`
- **Purpose**: Main webhook handler for all Stripe events
- **Methods**: GET (health check), POST (webhook processing)
- **Used by**: Stripe Dashboard webhook configuration
- **Dependencies**: 
  - `stripe` SDK
  - Firebase Firestore
  - `entitlementManager`, `subscriptionManager`, `dynamicRules`
- **Business Logic**: 
  - Handles checkout completion
  - Updates user subscriptions
  - Manages cancellations
  - Processes payment success/failures
  - Generates custom invoices
  - Implements idempotency checking
  - Logs subscription history with deduplication

#### `/api/create-checkout-session`
- **Purpose**: Creates Stripe checkout sessions for new subscriptions
- **Methods**: POST
- **Used by**: `SubscriptionPlans.tsx` component
- **Dependencies**: 
  - `stripe` SDK
  - `apiRateLimiter` for rate limiting
- **Business Logic**:
  - Creates/retrieves Stripe customers
  - Updates customer metadata with Firebase UID
  - Creates checkout sessions with subscription metadata
  - Implements rate limiting per email

#### `/api/create-portal-session`
- **Purpose**: Creates Stripe billing portal sessions
- **Methods**: POST
- **Used by**: `SubscriptionPlans.tsx` component
- **Dependencies**: 
  - `serverFirebaseFunctions` (delegates to Cloud Function)
- **Business Logic**:
  - Actually delegates to Firebase Cloud Function
  - Acts as a proxy endpoint

#### `/api/cancel-subscription`
- **Purpose**: Cancels user subscriptions
- **Methods**: POST
- **Used by**: `useSubscription2` hook
- **Dependencies**:
  - `serverFirebaseFunctions` (delegates to Cloud Function)
- **Business Logic**:
  - Extracts user ID from token
  - Delegates to Firebase Cloud Function
  - Includes cancellation reason and feedback

#### `/api/get-prices`
- **Purpose**: Fetches current subscription prices from Stripe
- **Methods**: GET
- **Used by**: `useStripePrices` hook
- **Dependencies**:
  - `stripe` SDK
- **Business Logic**:
  - Caches prices for 1 hour
  - Provides fallback prices if Stripe is unavailable
  - Formats prices for different currencies

### 1.2 Cloud Functions Stripe Handlers

#### `stripeWebhook` (Firebase Function)
- **Purpose**: Duplicate webhook handler for Stripe events
- **Trigger**: HTTPS endpoint
- **Events Handled**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- **Business Logic**:
  - Updates subscription with FLAT structure (no nested objects)
  - Uses `update()` to replace entire subscription object
  - Saves subscription history
  - Different data structure than Next.js webhook

#### `createPortalSession` (Firebase Function)
- **Purpose**: Creates Stripe billing portal sessions
- **Used by**: `/api/create-portal-session` route (proxy)
- **Authentication**: Firebase ID token required

#### `cancelSubscription` (Firebase Function)
- **Purpose**: Cancels subscriptions with reason tracking
- **Used by**: `/api/cancel-subscription` route (proxy)
- **Authentication**: Firebase ID token required

---

## 2. Environment Variables & Secrets

### 2.1 Current Configuration Locations

| Variable | Location | Usage | Sensitive | Migration Notes |
|----------|----------|--------|-----------|-----------------|
| `STRIPE_SECRET_KEY` | .env, functions/.env | Backend API calls | **YES** | Move to Secret Manager |
| `STRIPE_WEBHOOK_SECRET` | .env, functions/.env | Webhook signature verification | **YES** | Move to Secret Manager |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | .env | Frontend Stripe.js | NO | Keep public |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` | .env | Checkout session creation | NO | Move to config file |
| `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` | .env | Checkout session creation | NO | Move to config file |
| `FALLBACK_MONTHLY_PRICE` | .env (optional) | Fallback pricing | NO | Move to config |
| `FALLBACK_YEARLY_PRICE` | .env (optional) | Fallback pricing | NO | Move to config |
| `FALLBACK_CURRENCY` | .env (optional) | Fallback currency | NO | Move to config |

### 2.2 Hardcoded Price IDs Found

In `functions/src/index.ts`:
```typescript
const planMap: { [key: string]: 'monthly' | 'yearly' } = {
  'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',  // £8.99/month (LIVE)
  'price_1RubMxHdrJomitOwElEo6nys': 'yearly'    // £89.99/year (LIVE)
};
```

**Security Risk**: Hardcoded production price IDs in source code

---

## 3. Frontend Component Analysis

### 3.1 Components Using Stripe

#### `SubscriptionPlans.tsx`
- **Stripe Dependencies**: 
  - `useStripePrices` hook
  - `useSubscription2` hook
  - `STRIPE_CONFIG` from `/lib/stripe`
- **API Calls**:
  - `/api/create-checkout-session` (creates new subscriptions)
  - `/api/create-portal-session` (manages billing)
- **Direct Stripe.js usage**: NO
- **Migration Impact**: **HIGH** - Core subscription UI component

#### `useStripePrices.ts` Hook
- **Purpose**: Fetches and formats subscription prices
- **API Calls**: `/api/get-prices`
- **Features**:
  - Price caching in component state
  - Fallback pricing support
  - Multi-currency formatting
- **Migration Impact**: **MEDIUM** - Needs endpoint update

#### `useStripePayment.ts` Hook
- **Purpose**: Handles payment operations
- **API Calls**: 
  - `/api/create-checkout-session`
  - `/api/create-portal-session`
- **Migration Impact**: **HIGH** - Core payment functionality

#### `useSubscription2.ts` Hook
- **Purpose**: Manages subscription state and operations
- **Dependencies**: Firebase Firestore, Auth
- **Features**:
  - Real-time subscription status
  - Checkout session creation
  - Subscription cancellation
- **Migration Impact**: **HIGH** - Central subscription management

#### `StripeContext.tsx` (if exists)
- **Status**: Referenced but not actively used
- **Migration Impact**: **LOW** - Can be removed

---

## 4. Data Flow Analysis

### 4.1 Subscription Creation Flow
```
User → SubscriptionPlans.tsx → /api/create-checkout-session → Stripe
         ↓
    Stripe Checkout → Payment → Webhook Event
         ↓
    BOTH ENDPOINTS RECEIVE:
    1. /api/stripe-webhook (Next.js) → Complex nested structure
    2. stripeWebhook (Cloud Function) → Flat structure
         ↓
    RACE CONDITION: Both try to update Firebase
```

### 4.2 Subscription Update Flow
```
Stripe Event → DUPLICATE PROCESSING:
    ├── Next.js Webhook:
    │   ├── Idempotency check
    │   ├── Update with nested structure
    │   ├── Entitlement manager updates
    │   └── Subscription history (with dedup)
    │
    └── Cloud Function Webhook:
        ├── No idempotency check
        ├── Update with flat structure
        └── Subscription history
```

---

## 5. Critical Issues Found

### 5.1 Duplicate Webhook Processing
- **Issue**: Both Next.js and Cloud Functions process the same events
- **Impact**: Data inconsistency, race conditions
- **Evidence**: Different data structures in updates
  - Next.js: Complex nested structure with `limits`, `currentUsage`
  - Cloud Function: Flat structure with only core fields

### 5.2 Inconsistent Data Structures
- **Next.js Webhook** creates:
```typescript
{
  subscription: { /* subscription data */ },
  limits: { maxLists, maxDrillsPerDay, ... },
  currentUsage: { listsCount, drillsToday, ... }
}
```
- **Cloud Function** creates:
```typescript
{
  subscription: {
    status, plan, stripeSubscriptionId, ...
    // No nested objects!
  }
}
```

### 5.3 Security Vulnerabilities
1. **Plain text secrets** in multiple `.env` files
2. **Hardcoded price IDs** in Cloud Function source
3. **No webhook retry mechanism** in Next.js implementation
4. **Missing rate limiting** on webhook endpoints

### 5.4 Incomplete Migrations
- Portal session and cancellation already moved to Cloud Functions
- But still proxied through Next.js API routes
- Checkout session creation still in Next.js

---

## 6. Dependencies Graph

```
Frontend Components
    ↓
[useSubscription2, useStripePrices, useStripePayment]
    ↓
Next.js API Routes
    ├── /api/create-checkout-session (Direct Stripe)
    ├── /api/get-prices (Direct Stripe)
    ├── /api/stripe-webhook (Direct Stripe)
    ├── /api/create-portal-session → Cloud Function
    └── /api/cancel-subscription → Cloud Function
    
Stripe Dashboard Webhooks
    ├── → Next.js Webhook Endpoint
    └── → Cloud Function Webhook Endpoint (DUPLICATE!)
```

---

## 7. Risk Assessment

### High Risk
1. **Data Corruption**: Conflicting updates from dual webhooks
2. **Lost Subscriptions**: Race conditions may overwrite valid data
3. **Security Breach**: Plain text secrets in multiple locations
4. **Customer Impact**: Inconsistent subscription states

### Medium Risk
1. **Performance**: Duplicate processing wastes resources
2. **Debugging**: Hard to trace which system updated what
3. **Compliance**: Subscription data in inconsistent state

### Low Risk
1. **Code Maintenance**: Duplicate code in two systems
2. **Testing**: Need to test both implementations

---

## 8. Migration Recommendations

### Immediate Actions (Critical)
1. **DISABLE one webhook endpoint immediately** to stop race conditions
2. **Choose single data structure** (recommend Cloud Function's flat structure)
3. **Move secrets to Google Secret Manager**

### Phase 1: Consolidation (Week 1)
1. Consolidate all webhook processing to Cloud Functions
2. Remove Next.js webhook route
3. Update Stripe Dashboard to single webhook URL

### Phase 2: API Migration (Week 2)
1. Move `/api/create-checkout-session` to Cloud Function
2. Move `/api/get-prices` to Cloud Function
3. Remove proxy routes, call Cloud Functions directly

### Phase 3: Security (Week 2-3)
1. Implement Google Secret Manager
2. Add webhook retry logic
3. Implement rate limiting
4. Add comprehensive logging

### Phase 4: Testing & Cleanup (Week 3-4)
1. Test all payment flows
2. Remove old Next.js routes
3. Update documentation
4. Monitor for issues

---

## 9. Actionable Next Steps

1. **TODAY**: Disable Next.js webhook endpoint (`/api/stripe-webhook`)
2. **TODAY**: Update Stripe Dashboard to use only Cloud Function webhook
3. **Tomorrow**: Begin moving secrets to Google Secret Manager
4. **This Week**: Migrate checkout session creation to Cloud Function
5. **This Week**: Implement proper idempotency in Cloud Function

---

## Appendix A: File Locations

### Next.js Files to Remove/Migrate
- `/src/app/api/stripe-webhook/route.ts` - REMOVE after migration
- `/src/app/api/create-checkout-session/route.ts` - MIGRATE to Cloud Function
- `/src/app/api/get-prices/route.ts` - MIGRATE to Cloud Function
- `/src/app/api/create-portal-session/route.ts` - UPDATE to direct call
- `/src/app/api/cancel-subscription/route.ts` - UPDATE to direct call

### Cloud Function Files to Enhance
- `/functions/src/index.ts` - Add missing webhook features
- `/functions/src/admin-operations.ts` - Add checkout session creation

### Configuration Files
- `/src/lib/stripe.ts` - Centralize configuration
- `/src/config/payment-providers.ts` - Payment provider config

---

## Appendix B: Testing Checklist

- [ ] New subscription creation
- [ ] Subscription renewal
- [ ] Subscription upgrade/downgrade
- [ ] Subscription cancellation
- [ ] Failed payment handling
- [ ] Portal access
- [ ] Price fetching
- [ ] Webhook deduplication
- [ ] Rate limiting
- [ ] Error recovery

---

**End of Audit Report**