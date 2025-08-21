/**
 * Single Source of Truth for User Entitlements
 * 
 * This utility defines all feature limits and entitlements based on user type.
 * It provides a centralized way to manage what users can access and how much.
 */

import { UserType } from '@/types/subscription';

export interface FeatureEntitlement {
  daily?: number;  // Daily limit (-1 for unlimited, undefined if not applicable)
  total?: number;  // Total/absolute limit (-1 for unlimited, undefined if not applicable)
  enabled: boolean; // Whether the feature is available at all
}

export interface UserEntitlements {
  // Games
  games: {
    kanjiQuest: FeatureEntitlement;
    kanaDrop: FeatureEntitlement;
    otherGames: FeatureEntitlement; // For future games
  };
  
  // Learning Features
  learning: {
    drills: FeatureEntitlement;
    stories: FeatureEntitlement;
    articles: FeatureEntitlement;
    vocabularySearch: FeatureEntitlement;
    moodBoards: FeatureEntitlement;
  };
  
  // Storage & Organization
  storage: {
    lists: FeatureEntitlement;
    bookmarks: FeatureEntitlement;
    savedWords: FeatureEntitlement;
  };
  
  // System Features
  system: {
    cloudSync: FeatureEntitlement;
    offlineMode: FeatureEntitlement;
    progressTracking: FeatureEntitlement;
    analytics: FeatureEntitlement;
  };
  
  // Support
  support: {
    prioritySupport: FeatureEntitlement;
  };
}

/**
 * Define entitlements for each user type
 * This is the SINGLE SOURCE OF TRUTH for all feature limits
 */
const ENTITLEMENTS_BY_USER_TYPE: Record<UserType, UserEntitlements> = {
  guest: {
    games: {
      kanjiQuest: { daily: 3, enabled: true },
      kanaDrop: { daily: 3, enabled: true },
      otherGames: { daily: 3, enabled: true },
    },
    learning: {
      drills: { daily: 3, enabled: true },
      stories: { daily: 3, enabled: true },
      articles: { daily: 3, enabled: true },
      vocabularySearch: { daily: -1, enabled: true }, // Unlimited
      moodBoards: { enabled: true }, // View only, basic access
    },
    storage: {
      lists: { total: 0, enabled: false }, // Cannot create lists
      bookmarks: { total: 0, enabled: false }, // Cannot bookmark
      savedWords: { total: 0, enabled: false }, // Cannot save
    },
    system: {
      cloudSync: { enabled: false },
      offlineMode: { enabled: false },
      progressTracking: { enabled: false }, // No persistent tracking
      analytics: { enabled: false },
    },
    support: {
      prioritySupport: { enabled: false },
    },
  },
  
  free: {
    games: {
      kanjiQuest: { daily: 3, enabled: true },
      kanaDrop: { daily: 3, enabled: true },
      otherGames: { daily: 3, enabled: true },
    },
    learning: {
      drills: { daily: 3, enabled: true },
      stories: { daily: 3, enabled: true },
      articles: { daily: 3, enabled: true },
      vocabularySearch: { daily: -1, enabled: true }, // Unlimited
      moodBoards: { enabled: true }, // Basic access
    },
    storage: {
      lists: { total: 3, enabled: true },
      bookmarks: { total: 5, enabled: true },
      savedWords: { total: -1, enabled: true }, // Unlimited within lists
    },
    system: {
      cloudSync: { enabled: false },
      offlineMode: { enabled: false },
      progressTracking: { enabled: true }, // Local only
      analytics: { enabled: true }, // Basic analytics
    },
    support: {
      prioritySupport: { enabled: false },
    },
  },
  
  monthly: {
    games: {
      kanjiQuest: { daily: -1, enabled: true }, // Unlimited
      kanaDrop: { daily: -1, enabled: true },
      otherGames: { daily: -1, enabled: true },
    },
    learning: {
      drills: { daily: -1, enabled: true },
      stories: { daily: -1, enabled: true },
      articles: { daily: -1, enabled: true },
      vocabularySearch: { daily: -1, enabled: true },
      moodBoards: { enabled: true }, // Full access
    },
    storage: {
      lists: { total: -1, enabled: true },
      bookmarks: { total: -1, enabled: true },
      savedWords: { total: -1, enabled: true },
    },
    system: {
      cloudSync: { enabled: true },
      offlineMode: { enabled: true },
      progressTracking: { enabled: true }, // Cloud synced
      analytics: { enabled: true }, // Advanced analytics
    },
    support: {
      prioritySupport: { enabled: true },
    },
  },
  
  yearly: {
    // Same as monthly but with better value
    games: {
      kanjiQuest: { daily: -1, enabled: true },
      kanaDrop: { daily: -1, enabled: true },
      otherGames: { daily: -1, enabled: true },
    },
    learning: {
      drills: { daily: -1, enabled: true },
      stories: { daily: -1, enabled: true },
      articles: { daily: -1, enabled: true },
      vocabularySearch: { daily: -1, enabled: true },
      moodBoards: { enabled: true },
    },
    storage: {
      lists: { total: -1, enabled: true },
      bookmarks: { total: -1, enabled: true },
      savedWords: { total: -1, enabled: true },
    },
    system: {
      cloudSync: { enabled: true },
      offlineMode: { enabled: true },
      progressTracking: { enabled: true },
      analytics: { enabled: true },
    },
    support: {
      prioritySupport: { enabled: true },
    },
  },
  
  // Legacy premium type - maps to monthly
  premium: {
    games: {
      kanjiQuest: { daily: -1, enabled: true },
      kanaDrop: { daily: -1, enabled: true },
      otherGames: { daily: -1, enabled: true },
    },
    learning: {
      drills: { daily: -1, enabled: true },
      stories: { daily: -1, enabled: true },
      articles: { daily: -1, enabled: true },
      vocabularySearch: { daily: -1, enabled: true },
      moodBoards: { enabled: true },
    },
    storage: {
      lists: { total: -1, enabled: true },
      bookmarks: { total: -1, enabled: true },
      savedWords: { total: -1, enabled: true },
    },
    system: {
      cloudSync: { enabled: true },
      offlineMode: { enabled: true },
      progressTracking: { enabled: true },
      analytics: { enabled: true },
    },
    support: {
      prioritySupport: { enabled: true },
    },
  },
};

/**
 * Get entitlements for a specific user type
 */
export function getEntitlementsForUserType(userType: UserType): UserEntitlements {
  return ENTITLEMENTS_BY_USER_TYPE[userType] || ENTITLEMENTS_BY_USER_TYPE.guest;
}

/**
 * Check if a specific feature is available for a user type
 */
export function isFeatureEnabled(userType: UserType, featurePath: string): boolean {
  const entitlements = getEntitlementsForUserType(userType);
  
  // Navigate through the nested structure using the feature path
  // e.g., "games.kanjiQuest" or "storage.lists"
  const pathParts = featurePath.split('.');
  let current: any = entitlements;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  
  return current?.enabled || false;
}

/**
 * Get the limit for a specific feature
 * @returns The limit number (-1 for unlimited, 0 for not allowed, undefined if not applicable)
 */
export function getFeatureLimit(
  userType: UserType, 
  featurePath: string, 
  limitType: 'daily' | 'total' = 'daily'
): number | undefined {
  const entitlements = getEntitlementsForUserType(userType);
  
  // Navigate through the nested structure
  const pathParts = featurePath.split('.');
  let current: any = entitlements;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  if (current && typeof current === 'object' && 'enabled' in current) {
    const entitlement = current as FeatureEntitlement;
    return entitlement.enabled ? entitlement[limitType] : 0;
  }
  
  return undefined;
}

/**
 * Check if a limit is unlimited
 */
export function isUnlimited(limit: number | undefined): boolean {
  return limit === -1;
}

/**
 * Format a limit for display
 */
export function formatLimit(limit: number | undefined): string {
  if (limit === undefined) return 'N/A';
  if (limit === -1) return '∞';
  return limit.toString();
}

/**
 * Get a human-readable description of entitlements for a user type
 */
export function getEntitlementsSummary(userType: UserType): string[] {
  const entitlements = getEntitlementsForUserType(userType);
  const summary: string[] = [];
  
  // Games
  const kanjiQuestLimit = getFeatureLimit(userType, 'games.kanjiQuest');
  const kanaDropLimit = getFeatureLimit(userType, 'games.kanaDrop');
  
  if (isUnlimited(kanjiQuestLimit)) {
    summary.push('Unlimited games per day');
  } else if (kanjiQuestLimit) {
    summary.push(`${kanjiQuestLimit} games per day`);
  }
  
  // Learning
  const drillLimit = getFeatureLimit(userType, 'learning.drills');
  if (isUnlimited(drillLimit)) {
    summary.push('Unlimited drill questions');
  } else if (drillLimit) {
    summary.push(`${drillLimit} drill questions per day`);
  }
  
  // Storage
  const listLimit = getFeatureLimit(userType, 'storage.lists', 'total');
  if (isUnlimited(listLimit)) {
    summary.push('Unlimited vocabulary lists');
  } else if (listLimit && listLimit > 0) {
    summary.push(`Up to ${listLimit} vocabulary lists`);
  }
  
  // System
  if (entitlements.system.cloudSync.enabled) {
    summary.push('Cloud sync enabled');
  }
  
  if (entitlements.system.offlineMode.enabled) {
    summary.push('Offline mode');
  }
  
  if (entitlements.support.prioritySupport.enabled) {
    summary.push('Priority support');
  }
  
  return summary;
}

/**
 * Compare entitlements between two user types
 * Useful for showing what users get when they upgrade
 */
export function compareEntitlements(fromType: UserType, toType: UserType): {
  added: string[];
  improved: string[];
  same: string[];
} {
  const fromEntitlements = getEntitlementsForUserType(fromType);
  const toEntitlements = getEntitlementsForUserType(toType);
  
  const added: string[] = [];
  const improved: string[] = [];
  const same: string[] = [];
  
  // This is a simplified comparison - could be expanded
  // Check games
  const fromGames = getFeatureLimit(fromType, 'games.kanjiQuest');
  const toGames = getFeatureLimit(toType, 'games.kanjiQuest');
  
  if (fromGames !== toGames) {
    if (isUnlimited(toGames)) {
      improved.push('Unlimited games (previously ' + formatLimit(fromGames) + ' per day)');
    }
  }
  
  // Check cloud sync
  if (!fromEntitlements.system.cloudSync.enabled && toEntitlements.system.cloudSync.enabled) {
    added.push('Cloud sync');
  }
  
  // Add more comparisons as needed...
  
  return { added, improved, same };
}