import type { NavigationRule, NavigationEntry } from '@/types/navigation';

// Default navigation rules for different sections of the app
export const defaultNavigationRules: NavigationRule[] = [
  // Games - preserve state and allow specific destinations
  {
    pattern: /^\/games\/.*/,
    preserveState: true,
    returnBehavior: 'restore-state',
    allowedDestinations: ['/', '/vocabulary', '/practice/lists', '/tools/*', '/practice/*', '/read', '/admin', '/games', '/account', '/settings', '/kanji-browser'],
    stateSerializer: (state) => {
      // Only serialize essential game state
      if (!state) return null;
      
      return {
        score: state.score,
        level: state.level,
        currentQuestion: state.currentQuestion,
        lives: state.lives,
        progress: state.progress
      };
    }
  },
  
  // Practice pages - standard navigation
  {
    pattern: /^\/practice\/.*/,
    preserveState: true,
    returnBehavior: 'standard',
    stateSerializer: (state) => ({
      selectedItems: state.selectedItems,
      filters: state.filters,
      currentPage: state.currentPage
    })
  },
  
  // Vocabulary - preserve search and filters
  {
    pattern: '/vocabulary',
    preserveState: true,
    returnBehavior: 'previous-or-home',
    stateSerializer: (state) => ({
      searchQuery: state.searchQuery,
      filters: state.filters,
      scrollPosition: state.scrollPosition,
      selectedTab: state.selectedTab
    })
  },
  
  // Tools section
  {
    pattern: /^\/tools\/.*/,
    preserveState: false,
    returnBehavior: 'previous-or-home'
  },
  
  // Admin section - limited depth
  {
    pattern: /^\/admin\/.*/,
    preserveState: false,
    returnBehavior: 'standard',
    maxStackDepth: 5
  },
  
  // Authentication pages - clear stack
  {
    pattern: /^\/(login|signup|reset-password)/,
    preserveState: false,
    returnBehavior: 'custom',
    customReturnHandler: () => '/' // Always go to home
  },
  
  // Default rule for all other pages
  {
    pattern: /.*/,
    preserveState: false,
    returnBehavior: 'standard'
  }
];

class NavigationRulesEngine {
  private rules: NavigationRule[];
  
  constructor(rules: NavigationRule[] = defaultNavigationRules) {
    this.rules = rules;
  }
  
  /**
   * Find the matching rule for a given path
   */
  findRule(path: string): NavigationRule | null {
    for (const rule of this.rules) {
      if (this.matchesPattern(path, rule.pattern)) {
        return rule;
      }
    }
    return null;
  }
  
  /**
   * Check if navigation from one path to another is allowed
   */
  isNavigationAllowed(from: string, to: string): boolean {
    const rule = this.findRule(from);
    
    if (!rule || !rule.allowedDestinations) {
      return true; // No restrictions
    }
    
    return rule.allowedDestinations.some(pattern => {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        return to.startsWith(prefix);
      }
      return to === pattern;
    });
  }
  
  /**
   * Get the return behavior for a path
   */
  getReturnBehavior(path: string): string {
    const rule = this.findRule(path);
    return rule?.returnBehavior || 'standard';
  }
  
  /**
   * Check if state should be preserved for a path
   */
  shouldPreserveState(path: string): boolean {
    const rule = this.findRule(path);
    return rule?.preserveState || false;
  }
  
  /**
   * Get the state serializer for a path
   */
  getStateSerializer(path: string): ((state: any) => any) | null {
    const rule = this.findRule(path);
    return rule?.stateSerializer || null;
  }
  
  /**
   * Get custom return handler if defined
   */
  getCustomReturnHandler(path: string): ((entry: NavigationEntry) => string) | null {
    const rule = this.findRule(path);
    return rule?.customReturnHandler || null;
  }
  
  /**
   * Get max stack depth for a path
   */
  getMaxStackDepth(path: string): number | undefined {
    const rule = this.findRule(path);
    return rule?.maxStackDepth;
  }
  
  /**
   * Add or update a rule
   */
  addRule(rule: NavigationRule, prepend: boolean = true): void {
    if (prepend) {
      this.rules.unshift(rule);
    } else {
      this.rules.push(rule);
    }
  }
  
  /**
   * Remove rules matching a pattern
   */
  removeRule(pattern: string | RegExp): void {
    this.rules = this.rules.filter(rule => {
      if (typeof pattern === 'string' && typeof rule.pattern === 'string') {
        return rule.pattern !== pattern;
      }
      if (pattern instanceof RegExp && rule.pattern instanceof RegExp) {
        return rule.pattern.source !== pattern.source;
      }
      return true;
    });
  }
  
  /**
   * Check if a path matches a pattern
   */
  private matchesPattern(path: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(path);
    }
    
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }
    
    return path === pattern;
  }
}

// Export singleton instance with default rules
export const navigationRules = new NavigationRulesEngine();

// Export function to create custom rules engine
export function createNavigationRules(rules: NavigationRule[]): NavigationRulesEngine {
  return new NavigationRulesEngine(rules);
}