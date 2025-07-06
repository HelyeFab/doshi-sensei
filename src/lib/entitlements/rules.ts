/**
 * Entitlement Rules
 * Defines what each user type can access and their limits
 */

import { EntitlementRule } from './types';

export const ENTITLEMENT_RULES: EntitlementRule[] = [
  // Guest Users (not logged in)
  {
    id: 'guest_basic',
    userTypes: ['guest'],
    permissions: ['play_games', 'do_drills', 'read_articles', 'read_stories', 'kanji_moods'],
    limits: {
      daily: {
        drill_practice: 3,
        games: 3, // Shared limit for all games
        article_reading: 3,
        story_reading: 1,
        kanji_moods: 1
      }
    },
    description: 'Basic access for non-registered users'
  },
  
  // Free Users (registered but not paying)
  {
    id: 'free_user',
    userTypes: ['free'],
    permissions: [
      'play_games',
      'do_drills',
      'read_articles',
      'read_stories',
      'create_lists',
      'save_progress',
      'kanji_moods'
    ],
    limits: {
      daily: {
        drill_practice: 3,
        games: 3, // Shared limit for all games
        article_reading: 3,
        story_reading: 1,
        kanji_moods: 1
      },
      total: {
        word_lists: 3,
        bookmarks: 5
      }
    },
    description: 'Limited access for free registered users'
  },
  
  // Premium Users (Monthly)
  {
    id: 'premium_monthly',
    userTypes: ['monthly'],
    permissions: ['*'], // All permissions
    limits: {
      daily: {
        drill_practice: -1, // Unlimited
        games: -1,
        article_reading: -1,
        story_reading: -1,
        speaking_practice: -1,
        ai_tutor: 10 // Even premium has some limits on expensive features
      },
      total: {
        word_lists: -1,
        bookmarks: -1
      }
    },
    description: 'Full access for monthly subscribers'
  },
  
  // Premium Users (Yearly)
  {
    id: 'premium_yearly',
    userTypes: ['yearly'],
    permissions: ['*'], // All permissions
    limits: {
      daily: {
        drill_practice: -1, // Unlimited
        games: -1,
        article_reading: -1,
        story_reading: -1,
        speaking_practice: -1,
        ai_tutor: -1 // Yearly gets truly unlimited
      },
      total: {
        word_lists: -1,
        bookmarks: -1
      }
    },
    description: 'Full unlimited access for yearly subscribers'
  }
];

// Helper functions
export function getEntitlementRulesForUserType(userType: string) {
  return ENTITLEMENT_RULES.find(rule => rule.userTypes.includes(userType as any));
}

export function getUserPermissions(userType: string) {
  const rule = getEntitlementRulesForUserType(userType);
  return rule?.permissions || [];
}

export function getUserLimits(userType: string) {
  const rule = getEntitlementRulesForUserType(userType);
  return rule?.limits || { daily: {}, total: {} };
}