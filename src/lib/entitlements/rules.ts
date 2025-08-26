/**
 * Entitlement Rules - Pillar 2 of the Three-Pillar Architecture
 * 
 * This module defines the usage limits for each user type (guest, free, premium).
 * Limits are defined per feature and can be daily or total.
 * -1 means unlimited.
 */

import { UserType } from '@/types/subscription';

export type LimitPeriod = 'daily' | 'total';

export interface EntitlementLimits {
  daily: Record<string, number>;
  total: Record<string, number>;
}

export const entitlementRules: Record<UserType, EntitlementLimits> = {
  // Guest users (not logged in)
  guest: {
    daily: {
      // Learning
      'hiragana_practice': -1,  // Unlimited for basic kana
      'katakana_practice': -1,  // Unlimited for basic kana
      'drill_practice': 3,      // Taste of the feature
      'vocabulary_search': 20,  // More generous searches (API protection)
      'kanji_study': -1,        // Unlimited browsing (read-only)
      'verb_conjugation': -1,   // Unlimited (no saving anyway)
      'conjugation_practice': 0,    // Must sign up
      'flashcard_review': 0,        // Must sign up
      'textbook_vocabulary': 30, // More cards to explore
      
      // Games
      'kanji_quest': 3,         // Enough to get hooked
      'kana_drop': 3,           // Enough to get hooked
      'memory_match': 3,        // Enough to get hooked
      'stroke_order_practice': 5, // More practices
      'view_stroke_order': 10, // Limited views per day for guests
      'kanji_mastery': 0,       // Must sign up (requires saving)
      'kanji_browser': -1,      // Unlimited browsing
      'kanji_families': 10,     // More family explorations per day
      'kanji_radicals': 10,     // Semantic radical explorations per day
      'kanji_visual_layout': 10, // Visual layout explorations per day
      'kanji_connections': 0,   // Premium-only feature
      'kanji_moods': 0,         // Must sign up (requires saving)
      'kanji_simon': 3,         // Enough to get hooked
      'sentence_scramble': 3,   // Enough to get hooked
      'reading_routes': 3,      // Enough to get hooked
      'word_assembly': 3,       // Phonetic building game
      'listening_quiz': 3,      // Audio recognition game
      'matching_game': 3,       // Advanced vocabulary pairing
      
      // Tools
      'ai_stories': 0,          // Must sign up (high API cost)
      'youtube_shadowing': 1,   // One video per day (API costs)
      'uploaded_media_shadowing': 0, // Must sign up (processing costs)
      'news_reader': 3,         // Three articles per day
      'article_reading': 3,     // Three articles per day
      'anki_import': 0,         // Must sign up
      'youtube_series': -1,     // Unlimited access
      'my_videos': 0,           // Must sign up
      
      // AI Features
      'ai_context_explanation': 0,     // Must sign up (API costs)
      'ai_transcript_formatting': 0,   // Must sign up (API costs)
      'ai_article_validation': 0,      // Admin only
      'audio_transcription': 0,        // Must sign up (API costs)
      'ai_cover_generation': 0,        // Admin only
      'quick_context': 5,               // Limited uses for guests
      
      // Storage - all require sign up
      'study_lists': 0,
      'saved_items': 0,
      'bookmarks': 0,
      
      // System - all require sign up
      'cloud_sync': 0,
      'offline_mode': 0,
      'advanced_analytics': 0,
      
      // Achievement System - available to all
      'achievement_view': -1,      // Unlimited viewing
      'achievement_tracking': -1,  // Unlimited tracking
      'pokedex_view': -1,         // Unlimited Pokédex access
      'pokemon_catching': -1,     // Unlimited catching
      'achievement_admin': 0,     // Must sign up
      
      // Unified Review Engine
      'unified_review_system': -1,    // Unlimited access to review system
      'review_session': 5,            // More review sessions per day
      'review_notifications': 0,      // Must sign up
      'progress_dashboard': 0,        // Must sign up
      'advanced_srs_algorithms': 0,   // Must sign up
      'cross_device_sync': 0,         // Must sign up
      'resources': -1,                // Unlimited access for guests
    },
    total: {
      // Storage limits
      'study_lists': 0,
      'saved_items': 0,
      'bookmarks': 0,
      'anki_import': 0,
      'my_videos': 0,
      'article_bookmarks': 0,
    },
  },

  // Free users (logged in, no subscription)
  free: {
    daily: {
      // Learning
      'hiragana_practice': -1,  // Unlimited
      'katakana_practice': -1,  // Unlimited
      'drill_practice': 5,      // Limited drills
      'vocabulary_search': -1,  // Unlimited searches
      'kanji_study': -1,        // Unlimited viewing
      'verb_conjugation': 10,   // Limited conjugations
      'conjugation_practice': 3,    // Limited practice sessions
      'flashcard_review': 10,       // Limited flashcard reviews
      'textbook_vocabulary': 50, // Limited cards per day
      
      // Games
      'kanji_quest': 3,         // Few games per day
      'kana_drop': 3,           // Few games per day
      'memory_match': 5,        // More memory games
      'stroke_order_practice': 10, // Some practices
      'view_stroke_order': 30, // More views for free users
      'kanji_mastery': 3,       // Limited sessions
      'kanji_browser': -1,      // Unlimited browsing
      'kanji_families': 20,     // Many family explorations per day
      'kanji_radicals': 20,     // Many radical explorations per day
      'kanji_visual_layout': 20, // Many visual layout explorations per day
      'kanji_connections': 0,   // Premium-only feature
      'kanji_moods': 1,         // One mood board per day
      'kanji_simon': 5,         // Several games per day
      'sentence_scramble': 3,   // Few games per day
      'reading_routes': 3,      // Few games per day
      
      // Tools
      'ai_stories': 1,          // One AI story per day
      'youtube_shadowing': 3,   // Few videos per day
      'uploaded_media_shadowing': 2, // Two uploads per day
      'news_reader': 5,         // Several articles
      
      // AI Features
      'ai_context_explanation': 10,    // 10 explanations per day
      'ai_transcript_formatting': 3,   // 3 transcript formats per day
      'ai_article_validation': 0,      // Admin only
      'audio_transcription': 3,        // 3 transcriptions per day
      'ai_cover_generation': 0,        // Admin only
      'quick_context': 20,              // 20 uses per day for free users
      'article_reading': 5,     // Several articles per day
      'anki_import': 0,         // Premium only
      'youtube_series': -1,     // Unlimited access
      'my_videos': -1,          // No daily limit
      
      // Storage - limited
      'study_lists': -1,        // No daily limit
      'saved_items': -1,        // No daily limit
      'bookmarks': -1,          // No daily limit
      
      // System - premium only
      'cloud_sync': 0,
      'offline_mode': 0,
      'advanced_analytics': 0,
      
      // Achievement System - available to all
      'achievement_view': -1,      // Unlimited viewing
      'achievement_tracking': -1,  // Unlimited tracking
      'pokedex_view': -1,         // Unlimited Pokédex access
      'pokemon_catching': -1,     // Unlimited catching
      'achievement_admin': 0,     // Premium only
      
      // Unified Review Engine
      'unified_review_system': -1,    // Unlimited access to review system
      'review_session': 5,            // More review sessions per day
      'review_notifications': -1,     // Unlimited notification access
      'progress_dashboard': -1,       // Unlimited dashboard access
      'advanced_srs_algorithms': 0,   // Premium only
      'cross_device_sync': 0,         // Premium only
      'resources': -1,                // Unlimited access for free users
    },
    total: {
      // Storage limits
      'study_lists': 3,         // Max 3 lists
      'saved_items': 20,        // Max 20 saved items
      'bookmarks': 10,          // Max 10 bookmarks
      'anki_import': 0,         // Premium only
      'my_videos': 3,           // Max 3 personal videos
      'article_bookmarks': 10,  // Max 10 bookmarked articles
    },
  },

  // Monthly subscription users
  monthly: {
    daily: {
      // Learning - all unlimited
      'hiragana_practice': -1,
      'katakana_practice': -1,
      'drill_practice': -1,
      'vocabulary_search': -1,
      'kanji_study': -1,
      'verb_conjugation': -1,
      'conjugation_practice': -1,   // Unlimited practice
      'flashcard_review': -1,       // Unlimited flashcard reviews
      'textbook_vocabulary': -1,
      
      // Games - all unlimited
      'kanji_quest': -1,
      'kana_drop': -1,
      'memory_match': -1,
      'stroke_order_practice': -1,
      'view_stroke_order': -1, // Unlimited for premium
      'kanji_mastery': -1,      // Unlimited sessions
      'kanji_browser': -1,      // Unlimited browsing
      'kanji_families': -1,     // Unlimited family explorations
      'kanji_radicals': -1,     // Unlimited radical explorations
      'kanji_visual_layout': -1, // Unlimited visual layout explorations
      'kanji_connections': -1,  // Unlimited access to premium feature
      'kanji_moods': -1,        // Unlimited mood boards
      'kanji_simon': -1,        // Unlimited games
      'sentence_scramble': -1,  // Unlimited games
      'reading_routes': -1,     // Unlimited games
      'word_assembly': -1,      // Unlimited games
      'listening_quiz': -1,     // Unlimited games
      'matching_game': -1,      // Unlimited games
      
      // Tools - all unlimited
      'ai_stories': -1,
      'youtube_shadowing': -1,
      'uploaded_media_shadowing': -1,
      'news_reader': -1,
      'article_reading': -1,    // Unlimited articles
      'anki_import': -1,
      'youtube_series': -1,
      'my_videos': -1,
      
      // AI Features - all unlimited for premium
      'ai_context_explanation': -1,    // Unlimited explanations
      'ai_transcript_formatting': -1,  // Unlimited formatting
      'ai_article_validation': -1,     // Admin feature
      'audio_transcription': -1,       // Unlimited transcriptions
      'ai_cover_generation': -1,       // Admin feature
      'quick_context': -1,              // Unlimited QuickContext uses
      
      // Storage - all unlimited
      'study_lists': -1,
      'saved_items': -1,
      'bookmarks': -1,
      
      // System - all unlimited
      'cloud_sync': -1,
      'offline_mode': -1,
      'advanced_analytics': -1,
      
      // Achievement System - all unlimited
      'achievement_view': -1,      // Unlimited viewing
      'achievement_tracking': -1,  // Unlimited tracking
      'pokedex_view': -1,         // Unlimited Pokédex access
      'pokemon_catching': -1,     // Unlimited catching
      'achievement_admin': -1,    // Full admin access
      
      // Unified Review Engine - all unlimited
      'unified_review_system': -1,    // Unlimited access to review system
      'review_session': -1,           // Unlimited review sessions
      'review_notifications': -1,     // Unlimited notification access
      'progress_dashboard': -1,       // Unlimited dashboard access
      'advanced_srs_algorithms': -1,  // Access to FSRS and advanced algorithms
      'cross_device_sync': -1,        // Cross-device sync enabled
      'resources': -1,                // Unlimited access for premium users
    },
    total: {
      // Storage - all unlimited
      'study_lists': -1,
      'saved_items': -1,
      'bookmarks': -1,
      'anki_import': -1,
      'my_videos': -1,
      'article_bookmarks': -1,  // Unlimited bookmarks
    },
  },

  // Yearly subscription users (same benefits as monthly)
  yearly: {
    daily: {
      // Learning - all unlimited
      'hiragana_practice': -1,
      'katakana_practice': -1,
      'drill_practice': -1,
      'vocabulary_search': -1,
      'kanji_study': -1,
      'verb_conjugation': -1,
      'conjugation_practice': -1,   // Unlimited practice
      'flashcard_review': -1,       // Unlimited flashcard reviews
      'textbook_vocabulary': -1,
      
      // Games - all unlimited
      'kanji_quest': -1,
      'kana_drop': -1,
      'memory_match': -1,
      'stroke_order_practice': -1,
      'view_stroke_order': -1, // Unlimited for premium
      'kanji_mastery': -1,      // Unlimited sessions
      'kanji_browser': -1,      // Unlimited browsing
      'kanji_families': -1,     // Unlimited family explorations
      'kanji_radicals': -1,     // Unlimited radical explorations
      'kanji_visual_layout': -1, // Unlimited visual layout explorations
      'kanji_connections': -1,  // Unlimited access to premium feature
      'kanji_moods': -1,        // Unlimited mood boards
      'kanji_simon': -1,        // Unlimited games
      'sentence_scramble': -1,  // Unlimited games
      'reading_routes': -1,     // Unlimited games
      'word_assembly': -1,      // Unlimited games
      'listening_quiz': -1,     // Unlimited games
      'matching_game': -1,      // Unlimited games
      
      // Tools - all unlimited
      'ai_stories': -1,
      'youtube_shadowing': -1,
      'uploaded_media_shadowing': -1,
      'news_reader': -1,
      'article_reading': -1,    // Unlimited articles
      'anki_import': -1,
      'youtube_series': -1,
      'my_videos': -1,
      
      // AI Features - all unlimited for premium
      'ai_context_explanation': -1,    // Unlimited explanations
      'ai_transcript_formatting': -1,  // Unlimited formatting
      'ai_article_validation': -1,     // Admin feature
      'audio_transcription': -1,       // Unlimited transcriptions
      'ai_cover_generation': -1,       // Admin feature
      'quick_context': -1,              // Unlimited QuickContext uses
      
      // Storage - all unlimited
      'study_lists': -1,
      'saved_items': -1,
      'bookmarks': -1,
      
      // System - all unlimited
      'cloud_sync': -1,
      'offline_mode': -1,
      'advanced_analytics': -1,
      
      // Achievement System - all unlimited
      'achievement_view': -1,      // Unlimited viewing
      'achievement_tracking': -1,  // Unlimited tracking
      'pokedex_view': -1,         // Unlimited Pokédex access
      'pokemon_catching': -1,     // Unlimited catching
      'achievement_admin': -1,    // Full admin access
      
      // Unified Review Engine - all unlimited
      'unified_review_system': -1,    // Unlimited access to review system
      'review_session': -1,           // Unlimited review sessions
      'review_notifications': -1,     // Unlimited notification access
      'progress_dashboard': -1,       // Unlimited dashboard access
      'advanced_srs_algorithms': -1,  // Access to FSRS and advanced algorithms
      'cross_device_sync': -1,        // Cross-device sync enabled
      'resources': -1,                // Unlimited access for premium users
    },
    total: {
      // Storage - all unlimited
      'study_lists': -1,
      'saved_items': -1,
      'bookmarks': -1,
      'anki_import': -1,
      'my_videos': -1,
      'article_bookmarks': -1,  // Unlimited bookmarks
    },
  },
};

// Export alias for backward compatibility
export const ENTITLEMENT_RULES = entitlementRules;

// Helper functions
export function getLimit(
  userType: UserType,
  featureId: string,
  period: LimitPeriod
): number {
  return entitlementRules[userType]?.[period]?.[featureId] ?? 0;
}

export function hasAccess(
  userType: UserType,
  featureId: string,
  period: LimitPeriod = 'daily'
): boolean {
  const limit = getLimit(userType, featureId, period);
  return limit !== 0; // Either unlimited (-1) or has some limit > 0
}

export function isUnlimited(
  userType: UserType,
  featureId: string,
  period: LimitPeriod = 'daily'
): boolean {
  return getLimit(userType, featureId, period) === -1;
}

export function getEntitlementsForUser(userType: UserType): EntitlementLimits {
  return entitlementRules[userType];
}

export function compareEntitlements(
  userType1: UserType,
  userType2: UserType,
  featureId: string,
  period: LimitPeriod = 'daily'
): number {
  const limit1 = getLimit(userType1, featureId, period);
  const limit2 = getLimit(userType2, featureId, period);
  
  // Handle unlimited cases
  if (limit1 === -1 && limit2 === -1) return 0;
  if (limit1 === -1) return 1;
  if (limit2 === -1) return -1;
  
  return limit1 - limit2;
}

// Async compatibility functions for dynamic loading
export async function getEntitlementRulesForUserTypeAsync(userType: UserType): Promise<{ limits: EntitlementLimits; permissions: string[] } | null> {
  const limits = entitlementRules[userType];
  if (!limits) return null;
  
  // Generate permissions based on limits (features with non-zero limits)
  const permissions = new Set<string>();
  Object.entries(limits.daily).forEach(([featureId, limit]) => {
    if (limit !== 0) permissions.add(featureId);
  });
  Object.entries(limits.total).forEach(([featureId, limit]) => {
    if (limit !== 0) permissions.add(featureId);
  });
  
  return {
    limits,
    permissions: Array.from(permissions)
  };
}

export async function getUserPermissionsAsync(userType: UserType): Promise<string[]> {
  // Return feature IDs that user has access to
  const limits = entitlementRules[userType];
  if (!limits) return [];
  
  const permissions = new Set<string>();
  Object.entries(limits.daily).forEach(([featureId, limit]) => {
    if (limit !== 0) permissions.add(featureId);
  });
  Object.entries(limits.total).forEach(([featureId, limit]) => {
    if (limit !== 0) permissions.add(featureId);
  });
  
  return Array.from(permissions);
}

export async function getUserLimitsAsync(userType: UserType): Promise<EntitlementLimits | null> {
  return entitlementRules[userType] || null;
}