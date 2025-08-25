/**
 * Centralized Permission Mapping
 * Maps feature IDs to their required permissions
 * Single source of truth to avoid duplication
 */

export const FEATURE_PERMISSION_MAP: Record<string, string> = {
  // Learning Features
  'drill_practice': 'do_drills',
  'kana_study': 'do_drills',
  'flashcard_review': 'do_drills',
  'speaking_practice': 'do_drills',
  'article_reading': 'read_articles',
  'article_bookmarks': 'bookmark_articles',
  'story_reading': 'read_stories',
  'kanji_moods': 'kanji_moods',
  'textbook_vocabulary': 'textbook_vocabulary',
  'word_learning_session': 'do_learning_sessions',
  'kanji_stroke_order': 'view_stroke_order',
  'stroke_order_practice': 'view_stroke_order',
  'youtube_shadowing': 'youtube_shadowing',
  'uploaded_media_shadowing': 'uploaded_media_shadowing',
  'kanji_mastery': 'learn_kanji',
  'kanji_browser': 'browse_kanji',
  'kanji_families': 'explore_families',
  'adaptive_practice': 'adaptive_practice',
  'leech_treatment': 'premium_features',
  'quick_context': 'quick_context',
  'resources': 'view_resources',
  
  // Games
  'kanji_quest': 'play_games',
  'kana_drop': 'play_games',
  'sentence_scramble': 'play_games',
  'matching_game': 'play_games',
  'memory_match': 'play_games',
  'reading_routes': 'play_games',
  'kanji_simon': 'play_games',
  'listening_quiz': 'play_games',
  'word_assembly': 'play_games',
  
  // Storage Features
  'word_lists': 'create_lists',
  'bookmarks': 'create_lists',
  'sentences-bookmark': 'create_lists',
  'search_history': 'save_progress',
  'offline_articles': 'premium_features',
  'offline_stories': 'premium_features',
  'resource_caching': 'premium_features',
  'anki_import': 'anki_import',
  'anki_set_creation': 'anki_set_creation',
  
  // System Features
  'cloud_sync': 'cloud_sync',
  'progress_saving': 'save_progress',
  'background_sync': 'premium_features',
  'push_notifications': 'push_notifications',
  'ai_tutor': 'premium_features',
  'ai_context_explanation': 'ai_explanations',
  'leaderboard': 'view_leaderboard'
};

/**
 * Get the required permission for a feature
 */
export function getFeaturePermission(featureId: string): string | undefined {
  return FEATURE_PERMISSION_MAP[featureId];
}

/**
 * Check if a feature requires a specific permission
 */
export function featureRequiresPermission(featureId: string, permission: string): boolean {
  return FEATURE_PERMISSION_MAP[featureId] === permission;
}