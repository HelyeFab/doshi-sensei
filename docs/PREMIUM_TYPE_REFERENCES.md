# Premium Type References

This document tracks all locations where code specifically expects 'monthly' or 'yearly' instead of a generic 'premium' type. This is important for future refactoring if we decide to consolidate to a single 'premium' type.

## Current Architecture
- **SubscriptionContext** returns: 'guest', 'free', 'monthly', or 'yearly'
- **Entitlements system** supports: 'guest', 'free', 'monthly', 'yearly', and 'premium' (legacy)
- **Subscription validator** returns: 'guest', 'free', or 'premium'

## Files That Check for Monthly/Yearly

### 1. `/src/hooks/useEntitlements.ts`
```typescript
// Line ~297
const isPremium = userType === 'monthly' || userType === 'yearly' || userType === 'premium';
```

### 2. `/src/contexts/SubscriptionContext.tsx`
```typescript
// Line ~282-284
if (userSubscription.subscription.status === 'active' &&
  (userSubscription.subscription.plan === 'monthly' ||
    userSubscription.subscription.plan === 'yearly')) {
  return userSubscription.subscription.plan; // Returns 'monthly' or 'yearly'
}
```

### 3. `/src/utils/userEntitlements.ts`
```typescript
// Lines 117-144: Monthly entitlements definition
monthly: {
  games: { kanjiQuest: { daily: -1, enabled: true }, ... }
  // Full unlimited access
}

// Lines 146-174: Yearly entitlements definition  
yearly: {
  games: { kanjiQuest: { daily: -1, enabled: true }, ... }
  // Same as monthly
}

// Lines 177-204: Legacy premium mapping
premium: {
  // Maps to same unlimited access
}
```

### 4. `/src/components/games/KanjiQuest.tsx`
```typescript
// Line ~195
const isPremium = userType === 'monthly' || userType === 'yearly';
```

### 5. `/src/app/favourites/page.tsx`
```typescript
// Line ~54
const isPremiumEntitlement = // Uses useEntitlements hook which checks monthly/yearly
```

### 6. `/src/app/stories/page.tsx`
```typescript
// Line ~28
const isPremium = userType === 'monthly' || userType === 'yearly';
```

### 7. `/src/app/stories/[slug]/page.tsx`
```typescript
// Line ~28
const isPremium = userType === 'monthly' || userType === 'yearly';
```

### 8. `/src/components/story/StoryReader.tsx`
```typescript
// Line ~48
const isPremium = userType === 'monthly' || userType === 'yearly';
```

### 9. `/src/components/reading/ArticleReader.tsx`
```typescript
// Line ~324
const isPremium = userType === 'monthly' || userType === 'yearly';
```

### 10. `/src/types/subscription.ts`
```typescript
// UserSubscription interface expects plan: 'free' | 'monthly' | 'yearly'
// Functions like isPremiumPlan() check for 'monthly' || 'yearly'
```

### 11. `/src/utils/subscriptionValidator.ts`
```typescript
// Line ~69-71
let userType: UserType = 'guest';
if (hasUser) {
  userType = isPremium ? 'premium' : 'free'; // Returns 'premium', not monthly/yearly
}
```

### 12. `/src/app/api/stripe-webhook/route.ts`
```typescript
// Lines checking plan === 'monthly' || plan === 'yearly'
// Uses actual Stripe plan IDs
```

## Migration Strategy (If Needed)

If we decide to consolidate to a single 'premium' type:

1. **Update SubscriptionContext** (line ~284):
   ```typescript
   return 'premium'; // Instead of subscription.plan
   ```

2. **Update all isPremium checks** to only check for 'premium':
   ```typescript
   const isPremium = userType === 'premium';
   ```

3. **Keep entitlements system** as-is (already supports 'premium')

4. **Update TypeScript types** to reflect the change

5. **Ensure backward compatibility** for existing data

## Notes
- The entitlements system already supports 'premium' as a legacy type with full access
- Most components that check isPremium already include 'premium' in their checks
- The main change would be in SubscriptionContext's userType determination
- Database and Stripe webhooks would still use monthly/yearly for billing