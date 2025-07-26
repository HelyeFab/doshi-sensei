# Proposed Navigation Architecture

## System Overview

The new navigation system is built on a **Navigation Stack** concept, managed through React Context, with smart components that understand navigation intent and preserve state as needed.

```
┌─────────────────────────────────────────────────────────────┐
│                     Navigation System                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │ Navigation      │    │ Navigation Rules  │                │
│  │ Context         │───▶│ Engine            │                │
│  └─────────────────┘    └──────────────────┘                │
│           │                      │                            │
│           ▼                      ▼                            │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │ Navigation      │    │ State             │                │
│  │ Stack           │    │ Preservation      │                │
│  └─────────────────┘    └──────────────────┘                │
│           │                      │                            │
│           ▼                      ▼                            │
│  ┌─────────────────────────────────────────┐                │
│  │          Component Layer                 │                │
│  ├─────────────────┬───────────────────────┤                │
│  │ SmartPageHeader │ SmartNavigationLink   │                │
│  │ Breadcrumbs     │ NavigationProvider    │                │
│  └─────────────────┴───────────────────────┘                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. NavigationContext

```typescript
// src/contexts/NavigationContext.tsx

interface NavigationEntry {
  id: string;                    // Unique identifier
  path: string;                  // Route path
  title: string;                 // Page title
  type: NavigationType;          // 'page' | 'game' | 'modal' | 'tool'
  timestamp: number;             // When visited
  metadata?: {
    gameState?: any;           // Serializable game state
    scrollPosition?: number;    // Scroll position
    filters?: any;             // Active filters
    searchQuery?: string;      // Search terms
  };
}

interface NavigationState {
  stack: NavigationEntry[];
  currentIndex: number;
  maxStackSize: number;
}

interface NavigationContextValue {
  // State
  stack: NavigationEntry[];
  currentEntry: NavigationEntry | null;
  canGoBack: boolean;
  canGoForward: boolean;
  
  // Actions
  push: (entry: Omit<NavigationEntry, 'id' | 'timestamp'>) => void;
  pop: () => NavigationEntry | null;
  replace: (entry: Omit<NavigationEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
  
  // Utilities
  getBackUrl: () => string | null;
  getBackTitle: () => string | null;
  findInStack: (predicate: (entry: NavigationEntry) => boolean) => NavigationEntry | null;
  preserveState: (state: any) => void;
  restoreState: () => any;
}
```

### 2. Navigation Rules Engine

```typescript
// src/lib/navigation/rules.ts

interface NavigationRule {
  pattern: string | RegExp;           // Route pattern to match
  preserveState: boolean;             // Whether to preserve component state
  maxStackDepth?: number;             // Override max stack depth
  allowedDestinations?: string[];     // Restrict where users can go
  returnBehavior: ReturnBehavior;     // How back navigation works
  stateSerializer?: (state: any) => any;  // Custom state serialization
}

type ReturnBehavior = 
  | 'restore-state'      // Restore previous state
  | 'previous-or-home'   // Go to previous or home
  | 'standard'           // Normal back behavior
  | 'custom';            // Custom handler

const navigationRules: NavigationRule[] = [
  {
    pattern: /^\/games\/.*/,
    preserveState: true,
    returnBehavior: 'restore-state',
    allowedDestinations: ['/vocabulary', '/practice/lists', '/tools/*'],
    stateSerializer: (state) => ({
      // Only serialize essential game state
      score: state.score,
      level: state.level,
      currentQuestion: state.currentQuestion
    })
  },
  {
    pattern: /^\/tools\/.*/,
    preserveState: false,
    returnBehavior: 'previous-or-home'
  },
  {
    pattern: /^\/admin\/.*/,
    preserveState: false,
    returnBehavior: 'standard',
    maxStackDepth: 5  // Limit admin navigation depth
  }
];
```

### 3. State Preservation System

```typescript
// src/lib/navigation/statePreservation.ts

interface StatePreservationManager {
  save(key: string, state: any): void;
  restore(key: string): any;
  clear(key: string): void;
  clearOld(maxAge: number): void;
}

class StatePreservationService implements StatePreservationManager {
  private storage: Map<string, SavedState> = new Map();
  private maxStateSize = 1024 * 1024; // 1MB limit per state
  
  save(key: string, state: any): void {
    const serialized = this.serialize(state);
    
    if (serialized.length > this.maxStateSize) {
      console.warn(`State too large for ${key}, truncating`);
      // Implement smart truncation
    }
    
    this.storage.set(key, {
      state: serialized,
      timestamp: Date.now()
    });
    
    // Also save to sessionStorage for persistence
    this.persistToSession(key, serialized);
  }
  
  restore(key: string): any {
    const saved = this.storage.get(key) || this.restoreFromSession(key);
    
    if (!saved) return null;
    
    // Check if state is too old (configurable)
    if (Date.now() - saved.timestamp > 30 * 60 * 1000) { // 30 minutes
      this.clear(key);
      return null;
    }
    
    return this.deserialize(saved.state);
  }
  
  private serialize(state: any): string {
    // Handle circular references, functions, etc.
    return JSON.stringify(state, this.replacer);
  }
  
  private deserialize(state: string): any {
    return JSON.parse(state, this.reviver);
  }
}
```

### 4. Smart Components

#### SmartPageHeader

```typescript
// src/components/navigation/SmartPageHeader.tsx

interface SmartPageHeaderProps {
  title: string;
  fallbackHref?: string;
  showBreadcrumbs?: boolean;
  rightActions?: React.ReactNode;
}

export function SmartPageHeader({
  title,
  fallbackHref = '/',
  showBreadcrumbs = false,
  rightActions
}: SmartPageHeaderProps) {
  const { getBackUrl, getBackTitle, canGoBack } = useNavigation();
  const router = useRouter();
  
  const handleBack = () => {
    if (canGoBack) {
      const backUrl = getBackUrl();
      router.push(backUrl || fallbackHref);
    } else {
      router.push(fallbackHref);
    }
  };
  
  return (
    <header className="smart-page-header">
      <div className="header-content">
        <div className="left-section">
          {canGoBack && (
            <button
              onClick={handleBack}
              className="back-button"
              aria-label={`Go back to ${getBackTitle() || 'previous page'}`}
            >
              <ChevronLeft />
              <span className="back-label">
                {getBackTitle() || 'Back'}
              </span>
            </button>
          )}
          <h1>{title}</h1>
        </div>
        {rightActions && (
          <div className="right-section">{rightActions}</div>
        )}
      </div>
      {showBreadcrumbs && <Breadcrumbs />}
    </header>
  );
}
```

#### SmartNavigationLink

```typescript
// src/components/navigation/SmartNavigationLink.tsx

interface SmartNavigationLinkProps {
  href: string;
  children: React.ReactNode;
  preserveState?: boolean;
  metadata?: Record<string, any>;
  className?: string;
  onClick?: () => void;
}

export function SmartNavigationLink({
  href,
  children,
  preserveState = true,
  metadata,
  className,
  onClick
}: SmartNavigationLinkProps) {
  const { push } = useNavigation();
  const router = useRouter();
  const pathname = usePathname();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Execute custom onClick if provided
    onClick?.();
    
    // Get page title (could be from a mapping or extracted)
    const title = getPageTitle(href);
    const type = getPageType(href);
    
    // Add to navigation stack
    push({
      path: href,
      title,
      type,
      metadata: {
        from: pathname,
        ...metadata
      }
    });
    
    // Preserve current page state if needed
    if (preserveState) {
      preserveCurrentPageState();
    }
    
    // Navigate
    router.push(href);
  };
  
  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}
```

## Integration with Existing Systems

### Next.js App Router Integration

```typescript
// src/app/layout.tsx

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NavigationProvider>
          {/* Other providers */}
          {children}
        </NavigationProvider>
      </body>
    </html>
  );
}
```

### Route Change Detection

```typescript
// Inside NavigationProvider

useEffect(() => {
  const handleRouteChange = () => {
    const currentPath = window.location.pathname;
    
    // Auto-add to stack if navigation happened outside our system
    if (currentPath !== currentEntry?.path) {
      push({
        path: currentPath,
        title: document.title,
        type: 'page'
      });
    }
  };
  
  // Listen to popstate for browser back/forward
  window.addEventListener('popstate', handleRouteChange);
  
  return () => {
    window.removeEventListener('popstate', handleRouteChange);
  };
}, [currentEntry]);
```

## Memory Management

### Stack Size Limits

```typescript
const MAX_STACK_SIZE = 20;
const MAX_STATE_SIZE = 1024 * 1024; // 1MB

// Implement LRU eviction
function addToStack(entry: NavigationEntry) {
  if (stack.length >= MAX_STACK_SIZE) {
    // Remove oldest entry
    const removed = stack.shift();
    // Clean up preserved state
    stateManager.clear(removed.id);
  }
  
  stack.push(entry);
}
```

### State Cleanup

```typescript
// Automatic cleanup of old states
setInterval(() => {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  
  stateManager.clearOld(thirtyMinutesAgo);
}, 5 * 60 * 1000); // Run every 5 minutes
```

## Mobile Optimizations

### Touch Gestures

```typescript
// src/hooks/useSwipeBack.ts

export function useSwipeBack() {
  const { canGoBack, pop } = useNavigation();
  const router = useRouter();
  
  useEffect(() => {
    let startX = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;
      
      // Swipe right from left edge
      if (startX < 20 && diff > 100 && canGoBack) {
        const back = pop();
        if (back) {
          router.push(back.path);
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canGoBack]);
}
```

## Analytics Integration

```typescript
// Track navigation patterns
function trackNavigation(from: NavigationEntry, to: NavigationEntry) {
  analytics.track('navigation', {
    from_path: from.path,
    from_type: from.type,
    to_path: to.path,
    to_type: to.type,
    stack_depth: stack.length,
    time_on_page: Date.now() - from.timestamp
  });
}
```

## Error Handling

```typescript
// Graceful degradation
const NavigationErrorBoundary: React.FC = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div>
          <p>Navigation system error</p>
          <Link href="/">Go to Home</Link>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};
```