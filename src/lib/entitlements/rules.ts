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
    permissions: ['play_games', 'do_drills', 'read_articles', 'read_stories', 'kanji_moods', 'view_stroke_order', 'youtube_shadowing', 'ai_explanations', 'textbook_vocabulary'],
    limits: {
      daily: {
        drill_practice: 3,
        games: 3, // Shared limit for all games
        article_reading: 3,
        story_reading: 1,
        kanji_moods: 1,
        kanji_stroke_order: 10,
        stroke_order_practice: 3,
        youtube_shadowing: 0, // No YouTube URLs or uploads for guests
        ai_context_explanation: 3,
        textbook_vocabulary: 20
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
      'kanji_moods',
      'view_stroke_order',
      'youtube_shadowing',
      'ai_explanations',
      'textbook_vocabulary'
    ],
    limits: {
      daily: {
        drill_practice: 3,
        games: 3, // Shared limit for all games
        article_reading: 3,
        story_reading: 1,
        kanji_moods: 1,
        kanji_stroke_order: 10,
        stroke_order_practice: 3,
        youtube_shadowing: 1, // 1 YouTube URL or upload per day for free users
        ai_context_explanation: 3,
        textbook_vocabulary: 50
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
        ai_tutor: 10, // Even premium has some limits on expensive features
        ai_context_explanation: -1, // Unlimited AI explanations
        kanji_stroke_order: -1,
        stroke_order_practice: -1,
        youtube_shadowing: 10, // 10 YouTube URLs or uploads per day for premium
        anki_import: -1, // Unlimited Anki imports
        anki_set_creation: -1, // Unlimited Anki set creation
        textbook_vocabulary: -1 // Unlimited textbook vocabulary
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
        ai_tutor: -1, // Yearly gets truly unlimited
        ai_context_explanation: -1, // Unlimited AI explanations
        kanji_stroke_order: -1,
        stroke_order_practice: -1,
        youtube_shadowing: 10, // 10 YouTube URLs or uploads per day for premium
        anki_import: -1, // Unlimited Anki imports
        anki_set_creation: -1, // Unlimited Anki set creation
        textbook_vocabulary: -1 // Unlimited textbook vocabulary
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