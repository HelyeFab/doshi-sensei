# Entitlements System Documentation

## Overview

The Entitlements System provides a centralized, single source of truth for all user feature limits and access controls in Doshi Sensei. This system replaces scattered hardcoded limits throughout the codebase with a unified, maintainable solution.

## Architecture

```
src/
├── utils/
│   └── userEntitlements.ts      # Core entitlements definitions
├── hooks/
│   └── useEntitlements.ts       # React hook for components
└── types/
    └── subscription.ts          # User type definitions
```

## Core Components

### 1. User Entitlements Utility (`userEntitlements.ts`)

This is the **single source of truth** for all feature limits. It defines:

- What features are available for each user type
- Daily and total limits for each feature
- System capabilities (cloud sync, offline mode, etc.)

#### User Types

1. **Guest** - Non-authenticated users
2. **Free** - Registered users on free plan
3. **Monthly** - Monthly premium subscribers
4. **Yearly** - Yearly premium subscribers
5. **Premium** - Legacy type (maps to monthly)

#### Feature Categories

```typescript
interface UserEntitlements {
  games: {
    kanjiQuest: FeatureEntitlement;
    kanaDrop: FeatureEntitlement;
    otherGames: FeatureEntitlement;
  };
  
  learning: {
    drills: FeatureEntitlement;
    stories: FeatureEntitlement;
    articles: FeatureEntitlement;
    vocabularySearch: FeatureEntitlement;
    moodBoards: FeatureEntitlement;
  };
  
  storage: {
    lists: FeatureEntitlement;
    bookmarks: FeatureEntitlement;
    savedWords: FeatureEntitlement;
  };
  
  system: {
    cloudSync: FeatureEntitlement;
    offlineMode: FeatureEntitlement;
    progressTracking: FeatureEntitlement;
    analytics: FeatureEntitlement;
  };
  
  support: {
    prioritySupport: FeatureEntitlement;
  };
}
```

### 2. React Hook (`useEntitlements.ts`)

Provides an easy-to-use interface for React components:

```typescript
const {
  userType,              // Current user type
  entitlements,          // Full entitlements object
  canPlayGame,           // Check game access
  canCreateList,         // Check list creation
  canDoDrill,            // Check drill access
  promptForAccess,       // Show login/upgrade modal
  loading
} = useEntitlements();
```

## Usage Examples

### Checking Game Access

```typescript
// In a game component
const { canPlayGame, promptForAccess } = useEntitlements();

const handleStartGame = () => {
  const check = canPlayGame('kanaDrop');
  
  if (!check.allowed) {
    // Show appropriate modal based on user type
    promptForAccess('Kana Drop game', 
      `You've used ${check.used}/${check.limit} games today!`
    );
    return;
  }
  
  // Start the game
  startGame();
};
```

### Checking Storage Limits

```typescript
const { canCreateList, promptForAccess } = useEntitlements();

const handleCreateList = () => {
  const check = canCreateList();
  
  if (!check.allowed) {
    promptForAccess('vocabulary lists',
      `You have ${check.used} lists (max: ${check.limit})`
    );
    return;
  }
  
  // Create the list
  createNewList();
};
```

### Displaying Limits to Users

```typescript
const { getLimit, userType } = useEntitlements();

const dailyGameLimit = getLimit('games.kanjiQuest', 'daily');
const isUnlimited = dailyGameLimit === -1;

return (
  <div>
    {isUnlimited ? (
      <span>Unlimited games per day</span>
    ) : (
      <span>{dailyGameLimit} games per day</span>
    )}
  </div>
);
```

## Feature Limits by User Type

### Guest Users
- **Games**: 3 per day each (KanjiQuest: 3/day, KanaDrop: 3/day - separate limits)
- **Learning**: 3 drills/stories/articles per day, unlimited vocabulary search
- **Storage**: Cannot create lists or bookmarks
- **System**: No cloud sync, offline mode, or progress tracking

### Free Users
- **Games**: 3 per day each (KanjiQuest: 3/day, KanaDrop: 3/day - separate limits)
- **Learning**: 3 drills/stories/articles per day, unlimited vocabulary search
- **Storage**: 3 lists max, 5 bookmarks max
- **System**: Local progress tracking only, no cloud sync

### Premium Users (Monthly/Yearly)
- **Games**: Unlimited all games
- **Learning**: Unlimited everything
- **Storage**: Unlimited lists and bookmarks
- **System**: Cloud sync, offline mode, advanced analytics
- **Support**: Priority support

## Adding New Features

To add a new feature with limits:

1. **Update the entitlements structure** in `userEntitlements.ts`:
```typescript
// Add to the appropriate category
learning: {
  // ... existing features
  flashcards: { daily: 10, enabled: true }, // New feature
}
```

2. **Add a specific check method** in `useEntitlements.ts` if needed:
```typescript
const canUseFlashcards = useCallback((): EntitlementCheck => {
  const usage = getCurrentFlashcardUsage();
  return canAccess('learning.flashcards', usage);
}, [canAccess]);
```

3. **Use in your component**:
```typescript
const { canAccess } = useEntitlements();

const check = canAccess('learning.flashcards', { daily: currentUsage });
if (!check.allowed) {
  // Handle limit reached
}
```

## Migration Guide

### Before (Hardcoded limits)
```typescript
// ❌ Old way - hardcoded limits scattered in components
const MAX_GAMES_PER_DAY = 3;
const canPlay = userType === 'premium' || gamesPlayedToday < MAX_GAMES_PER_DAY;
```

### After (Entitlements system)
```typescript
// ✅ New way - centralized entitlements
const { canPlayGame } = useEntitlements();
const check = canPlayGame('kanjiQuest');
const canPlay = check.allowed;
```

## Common Patterns

### Pattern 1: Feature Gate with Prompt
```typescript
const FeatureComponent = () => {
  const { canAccess, promptForAccess } = useEntitlements();
  
  const handleAction = () => {
    const check = canAccess('feature.path');
    
    if (!check.allowed) {
      promptForAccess('Feature Name', check.reason);
      return;
    }
    
    // Proceed with action
  };
};
```

### Pattern 2: Display Remaining Usage
```typescript
const UsageDisplay = () => {
  const { canDoDrill } = useEntitlements();
  const check = canDoDrill();
  
  if (check.unlimited) {
    return <div>Unlimited drills</div>;
  }
  
  return (
    <div>
      {check.remaining || 0} drills remaining today
    </div>
  );
};
```

### Pattern 3: Conditional UI Based on Plan
```typescript
const UpgradePrompt = () => {
  const { userType, isEnabled } = useEntitlements();
  
  if (userType === 'premium') return null;
  
  return (
    <div>
      {!isEnabled('system.cloudSync') && (
        <p>Upgrade to enable cloud sync!</p>
      )}
    </div>
  );
};
```

## Best Practices

1. **Always use the entitlements system** - Never hardcode limits
2. **Check at the point of action** - Validate access when user tries to use a feature
3. **Provide clear feedback** - Tell users why they can't access something
4. **Use appropriate prompts** - Guest users see login prompt, free users see upgrade prompt
5. **Cache usage counts** - Don't recalculate usage on every render

## Testing

When testing components that use entitlements:

```typescript
// Mock the hook
jest.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({
    userType: 'free',
    canPlayGame: () => ({ allowed: true, unlimited: false, limit: 3 }),
    promptForAccess: jest.fn(),
    loading: false
  })
}));
```

## Troubleshooting

### Common Issues

1. **Feature always shows as unavailable**
   - Check the feature path is correct (e.g., 'games.kanjiQuest')
   - Verify the feature is enabled in entitlements definition

2. **Limits not updating**
   - Ensure usage tracking is properly incrementing
   - Check date comparison for daily resets

3. **Wrong user type detected**
   - Verify subscription context is loaded
   - Check authentication state

## Future Enhancements

1. **Time-based limits** - Hourly limits, weekly limits
2. **Feature trials** - Allow X free uses before requiring upgrade
3. **Dynamic limits** - Server-controlled limits
4. **Usage analytics** - Track feature usage patterns
5. **A/B testing** - Different limits for different user cohorts

## Related Documentation

- [Subscription System](./SUBSCRIPTION_STRIPE_FLOW.md)
- [User Types](./USER_ENTITLEMENTS.md)
- [Freemium System](./FREEMIUM_SYSTEM_DOCUMENTATION.md)