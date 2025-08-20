/**
 * Access Permission Mapping - Pillar 3 of the Three-Pillar Architecture
 * 
 * This module maps features to permission strings used throughout the app.
 * It provides the bridge between feature IDs and the actual permission checks.
 */

// Permission mapping for features
const permissionMap: Record<string, string> = {
  // Learning permissions
  'hiragana_practice': 'practice_hiragana',
  'katakana_practice': 'practice_katakana',
  'drill_practice': 'do_drills',
  'vocabulary_search': 'search_vocabulary',
  'kanji_study': 'study_kanji',
  'verb_conjugation': 'conjugate_verbs',
  'textbook_vocabulary': 'study_textbooks',
  
  // Game permissions
  'kanji_quest': 'play_games',
  'kana_drop': 'play_games',
  'memory_match': 'play_games',
  'stroke_order_practice': 'practice_strokes',
  
  // Tool permissions
  'ai_stories': 'generate_stories',
  'youtube_shadowing': 'shadow_videos',
  'news_reader': 'read_news',
  'anki_import': 'import_anki',
  
  // Storage permissions
  'study_lists': 'manage_lists',
  'saved_items': 'save_items',
  'bookmarks': 'manage_bookmarks',
  
  // System permissions
  'cloud_sync': 'sync_data',
  'offline_mode': 'use_offline',
  'advanced_analytics': 'view_analytics',
};

// Reverse mapping for convenience
const featureMap: Record<string, string> = Object.entries(permissionMap).reduce(
  (acc, [feature, permission]) => {
    if (!acc[permission]) {
      acc[permission] = feature;
    }
    return acc;
  },
  {} as Record<string, string>
);

// Export functions
export function getPermissionForFeature(featureId: string): string {
  return permissionMap[featureId] || 'unknown_permission';
}

export function getFeatureForPermission(permission: string): string | undefined {
  return featureMap[permission];
}

export function getAllPermissions(): string[] {
  return Array.from(new Set(Object.values(permissionMap)));
}

export function getFeaturesForPermission(permission: string): string[] {
  return Object.entries(permissionMap)
    .filter(([_, perm]) => perm === permission)
    .map(([feature, _]) => feature);
}

// Permission groups for UI organization
export const permissionGroups = {
  learning: [
    'practice_hiragana',
    'practice_katakana',
    'do_drills',
    'search_vocabulary',
    'study_kanji',
    'conjugate_verbs',
    'study_textbooks',
  ],
  games: [
    'play_games',
    'practice_strokes',
  ],
  tools: [
    'generate_stories',
    'shadow_videos',
    'read_news',
    'import_anki',
  ],
  storage: [
    'manage_lists',
    'save_items',
    'manage_bookmarks',
  ],
  system: [
    'sync_data',
    'use_offline',
    'view_analytics',
  ],
};

// Check if a permission belongs to a group
export function isInPermissionGroup(permission: string, group: keyof typeof permissionGroups): boolean {
  return permissionGroups[group].includes(permission);
}

// Get all features in a permission group
export function getFeaturesInGroup(group: keyof typeof permissionGroups): string[] {
  const permissions = permissionGroups[group];
  return permissions.flatMap(permission => getFeaturesForPermission(permission));
}