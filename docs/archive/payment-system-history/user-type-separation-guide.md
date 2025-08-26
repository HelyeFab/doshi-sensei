# User Type Separation: Authentication vs Subscription Tier

## Overview

This document describes the separation of authentication status from subscription tier in the Doshi Sensei codebase. The previous `UserType` mixed authentication concerns (`'guest'`) with subscription tiers (`'free'`, `'monthly'`, `'yearly'`), creating semantic confusion.

## Problem Statement

The original `UserType = 'guest' | 'free' | 'monthly' | 'yearly'` had conceptual issues:

- **'guest'** represents authentication status (not logged in)
- **'free', 'monthly', 'yearly'** represent subscription tiers
- This mixing made it unclear whether a user was authenticated or what tier they had
- Logic like "is user authenticated?" required checking `userType !== 'guest'`
- Hard to distinguish between "anonymous user" and "authenticated free user"

## New Type Structure

### Core Types

```typescript
// Authentication status - whether user is logged in
type AuthStatus = 'authenticated' | 'anonymous';

// Subscription tier - payment/subscription level
type SubscriptionTier = 'free' | 'monthly' | 'yearly';

// Combined profile with separated concerns
interface UserProfile {
  authStatus: AuthStatus;
  subscriptionTier: SubscriptionTier;
  userId?: string; // Only present when authenticated
  
  // Backward compatibility helper
  get legacyUserType(): LegacyUserType;
}
```

### Mapping Logic

| Authentication | Subscription | Legacy UserType | UserProfile |
|---------------|-------------|-----------------|-------------|
| Anonymous | N/A | `'guest'` | `{ authStatus: 'anonymous', subscriptionTier: 'free' }` |
| Authenticated | Free | `'free'` | `{ authStatus: 'authenticated', subscriptionTier: 'free', userId: 'xyz' }` |
| Authenticated | Monthly | `'monthly'` | `{ authStatus: 'authenticated', subscriptionTier: 'monthly', userId: 'xyz' }` |
| Authenticated | Yearly | `'yearly'` | `{ authStatus: 'authenticated', subscriptionTier: 'yearly', userId: 'xyz' }` |

## Updated Functions

### New Functions (Recommended)

```typescript
// Primary function - returns separated concerns
function getUserProfile(subscription: UserSubscription | null, userId?: string): UserProfile

// Individual concern accessors
function getAuthStatus(subscription: UserSubscription | null): AuthStatus
function getSubscriptionTier(subscription: UserSubscription | null): SubscriptionTier
```

### Legacy Functions (Deprecated)

```typescript
// Still works but deprecated
function getUserType(subscription: UserSubscription | null): UserType // @deprecated
```

## Migration Strategy

### Phase 1: Backward Compatibility (Current)

✅ **COMPLETED**
- New types and functions added
- All existing code continues to work unchanged
- Legacy `UserType` still supported
- `AuthContext` provides both old and new properties

### Phase 2: Gradual Migration (Future)

Components can incrementally adopt new types:

```typescript
// OLD CODE (still works)
const { userType } = useAuth();
if (userType === 'guest') { /* anonymous logic */ }
if (userType !== 'guest') { /* authenticated logic */ }
if (userType === 'monthly' || userType === 'yearly') { /* premium logic */ }

// NEW CODE (recommended)
const { authStatus, subscriptionTier } = useAuth();
if (authStatus === 'anonymous') { /* anonymous logic */ }
if (authStatus === 'authenticated') { /* authenticated logic */ }
if (subscriptionTier === 'monthly' || subscriptionTier === 'yearly') { /* premium logic */ }

// OR use UserProfile
const { userProfile } = useAuth();
if (!isAuthenticated(userProfile)) { /* anonymous logic */ }
if (isAuthenticated(userProfile)) { /* authenticated logic */ }
if (hasPremiumSubscription(userProfile)) { /* premium logic */ }
```

### Phase 3: Full Migration (Future)

Eventually, legacy types can be removed once all code is migrated.

## Usage Examples

### AuthContext Usage

```typescript
const {
  // Legacy (deprecated but still works)
  userType,
  
  // New separated concerns
  authStatus,        // 'authenticated' | 'anonymous'
  subscriptionTier,  // 'free' | 'monthly' | 'yearly'
  userProfile        // Complete UserProfile object
} = useAuth();

// Check authentication
if (authStatus === 'authenticated') {
  // User is logged in
}

// Check subscription
if (subscriptionTier === 'monthly' || subscriptionTier === 'yearly') {
  // User has premium subscription
}

// Using helper functions
if (isAuthenticated(userProfile)) {
  // User is logged in
}

if (hasPremiumSubscription(userProfile)) {
  // User has premium subscription
}

if (isPremiumUser(userProfile)) {
  // User is both authenticated AND has premium subscription
}
```

### Component Migration Example

```typescript
// BEFORE: Mixed concerns
function MyComponent() {
  const { userType } = useAuth();
  
  const isLoggedIn = userType !== 'guest';
  const isPremium = userType === 'monthly' || userType === 'yearly';
  const isAnonymous = userType === 'guest';
  
  // ... rest of component
}

// AFTER: Separated concerns
function MyComponent() {
  const { authStatus, subscriptionTier } = useAuth();
  
  const isLoggedIn = authStatus === 'authenticated';
  const isPremium = subscriptionTier === 'monthly' || subscriptionTier === 'yearly';
  const isAnonymous = authStatus === 'anonymous';
  
  // ... rest of component
}

// OR using UserProfile helpers
function MyComponent() {
  const { userProfile } = useAuth();
  
  const isLoggedIn = isAuthenticated(userProfile);
  const isPremium = hasPremiumSubscription(userProfile);
  const isAnonymous = !isAuthenticated(userProfile);
  
  // ... rest of component
}
```

## Files Modified

### Core Type System
- `/src/types/user-profile.ts` - **NEW**: Separated type definitions
- `/src/types/subscription.ts` - Updated with new functions, legacy marked deprecated
- `/src/lib/subscriptions/manager.ts` - Added new methods, deprecated old ones

### Context
- `/src/contexts/AuthContext.tsx` - Added new properties while maintaining legacy ones

### Files Using UserType (Need Future Migration)
- `/src/lib/entitlements/types.ts` - Uses UserType in entitlements system
- `/src/lib/entitlements/rules.ts` - Defines limits per UserType
- `/src/lib/access/index.ts` - Access control logic
- `/src/hooks/useSubscription2.ts` - Subscription management
- Various cache managers and utility files

## Benefits

### Clearer Semantics
- Authentication status is explicit: `authStatus`
- Subscription tier is explicit: `subscriptionTier`
- No more confusion about what `'guest'` vs `'free'` means

### Better Type Safety
- TypeScript can better enforce authentication requirements
- Clearer function signatures
- Less ambiguous logic

### Easier Testing
- Can test authentication and subscription concerns independently
- More predictable state combinations
- Better test coverage of edge cases

### Future Flexibility
- Easy to add new subscription tiers without touching authentication logic
- Can add more authentication methods without affecting subscription logic
- Better separation of concerns for complex features

## Risks and Considerations

### Low Risk (Mitigated)
- **Breaking Changes**: ✅ Avoided with backward compatibility
- **Performance**: ✅ Minimal overhead, cached properties
- **Complexity**: ✅ Hidden behind compatible API

### Medium Risk (Monitored)
- **Developer Confusion**: Two ways to do things during transition
- **Migration Burden**: Need to update many files eventually
- **Documentation Debt**: Need to update docs and examples

### Migration Path Forward

1. **Immediate**: Use new types in new features
2. **Gradual**: Update existing components during maintenance
3. **Eventually**: Remove deprecated functions after full migration

## Testing Strategy

### Current Tests
- All existing tests still pass
- Legacy functions work identically
- AuthContext provides all expected properties

### New Tests Needed
- Test new UserProfile functions
- Test edge cases with separated concerns
- Test migration helper functions

### Integration Tests
- Verify AuthContext provides consistent data
- Test subscription state changes
- Test authentication flow with new properties

## Conclusion

This separation provides a cleaner foundation for user state management while maintaining complete backward compatibility. The migration can be gradual and low-risk, with immediate benefits for new code and long-term benefits for maintainability.

The key insight is that "who you are" (authentication) and "what you pay for" (subscription) are fundamentally different concerns that should be modeled separately.