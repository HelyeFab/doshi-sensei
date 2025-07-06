# Entitlements System Migration Plan

## Migration Status: Phase 1-3 COMPLETED ✅

**Last Updated**: January 5, 2025

### Completed Work
- ✅ Phase 1: Fixed critical issues (incorrect drill limits, hardcoded values)
- ✅ Phase 2: Migrated all core features (KanjiQuest, Drills, Stories, Articles, Lists)
- ✅ Phase 3: Updated backend integration (Stripe webhook, type definitions)
- 🔄 Phase 4: Documentation & cleanup (in progress)

## Executive Summary

This document outlines the migration from scattered hardcoded user limits to a centralized entitlements system. The migration will ensure consistent feature access control across the entire Doshi Sensei application.

## Current State Analysis

### Problems with Current Implementation
1. **Inconsistent Limits**: Different files have different values (e.g., 50 vs 3 drills/day)
2. **Maintenance Nightmare**: Limits defined in 8+ different files
3. **No Single Source of Truth**: Each feature implements its own limit checking
4. **Difficult to Update**: Changing limits requires updating multiple files

### New Entitlements System Benefits
1. **Single Source of Truth**: All limits defined in one place
2. **Type-Safe**: Full TypeScript support with interfaces
3. **Easy Maintenance**: Update limits in one location
4. **Consistent UX**: Same patterns across all features
5. **Future-Proof**: Easy to add new features and limits

## Migration Strategy

### Phase 1: Critical Fixes (Est. 2 hours)

#### 1.1 Fix UsageLimitDisplay Component
**File**: `src/components/UsageLimitDisplay.tsx`
**Issue**: Shows 50 drills/day instead of 3
**Fix**:
```typescript
// Remove:
const FREE_LIMITS = {
  maxDrillsPerDay: 50, // WRONG!
  maxLists: 3,
  canSync: false,
  canSave: true,
};

// Replace with:
import { useEntitlements } from '@/hooks/useEntitlements';

// In component:
const { getLimit } = useEntitlements();
const drillLimit = getLimit('learning.drills', 'daily');
```

#### 1.2 Update SubscriptionContext
**File**: `src/contexts/SubscriptionContext.tsx`
**Lines**: 70-78, 146-154, 330, 339
**Fix**:
```typescript
// Remove all hardcoded limits
// Import entitlements utility
import { getEntitlementsForUserType } from '@/utils/userEntitlements';

// Use dynamic limits
const userEntitlements = getEntitlementsForUserType('free');
```

### Phase 2: Core Features Migration (Est. 4-6 hours)

#### 2.1 KanjiQuest Game
**File**: `src/components/games/KanjiQuest.tsx`
**Current Implementation**: Lines 195-196 hardcode limits
**Migration Steps**:
1. Add `useEntitlements` hook import
2. Replace `canPlay = isFeatureAvailable('kanjiquest')` with entitlements check
3. Use `canPlayGame('kanjiQuest')` method
4. Remove hardcoded limit values

**Before**:
```typescript
const maxEncounters = userType === 'guest' ? 3 : (userSubscription?.limits?.maxKanjiQuestPerDay || 3);
```

**After**:
```typescript
const { canPlayGame } = useEntitlements();
const gameCheck = canPlayGame('kanjiQuest');
if (!gameCheck.allowed) {
  promptForAccess('Pokémon encounters', gameCheck.reason);
  return;
}
```

#### 2.2 Drill System
**File**: `src/app/drill/page.tsx`
**Migration Steps**:
1. Replace hardcoded limit display
2. Use `useEntitlements` for access checks
3. Update limit messages dynamically

#### 2.3 Story System
**Files**: Need to locate story access checks
**Migration Steps**:
1. Find all story limit checks
2. Replace with `canReadStory()`
3. Update usage tracking

#### 2.4 Article System
**Files**: Need to locate article access checks
**Migration Steps**:
1. Find all article limit checks
2. Replace with `canReadArticle()`
3. Ensure bookmark limits use entitlements

#### 2.5 List Creation
**File**: `src/app/practice/page.tsx` (line 713)
**Current**: Alert with hardcoded limit
**Fix**:
```typescript
const { canCreateList, getLimit } = useEntitlements();
const listCheck = canCreateList();
if (!listCheck.allowed) {
  alert(`You've reached the maximum of ${listCheck.limit} lists. Upgrade to create unlimited lists!`);
  return;
}
```

### Phase 3: Backend Integration (Est. 2-3 hours)

#### 3.1 Stripe Webhook Handler
**File**: `src/app/api/stripe-webhook/route.ts`
**Lines**: 161-164, 204-207
**Migration**:
1. Import entitlements utility (not hook - this is server-side)
2. Replace hardcoded FREE_LIMITS
3. Use `getEntitlementsForUserType()` for plan-based limits

#### 3.2 Type Definitions
**File**: `src/types/subscription.ts`
**Migration**:
1. Update DEFAULT_FREE_SUBSCRIPTION to use entitlements
2. Update GUEST_LIMITS to use entitlements
3. Keep types for backwards compatibility

### Phase 4: Documentation & Cleanup (Est. 1 hour)

#### 4.1 Update Plan Descriptions
**File**: `src/types/subscription.ts` - SUBSCRIPTION_PLANS array
**Update**: Feature descriptions to match entitlements

#### 4.2 Remove Old Code
1. Remove unused limit constants
2. Clean up duplicate limit definitions
3. Update comments and documentation

## Implementation Checklist

### Pre-Migration
- [ ] Create feature branch `feature/entitlements-migration`
- [ ] Review current entitlements system implementation
- [ ] Set up test scenarios for each user type

### Phase 1 Checklist
- [ ] Fix UsageLimitDisplay drill limit (50 → 3)
- [ ] Update SubscriptionContext FREE_LIMITS
- [ ] Update SubscriptionContext GUEST limits
- [ ] Test limit displays for all user types

### Phase 2 Checklist
- [ ] Migrate KanjiQuest to use entitlements
- [ ] Migrate Drill system to use entitlements
- [ ] Migrate Story system to use entitlements
- [ ] Migrate Article system to use entitlements
- [ ] Migrate List creation to use entitlements
- [ ] Test all features with guest/free/premium users

### Phase 3 Checklist ✅ COMPLETED
- [x] Update Stripe webhook handler
- [x] Update subscription type defaults
- [x] Test subscription changes trigger correct limits

### Phase 4 Checklist
- [ ] Update documentation
- [ ] Remove deprecated code
- [ ] Final testing pass
- [ ] Create pull request

## Testing Guide

### Test Scenarios

#### Guest User Tests
1. Can play 3 games per day (KanjiQuest, KanaDrop)
2. Can do 3 drills per day
3. Cannot create lists
4. Cannot bookmark articles
5. See login prompt when limits reached

#### Free User Tests
1. Can play 3 games per day
2. Can do 3 drills per day
3. Can create up to 3 lists
4. Can bookmark up to 5 articles
5. See upgrade prompt when limits reached

#### Premium User Tests
1. Unlimited games
2. Unlimited drills
3. Unlimited lists
4. Unlimited bookmarks
5. No limit prompts shown

### Testing Commands
```bash
# Run tests
npm test

# Test as different users
# 1. Log out (test as guest)
# 2. Create free account
# 3. Use admin to upgrade account to premium
```

## Rollback Plan

If issues arise:
1. The old system remains functional alongside the new one
2. Can revert by switching back to old limit checks
3. All changes are isolated to specific components

## Success Criteria

1. All features use centralized entitlements system
2. No more hardcoded limits in components
3. Consistent limit enforcement across the app
4. All tests passing
5. No user-facing breaking changes

## Notes for Future Development

### Adding New Features
1. Define limits in `userEntitlements.ts`
2. Add specific check method in `useEntitlements.ts` if needed
3. Use the hook in components
4. Document the feature limits

### Changing Limits
1. Update values in `userEntitlements.ts`
2. No other code changes needed
3. Changes apply immediately across the app

### Adding New User Types
1. Add type to `UserType` in `types/subscription.ts`
2. Define entitlements in `ENTITLEMENTS_BY_USER_TYPE`
3. System automatically handles the new type

## Migration Timeline

- **Day 1**: Phase 1 (Critical Fixes) + Phase 2.1-2.2
- **Day 2**: Phase 2.3-2.5 + Phase 3
- **Day 3**: Phase 4 + Testing + PR Review

Total estimated time: 10-12 hours of development + testing