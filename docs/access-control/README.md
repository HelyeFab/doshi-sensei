# Unified Access Control System

## Overview

The Doshi Sensei access control system has been unified into a single, powerful hook that replaces the previous fragmented approach. This documentation describes the architecture, implementation, and migration path for the new system.

## Architecture

### Three-Pillar Foundation (Unchanged)

The underlying Three-Pillar Architecture remains intact:

1. **Feature Registry** (`/lib/features/registry.ts`)
   - Defines all features with their metadata
   - Configures limit types and requirements

2. **Entitlement Rules** (`/lib/entitlements/rules.ts`)
   - Maps user types to permissions
   - Defines usage limits per user type

3. **Access Permission Mapping** (`/lib/access/index.ts`)
   - Maps features to permissions
   - Contains the AccessControl class

### Subscription Model (Flat Structure)

The subscription system uses a simplified "flat" model:

```typescript
UserType = 'guest' | 'free' | 'monthly' | 'yearly'
```

- **guest**: Not logged in
- **free**: Logged in, no subscription
- **monthly**: Active monthly subscription
- **yearly**: Active yearly subscription

This flat structure eliminates nested subscription tiers and simplifies access checks.

## The Unified Hook: `useFeature`

### Design Philosophy

Instead of multiple hooks (`useAccess`, `useAccessWithModals`, `useFeature`), we now have ONE hook with configurable behavior:

```typescript
const { canUse, checkAndTrack, remaining } = useFeature(featureId, options);
```

### Hook Interface

```typescript
interface UseFeatureOptions {
  // UI Feedback Options
  showToast?: boolean;         // Show toast notifications (default: false)
  showModal?: boolean;         // Show upgrade/login modals (default: false)
  toastPosition?: 'top' | 'bottom' | 'center'; // Toast position
  
  // Behavior Options
  trackUsage?: boolean;        // Auto-track usage on success (default: false)
  checkOnly?: boolean;         // Just check, don't track (default: false)
  silent?: boolean;           // No UI feedback at all (default: false)
  
  // Custom Handlers
  onLimitReached?: (remaining: number, limit: number) => void;
  onAccessDenied?: (reason: AccessDenialReason) => void;
  onSubscriptionRequired?: () => void;
  onLoginRequired?: () => void;
  
  // Performance Options
  cache?: boolean;            // Cache the result (default: true)
  realtimeUpdates?: boolean;  // Listen for changes (default: false)
}

interface UseFeatureReturn {
  // Status
  canUse: boolean;           // Can the user use this feature now?
  isLoading: boolean;        // Is the check in progress?
  error: Error | null;       // Any errors during check
  
  // Access Details
  userType: UserType;        // Current user type
  accessReason?: AccessDenialReason; // Why access was denied
  
  // Limits
  limit: number | null;      // Feature limit (-1 = unlimited, null = no limit)
  usage: number;             // Current usage count
  remaining: number | null;  // Remaining uses (-1 = unlimited)
  resetAt?: Date;           // When daily limits reset
  
  // Actions
  checkAndTrack: () => Promise<boolean>; // Check access and track usage
  check: () => Promise<boolean>;         // Just check without tracking
  track: () => Promise<void>;            // Just track usage
  refresh: () => Promise<void>;          // Refresh the access check
  
  // UI Components (if showModal is true)
  AccessModals?: () => JSX.Element;      // Modal components to render
}

type AccessDenialReason = 
  | 'not_authenticated'      // User needs to log in
  | 'subscription_required'  // Premium feature
  | 'limit_reached'          // Daily/total limit hit
  | 'feature_disabled'       // Feature is turned off
  | 'no_permission';         // User type lacks permission
```

## Usage Examples

### Basic Access Check (Silent)

```typescript
function MyComponent() {
  const { canUse } = useFeature('ai_stories');
  
  if (!canUse) {
    return <div>This feature is not available</div>;
  }
  
  return <div>AI Story Generator</div>;
}
```

### With Toast Notifications

```typescript
function DrillComponent() {
  const { canUse, checkAndTrack } = useFeature('drill_practice', {
    showToast: true,
    trackUsage: true
  });
  
  const handleStartDrill = async () => {
    if (await checkAndTrack()) {
      // User has access and usage was tracked
      startDrill();
    }
    // Toast will automatically show if access denied
  };
}
```

### With Modal Upgrades

```typescript
function PremiumFeature() {
  const { 
    canUse, 
    checkAndTrack, 
    remaining,
    AccessModals 
  } = useFeature('youtube_shadowing', {
    showModal: true,
    showToast: true,
    trackUsage: true
  });
  
  return (
    <>
      {AccessModals && <AccessModals />}
      
      <button onClick={checkAndTrack}>
        Start Shadowing {remaining && remaining > 0 && `(${remaining} left)`}
      </button>
    </>
  );
}
```

### Custom Handling

```typescript
function CustomComponent() {
  const { canUse, checkAndTrack } = useFeature('kanji_quest', {
    onLimitReached: (remaining, limit) => {
      // Custom limit reached behavior
      openCustomUpgradeFlow({
        message: `You've used ${limit} games today!`,
        ctaText: 'Get Unlimited Games'
      });
    },
    onLoginRequired: () => {
      // Custom login flow
      router.push('/login?redirect=/games/kanji-quest');
    }
  });
}
```

### Realtime Subscription Updates

```typescript
function SubscriptionAwareComponent() {
  const { canUse, remaining } = useFeature('textbook_vocabulary', {
    realtimeUpdates: true, // Will update when subscription changes
    showToast: true
  });
  
  // Component will re-render when subscription status changes
  return <div>Cards remaining today: {remaining ?? 'Unlimited'}</div>;
}
```

## Migration Guide

### From `useAccess`

```typescript
// Old
const { canAccess, checkAndTrack } = useAccess();
const allowed = await canAccess('feature_id');

// New
const { canUse, checkAndTrack } = useFeature('feature_id', {
  showToast: true,
  trackUsage: true
});
// canUse is already available, no await needed
```

### From `useAccessWithModals`

```typescript
// Old
const { checkAndTrack, AccessModals } = useAccessWithModals();
return (
  <>
    <AccessModals />
    <button onClick={() => checkAndTrack('feature_id')}>
  </>
);

// New
const { checkAndTrack, AccessModals } = useFeature('feature_id', {
  showModal: true,
  showToast: true,
  trackUsage: true
});
// Same usage pattern!
```

### From Old `useFeature`

```typescript
// Old
const { feature, access, canUse } = useFeature('feature_id');

// New
const { canUse, limit, remaining } = useFeature('feature_id');
// Simpler, more direct access to what you need
```

## Implementation Details

### Caching Strategy

The hook implements smart caching:
- Access checks are cached for 1 minute by default
- Cache is invalidated on:
  - User login/logout
  - Subscription changes
  - Usage tracking

### Performance Optimizations

1. **Batched Checks**: Multiple hooks for the same feature share the same check
2. **Lazy Loading**: Modals are only loaded when `showModal: true`
3. **Debounced Tracking**: Rapid usage is batched to reduce Firestore writes

### Error Handling

The hook gracefully handles:
- Network failures (returns last known state)
- Firebase permission errors (treats as guest)
- Invalid feature IDs (logs warning, returns no access)

## Testing

### Unit Tests

```typescript
describe('useFeature', () => {
  it('should deny access to guests for auth-required features', () => {
    const { result } = renderHook(() => useFeature('ai_stories'));
    expect(result.current.canUse).toBe(false);
    expect(result.current.accessReason).toBe('not_authenticated');
  });
  
  it('should track usage when trackUsage is true', async () => {
    const { result } = renderHook(() => 
      useFeature('drill_practice', { trackUsage: true })
    );
    await act(async () => {
      await result.current.checkAndTrack();
    });
    expect(usageTracker.increment).toHaveBeenCalledWith('drill_practice');
  });
});
```

## Telemetry

The unified hook automatically tracks:
- Feature access attempts
- Denial reasons
- Upgrade modal views
- Conversion from limit reached to subscription

## Future Enhancements

### Planned Features

1. **Soft Limits**: Warning at 80% usage
2. **Grace Period**: Allow 1-2 uses past limit
3. **Feature Trials**: Time-limited premium access
4. **Group Permissions**: Bulk-check related features
5. **Offline Support**: Cache permissions locally

### API Extensions

```typescript
// Future API ideas
const bundle = useFeatureBundle(['ai_stories', 'youtube_shadowing']);
const trial = useFeatureTrial('premium_features', { days: 7 });
const group = useFeatureGroup('learning_tools');
```

## FAQ

### Why unify the hooks?

1. **Consistency**: One pattern for all access checks
2. **Maintainability**: Single source of truth
3. **Flexibility**: Configure behavior per use case
4. **Performance**: Shared caching and batching
5. **Developer Experience**: Simpler mental model

### What about backwards compatibility?

During migration, the old hooks remain as thin wrappers around `useFeature`. They can be deprecated and removed once all components are migrated.

### How does this affect bundle size?

The unified hook uses dynamic imports for modals and toast libraries, so they're only loaded when needed. The base hook is actually smaller than the combined size of the three previous hooks.

## Support

For questions or issues with the access control system:
1. Check this documentation
2. Review the examples in `/lib/access/examples`
3. Contact the team in #dev-access-control