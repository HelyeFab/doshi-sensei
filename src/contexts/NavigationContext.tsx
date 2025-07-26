'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { 
  NavigationContextValue, 
  NavigationEntry, 
  NavigationEntryInput, 
  NavigationProviderProps,
  NavigationState
} from '@/types/navigation';
import { statePreservation } from '@/services/navigation/statePreservation';
import { navigationRules } from '@/lib/navigation/rules';
import { v4 as uuidv4 } from 'uuid';

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ 
  children, 
  maxStackSize = 20,
  enablePersistence = true,
  debug = false
}: NavigationProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<NavigationState>(() => {
    // Try to restore from session storage
    if (enablePersistence && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('doshi-nav-stack');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            stack: parsed.stack || [],
            currentIndex: parsed.currentIndex || -1,
            maxStackSize
          };
        }
      } catch (error) {
        console.error('Failed to restore navigation stack:', error);
      }
    }
    
    return {
      stack: [],
      currentIndex: -1,
      maxStackSize
    };
  });
  
  const isNavigating = useRef(false);
  
  // Get current entry
  const currentEntry = state.currentIndex >= 0 ? state.stack[state.currentIndex] : null;
  
  // Check navigation capabilities
  const canGoBack = state.currentIndex > 0;
  const canGoForward = state.currentIndex < state.stack.length - 1;
  
  // Persist state to session storage
  useEffect(() => {
    if (enablePersistence && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('doshi-nav-stack', JSON.stringify({
          stack: state.stack,
          currentIndex: state.currentIndex
        }));
      } catch (error) {
        console.error('Failed to persist navigation stack:', error);
      }
    }
  }, [state, enablePersistence]);
  
  // Clean up old states periodically
  useEffect(() => {
    const interval = setInterval(() => {
      statePreservation.clearOld(30 * 60 * 1000); // 30 minutes
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, []);
  
  // Push new entry to stack
  const push = useCallback((entry: NavigationEntryInput) => {
    setState(prev => {
      const newEntry: NavigationEntry = {
        ...entry,
        id: uuidv4(),
        timestamp: Date.now()
      };
      
      // If we're not at the end of the stack, remove forward entries
      let newStack = prev.currentIndex < prev.stack.length - 1
        ? prev.stack.slice(0, prev.currentIndex + 1)
        : [...prev.stack];
      
      // Check if we need to enforce max stack depth for this path
      const maxDepth = navigationRules.getMaxStackDepth(entry.path) || maxStackSize;
      
      // Add new entry
      newStack.push(newEntry);
      
      // Enforce max stack size
      if (newStack.length > maxDepth) {
        const removed = newStack.shift();
        if (removed) {
          // Clean up state for removed entry
          statePreservation.clear(removed.id);
        }
      }
      
      return {
        ...prev,
        stack: newStack,
        currentIndex: newStack.length - 1
      };
    });
    
    if (debug) {
      console.log('[Navigation] Pushed:', entry);
    }
  }, [maxStackSize, debug]);
  
  // Pop current entry from stack
  const pop = useCallback(() => {
    let poppedEntry: NavigationEntry | null = null;
    
    setState(prev => {
      if (prev.currentIndex > 0) {
        poppedEntry = prev.stack[prev.currentIndex];
        return {
          ...prev,
          currentIndex: prev.currentIndex - 1
        };
      }
      return prev;
    });
    
    if (debug && poppedEntry) {
      console.log('[Navigation] Popped:', poppedEntry);
    }
    
    return poppedEntry;
  }, [debug]);
  
  // Replace current entry
  const replace = useCallback((entry: NavigationEntryInput) => {
    setState(prev => {
      if (prev.currentIndex < 0) {
        // If no current entry, just push
        return prev;
      }
      
      const newEntry: NavigationEntry = {
        ...entry,
        id: prev.stack[prev.currentIndex].id, // Keep same ID
        timestamp: Date.now()
      };
      
      const newStack = [...prev.stack];
      newStack[prev.currentIndex] = newEntry;
      
      return {
        ...prev,
        stack: newStack
      };
    });
    
    if (debug) {
      console.log('[Navigation] Replaced:', entry);
    }
  }, [debug]);
  
  // Clear navigation stack
  const clear = useCallback(() => {
    setState(prev => {
      // Clean up all states
      prev.stack.forEach(entry => {
        statePreservation.clear(entry.id);
      });
      
      return {
        ...prev,
        stack: [],
        currentIndex: -1
      };
    });
    
    if (debug) {
      console.log('[Navigation] Cleared stack');
    }
  }, [debug]);
  
  // Get back URL
  const getBackUrl = useCallback(() => {
    if (!canGoBack) return null;
    
    const previousEntry = state.stack[state.currentIndex - 1];
    if (!previousEntry) return null;
    
    // Check for custom return behavior
    const behavior = navigationRules.getReturnBehavior(currentEntry?.path || '');
    
    if (behavior === 'custom' && currentEntry) {
      const customHandler = navigationRules.getCustomReturnHandler(currentEntry.path);
      if (customHandler) {
        return customHandler(currentEntry);
      }
    }
    
    return previousEntry.path;
  }, [canGoBack, state.stack, state.currentIndex, currentEntry]);
  
  // Get back title
  const getBackTitle = useCallback(() => {
    if (!canGoBack) return null;
    
    const previousEntry = state.stack[state.currentIndex - 1];
    return previousEntry?.title || null;
  }, [canGoBack, state.stack, state.currentIndex]);
  
  // Find entry in stack
  const findInStack = useCallback((predicate: (entry: NavigationEntry) => boolean) => {
    return state.stack.find(predicate) || null;
  }, [state.stack]);
  
  // Preserve state for current page
  const preserveState = useCallback((pageState: any) => {
    if (!currentEntry) return;
    
    const shouldPreserve = navigationRules.shouldPreserveState(currentEntry.path);
    if (!shouldPreserve) return;
    
    const serializer = navigationRules.getStateSerializer(currentEntry.path);
    const stateToSave = serializer ? serializer(pageState) : pageState;
    
    statePreservation.save(currentEntry.id, stateToSave);
    
    if (debug) {
      console.log('[Navigation] Preserved state for:', currentEntry.path);
    }
  }, [currentEntry, debug]);
  
  // Restore state for current page
  const restoreState = useCallback(() => {
    if (!currentEntry) return null;
    
    const savedState = statePreservation.restore(currentEntry.id);
    
    if (debug && savedState) {
      console.log('[Navigation] Restored state for:', currentEntry.path);
    }
    
    return savedState;
  }, [currentEntry, debug]);
  
  // Track route changes
  useEffect(() => {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    // Skip if we're in the middle of programmatic navigation
    if (isNavigating.current) {
      isNavigating.current = false;
      return;
    }
    
    // If the pathname changed but wasn't tracked, add it
    if (pathname !== currentEntry?.path) {
      // Extract title from document
      const title = typeof document !== 'undefined' ? document.title : pathname;
      
      push({
        path: pathname,
        title: title.replace(' - Doshi Sensei', ''), // Remove app suffix
        type: 'page'
      });
    }
  }, [pathname, currentEntry, push]);
  
  // Handle browser back/forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handlePopState = () => {
      isNavigating.current = true;
      // Browser navigation happened, sync our state
      // This is handled by the pathname effect
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const value: NavigationContextValue = {
    // State
    stack: state.stack,
    currentEntry,
    canGoBack,
    canGoForward,
    
    // Actions
    push,
    pop,
    replace,
    clear,
    
    // Utilities
    getBackUrl,
    getBackTitle,
    findInStack,
    preserveState,
    restoreState
  };
  
  return (
    <NavigationContext.Provider value={value}>
      {children}
      {debug && (
        <NavigationDebugger 
          stack={state.stack} 
          currentIndex={state.currentIndex} 
        />
      )}
    </NavigationContext.Provider>
  );
}

// Navigation debugger component (only shown in debug mode)
function NavigationDebugger({ stack, currentIndex }: { stack: NavigationEntry[], currentIndex: number }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="fixed bottom-20 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
      >
        Nav Debug ({currentIndex + 1}/{stack.length})
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg p-4 w-96 max-h-96 overflow-auto">
          <h3 className="font-bold mb-2">Navigation Stack</h3>
          <div className="space-y-2">
            {stack.map((entry, index) => (
              <div
                key={entry.id}
                className={`text-xs p-2 rounded ${
                  index === currentIndex ? 'bg-blue-100 font-bold' : 'bg-gray-50'
                }`}
              >
                <div>{index}: {entry.title}</div>
                <div className="text-gray-500">{entry.path}</div>
                <div className="text-gray-400">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom hook to use navigation context
export function useNavigation() {
  const context = useContext(NavigationContext);
  
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  
  return context;
}