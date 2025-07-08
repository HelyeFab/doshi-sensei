# 🚀 SUPER_POWERS.md - Developer Onboarding Guide

> **Your Complete Guide to Contributing to Doshi Sensei**  
> *From Zero to Hero in One Document*

---

## 🎯 Welcome to Doshi Sensei

**Doshi Sensei** is a comprehensive Japanese language learning platform that combines modern web technologies with proven educational methodologies. Built with Next.js 15, Firebase, and a sophisticated three-pillar architecture, it serves thousands of learners with features ranging from conjugation drills to Pokémon-style kanji battles.

### What Makes This Project Special
- **Advanced Freemium System**: Dynamic access control with real-time limit adjustments
- **Offline-First Design**: Works seamlessly without internet connection
- **Educational Games**: Gamified learning with spaced repetition algorithms
- **Progressive Web App**: Native app experience on any device
- **Accessibility**: WCAG AA compliant with 8 beautiful themes

---

## 🏗️ The Three-Pillar Architecture (Your Foundation)

**This is the heart of everything.** Understand this, and you understand the system.

```
Your Component
    ↓
useAccess() / useFeature() / useSubscription2()
    ↓
Access Control API
    ↓
┌─────────────┐ ┌──────────────┐ ┌────────────────┐
│ Entitlements│ │   Features   │ │ Subscriptions  │
│   Manager   │ │   Registry   │ │    Manager     │
└─────────────┘ └──────────────┘ └────────────────┘
    ↓               ↓                   ↓
         Firestore Database
```

### ⚡ Quick Implementation Pattern

```typescript
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';

function MyComponent() {
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining } = useFeature('my_feature');
  const { isPremium, userType } = useSubscription2();

  const handleAction = async () => {
    // 🎯 This ONE line handles everything:
    // - Checks permissions
    // - Validates limits
    // - Shows appropriate modals
    // - Tracks usage automatically
    const canProceed = await checkAndTrack('my_feature');
    
    if (canProceed) {
      // User has access, proceed with action
      doTheActualWork();
    }
    // If no access, modals are shown automatically
  };

  return (
    <div>
      {access?.remaining && (
        <p>Remaining uses: {access.remaining}</p>
      )}
      <button onClick={handleAction}>
        Use Feature
      </button>
    </div>
  );
}
```

### 🛠️ The Three Pillars Explained

#### 1. **Entitlements Manager** (`/src/lib/entitlements/`)
- **Purpose**: User permissions and access control
- **Key Files**: `manager.ts`, `rules.ts`, `dynamic-rules.ts`
- **What It Does**: Determines what users can do based on their subscription type

#### 2. **Features Registry** (`/src/lib/features/`)
- **Purpose**: Central catalog of all app features
- **Key Files**: `registry.ts`, `manager.ts`, `types.ts`
- **What It Does**: Defines feature metadata, limits, and requirements

#### 3. **Subscriptions Manager** (`/src/lib/subscriptions/`)
- **Purpose**: Payment status and user type management
- **Key Files**: `manager.ts`, `types.ts`
- **What It Does**: Tracks subscription status and maps to user types

---

## 📊 Adding New Features (Step-by-Step)

### Step 1: Register Your Feature

Add to `/src/lib/features/registry.ts`:

```typescript
export const FEATURE_REGISTRY: FeatureRegistry = {
  // ... existing features
  
  'my_awesome_feature': {
    id: 'my_awesome_feature',
    name: 'My Awesome Feature',
    description: 'Does something amazing for users',
    category: 'learning', // 'learning' | 'games' | 'storage' | 'system'
    icon: '🌟',
    limitType: 'daily', // 'daily' | 'total' | 'none'
    requiresAuth: true, // Does user need to be logged in?
    requiresSubscription: false, // Premium only?
    status: 'active' // 'active' | 'beta' | 'planned' | 'deprecated'
  }
};
```

### Step 2: Build Your Component

```typescript
'use client';

import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';

export default function MyAwesomeComponent() {
  const { checkAndTrack, isChecking } = useAccess();
  const { feature, access, isLoading } = useFeature('my_awesome_feature');

  const handleUseFeature = async () => {
    const canUse = await checkAndTrack('my_awesome_feature');
    
    if (canUse) {
      // Feature logic here - user has access and usage is tracked
      console.log('User can use this feature!');
    }
    // Access denied scenarios are handled automatically
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h2>{feature?.name}</h2>
      <p>{feature?.description}</p>
      
      {access?.remaining !== null && (
        <p>Uses remaining: {access.remaining}</p>
      )}
      
      <button 
        onClick={handleUseFeature}
        disabled={isChecking}
        className="px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        {isChecking ? 'Checking...' : 'Use Feature'}
      </button>
    </div>
  );
}
```

### Step 3: Configure Limits (Automatic!)

Your feature automatically appears in the admin dashboard at `/admin/features` where limits can be adjusted in real-time without code deployments.

---

## 💾 Storage System - Your Data Lifeline

**Rule #1**: Always use the Enhanced Storage Manager. Never touch localStorage directly.

```typescript
import EnhancedStorageManager from '@/utils/storage';

// ✅ Initialize on app start
await EnhancedStorageManager.initialize();

// ✅ Save data
await EnhancedStorageManager.saveData('userData', { name: 'John' });

// ✅ Load data
const userData = await EnhancedStorageManager.loadData('userData');

// ✅ Save settings with validation
await EnhancedStorageManager.saveSettings({
  theme: 'dark',
  language: 'ja'
});
```

### Storage Architecture Benefits
- **IndexedDB First**: Advanced features like analytics only work with IndexedDB
- **Automatic Fallback**: Gracefully degrades to localStorage when needed
- **Performance**: Optimized with strategic indexing and batch operations
- **Cloud Sync**: Automatic for premium users

---

## 🎨 Theme System - Beautiful & Accessible

### CSS Custom Properties Pattern

```typescript
// ✅ Use semantic tokens, not hardcoded colors
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Primary Action
  </button>
  <div className="bg-card border-border text-card-foreground">
    Card Content
  </div>
</div>

// ❌ Don't hardcode colors
<div className="bg-white text-black border-gray-300"> {/* Bad */}
```

### Theme Features
- **8 Color Schemes**: Terminal-inspired palettes
- **WCAG AA Compliance**: All themes meet accessibility standards
- **Hydration Safe**: No SSR mismatches
- **Dynamic Switching**: Real-time theme changes

---

## 📚 List System - Smart Data Organization

### Unified Study List Pattern

```typescript
import StudyListManager from '@/utils/studyListManager';

// ✅ Always validate before adding
const canAdd = StudyListManager.canAddToList(itemType, item, listType);
if (!canAdd.success) {
  console.error('Cannot add item:', canAdd.reason);
  return;
}

// ✅ Add item to list
await StudyListManager.addToList(listId, item);

// ✅ Get list contents
const { words, sentences } = await StudyListManager.getItemsInList(listId);
```

### List Types & Validation
- **Drillable Lists**: Only accept conjugable content (verbs, adjectives)
- **Flashcard Lists**: Accept any content (words, kanji, mixed)
- **Smart Validation**: System prevents incompatible items automatically

---

## 🧪 Testing Standards - Quality First

### Coverage Requirements
- **Statements**: >95%
- **Branches**: >90%
- **Functions**: >90%

### Testing Pattern (AAA)

```typescript
// ✅ Follow Arrange-Act-Assert pattern
test('should conjugate Ichidan verbs correctly', () => {
  // Arrange
  const verb = { word: '食べる', type: 'ichidan' };
  
  // Act
  const result = conjugate(verb, 'past');
  
  // Assert
  expect(result).toBe('食べた');
});

// ✅ Test error scenarios
test('should handle invalid conjugation gracefully', () => {
  expect(() => conjugate(null, 'past')).not.toThrow();
});
```

---

## 🎮 Game Development Patterns

### Educational Game Template

```typescript
'use client';

import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';

export default function MyLearningGame() {
  const { checkAndTrack } = useAccess();
  const { remaining } = useFeature('my_game');
  const [gameState, setGameState] = useState('setup');

  const startGame = async () => {
    // 🎯 Check access before allowing gameplay
    const canPlay = await checkAndTrack('my_game');
    
    if (canPlay) {
      setGameState('playing');
      // Game logic here
    }
    // Access denied? Modals shown automatically
  };

  const completeGame = (score: number) => {
    // Game completion logic
    setGameState('completed');
    
    // Usage is already tracked by checkAndTrack()
    // No manual tracking needed!
  };

  return (
    <div>
      {gameState === 'setup' && (
        <button onClick={startGame}>
          Start Game {remaining && `(${remaining} plays left)`}
        </button>
      )}
      
      {gameState === 'playing' && (
        <GameplayComponent onComplete={completeGame} />
      )}
      
      {gameState === 'completed' && (
        <GameResultsComponent onPlayAgain={startGame} />
      )}
    </div>
  );
}
```

---

## 🛡️ Security & Access Control

### FeatureGate Component

```typescript
import { FeatureGate, LoginRequired, PremiumOnly } from '@/components/FeatureGate';

// ✅ Wrap components that need access control
<FeatureGate feature="advanced_drills">
  <AdvancedDrillsComponent />
</FeatureGate>

// ✅ Login requirement
<LoginRequired message="Log in to save your progress">
  <ProgressSavingComponent />
</LoginRequired>

// ✅ Premium only features
<PremiumOnly message="Upgrade for unlimited practice">
  <UnlimitedPracticeComponent />
</PremiumOnly>
```

---

## 📱 Mobile-First Development

### Responsive Design Standards

```typescript
// ✅ Mobile-first with progressive enhancement
<div className="
  px-4 py-6          // Mobile: padding
  md:px-8 md:py-12   // Desktop: larger padding
  max-w-2xl mx-auto  // Constrain width on large screens
">
  <h1 className="
    text-2xl         // Mobile: smaller heading
    md:text-4xl      // Desktop: larger heading
    font-bold mb-4
  ">
    Title
  </h1>
</div>
```

### Key Mobile Considerations
- **Touch Targets**: Minimum 44px for buttons
- **Navigation**: Bottom navigation for mobile
- **Performance**: Optimize images and assets
- **Offline**: Essential features work without internet

---

## 🔧 Component Architecture Best Practices

### 1. Single Responsibility

```typescript
// ✅ Good - focused component
function VocabularyCard({ word, onSave }) {
  return (
    <div className="card">
      <h3>{word.kanji}</h3>
      <p>{word.meaning}</p>
      <button onClick={() => onSave(word)}>Save</button>
    </div>
  );
}

// ❌ Bad - too many responsibilities
function VocabularyManager() {
  // Handles search, display, saving, filtering, sorting, etc.
}
```

### 2. Error Boundaries

```typescript
// ✅ Wrap components that might fail
function MyComponent() {
  try {
    return <ComplexFeature />;
  } catch (error) {
    console.error('Component failed:', error);
    return <ErrorFallback />;
  }
}
```

### 3. Loading States

```typescript
// ✅ Always handle loading states
function DataComponent() {
  const { data, isLoading, error } = useFeature('my_feature');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <NoDataMessage />;

  return <DataDisplay data={data} />;
}
```

---

## 🚨 Common Pitfalls & How to Avoid Them

### ❌ DON'T: Manual Modal Management
```typescript
// ❌ Bad - manually showing upgrade prompts
if (!isPremium) {
  showUpgradeModal();
  return;
}
```

### ✅ DO: Use Access Control System
```typescript
// ✅ Good - let the system handle it
const canProceed = await checkAndTrack('premium_feature');
if (canProceed) {
  // Proceed with feature
}
```

### ❌ DON'T: Direct Storage Access
```typescript
// ❌ Bad - bypassing the storage system
localStorage.setItem('userPrefs', JSON.stringify(prefs));
```

### ✅ DO: Use Enhanced Storage Manager
```typescript
// ✅ Good - using the unified system
await EnhancedStorageManager.saveSettings(prefs);
```

### ❌ DON'T: Hardcoded Colors
```typescript
// ❌ Bad - breaks theme system
<div style={{ color: '#000000', backgroundColor: '#ffffff' }}>
```

### ✅ DO: Use Theme Tokens
```typescript
// ✅ Good - theme-aware
<div className="text-foreground bg-background">
```

---

## 🎯 Development Workflow

### 1. Before You Start
```bash
# 📋 Check the existing documentation
# 🔍 Search for similar features
# 📝 Plan your component architecture
# 🧪 Write tests first (TDD recommended)
```

### 2. Implementation Checklist
- [ ] Feature registered in `/src/lib/features/registry.ts`
- [ ] Component uses three-pillar hooks
- [ ] Proper error handling and loading states
- [ ] Mobile-responsive design
- [ ] Theme-aware styling
- [ ] Accessibility considerations
- [ ] Tests written and passing
- [ ] Documentation updated

### 3. Testing Your Feature
```bash
# 🧪 Run tests
npm test

# 🎨 Check theme compatibility
# Switch between all 8 themes

# 📱 Test on mobile
# Use browser dev tools responsive mode

# ♿ Accessibility check
# Test with screen reader/keyboard navigation
```

---

## 📊 Admin Dashboard Integration

### Automatic Feature Management

When you register a feature, it automatically appears in `/admin/features` with:

- **Real-time Limit Editing**: Click any number to change limits
- **Export Functionality**: CSV/JSON export for analysis
- **Usage Analytics**: Track feature adoption and conversion
- **A/B Testing**: Toggle features on/off for different user groups

### Admin Access Pattern

```typescript
// ✅ Admin-only components
import { useAdmin } from '@/contexts/AdminContext';

function AdminOnlyFeature() {
  const { isAdmin, loading } = useAdmin();
  
  if (loading) return <LoadingSpinner />;
  if (!isAdmin) return <AccessDenied />;
  
  return <AdminDashboard />;
}
```

---

## 🌟 Advanced Patterns

### Shared Limit Groups

```typescript
// In registry.ts - features that share usage limits
'kanji_quest': {
  // ... other properties
  sharedLimitGroup: 'games' // All games share the same daily limit
},
'kana_drop': {
  // ... other properties  
  sharedLimitGroup: 'games' // Uses same counter as kanji_quest
}
```

### Dynamic Rule Updates

```typescript
// Admin can change limits without code deployment
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';

// Update limits in real-time
await dynamicRules.updateLimit('free', 'drill_practice', 'daily', 10);
// All users immediately see new limit
```

### Progressive Enhancement

```typescript
// ✅ Build features that work incrementally
function AdvancedFeature() {
  const { feature } = useFeature('advanced_analytics');
  
  // Basic feature always works
  const basicAnalytics = useBasicAnalytics();
  
  // Enhanced feature for users with access
  const advancedAnalytics = feature?.status === 'active' 
    ? useAdvancedAnalytics() 
    : null;
  
  return (
    <div>
      <BasicStatsDisplay data={basicAnalytics} />
      {advancedAnalytics && (
        <AdvancedStatsDisplay data={advancedAnalytics} />
      )}
    </div>
  );
}
```

---

## 🔄 Migration & Legacy Patterns

### What's Been Migrated (as of January 2025)
- ✅ **Three-Pillar Architecture**: Fully implemented
- ✅ **Subscription System**: Complete migration
- ✅ **Storage System**: Enhanced manager in use
- ✅ **Admin Dashboard**: Real-time limit editing active

### Legacy Patterns to Avoid
```typescript
// ❌ Old subscription hooks (don't use)
import { useSubscription } from '@/hooks/useSubscription'; // OLD

// ✅ New subscription hooks (use these)
import { useSubscription2 } from '@/hooks/useSubscription2'; // NEW

// ❌ Old storage patterns (don't use)
import WordListManager from '@/utils/wordListManager'; // OLD

// ✅ New storage patterns (use these)  
import StudyListManager from '@/utils/studyListManager'; // NEW
```

---

## 🎓 Learning Resources

### Essential Files to Study
- `/src/app/games/page.tsx` - Three-pillar implementation example
- `/src/components/games/KanjiQuest.tsx` - Complex feature with access control
- `/src/components/FeatureGate.tsx` - Reusable access control wrapper
- `/src/lib/features/registry.ts` - Feature definitions
- `/docs/three-pillars/README.md` - Architecture deep dive

### Code Examples in the Wild
- **News/Articles Pages**: Perfect three-pillar usage
- **Games System**: Complex access control with limits
- **Admin Dashboard**: Real-time configuration
- **Storage Examples**: Throughout vocabulary and list systems

---

## 🚀 You're Ready!

You now have the knowledge to:

### ✅ **Immediate Contributions**
- Build new learning features
- Add educational games
- Create admin dashboard components
- Implement storage features

### ✅ **Advanced Contributions**  
- Optimize performance bottlenecks
- Enhance accessibility features
- Build complex user flows
- Design new architectural patterns

### ✅ **Leadership Opportunities**
- Mentor other developers
- Lead feature development
- Architect new systems
- Drive technical decisions

---

## 🎯 Quick Reference

### Must-Use Hooks
```typescript
import { useAccess } from '@/hooks/useAccess';           // Access control
import { useFeature } from '@/hooks/useFeature';         // Feature data  
import { useSubscription2 } from '@/hooks/useSubscription2'; // User type
import { useAdmin } from '@/contexts/AdminContext';      // Admin access
```

### Must-Use Utilities
```typescript
import EnhancedStorageManager from '@/utils/storage';    // Data storage
import StudyListManager from '@/utils/studyListManager'; // List management
import { dynamicRules } from '@/lib/entitlements/dynamic-rules'; // Admin
```

### Key Directories
- `/src/lib/features/` - Feature definitions
- `/src/lib/entitlements/` - Access control logic
- `/src/lib/subscriptions/` - Payment/user management
- `/src/hooks/` - React hooks
- `/src/components/admin/` - Admin dashboard
- `/docs/three-pillars/` - Architecture documentation

---

## 🎉 Welcome to the Team!

You're now equipped with the same knowledge that took months to accumulate. The Doshi Sensei codebase is sophisticated, well-architected, and designed for scalability. Most importantly, it's built with users in mind - every feature serves the goal of helping people learn Japanese effectively.

**Your mission**: Build features that delight users, follow established patterns, and contribute to this amazing educational platform.

**Remember**: When in doubt, check the documentation, follow the patterns you see in existing code, and don't hesitate to ask questions. The architecture is designed to guide you toward good decisions.

---

*Last Updated: January 2025*  
*Built with ❤️ for Japanese language learners worldwide*