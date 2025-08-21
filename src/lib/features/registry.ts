/**
 * Feature Registry - Pillar 1 of the Three-Pillar Architecture
 * 
 * This registry defines all features in the application that require access control.
 * Each feature specifies its requirements, limits, and metadata.
 */

export type FeatureCategory = 'learning' | 'games' | 'tools' | 'storage' | 'system';
export type LimitType = 'daily' | 'total' | 'none';

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  icon?: string;
  limitType: LimitType;
  requiresAuth: boolean;
  requiresSubscription: boolean;
  status: 'active' | 'beta' | 'coming_soon' | 'deprecated';
}

const _internalRegistry: Record<string, Feature> = {
  // Learning Features
  'hiragana_practice': {
    id: 'hiragana_practice',
    name: 'Hiragana Practice',
    description: 'Interactive hiragana character practice',
    category: 'learning',
    icon: 'あ',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'katakana_practice': {
    id: 'katakana_practice',
    name: 'Katakana Practice',
    description: 'Interactive katakana character practice',
    category: 'learning',
    icon: 'ア',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'drill_practice': {
    id: 'drill_practice',
    name: 'Drill Practice',
    description: 'Vocabulary and grammar drills',
    category: 'learning',
    icon: '📝',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'vocabulary_search': {
    id: 'vocabulary_search',
    name: 'Vocabulary Search',
    description: 'Search Japanese dictionary',
    category: 'learning',
    icon: '🔍',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'kanji_study': {
    id: 'kanji_study',
    name: 'Kanji Study',
    description: 'Study kanji characters and meanings',
    category: 'learning',
    icon: '漢',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'verb_conjugation': {
    id: 'verb_conjugation',
    name: 'Verb Conjugation',
    description: 'Practice verb conjugations',
    category: 'learning',
    icon: '動',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'conjugation_practice': {
    id: 'conjugation_practice',
    name: 'Conjugation Practice',
    description: 'Dedicated conjugation exploration and practice',
    category: 'learning',
    icon: '📝',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'flashcard_review': {
    id: 'flashcard_review',
    name: 'Flashcard Review',
    description: 'SRS-based flashcard system for vocabulary and kanji',
    category: 'learning',
    icon: '🗂️',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'textbook_vocabulary': {
    id: 'textbook_vocabulary',
    name: 'Textbook Vocabulary',
    description: 'Study vocabulary from Genki and Minna no Nihongo',
    category: 'learning',
    icon: '📚',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },

  // Games
  'kanji_quest': {
    id: 'kanji_quest',
    name: 'Kanji Quest',
    description: 'Adventure game for learning kanji',
    category: 'games',
    icon: '🎮',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'kana_drop': {
    id: 'kana_drop',
    name: 'Kana Drop',
    description: 'Falling blocks game with kana characters',
    category: 'games',
    icon: '🎯',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'memory_match': {
    id: 'memory_match',
    name: 'Memory Match',
    description: 'Memory game with Japanese characters',
    category: 'games',
    icon: '🃏',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'stroke_order_practice': {
    id: 'stroke_order_practice',
    name: 'Stroke Order Practice',
    description: 'Practice writing kanji with correct stroke order',
    category: 'games',
    icon: '✏️',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'kanji_mastery': {
    id: 'kanji_mastery',
    name: 'Kanji Mastery',
    description: 'Comprehensive kanji learning with SRS system',
    category: 'learning',
    icon: '漢',
    limitType: 'daily',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },
  'kanji_browser': {
    id: 'kanji_browser',
    name: 'Kanji Browser',
    description: 'Browse and explore kanji by JLPT level',
    category: 'learning',
    icon: '📚',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'kanji_moods': {
    id: 'kanji_moods',
    name: 'Kanji Moods',
    description: 'Visual kanji mood boards for memory aids',
    category: 'tools',
    icon: '🎨',
    limitType: 'daily',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },
  'kanji_simon': {
    id: 'kanji_simon',
    name: 'Kanji Simon',
    description: 'Memory game using kanji characters',
    category: 'games',
    icon: '🎵',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'sentence_scramble': {
    id: 'sentence_scramble',
    name: 'Sentence Scramble',
    description: 'Unscramble Japanese sentences for practice',
    category: 'games',
    icon: '🧩',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'reading_routes': {
    id: 'reading_routes',
    name: 'Reading Routes',
    description: 'Learn kanji readings in context with interactive gameplay',
    category: 'games',
    icon: '🛣️',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },

  // Tools
  'ai_stories': {
    id: 'ai_stories',
    name: 'AI Stories',
    description: 'Generate stories with AI for reading practice',
    category: 'tools',
    icon: '📖',
    limitType: 'daily',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },
  'youtube_shadowing': {
    id: 'youtube_shadowing',
    name: 'YouTube Shadowing',
    description: 'Practice with YouTube video transcripts',
    category: 'tools',
    icon: '🎬',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'news_reader': {
    id: 'news_reader',
    name: 'News Reader',
    description: 'Read Japanese news articles',
    category: 'tools',
    icon: '📰',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'anki_import': {
    id: 'anki_import',
    name: 'Anki Import',
    description: 'Import and sync Anki decks',
    category: 'tools',
    icon: '📥',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
  },
  'youtube_series': {
    id: 'youtube_series',
    name: 'YouTube Series',
    description: 'Access curated Japanese learning YouTube channels',
    category: 'tools',
    icon: '📺',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'my_videos': {
    id: 'my_videos',
    name: 'My Videos',
    description: 'Manage your personal video collection',
    category: 'storage',
    icon: '📼',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },

  // Storage
  'study_lists': {
    id: 'study_lists',
    name: 'Study Lists',
    description: 'Create and manage study lists',
    category: 'storage',
    icon: '📋',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },
  'saved_items': {
    id: 'saved_items',
    name: 'Saved Items',
    description: 'Save vocabulary and kanji for later',
    category: 'storage',
    icon: '💾',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },
  'bookmarks': {
    id: 'bookmarks',
    name: 'Bookmarks',
    description: 'Bookmark lessons and articles',
    category: 'storage',
    icon: '🔖',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },

  // System Features
  'cloud_sync': {
    id: 'cloud_sync',
    name: 'Cloud Sync',
    description: 'Sync progress across devices',
    category: 'system',
    icon: '☁️',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
  },
  'offline_mode': {
    id: 'offline_mode',
    name: 'Offline Mode',
    description: 'Access content offline',
    category: 'system',
    icon: '📱',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
  },
  'advanced_analytics': {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed progress tracking',
    category: 'system',
    icon: '📊',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
  },

  // Achievement System Features
  'achievement_view': {
    id: 'achievement_view',
    name: 'Achievement View',
    description: 'View unlocked achievements and progress',
    category: 'system',
    icon: '🏆',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'achievement_tracking': {
    id: 'achievement_tracking',
    name: 'Achievement Tracking',
    description: 'Track progress and unlock achievements',
    category: 'system',
    icon: '🎯',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'pokedex_view': {
    id: 'pokedex_view',
    name: 'Pokédex View',
    description: 'View caught Pokémon in the Pokédex',
    category: 'games',
    icon: '📖',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'pokemon_catching': {
    id: 'pokemon_catching',
    name: 'Pokémon Catching',
    description: 'Catch Pokémon through studying',
    category: 'games',
    icon: '⚾',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'achievement_admin': {
    id: 'achievement_admin',
    name: 'Achievement Administration',
    description: 'Manage and create custom achievements',
    category: 'system',
    icon: '⚙️',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
  },

  // Unified Review Engine Features
  'unified_review_system': {
    id: 'unified_review_system',
    name: 'Unified Review System',
    description: 'Access the unified spaced repetition review engine',
    category: 'learning',
    icon: '🔄',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'review_session': {
    id: 'review_session',
    name: 'Review Sessions',
    description: 'Start and manage review sessions across all content types',
    category: 'learning',
    icon: '📝',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  'review_notifications': {
    id: 'review_notifications',
    name: 'Review Notifications',
    description: 'Configure review reminder notifications',
    category: 'system',
    icon: '🔔',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },
  'progress_dashboard': {
    id: 'progress_dashboard',
    name: 'Progress Dashboard',
    description: 'View detailed learning progress and statistics',
    category: 'system',
    icon: '📊',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
  },
  'advanced_srs_algorithms': {
    id: 'advanced_srs_algorithms',
    name: 'Advanced SRS Algorithms',
    description: 'Access to FSRS and other advanced spaced repetition algorithms',
    category: 'system',
    icon: '🧠',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
  },
  'cross_device_sync': {
    id: 'cross_device_sync',
    name: 'Cross-Device Sync',
    description: 'Sync review progress across multiple devices',
    category: 'system',
    icon: '🔄',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
  },
};

// Export with both names for compatibility
export const FEATURE_REGISTRY = _internalRegistry;
export const featureRegistry = _internalRegistry;

// Helper functions
export function getFeature(featureId: string): Feature | undefined {
  return featureRegistry[featureId];
}

export function getFeaturesByCategory(category: FeatureCategory): Feature[] {
  return Object.values(featureRegistry).filter(f => f.category === category);
}

export function getActiveFeatures(): Feature[] {
  return Object.values(featureRegistry).filter(f => f.status === 'active');
}

export function requiresAuth(featureId: string): boolean {
  const feature = getFeature(featureId);
  return feature?.requiresAuth ?? false;
}

export function requiresSubscription(featureId: string): boolean {
  const feature = getFeature(featureId);
  return feature?.requiresSubscription ?? false;
}