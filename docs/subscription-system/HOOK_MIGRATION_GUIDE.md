# Access Control Hook Migration Guide

## Overview
This guide helps you migrate from the legacy `useAccess` hook to the new unified `useFeature` hook.

## Why Migrate?
- **Single source of truth** - One hook for all access control
- **Better error handling** - Built-in modal and toast support
- **Automatic usage tracking** - No manual tracking needed
- **Real-time updates** - Subscription changes reflect immediately
- **Better TypeScript support** - Strongly typed returns

## Migration Steps

### 1. Basic Migration

#### Before (useAccess):
```typescript
import { useAccess } from '@/hooks/useAccess';

function MyComponent() {
  const { checkAndTrack, canAccess } = useAccess();
  
  const handleAction = async () => {
    if (await checkAndTrack('feature_name')) {
      // Do the action
    } else {
      // Show error manually
      toast.error('Access denied');
    }
  };
}
```

#### After (useFeature):
```typescript
import { useFeature } from '@/hooks/useFeature';

function MyComponent() {
  const { checkAndTrack } = useFeature('feature_name', {
    showToast: true,  // Automatic toast notifications
    trackUsage: true  // Automatic usage tracking
  });
  
  const handleAction = async () => {
    if (await checkAndTrack()) {
      // Do the action
    }
    // No else needed - toast shown automatically
  };
}
```

### 2. With Modal Support

#### Before (useAccessWithModals):
```typescript
import { useAccessWithModals } from '@/hooks/useAccessWithModals';

function MyComponent() {
  const { checkAccess, LoginPromptModal, UpgradeModal } = useAccessWithModals();
  
  return (
    <>
      <button onClick={() => checkAccess('feature_name')}>
        Use Feature
      </button>
      <LoginPromptModal />
      <UpgradeModal />
    </>
  );
}
```

#### After (useFeature):
```typescript
import { useFeature } from '@/hooks/useFeature';

function MyComponent() {
  const { checkAndTrack, AccessModals } = useFeature('feature_name', {
    showModal: true,  // Enable modal support
    trackUsage: true
  });
  
  return (
    <>
      <button onClick={checkAndTrack}>
        Use Feature
      </button>
      {AccessModals && <AccessModals />}
    </>
  );
}
```

### 3. Check-Only (No Tracking)

#### Before:
```typescript
const { canAccess } = useAccess();
if (canAccess('feature_name')) {
  // Show feature
}
```

#### After:
```typescript
const { canUse } = useFeature('feature_name', {
  checkOnly: true  // Don't track usage
});
if (canUse) {
  // Show feature
}
```

### 4. With Custom Handlers

#### After (useFeature with callbacks):
```typescript
const { checkAndTrack } = useFeature('feature_name', {
  onLimitReached: (remaining, limit) => {
    console.log(`${remaining} uses left of ${limit}`);
  },
  onSubscriptionRequired: () => {
    // Custom upgrade flow
    router.push('/pricing');
  },
  onLoginRequired: () => {
    // Custom login flow
    openLoginModal();
  }
});
```

## Feature Comparison

| Feature | useAccess | useFeature |
|---------|-----------|------------|
| Check access | ✅ | ✅ |
| Track usage | ✅ Manual | ✅ Automatic |
| Toast notifications | ❌ Manual | ✅ Built-in |
| Modal dialogs | ❌ Separate hook | ✅ Built-in |
| Real-time updates | ❌ | ✅ |
| Custom handlers | ❌ | ✅ |
| TypeScript support | 🟡 Basic | ✅ Full |
| Loading states | ❌ | ✅ |
| Error handling | 🟡 Basic | ✅ Comprehensive |
| Cache support | ❌ | ✅ |

## Common Patterns

### 1. Feature Gate Component
```typescript
function FeatureGate({ children, featureId }: Props) {
  const { canUse, isLoading } = useFeature(featureId);
  
  if (isLoading) return <Skeleton />;
  if (!canUse) return <UpgradePrompt />;
  
  return <>{children}</>;
}
```

### 2. Conditional Rendering
```typescript
function MyComponent() {
  const { canUse, remaining } = useFeature('ai_stories');
  
  return (
    <div>
      {canUse ? (
        <AIStoryGenerator />
      ) : (
        <LockedFeature />
      )}
      {remaining !== null && (
        <p>{remaining} stories remaining today</p>
      )}
    </div>
  );
}
```

### 3. Progressive Enhancement
```typescript
function Editor() {
  const basic = useFeature('basic_editing');
  const advanced = useFeature('advanced_editing');
  
  return (
    <div>
      {basic.canUse && <BasicTools />}
      {advanced.canUse && <AdvancedTools />}
    </div>
  );
}
```

## Migration Checklist

- [ ] Search for all `useAccess` imports
- [ ] Search for all `useAccessWithModals` imports  
- [ ] Replace with `useFeature` imports
- [ ] Update hook initialization with feature ID
- [ ] Add appropriate options (showToast, showModal, etc.)
- [ ] Remove manual toast/modal code
- [ ] Test with different user types (guest, free, premium)
- [ ] Verify usage tracking works
- [ ] Check modal/toast displays correctly

## Deprecation Timeline

1. **Phase 1 (Current)**: Both hooks available, new code uses `useFeature`
2. **Phase 2 (Next Sprint)**: Console warnings for `useAccess` usage
3. **Phase 3 (Next Month)**: Remove `useAccess` from codebase

## Need Help?

- Check `/src/lib/access/examples/UnifiedHookExample.tsx` for examples
- Review the Three-Pillar Architecture in `/docs/access-control/README.md`
- Ask in team chat for migration assistance