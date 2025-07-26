// Navigation system types

export type NavigationType = 'page' | 'game' | 'modal' | 'tool';

export type ReturnBehavior = 
  | 'restore-state'      // Restore previous state
  | 'previous-or-home'   // Go to previous or home
  | 'standard'           // Normal back behavior
  | 'custom';            // Custom handler

export interface NavigationEntry {
  id: string;
  path: string;
  title: string;
  type: NavigationType;
  timestamp: number;
  metadata?: {
    gameState?: any;
    scrollPosition?: number;
    filters?: any;
    searchQuery?: string;
    from?: string;
    [key: string]: any;
  };
}

export type NavigationEntryInput = Omit<NavigationEntry, 'id' | 'timestamp'>;

export interface NavigationState {
  stack: NavigationEntry[];
  currentIndex: number;
  maxStackSize: number;
}

export interface NavigationContextValue {
  // State
  stack: NavigationEntry[];
  currentEntry: NavigationEntry | null;
  canGoBack: boolean;
  canGoForward: boolean;
  
  // Actions
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

export interface NavigationRule {
  pattern: string | RegExp;
  preserveState: boolean;
  returnBehavior: ReturnBehavior;
  maxStackDepth?: number;
  allowedDestinations?: string[];
  stateSerializer?: (state: any) => any;
  customReturnHandler?: (entry: NavigationEntry) => string;
}

export interface SavedState {
  state: string;
  timestamp: number;
}

export interface NavigationProviderProps {
  children: React.ReactNode;
  maxStackSize?: number;
  enablePersistence?: boolean;
  debug?: boolean;
}