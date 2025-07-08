# Doshi Sensei Freemium System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Types & Subscription Plans](#user-types--subscription-plans)
4. [Core Components](#core-components)
5. [Hooks & Utilities](#hooks--utilities)
6. [Usage Limits & Enforcement](#usage-limits--enforcement)
7. [Guest Migration System](#guest-migration-system)
8. [Testing Strategy](#testing-strategy)
9. [Implementation Examples](#implementation-examples)
10. [Configuration](#configuration)
11. [Troubleshooting](#troubleshooting)

## Overview

The Doshi Sensei freemium system provides a comprehensive subscription management solution with three user tiers:
- **Guest**: Limited access without account creation
- **Free**: Basic features with usage limits
- **Premium**: Full access with unlimited features

The system is designed to encourage user progression from guest → free → premium while maintaining a smooth user experience.

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Guest User    │───▶│   Free User      │───▶│  Premium User   │
│                 │    │                  │    │                 │
│ • No account    │    │ • Firebase Auth  │    │ • Firebase Auth │
│ • localStorage  │    │ • localStorage   │    │ • Firestore     │
│ • 3 drills/day  │    │ • 3 drills/day   │    │ • Unlimited     │
│ • No saving     │    │ • 3 lists max    │    │ • Cloud sync    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core System Components
```
src/
├── contexts/
│   └── SubscriptionContext.tsx      # Main subscription state management
├── hooks/
│   └── useFreemiumLimits.ts        # Usage limits and enforcement
├── components/
│   ├── FeatureGate.tsx             # Component-level access control
│   ├── LoginPromptModal.tsx        # Guest → Free conversion
│   ├── UpgradePromptModal.tsx      # Free → Premium conversion
│   ├── UsageLimitDisplay.tsx       # Usage visualization
│   └── ErrorBoundarySubscription.tsx # Error handling
├── utils/
│   └── guestMigration.ts           # Guest data migration
├── types/
│   └── subscription.ts             # Type definitions
└── __tests__/
    └── freemium/                   # Comprehensive test suite
```

## User Types & Subscription Plans

### Type Definitions
```typescript
export type UserType = 'guest' | 'free' | 'premium';
export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';

export interface UsageLimits {
  maxLists: number;           // -1 = unlimited
  maxDrillsPerDay: number;    // -1 = unlimited
  canSync: boolean;           // Cloud synchronization
  canSave: boolean;           // Data persistence
}
```

### Plan Configuration
```typescript
export const SUBSCRIPTION_PLANS = {
  guest: {
    name: 'Guest',
    price: 0,
    limits: {
      maxLists: 0,
      maxDrillsPerDay: 3,
      canSync: false,
      canSave: false,
    },
    features: [
      '3 drills per day',
      'View-only access',
      'No progress saving'
    ]
  },
  free: {
    name: 'Free',
    price: 0,
    limits: {
      maxLists: 3,
      maxDrillsPerDay: 3,
      canSync: false,
      canSave: true,
    },
    features: [
      'Up to 3 word lists',
      '3 drills per day',
      'Basic conjugation practice',
      'Local storage only'
    ]
  },
  monthly: {
    name: 'Monthly',
    price: 3.99,
    limits: {
      maxLists: -1,
      maxDrillsPerDay: -1,
      canSync: true,
      canSave: true,
    },
    features: [
      'Unlimited word lists',
      'Unlimited drills',
      'Cloud sync across devices',
      'Advanced analytics',
      'Priority support'
    ]
  },
  yearly: {
    name: 'Yearly',
    price: 39.99,
    limits: {
      maxLists: -1,
      maxDrillsPerDay: -1,
      canSync: true,
      canSave: true,
    },
    features: [
      'Unlimited word lists',
      'Unlimited drills',
      'Cloud sync across devices',
      'Advanced analytics',
      'Priority support',
      '2 months free!'
    ]
  }
} as const;
```

## Core Components

### 1. SubscriptionContext
**File**: `src/contexts/SubscriptionContext.tsx`

Primary state management for the entire freemium system.

```typescript
interface SubscriptionContextType {
  // User classification
  userType: UserType;
  userSubscription: UserSubscription | null;

  // Usage tracking
  canDoDrill: () => boolean;
  canCreateList: () => boolean;
  canSaveData: () => boolean;

  // Actions
  incrementDrillCount: () => Promise<void>;
  incrementGuestDrillCount: () => void;

  // UI state
  showLoginPrompt: boolean;
  showUpgradePrompt: boolean;
  setShowLoginPrompt: (show: boolean) => void;
  setShowUpgradePrompt: (show: boolean) => void;
}
```

**Key Features**:
- Automatic user type detection
- Real-time usage limit checking
- Guest usage tracking via localStorage
- Automatic modal triggering for conversions

### 2. FeatureGate Component
**File**: `src/components/FeatureGate.tsx`

Declarative access control for features based on subscription level.

```typescript
interface FeatureGateProps {
  feature: 'drills' | 'lists' | 'sync' | 'save';
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  children: React.ReactNode;
}

// Usage example
<FeatureGate feature="lists" showUpgradePrompt>
  <CreateListButton />
</FeatureGate>
```

**Behavior**:
- **Granted**: Renders children normally
- **Denied**: Shows fallback or upgrade prompt
- **Usage Exceeded**: Displays limit reached message

### 3. Modal Components

#### LoginPromptModal
**File**: `src/components/LoginPromptModal.tsx`

Converts guests to free users with data migration.

**Features**:
- Explains free account benefits
- Handles guest data migration
- Maintains session continuity
- Custom messaging based on context

#### UpgradePromptModal
**File**: `src/components/UpgradePromptModal.tsx`

Converts free users to premium subscriptions.

**Features**:
- Feature comparison table
- Stripe integration ready
- Usage limit visualization
- Contextual upgrade messaging

### 4. UsageLimitDisplay
**File**: `src/components/UsageLimitDisplay.tsx`

Visual representation of current usage vs limits.

```typescript
interface UsageLimitDisplayProps {
  type: 'drills' | 'lists';
  current: number;
  maximum: number;
  timeframe?: string;
}

// Usage example
<UsageLimitDisplay
  type="drills"
  current={userSubscription.currentUsage.drillsToday}
  maximum={userSubscription.limits.maxDrillsPerDay}
  timeframe="today"
/>
```

## Hooks & Utilities

### useFreemiumLimits Hook
**File**: `src/hooks/useFreemiumLimits.ts`

Centralized logic for usage limit enforcement.

```typescript
interface FreemiumLimits {
  canDoDrill: boolean;
  canCreateList: boolean;
  canSaveData: boolean;
  canSync: boolean;

  drillsRemaining: number;
  listsRemaining: number;

  showLoginPrompt: () => void;
  showUpgradePrompt: () => void;
}

const limits = useFreemiumLimits();

// Usage example
if (!limits.canDoDrill) {
  limits.showUpgradePrompt();
  return;
}
```

### Guest Migration Utility
**File**: `src/utils/guestMigration.ts`

Handles seamless data transfer when guests create accounts.

```typescript
class GuestMigrationManager {
  static async migrateGuestData(userId: string): Promise<MigrationResult> {
    // 1. Retrieve guest data from localStorage
    // 2. Validate data integrity
    // 3. Transfer to Firestore
    // 4. Clear localStorage
    // 5. Return migration summary
  }

  static validateDrillCount(count: number): boolean {
    return Number.isInteger(count) && count >= 0 && count <= 1000;
  }

  static getGuestUsage(): GuestUsage {
    // Returns current guest usage from localStorage
  }
}
```

**Migration Process**:
1. **Data Collection**: Gather guest usage statistics
2. **Validation**: Ensure data integrity
3. **Transfer**: Move to Firestore under new user ID
4. **Cleanup**: Clear localStorage
5. **Verification**: Confirm successful migration

## Usage Limits & Enforcement

### Daily Drill Limits
```typescript
// Guest: 3 drills per day
// Free: 3 drills per day
// Premium: Unlimited (-1)

const canDoDrill = (): boolean => {
  const today = new Date().toISOString().split('T')[0];
  const usage = getCurrentUsage();

  if (usage.lastDrillDate !== today) {
    // Reset daily count
    usage.drillsToday = 0;
    usage.lastDrillDate = today;
  }

  const limit = userSubscription.limits.maxDrillsPerDay;
  return limit === -1 || usage.drillsToday < limit;
};
```

### List Creation Limits
```typescript
// Guest: 0 lists (view only)
// Free: 3 lists maximum
// Premium: Unlimited (-1)

const canCreateList = (): boolean => {
  const currentLists = getUserLists().length;
  const limit = userSubscription.limits.maxLists;

  return limit === -1 || currentLists < limit;
};
```

### Feature Access Control
```typescript
// Sync capability (Premium only)
const canSync = userSubscription.limits.canSync;

// Save capability (Free + Premium)
const canSave = userSubscription.limits.canSave;
```

## Guest Migration System

### Migration Trigger Points
1. **Manual Sign-up**: User clicks "Create Account"
2. **Limit Reached**: Auto-prompt when hitting usage limits
3. **Feature Request**: Accessing premium features

### Migration Flow
```typescript
const migrationFlow = async (user: User) => {
  try {
    // 1. Show migration progress
    setMigrationStatus('in-progress');

    // 2. Collect guest data
    const guestData = GuestMigrationManager.getGuestData();

    // 3. Validate data
    const validationResult = GuestMigrationManager.validateGuestData(guestData);
    if (!validationResult.valid) {
      throw new Error('Invalid guest data');
    }

    // 4. Migrate to Firestore
    const migrationResult = await GuestMigrationManager.migrateToFirestore(
      user.uid,
      guestData
    );

    // 5. Update user subscription state
    await updateUserSubscription(user.uid);

    // 6. Clear localStorage
    GuestMigrationManager.clearGuestData();

    // 7. Show success message
    setMigrationStatus('success');

  } catch (error) {
    setMigrationStatus('error');
    console.error('Migration failed:', error);
  }
};
```

## Testing Strategy

### Test Coverage Areas
1. **Subscription Plans**: Configuration validation
2. **User Type Classification**: Logic verification
3. **Usage Limits**: Enforcement testing
4. **Guest Migration**: Data integrity
5. **Component Integration**: UI behavior
6. **Error Handling**: Edge cases

### Test Files
```
__tests__/freemium/
├── core-functionality.test.tsx     # Plan configs, limits
├── subscription.test.tsx           # Context integration
└── subscription-fixed.test.tsx     # Fixed implementations
```

### Example Test
```typescript
describe('Drill Limits', () => {
  it('should enforce daily drill limits for guests', () => {
    const mockUsage = { drillsToday: 2, lastDrillDate: today };
    const canDrill = checkDrillLimits('guest', mockUsage);

    expect(canDrill).toBe(false);
  });

  it('should allow unlimited drills for premium users', () => {
    const mockUsage = { drillsToday: 100, lastDrillDate: today };
    const canDrill = checkDrillLimits('premium', mockUsage);

    expect(canDrill).toBe(true);
  });
});
```

## Implementation Examples

### 1. Protecting a Feature with FeatureGate
```tsx
import { FeatureGate } from '@/components/FeatureGate';

function DrillPage() {
  return (
    <FeatureGate
      feature="drills"
      fallback={<DrillLimitReached />}
      showUpgradePrompt
    >
      <DrillContent />
    </FeatureGate>
  );
}
```

### 2. Using Subscription Context
```tsx
import { useSubscription } from '@/contexts/SubscriptionContext';

function CreateListButton() {
  const { canCreateList, showUpgradePrompt, userType } = useSubscription();

  const handleClick = () => {
    if (!canCreateList()) {
      if (userType === 'guest') {
        showLoginPrompt();
      } else {
        showUpgradePrompt();
      }
      return;
    }

    // Proceed with list creation
    createNewList();
  };

  return (
    <button onClick={handleClick}>
      Create List
    </button>
  );
}
```

### 3. Custom Hook for Feature Checking
```tsx
import { useFreemiumLimits } from '@/hooks/useFreemiumLimits';

function useFeatureAccess(feature: string) {
  const limits = useFreemiumLimits();

  return {
    canAccess: limits[`can${capitalize(feature)}`],
    remaining: limits[`${feature}Remaining`],
    upgrade: limits.showUpgradePrompt,
  };
}

// Usage
function SomeComponent() {
  const { canAccess, remaining, upgrade } = useFeatureAccess('drill');

  if (!canAccess) {
    return <button onClick={upgrade}>Upgrade for More Drills</button>;
  }

  return <div>Drills remaining: {remaining}</div>;
}
```

## Configuration

### Environment Variables
```bash
# Stripe (for premium subscriptions)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Firebase (for user management)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

### Firestore Security Rules
```javascript
// Allow users to read/write their own subscription data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

match /subscriptions/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Plan Pricing Updates
To modify subscription plans, update the `SUBSCRIPTION_PLANS` object in `src/types/subscription.ts`:

```typescript
// Example: Adding a new plan
const SUBSCRIPTION_PLANS = {
  // ... existing plans
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    limits: {
      maxLists: -1,
      maxDrillsPerDay: -1,
      canSync: true,
      canSave: true,
    },
    features: [
      'Everything in Premium',
      'Team management',
      'Analytics dashboard',
      'Priority support'
    ]
  }
};
```

## Troubleshooting

### Common Issues

#### 1. Guest Data Not Migrating
**Symptoms**: User signs up but previous progress is lost
**Solution**: Check localStorage data format and migration validation

```typescript
// Debug guest data
console.log('Guest data:', GuestMigrationManager.getGuestData());

// Validate before migration
const validation = GuestMigrationManager.validateGuestData(guestData);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

#### 2. Usage Limits Not Enforcing
**Symptoms**: Users can exceed daily limits
**Solution**: Verify date comparison logic and timezone handling

```typescript
// Check date calculation
const today = new Date().toISOString().split('T')[0];
console.log('Today:', today);
console.log('Last drill date:', usage.lastDrillDate);
console.log('Dates match:', usage.lastDrillDate === today);
```

#### 3. Subscription State Not Updating
**Symptoms**: UI doesn't reflect subscription changes
**Solution**: Ensure context re-renders and Firebase listeners

```typescript
// Check context updates
useEffect(() => {
  console.log('Subscription updated:', userSubscription);
}, [userSubscription]);

// Verify Firebase listener
useEffect(() => {
  if (!user) return;

  const unsubscribe = onSnapshot(
    doc(db, 'subscriptions', user.uid),
    (doc) => {
      console.log('Firestore update:', doc.data());
      setUserSubscription(doc.data());
    }
  );

  return unsubscribe;
}, [user]);
```

### Performance Considerations

1. **Context Optimization**: Use React.memo for expensive components
2. **Local Storage**: Minimize reads/writes with batching
3. **Firestore Queries**: Cache subscription data locally
4. **Modal Rendering**: Lazy load modals to reduce bundle size

### Security Best Practices

1. **Client-Side Validation**: Always validate on server-side too
2. **Usage Tracking**: Implement server-side usage verification
3. **Plan Changes**: Validate subscription status server-side
4. **Data Migration**: Sanitize guest data before migration

## Future Enhancements

### Planned Features
1. **Trial Periods**: 7-day premium trial for free users
2. **Usage Analytics**: Detailed usage tracking and reporting
3. **Team Plans**: Multi-user subscription management
4. **Custom Limits**: Admin-configurable usage limits
5. **Granular Permissions**: Feature-specific access controls

### Migration Path
When adding new features, follow this pattern:
1. Update type definitions in `subscription.ts`
2. Modify plan configurations
3. Update FeatureGate component
4. Add corresponding tests
5. Update documentation

This comprehensive freemium system provides a solid foundation for monetization while maintaining excellent user experience across all subscription tiers.
