# Phase 1 Implementation Checklist

**Timeline**: Week 1 (7 days)  
**Goal**: Build the new subscription system without touching existing code

## Day 1-2: Core Infrastructure

### Morning Day 1
- [ ] Create new folder structure
  ```
  src/
    lib/
      entitlements/
        index.ts
        types.ts
        rules.ts
        manager.ts
      features/
        index.ts
        types.ts
        registry.ts
        manager.ts
      subscriptions/
        index.ts
        types.ts
        manager.ts
        stripe-handler.ts
      access/
        index.ts
        types.ts
        usage-tracker.ts
  ```

- [ ] Define TypeScript interfaces
  - [ ] `EntitlementRule` interface
  - [ ] `Feature` interface
  - [ ] `Subscription` interface
  - [ ] `AccessResult` interface
  - [ ] `UsageRecord` interface

### Afternoon Day 1
- [ ] Set up base classes with method signatures
  - [ ] `EntitlementManager` class
  - [ ] `FeatureManager` class
  - [ ] `SubscriptionManager` class
  - [ ] `UsageTracker` class
  - [ ] `AccessControl` class

### Day 2
- [ ] Implement error handling and logging
  - [ ] Custom error classes
  - [ ] Structured logging with context
  - [ ] Debug mode for development

- [ ] Create test harness
  - [ ] Unit test setup for each module
  - [ ] Mock data generators
  - [ ] Test utilities

## Day 3-4: Implement Three Pillars

### Day 3: Entitlements & Features
- [ ] Implement Entitlements System
  - [ ] Define all entitlement rules
    - [ ] Guest user entitlements
    - [ ] Free user entitlements
    - [ ] Monthly user entitlements
    - [ ] Yearly user entitlements
  - [ ] Create `EntitlementManager`
    - [ ] `getEntitlementsForUser(userType)`
    - [ ] `checkPermission(userType, permission)`
    - [ ] `getLimit(userType, feature, limitType)`

- [ ] Implement Features System
  - [ ] Create complete feature registry
    ```typescript
    // All current features
    - drill_practice
    - kanji_quest
    - kana_drop
    - article_reading
    - story_reading
    - word_lists
    - bookmarks
    - cloud_sync
    - progress_saving
    - kanji_moods
    ```
  - [ ] Create `FeatureManager`
    - [ ] `getFeature(featureId)`
    - [ ] `getAllFeatures()`
    - [ ] `getFeaturesByCategory(category)`

### Day 4: Subscriptions
- [ ] Implement Subscription Manager
  - [ ] `getSubscription(userId)`
  - [ ] `createSubscription(userId, plan)`
  - [ ] `updateSubscription(userId, updates)`
  - [ ] `cancelSubscription(userId)`

- [ ] Stripe Integration
  - [ ] Webhook handler for new system
  - [ ] Checkout session creation
  - [ ] Subscription sync logic
  - [ ] Error recovery mechanisms

- [ ] Firebase Integration
  - [ ] Define new Firestore structure
  - [ ] Create read/write methods
  - [ ] Set up real-time listeners
  - [ ] Implement caching layer

## Day 5-6: Unified Access API & Admin Features

### Day 5: Access Control
- [ ] Implement `AccessControl` class
  - [ ] `canUserAccess(userId, featureId)`
  - [ ] `getUserLimits(userId)`
  - [ ] `getRemainingUsage(userId, featureId)`
  - [ ] `checkAndTrackUsage(userId, featureId)`

- [ ] Implement `UsageTracker`
  - [ ] `getUsage(userId, featureId, period)`
  - [ ] `incrementUsage(userId, featureId)`
  - [ ] `resetDailyUsage()` - for midnight resets
  - [ ] `getUserUsageSummary(userId)`

- [ ] Guest user support
  - [ ] Local storage for guest usage
  - [ ] Session management
  - [ ] Migration to user account

### Day 6: Admin Feature Matrix
- [ ] Create Feature Matrix Components
  - [ ] `FeatureMatrixPage` component
  - [ ] `FeatureMatrixTable` component
  - [ ] `FeatureRow` component
  - [ ] `AccessDisplay` component

- [ ] Implement Data Fetching
  - [ ] Hook: `useFeatureMatrix()`
  - [ ] Real-time updates
  - [ ] Caching strategy

- [ ] Add Export Functionality
  - [ ] CSV export
  - [ ] JSON export
  - [ ] Copy to clipboard

- [ ] Create Admin API Endpoints
  - [ ] `/api/admin/features` - Get all features
  - [ ] `/api/admin/entitlements` - Get entitlement rules
  - [ ] `/api/admin/feature-matrix` - Get complete matrix

## Day 7: React Integration & Testing

### Morning: React Hooks
- [ ] Create `useAccess` hook
  ```typescript
  const { 
    canAccess, 
    checkAccess, 
    trackUsage, 
    limits, 
    usage 
  } = useAccess();
  ```

- [ ] Create `useFeature` hook
  ```typescript
  const { 
    feature, 
    isAvailable, 
    limit, 
    remaining 
  } = useFeature('kanji_quest');
  ```

- [ ] Create `useSubscription2` hook (temporary name)
  ```typescript
  const { 
    subscription, 
    isLoading, 
    error, 
    upgrade 
  } = useSubscription2();
  ```

### Afternoon: Testing
- [ ] Unit Tests
  - [ ] Test entitlement rules for all user types
  - [ ] Test feature registry
  - [ ] Test access control logic
  - [ ] Test usage tracking
  - [ ] Test limit enforcement

- [ ] Integration Tests
  - [ ] Test complete access flow
  - [ ] Test usage tracking with Firebase
  - [ ] Test subscription updates
  - [ ] Test guest → user migration

- [ ] Admin Dashboard Tests
  - [ ] Test feature matrix display
  - [ ] Test export functionality
  - [ ] Test real-time updates

## Deliverables Checklist

### Code Deliverables
- [ ] `/src/lib/entitlements/` - Complete module
- [ ] `/src/lib/features/` - Complete module
- [ ] `/src/lib/subscriptions/` - Complete module
- [ ] `/src/lib/access/` - Complete module
- [ ] `/src/hooks/useAccess.ts`
- [ ] `/src/hooks/useFeature.ts`
- [ ] `/src/hooks/useSubscription2.ts`
- [ ] `/src/app/admin/features/` - Feature matrix page
- [ ] `/src/components/admin/feature-matrix/` - Components

### Documentation Deliverables
- [ ] API documentation for each module
- [ ] Integration guide
- [ ] Migration plan from old to new
- [ ] Admin dashboard user guide

### Test Deliverables
- [ ] 90%+ test coverage
- [ ] All tests passing
- [ ] Performance benchmarks
- [ ] Load test results

## Definition of Done

Each item is considered complete when:
1. Code is written and follows TypeScript best practices
2. Unit tests are written and passing
3. Documentation is updated
4. Code review completed (self-review for now)
5. No TypeScript errors
6. Follows project style guide

## Daily Standup Questions

At the end of each day, answer:
1. What was completed today?
2. What blockers were encountered?
3. What's the plan for tomorrow?
4. Are we on track for the weekly goal?

## Risk Monitoring

Track these potential risks daily:
- [ ] Stripe API complexity higher than expected
- [ ] Firebase structure migration complexity
- [ ] Performance issues with usage tracking
- [ ] Edge cases in entitlement rules

## Success Metrics

By end of Phase 1:
- [ ] New system runs independently
- [ ] All features have access rules defined
- [ ] Admin can view feature matrix
- [ ] 0 impact on existing system
- [ ] Ready for Phase 2 parallel run

---

**Note**: This checklist should be updated daily. Check off items as completed and add notes about any deviations from the plan.