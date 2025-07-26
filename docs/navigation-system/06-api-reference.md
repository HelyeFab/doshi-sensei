# Navigation System API Reference

## Table of Contents

1. [NavigationProvider](#navigationprovider)
2. [useNavigation Hook](#usenavigation-hook)
3. [SmartPageHeader Component](#smartpageheader-component)
4. [SmartNavigationLink Component](#smartnavigationlink-component)
5. [Breadcrumbs Component](#breadcrumbs-component)
6. [Navigation Rules](#navigation-rules)
7. [State Preservation API](#state-preservation-api)
8. [Utility Functions](#utility-functions)

## NavigationProvider

The root provider that manages navigation state for the entire application.

### Usage

```tsx
import { NavigationProvider } from '@/contexts/NavigationContext';

export default function RootLayout({ children }) {
  return (
    <NavigationProvider
      maxStackSize={20}
      enablePersistence={true}
      debug={process.env.NODE_ENV === 'development'}
    >
      {children}
    </NavigationProvider>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxStackSize` | `number` | `20` | Maximum number of entries in navigation stack |
| `enablePersistence` | `boolean` | `true` | Whether to persist stack to sessionStorage |
| `debug` | `boolean` | `false` | Enable debug logging and UI |
| `children` | `ReactNode` | required | Child components |

## useNavigation Hook

The primary hook for interacting with the navigation system.

### Usage

```tsx
import { useNavigation } from '@/hooks/useNavigation';

function MyComponent() {
  const {
    stack,
    currentEntry,
    canGoBack,
    canGoForward,
    push,
    pop,
    replace,
    clear,
    getBackUrl,
    getBackTitle,
    preserveState,
    restoreState
  } = useNavigation();
  
  // Use navigation features
}
```

### Return Value

```typescript
interface NavigationContextValue {
  // State
  stack: NavigationEntry[];
  currentEntry: NavigationEntry | null;
  canGoBack: boolean;
  canGoForward: boolean;
  
  // Navigation Methods
  push: (entry: NavigationEntryInput) => void;
  pop: () => NavigationEntry | null;
  replace: (entry: NavigationEntryInput) => void;
  clear: () => void;
  
  // Utilities
  getBackUrl: () => string | null;
  getBackTitle: () => string | null;
  findInStack: (predicate: (entry: NavigationEntry) => boolean) => NavigationEntry | null;
  preserveState: (state: any) => void;
  restoreState: () => any;
}
```

### Types

```typescript
interface NavigationEntry {
  id: string;
  path: string;
  title: string;
  type: 'page' | 'game' | 'modal' | 'tool';
  timestamp: number;
  metadata?: {
    gameState?: any;
    scrollPosition?: number;
    filters?: any;
    searchQuery?: string;
    [key: string]: any;
  };
}

type NavigationEntryInput = Omit<NavigationEntry, 'id' | 'timestamp'>;
```

### Methods

#### `push(entry: NavigationEntryInput): void`
Adds a new entry to the navigation stack.

```tsx
push({
  path: '/vocabulary',
  title: 'Vocabulary',
  type: 'page',
  metadata: { from: currentPath }
});
```

#### `pop(): NavigationEntry | null`
Removes and returns the current entry from the stack.

```tsx
const previousEntry = pop();
if (previousEntry) {
  router.push(previousEntry.path);
}
```

#### `replace(entry: NavigationEntryInput): void`
Replaces the current entry in the stack.

```tsx
replace({
  path: '/games/kanji-quest',
  title: 'Kanji Quest - Level 2',
  type: 'game'
});
```

#### `clear(): void`
Clears the entire navigation stack.

```tsx
// Use carefully - typically for logout or reset
clear();
```

#### `preserveState(state: any): void`
Saves state for the current page.

```tsx
preserveState({
  formData: formValues,
  scrollPosition: window.scrollY,
  selectedTab: activeTab
});
```

#### `restoreState(): any`
Retrieves previously saved state for the current page.

```tsx
useEffect(() => {
  const savedState = restoreState();
  if (savedState) {
    setFormValues(savedState.formData);
    window.scrollTo(0, savedState.scrollPosition);
    setActiveTab(savedState.selectedTab);
  }
}, []);
```

## SmartPageHeader Component

A intelligent page header that provides context-aware back navigation.

### Usage

```tsx
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';

export default function VocabularyPage() {
  return (
    <>
      <SmartPageHeader
        title="Vocabulary"
        fallbackHref="/practice"
        showBreadcrumbs={true}
        rightActions={
          <button onClick={handleSearch}>
            <SearchIcon />
          </button>
        }
      />
      {/* Page content */}
    </>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Page title to display |
| `fallbackHref` | `string` | `'/'` | URL to use when no back history exists |
| `showBreadcrumbs` | `boolean` | `false` | Whether to show breadcrumb navigation |
| `rightActions` | `ReactNode` | `null` | Actions to display on the right side |
| `className` | `string` | `''` | Additional CSS classes |
| `onBack` | `() => void` | `null` | Custom back handler (overrides default) |

## SmartNavigationLink Component

An enhanced link component that integrates with the navigation system.

### Usage

```tsx
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';

<SmartNavigationLink
  href="/vocabulary"
  preserveState={true}
  metadata={{ source: 'game', wordId: word.id }}
  className="btn btn-primary"
>
  Check Vocabulary
</SmartNavigationLink>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `href` | `string` | required | Destination URL |
| `preserveState` | `boolean` | `true` | Whether to preserve current page state |
| `metadata` | `object` | `{}` | Additional metadata to store |
| `className` | `string` | `''` | CSS classes |
| `onClick` | `() => void` | `null` | Additional click handler |
| `children` | `ReactNode` | required | Link content |

## Breadcrumbs Component

Displays hierarchical navigation path.

### Usage

```tsx
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

<Breadcrumbs
  maxItems={4}
  separator=">"
  className="text-sm"
  showHome={true}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxItems` | `number` | `5` | Maximum breadcrumb items to show |
| `separator` | `ReactNode` | `'/'` | Separator between items |
| `className` | `string` | `''` | CSS classes |
| `showHome` | `boolean` | `true` | Whether to always show Home |
| `itemClassName` | `string` | `''` | CSS classes for items |

## Navigation Rules

Configure navigation behavior for different sections of your app.

### Usage

```typescript
// src/lib/navigation/rules.ts
import { defineNavigationRules } from '@/lib/navigation';

export const navigationRules = defineNavigationRules([
  {
    pattern: /^\/games\/.*/,
    preserveState: true,
    returnBehavior: 'restore-state',
    maxStackDepth: 10,
    stateSerializer: (state) => ({
      score: state.score,
      level: state.level
    })
  },
  {
    pattern: '/admin/*',
    preserveState: false,
    returnBehavior: 'standard',
    maxStackDepth: 5
  }
]);
```

### Rule Interface

```typescript
interface NavigationRule {
  pattern: string | RegExp;
  preserveState: boolean;
  returnBehavior: 'restore-state' | 'previous-or-home' | 'standard' | 'custom';
  maxStackDepth?: number;
  allowedDestinations?: string[];
  stateSerializer?: (state: any) => any;
  customReturnHandler?: (entry: NavigationEntry) => string;
}
```

## State Preservation API

Low-level API for state management.

### Usage

```typescript
import { statePreservation } from '@/services/statePreservation';

// Save state
statePreservation.save('my-page-id', {
  formData: values,
  timestamp: Date.now()
});

// Restore state
const saved = statePreservation.restore('my-page-id');

// Clear state
statePreservation.clear('my-page-id');

// Clear old states
statePreservation.clearOld(30 * 60 * 1000); // 30 minutes
```

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `save` | `(key: string, state: any)` | `void` | Save state with key |
| `restore` | `(key: string)` | `any \| null` | Restore state by key |
| `clear` | `(key: string)` | `void` | Clear specific state |
| `clearOld` | `(maxAge: number)` | `void` | Clear states older than maxAge |
| `clearAll` | `()` | `void` | Clear all saved states |
| `getSize` | `()` | `number` | Get total size of saved states |

## Utility Functions

Helper functions for navigation operations.

### `getPageTitle(path: string): string`
Extracts a readable title from a path.

```typescript
getPageTitle('/practice/conjugation'); // "Conjugation"
getPageTitle('/games/kanji-quest'); // "Kanji Quest"
```

### `getPageType(path: string): NavigationType`
Determines the type of page from its path.

```typescript
getPageType('/games/kanji-quest'); // "game"
getPageType('/vocabulary'); // "page"
getPageType('/tools/calculator'); // "tool"
```

### `isNavigationAllowed(from: string, to: string): boolean`
Checks if navigation is allowed based on rules.

```typescript
if (!isNavigationAllowed(currentPath, destinationPath)) {
  showWarning('This navigation is not allowed');
  return;
}
```

### `createNavigationEntry(path: string, metadata?: any): NavigationEntryInput`
Helper to create a navigation entry.

```typescript
const entry = createNavigationEntry('/vocabulary', {
  source: 'quick-action',
  timestamp: Date.now()
});
```

## Hooks

### `useNavigationGestures()`
Enables swipe gestures for navigation (mobile).

```typescript
function MyPage() {
  useNavigationGestures({
    enableSwipeBack: true,
    swipeThreshold: 100,
    edgeWidth: 20
  });
  
  return <div>...</div>;
}
```

### `useNavigationKeyboard()`
Enables keyboard shortcuts for navigation.

```typescript
function MyPage() {
  useNavigationKeyboard({
    backKey: 'Escape',
    forwardKey: null,
    homeKey: 'h'
  });
  
  return <div>...</div>;
}
```

### `useNavigationState(key: string)`
Simplified state preservation for a component.

```typescript
function MyForm() {
  const [values, setValues] = useNavigationState('my-form', {
    name: '',
    email: ''
  });
  
  return <form>...</form>;
}
```

## TypeScript Support

All components and hooks are fully typed. Import types from:

```typescript
import type {
  NavigationEntry,
  NavigationEntryInput,
  NavigationType,
  NavigationRule,
  NavigationContextValue
} from '@/types/navigation';
```

## Migration Guide

For migrating from StandardPageHeader:

```tsx
// Before
<StandardPageHeader
  title="My Page"
  backHref="/previous"
/>

// After
<SmartPageHeader
  title="My Page"
  fallbackHref="/previous"
/>
```

For navigation links:

```tsx
// Before
<Link href="/vocabulary">Vocabulary</Link>

// After
<SmartNavigationLink href="/vocabulary">
  Vocabulary
</SmartNavigationLink>
```