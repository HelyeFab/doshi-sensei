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
        kana_study: 3, // Kana study sessions
        // Individual game limits (no more shared limits)
        kanji_quest: 3,
        kana_drop: 3,
        sentence_scramble: 3,
        memory_match: 3,
        reading_routes: 3,
        kanji_simon: 3,
        listening_quiz: 3,
        word_assembly: 3,
        flashcard_review: 3, // Separate from drill_practice now
        article_reading: 3,
        story_reading: 3,
        kanji_moods: 3,
        kanji_stroke_order: -1,
        stroke_order_practice: 3,
        youtube_shadowing: 1, // 1 YouTube URL or upload per day for guests
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
        kana_study: 3, // Kana study sessions
        // Individual game limits (no more shared limits)
        kanji_quest: 3,
        kana_drop: 3,
        sentence_scramble: 3,
        memory_match: 3,
        reading_routes: 3,
        kanji_simon: 3,
        listening_quiz: 3,
        word_assembly: 3,
        flashcard_review: 3, // Separate from drill_practice now
        article_reading: 3,
        story_reading: 3,
        kanji_moods: 3,
        kanji_stroke_order: -1,
        stroke_order_practice: 3,
        youtube_shadowing: 3, // 3 YouTube shadowing sessions per day for free users
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
        kana_study: -1, // Unlimited kana study
        // Individual game limits
        kanji_quest: -1,
        kana_drop: -1,
        sentence_scramble: -1,
        memory_match: -1,
        reading_routes: -1,
        kanji_simon: -1,
        listening_quiz: -1,
        word_assembly: -1,
        flashcard_review: -1,
        article_reading: -1,
        story_reading: -1,
        speaking_practice: -1,
        ai_tutor: -1, // Unlimited AI tutor for premium monthly
        ai_context_explanation: -1, // Unlimited AI explanations
        kanji_stroke_order: -1,
        stroke_order_practice: -1,
        youtube_shadowing: -1, // Unlimited YouTube URLs or uploads for premium
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
        kana_study: -1, // Unlimited kana study
        // Individual game limits
        kanji_quest: -1,
        kana_drop: -1,
        sentence_scramble: -1,
        memory_match: -1,
        reading_routes: -1,
        kanji_simon: -1,
        listening_quiz: -1,
        word_assembly: -1,
        flashcard_review: -1,
        article_reading: -1,
        story_reading: -1,
        speaking_practice: -1,
        ai_tutor: -1, // Yearly gets truly unlimited
        ai_context_explanation: -1, // Unlimited AI explanations
        kanji_stroke_order: -1,
        stroke_order_practice: -1,
        youtube_shadowing: -1, // Unlimited YouTube URLs or uploads for premium
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

// Cache for dynamic rules to avoid repeated async calls
let cachedRules: EntitlementRule[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute cache

async function getDynamicRules(): Promise<EntitlementRule[]> {
  // Use cached rules if fresh
  if (cachedRules && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedRules;
  }

  try {
    // The dynamic-rules module now handles admin checking internally
    const { dynamicRules } = await import('./dynamic-rules');
    cachedRules = await dynamicRules.getRules();
    cacheTimestamp = Date.now();
    return cachedRules;
  } catch (error) {
    // Don't log expected permission errors for non-admin users
    // The dynamic-rules module will return static rules for non-admins
    return ENTITLEMENT_RULES;
  }
}

// Synchronous fallback for backwards compatibility
export function getEntitlementRulesForUserType(userType: string) {
  // This function is being phased out - use async version
  console.warn('getEntitlementRulesForUserType is deprecated. Use getEntitlementRulesForUserTypeAsync');
  return ENTITLEMENT_RULES.find(rule => rule.userTypes.includes(userType as any));
}

// New async version that uses dynamic rules
export async function getEntitlementRulesForUserTypeAsync(userType: string) {
  const rules = await getDynamicRules();
  return rules.find(rule => rule.userTypes.includes(userType as any));
}

export function getUserPermissions(userType: string) {
  // This function is being phased out - use async version
  console.warn('getUserPermissions is deprecated. Use getUserPermissionsAsync');
  const rule = getEntitlementRulesForUserType(userType);
  return rule?.permissions || [];
}

export async function getUserPermissionsAsync(userType: string) {
  const rule = await getEntitlementRulesForUserTypeAsync(userType);
  return rule?.permissions || [];
}

export function getUserLimits(userType: string) {
  // This function is being phased out - use async version
  console.warn('getUserLimits is deprecated. Use getUserLimitsAsync');
  const rule = getEntitlementRulesForUserType(userType);
  return rule?.limits || { daily: {}, total: {} };
}

export async function getUserLimitsAsync(userType: string) {
  const rule = await getEntitlementRulesForUserTypeAsync(userType);
  return rule?.limits || { daily: {}, total: {} };
}