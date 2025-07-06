# Subscription System Complete Rebuild Plan

**Author**: Senior Development Team  
**Date**: January 6, 2025  
**Status**: APPROVED - Ready for Implementation  
**Estimated Timeline**: 2-3 weeks with phased rollout

## Executive Summary

The current subscription system has accumulated significant technical debt with three different data structures in production, scattered entitlement checks, and increasing complexity with each patch. This document outlines a complete rebuild using a clean three-pillar architecture that will be more maintainable, scalable, and reliable.

## Current Problems Summary

1. **Three incompatible data structures in production**:
   - Double-nested: `subscription.subscription.plan`
   - Single-nested: `subscription.plan` 
   - Flat root: `plan` at user document root

2. **Scattered entitlement logic**:
   - Hardcoded limits in multiple files
   - Inconsistent checking mechanisms
   - No single source of truth

3. **Complex compatibility code**:
   - Multiple fallback checks
   - Performance impact
   - High risk of bugs

## Proposed Three-Pillar Architecture

### Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  ENTITLEMENTS       │     │  FEATURES        │     │  SUBSCRIPTIONS     │
│  /lib/entitlements  │     │  /lib/features   │     │  /lib/subscriptions│
├─────────────────────┤     ├──────────────────┤     ├────────────────────┤
│ • User permissions  │     │ • Feature flags  │     │ • Payment status   │
│ • Access control    │     │ • System limits  │     │ • Stripe sync      │
│ • Usage tracking    │     │ • Game configs   │     │ • Plan management  │
└─────────────────────┘     └──────────────────┘     └────────────────────┘
         ↓                          ↓                          ↓
         └──────────────────────────┴──────────────────────────┘
                                    ↓
                    ┌────────────────────────────┐
                    │   UNIFIED ACCESS API       │
                    │   /lib/access              │
                    ├────────────────────────────┤
                    │ • canUserAccess()          │
                    │ • getUserLimits()          │
                    │ • trackUsage()            │
                    └────────────────────────────┘
```

### Pillar 1: Entitlements System

**Purpose**: Define what each user type can do

**Location**: `/src/lib/entitlements/`

```typescript
// /src/lib/entitlements/types.ts
export interface EntitlementRule {
  id: string;
  userTypes: UserType[];
  permissions: Permission[];
  limits: LimitConfig;
}

// /src/lib/entitlements/rules.ts
export const ENTITLEMENT_RULES: EntitlementRule[] = [
  {
    id: 'guest_basic',
    userTypes: ['guest'],
    permissions: ['play_games', 'do_drills', 'read_articles'],
    limits: {
      daily: {
        games: 3,
        drills: 3,
        articles: 3
      }
    }
  },
  {
    id: 'free_user',
    userTypes: ['free'],
    permissions: ['play_games', 'do_drills', 'read_articles', 'create_lists', 'save_progress'],
    limits: {
      daily: {
        games: 3,
        drills: 3,
        articles: 3,
        stories: 3
      },
      total: {
        lists: 3,
        bookmarks: 5
      }
    }
  },
  {
    id: 'premium_unlimited',
    userTypes: ['monthly', 'yearly'],
    permissions: ['*'], // All permissions
    limits: {
      daily: { '*': -1 }, // Unlimited
      total: { '*': -1 }  // Unlimited
    }
  }
];
```

### Pillar 2: Features System

**Purpose**: Central configuration for all features and their limits

**Location**: `/src/lib/features/`

```typescript
// /src/lib/features/types.ts
export interface Feature {
  id: string;
  name: string;
  category: 'learning' | 'games' | 'storage' | 'system';
  limitType: 'daily' | 'total' | 'none';
  requiresAuth: boolean;
  requiresSubscription: boolean;
}

// /src/lib/features/registry.ts
export const FEATURE_REGISTRY: Record<string, Feature> = {
  'drill_practice': {
    id: 'drill_practice',
    name: 'Conjugation Drills',
    category: 'learning',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false
  },
  'kanji_quest': {
    id: 'kanji_quest',
    name: 'Kanji Quest Game',
    category: 'games',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false
  },
  'word_lists': {
    id: 'word_lists',
    name: 'Word Lists',
    category: 'storage',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false
  },
  'cloud_sync': {
    id: 'cloud_sync',
    name: 'Cloud Sync',
    category: 'system',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true
  }
};
```

### Pillar 3: Subscriptions System

**Purpose**: Handle all payment and subscription status

**Location**: `/src/lib/subscriptions/`

```typescript
// /src/lib/subscriptions/types.ts
export interface Subscription {
  userId: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  plan: 'free' | 'monthly' | 'yearly';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  metadata: {
    source: 'stripe' | 'admin' | 'promo';
    createdAt: Date;
    updatedAt: Date;
  };
}

// /src/lib/subscriptions/manager.ts
export class SubscriptionManager {
  async getSubscription(userId: string): Promise<Subscription> {
    // Single source of truth for subscription data
  }
  
  async updateFromStripe(webhookData: Stripe.Event): Promise<void> {
    // Handle all Stripe webhook events
  }
  
  async createCheckoutSession(userId: string, plan: 'monthly' | 'yearly'): Promise<string> {
    // Create Stripe checkout
  }
}
```

## New Data Structure (Single Source of Truth)

### Firestore Structure

```
users/
  {userId}/
    profile/
      email: string
      displayName: string
      createdAt: timestamp
    
    subscription/
      status: 'active' | 'canceled' | 'past_due' | 'incomplete'
      plan: 'free' | 'monthly' | 'yearly'
      stripeCustomerId?: string
      stripeSubscriptionId?: string
      currentPeriodEnd?: timestamp
      cancelAtPeriodEnd?: boolean
      metadata: {
        source: 'stripe' | 'admin' | 'promo'
        createdAt: timestamp
        updatedAt: timestamp
      }
    
    usage/
      daily/
        {YYYY-MM-DD}/
          drills: number
          games: number
          articles: number
          stories: number
      
      totals/
        lists: number
        bookmarks: number
```

## Unified Access API

**Location**: `/src/lib/access/`

```typescript
// /src/lib/access/index.ts
export class AccessControl {
  constructor(
    private entitlements: EntitlementManager,
    private features: FeatureManager,
    private subscriptions: SubscriptionManager,
    private usage: UsageTracker
  ) {}
  
  async canUserAccess(
    userId: string | null,
    featureId: string
  ): Promise<AccessResult> {
    // 1. Get user subscription status
    const subscription = userId 
      ? await this.subscriptions.getSubscription(userId)
      : { plan: 'guest', status: 'active' };
    
    // 2. Get feature configuration
    const feature = this.features.getFeature(featureId);
    
    // 3. Check entitlements
    const entitlements = this.entitlements.getForUserType(subscription.plan);
    
    // 4. Check usage if limited
    if (feature.limitType !== 'none') {
      const usage = await this.usage.getUsage(userId, featureId);
      const limit = entitlements.limits[feature.limitType]?.[featureId] ?? 0;
      
      if (limit !== -1 && usage >= limit) {
        return {
          allowed: false,
          reason: 'limit_reached',
          limit,
          usage,
          userType: subscription.plan
        };
      }
    }
    
    return {
      allowed: true,
      userType: subscription.plan
    };
  }
  
  async trackUsage(
    userId: string | null,
    featureId: string
  ): Promise<void> {
    await this.usage.increment(userId, featureId);
  }
}
```

## Implementation Phases

### Phase 1: Build New System (Week 1)

**Goal**: Create new system without touching existing code

1. **Day 1-2**: Core Infrastructure
   - Create folder structure
   - Define all TypeScript interfaces
   - Set up base classes

2. **Day 3-4**: Implement Three Pillars
   - Entitlements rules and manager
   - Features registry and manager
   - Subscription manager with Stripe integration

3. **Day 5-7**: Unified Access API
   - Access control logic
   - Usage tracking system
   - React hooks for easy integration

**Deliverables**:
- `/src/lib/entitlements/` - Complete entitlements system
- `/src/lib/features/` - Feature registry
- `/src/lib/subscriptions/` - Subscription management
- `/src/lib/access/` - Unified API
- `/src/hooks/useAccess.ts` - React integration

### Phase 2: Parallel Run (Week 2)

**Goal**: Run new system alongside old system for testing

1. **Day 1-2**: Integration Layer
   ```typescript
   // Temporary compatibility layer
   export function useSubscriptionCompat() {
     const oldSystem = useSubscription();
     const newSystem = useAccess();
     
     // Use new system but fall back to old if needed
     return process.env.NEXT_PUBLIC_USE_NEW_SUBSCRIPTION === 'true'
       ? newSystem
       : oldSystem;
   }
   ```

2. **Day 3-4**: Migrate Critical Paths
   - Article access checks
   - Game limit checks
   - Subscription management pages

3. **Day 5-7**: Testing & Monitoring
   - A/B test with select users
   - Monitor for discrepancies
   - Fix any issues

### Phase 3: Migration & Cleanup (Week 3)

**Goal**: Migrate all users and remove old code

1. **Day 1**: Data Migration
   ```javascript
   // Migration script
   async function migrateAllUsers() {
     const batch = db.batch();
     
     const users = await db.collection('users').get();
     
     for (const userDoc of users.docs) {
       const oldData = userDoc.data();
       const newStructure = convertToNewStructure(oldData);
       
       batch.set(
         db.collection('users').doc(userDoc.id),
         newStructure,
         { merge: false } // Complete replacement
       );
     }
     
     await batch.commit();
   }
   ```

2. **Day 2-3**: Switch to New System
   - Remove feature flag
   - Update all imports
   - Remove compatibility layer

3. **Day 4-5**: Remove Old Code
   - Delete old SubscriptionContext
   - Remove all compatibility checks
   - Clean up technical debt

4. **Day 6-7**: Documentation & Training
   - Update all documentation
   - Create migration guide
   - Knowledge transfer

## Testing Strategy

### Unit Tests
```typescript
describe('AccessControl', () => {
  it('should allow guest users 3 games per day', async () => {
    const result = await access.canUserAccess(null, 'kanji_quest');
    expect(result.allowed).toBe(true);
    
    // Simulate 3 plays
    await access.trackUsage(null, 'kanji_quest');
    await access.trackUsage(null, 'kanji_quest');
    await access.trackUsage(null, 'kanji_quest');
    
    const resultAfter = await access.canUserAccess(null, 'kanji_quest');
    expect(resultAfter.allowed).toBe(false);
    expect(resultAfter.reason).toBe('limit_reached');
  });
});
```

### Integration Tests
- Test Stripe webhook processing
- Test usage tracking accuracy
- Test limit enforcement
- Test subscription upgrades/downgrades

### End-to-End Tests
- Complete user journey from guest → free → premium
- Test all feature access points
- Verify data consistency

## Risk Mitigation

### Rollback Plan
1. Keep old system code for 30 days
2. Database backups before each migration
3. Feature flag for instant rollback
4. Monitoring dashboard for issues

### Data Integrity
1. Validate all migrated data
2. Checksum comparisons
3. Dual-write during transition
4. Audit logs for all changes

### Zero Downtime Strategy
1. New system runs in parallel
2. Gradual user migration
3. Real-time monitoring
4. Instant rollback capability

## Success Metrics

1. **Technical Metrics**:
   - 0% data loss
   - <50ms access check latency
   - 100% webhook processing success
   - 0 compatibility issues

2. **Business Metrics**:
   - No increase in support tickets
   - No revenue impact
   - Improved developer velocity post-migration

3. **Code Quality Metrics**:
   - 90%+ test coverage
   - 0 TypeScript errors
   - Clean architecture score: A

## Long-term Benefits

1. **Maintainability**:
   - Single source of truth
   - Clear separation of concerns
   - Easy to add new features

2. **Scalability**:
   - Ready for new subscription tiers
   - Easy to add new features
   - Performance optimized

3. **Reliability**:
   - Robust error handling
   - Comprehensive logging
   - Self-healing capabilities

4. **Developer Experience**:
   - Clear, documented APIs
   - TypeScript everywhere
   - Intuitive hook usage

## Next Steps

1. **Immediate Actions**:
   - Review and approve this plan
   - Set up new folder structure
   - Begin Phase 1 implementation

2. **Communication**:
   - Inform users about improvements
   - Document all changes
   - Regular progress updates

3. **Post-Migration**:
   - Performance optimization
   - Add analytics dashboard
   - Plan for future features

---

**Approval**: _________________ Date: _________________

This rebuild will transform the subscription system from a patched-together solution into a robust, scalable foundation for the future of Doshi Sensei.