# New Clean Architecture

## Overview
Single source of truth using Three-Pillar Architecture with clean, flat subscription structure.

## Data Structure

### User Document (Firestore)
```typescript
{
  // User Identity
  uid: string,                    // Firebase Auth UID
  email: string,                  // User email
  displayName: string | null,     // Optional display name
  
  // Timestamps
  createdAt: Timestamp,          // Account creation
  lastLoginAt: Timestamp,        // Last login time
  updatedAt: Timestamp,          // Last update
  
  // Status
  isActive: boolean,             // Account active status
  
  // Clean Subscription Object (Managed by Stripe Webhook)
  subscription: {
    // Core Fields
    status: 'active' | 'inactive' | 'canceled' | 'past_due',
    plan: 'free' | 'monthly' | 'yearly',
    
    // Stripe Integration
    stripeSubscriptionId?: string,   // sub_xxx
    stripeCustomerId?: string,       // cus_xxx
    stripePriceId?: string,          // price_xxx
    
    // Timing
    currentPeriodEnd?: Timestamp,    // When current period ends
    cancelAtPeriodEnd?: boolean,     // Scheduled cancellation
    canceledAt?: Timestamp,          // When canceled
    
    // Metadata
    metadata: {
      source: 'stripe' | 'admin' | 'system',
      createdAt: Timestamp,
      updatedAt: Timestamp
    }
  }
}
```

### What's NOT in User Document
- ❌ No entitlements
- ❌ No limits
- ❌ No currentUsage
- ❌ No nested structures
- ❌ No feature flags

These are ALL handled by the Three-Pillar system!

## Three-Pillar Architecture

### Pillar 1: Subscriptions (`/src/lib/subscriptions/`)
**Responsibility**: Manage subscription state only
```typescript
// Gets subscription from user document
const subscription = await subscriptionManager.getSubscription(userId);

// Returns clean structure
{
  status: 'active',
  plan: 'monthly',
  stripeSubscriptionId: 'sub_xxx',
  // ... etc
}
```

### Pillar 2: Entitlements (`/src/lib/entitlements/`)
**Responsibility**: Define what users can do
```typescript
// Dynamic rules loaded from Firestore (admin-editable)
const rules = await dynamicRules.getRules();

// Example rule for monthly users
{
  userTypes: ['monthly'],
  permissions: ['*'],  // All permissions
  limits: {
    daily: {
      drill_practice: -1,      // Unlimited
      article_reading: -1,     // Unlimited
      // ... etc
    }
  }
}
```

### Pillar 3: Features (`/src/lib/features/`)
**Responsibility**: Define features and track usage
```typescript
// Feature registry
{
  id: 'drill_practice',
  name: 'Conjugation Practice',
  path: 'drill/practice',
  trackingType: 'daily',
  // ... etc
}
```

### Unified Access API (`/src/lib/access/`)
**Responsibility**: Single point for all access checks
```typescript
// Check and track in one call
const canAccess = await checkAndTrack('drill_practice');
if (!canAccess) {
  // Limit reached, modal shown automatically
  return;
}
```

## Stripe Webhook Flow

### 1. Customer Makes Purchase
```
Stripe Checkout → Payment → Webhook Event
```

### 2. Firebase Function Receives Event
```typescript
// Clean webhook handler
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Extract clean data
  const plan = mapPriceIdToPlan(subscription.items.data[0].price.id);
  
  // Write clean structure
  await db.collection('users').doc(firebaseUID).set({
    subscription: {
      status: subscription.status,
      plan: plan,
      stripeSubscriptionId: subscription.id,
      // ... etc
    }
  }, { merge: true });
}
```

### 3. Three-Pillar System Takes Over
```
User Document → Subscription Manager → Entitlements → Access Decision
```

## Key Improvements

### 1. Single Source of Truth
- Subscription state in ONE place
- No nested structures
- No conflicting data

### 2. Dynamic Configuration
- Change limits without deploying
- A/B test features easily
- Instant updates via admin dashboard

### 3. Clean Separation
- Webhook ONLY writes subscription
- Access system ONLY reads subscription
- No mixing of concerns

### 4. Reliable Payment Flow
```
Payment → Clean Structure → Correct Access
```
No more payment failures!

## Code Examples

### Checking Access (React)
```typescript
import { useAccess } from '@/hooks/useAccess';

function GameComponent() {
  const { checkAndTrack } = useAccess();
  
  const startGame = async () => {
    const canPlay = await checkAndTrack('kanji_quest');
    if (canPlay) {
      // Start the game
    }
    // Modal shown automatically if limit reached
  };
}
```

### Getting User Type
```typescript
import { useSubscription2 } from '@/hooks/useSubscription2';

function PricingPage() {
  const { userType, isPremium } = useSubscription2();
  
  // userType: 'guest' | 'free' | 'monthly' | 'yearly'
  // isPremium: true for monthly/yearly
}
```

### Admin Dashboard Integration
```typescript
// Change limits dynamically at /admin/features
// Changes apply instantly to all users
// No code deployment needed!
```

## Migration Benefits

1. **Reliability**: No more nested structure bugs
2. **Flexibility**: Change features without code
3. **Clarity**: Clear separation of concerns
4. **Performance**: Efficient access checks
5. **Maintainability**: Simple, clean code

---

Next: [Validation Tests →](06-VALIDATION-TESTS.md)