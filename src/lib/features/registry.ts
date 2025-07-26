/**
 * Feature Registry
 * Central source of truth for all features in Doshi Sensei
 */

import { FeatureRegistry } from './types';

export const FEATURE_REGISTRY: FeatureRegistry = {
  // Learning Features
  'drill_practice': {
    id: 'drill_practice',
    name: 'Conjugation Drills',
    description: 'Practice verb conjugations with interactive drills',
    category: 'learning',
    icon: '📝',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'article_reading': {
    id: 'article_reading',
    name: 'News Articles',
    description: 'Read Japanese news articles from various sources',
    category: 'learning',
    icon: '📰',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'story_reading': {
    id: 'story_reading',
    name: 'Story Reading',
    description: 'Read graded stories with comprehension exercises',
    category: 'learning',
    icon: '📖',
    limitType: 'daily',
    requiresAuth: false, // Changed to allow guest access
    requiresSubscription: false,
    status: 'active'
  },
  
  'kanji_moods': {
    id: 'kanji_moods',
    name: 'Kanji Mood Boards',
    description: 'Learn kanji through thematic mood boards',
    category: 'learning',
    icon: '🎯',
    limitType: 'daily', // Changed from 'none' to enforce daily limits
    requiresAuth: false, // Changed to allow guest access
    requiresSubscription: false,
    status: 'active'
  },
  
  // Games
  'kanji_quest': {
    id: 'kanji_quest',
    name: 'Kanji Quest',
    description: 'Pokémon-style kanji learning game',
    category: 'games',
    icon: '🎮',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  
  'kana_study': {
    id: 'kana_study',
    name: 'Kana Study',
    description: 'Study hiragana and katakana characters',
    category: 'learning',
    icon: '📖',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
    // Removed sharedLimitGroup - was causing tracking issues
  },
  
  'kana_drop': {
    id: 'kana_drop',
    name: 'Kana Drop',
    description: 'Falling kana recognition game',
    category: 'games',
    icon: '🎮',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  
  'sentence_scramble': {
    id: 'sentence_scramble',
    name: 'Sentence Scramble',
    description: 'Reassemble scrambled Japanese sentences from your saved lists',
    category: 'games',
    icon: '🧩',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  
  'matching_game': {
    id: 'matching_game',
    name: 'Memory Match',
    description: 'Match Japanese words with their meanings or readings in a memory game',
    category: 'games',
    icon: '🀄',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  
  'reading_routes': {
    id: 'reading_routes',
    name: 'Reading Routes',
    description: 'Master kanji readings through an interactive path-selection game',
    category: 'games',
    icon: '🛤️',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  
  'kanji_simon': {
    id: 'kanji_simon',
    name: 'Kanji Simon',
    description: 'Memory game: repeat kanji reading sequences like Simon Says',
    category: 'games',
    icon: '🎯',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },

  'listening_quiz': {
    id: 'listening_quiz',
    name: 'Listening Quiz',
    description: 'Test your listening comprehension with audio questions',
    category: 'games',
    icon: '🎧',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },

  'word_assembly': {
    id: 'word_assembly',
    name: 'Word Assembly',
    description: 'Build Japanese words from kana segments',
    category: 'games',
    icon: '🔤',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  
  // Learning Features
  'textbook_vocabulary': {
    id: 'textbook_vocabulary',
    name: 'Textbook Vocabulary',
    description: 'Learn vocabulary from Genki & Minna no Nihongo textbooks',
    category: 'learning',
    icon: '📚',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'kanji_stroke_order': {
    id: 'kanji_stroke_order',
    name: 'Kanji Stroke Order',
    description: 'View animated stroke order for any kanji character',
    category: 'learning',
    icon: '✍️',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'stroke_order_practice': {
    id: 'stroke_order_practice',
    name: 'Stroke Order Practice',
    description: 'Practice writing kanji with guided stroke order',
    category: 'learning',
    icon: '📝',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'flashcard_review': {
    id: 'flashcard_review',
    name: 'Flashcard Review',
    description: 'Review vocabulary and kanji using spaced repetition flashcards',
    category: 'learning',
    icon: '🗂️',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
  },
  
  'youtube_shadowing': {
    id: 'youtube_shadowing',
    name: 'YouTube Shadowing',
    description: 'Practice Japanese through YouTube videos or uploaded files with line-by-line audio shadowing',
    category: 'learning',
    icon: '🎥',
    limitType: 'daily',
    requiresAuth: false, // Guests can view but not use
    requiresSubscription: false,
    status: 'active',
    metadata: {
      maxUsagePerDay: { guest: 0, free: 1, premium: 10 }, // Combined limit for YouTube URLs + file uploads
      maxVideoLength: { guest: 0, free: 600, premium: -1 }, // in seconds, -1 means unlimited
      maxFileSizeMB: { guest: 0, free: 50, premium: 200 },
      allowedFormats: ['mp3', 'wav', 'm4a', 'mp4', 'mov', 'avi', 'webm'],
      features: {
        guest: [], // No features for guests
        free: ['youtube_url', 'file_upload', 'basic_playback', 'transcript_view', 'recording', 'vocabulary_lookup'],
        premium: ['youtube_url', 'file_upload', 'basic_playback', 'transcript_view', 'recording', 'vocabulary_lookup', 'offline_caching', 'advanced_analysis']
      }
    }
  },
  
  // Storage Features
  'word_lists': {
    id: 'word_lists',
    name: 'Study Lists',
    description: 'Create and manage study lists (words, kanji, sentences)',
    category: 'storage',
    icon: '📋',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active'
  },

  'search_history': {
    id: 'search_history',
    name: 'Search History',
    description: 'Save and sync vocabulary search history across devices',
    category: 'storage',
    icon: '🔍',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'bookmarks': {
    id: 'bookmarks',
    name: 'Bookmarks',
    description: 'Bookmark articles and stories',
    category: 'storage',
    icon: '🔖',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active'
  },

  'sentences-bookmark': {
    id: 'sentences-bookmark',
    name: 'Sentence Bookmarks',
    description: 'Save sentences from shadowing practice to lists',
    category: 'storage',
    icon: '📝',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active'
  },

  // Offline Storage Features
  'offline_articles': {
    id: 'offline_articles',
    name: 'Offline Articles',
    description: 'Cache articles for offline reading',
    category: 'storage',
    icon: '📥',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
    metadata: {
      storageType: 'article',
      maxItems: { guest: 3, free: 3, premium: 50 }
    }
  },
  
  'offline_stories': {
    id: 'offline_stories',
    name: 'Offline Stories',
    description: 'Cache stories for offline reading',
    category: 'storage',
    icon: '📚',
    limitType: 'total',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active',
    metadata: {
      storageType: 'story',
      maxItems: { guest: 3, free: 3, premium: 50 }
    }
  },
  
  'resource_caching': {
    id: 'resource_caching',
    name: 'Resource Caching',
    description: 'Cache kanji, verbs, and audio for instant access',
    category: 'storage',
    icon: '💾',
    limitType: 'none',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'background_sync': {
    id: 'background_sync',
    name: 'Background Sync',
    description: 'Automatically sync content across devices',
    category: 'system',
    icon: '🔄',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true, // Premium only
    status: 'active'
  },

  
  // System Features
  'cloud_sync': {
    id: 'cloud_sync',
    name: 'Cloud Sync',
    description: 'Sync data across devices',
    category: 'system',
    icon: '☁️',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active'
  },
  
  'progress_saving': {
    id: 'progress_saving',
    name: 'Progress Saving',
    description: 'Save learning progress',
    category: 'system',
    icon: '💾',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active'
  },
  
  // Planned Features (for your admin dashboard view)
  'speaking_practice': {
    id: 'speaking_practice',
    name: 'Speaking Practice',
    description: 'Practice pronunciation with AI feedback',
    category: 'learning',
    icon: '🗣️',
    limitType: 'daily',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'planned'
  },
  
  'ai_tutor': {
    id: 'ai_tutor',
    name: 'AI Tutor',
    description: 'Get personalized help from AI',
    category: 'learning',
    icon: '🤖',
    limitType: 'daily',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'planned'
  },
  
  'ai_context_explanation': {
    id: 'ai_context_explanation',
    name: 'AI Context Explanation',
    description: 'Get instant AI-powered explanations for any Japanese text',
    category: 'learning',
    icon: '💡',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active',
    metadata: {
      maxRequestsPerDay: { guest: 5, free: 10, premium: -1 },
      features: {
        guest: ['basic_explanation'],
        free: ['basic_explanation', 'grammar_analysis'],
        premium: ['basic_explanation', 'grammar_analysis', 'cultural_notes', 'unlimited_requests']
      }
    }
  },
  
  'anki_import': {
    id: 'anki_import',
    name: 'Import Anki Decks',
    description: 'Import your Anki decks into study lists (Premium)',
    category: 'storage',
    icon: '📥',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: true,
    status: 'active',
    metadata: {
      maxFileSize: 200 * 1024 * 1024,
      allowedFormats: ['.apkg', '.anki2']
    }
  },
  
  'anki_set_creation': {
    id: 'anki_set_creation',
    name: 'Create Anki Sets',
    description: 'Create custom Anki-style flashcard sets',
    category: 'storage',
    icon: '🎴',
    limitType: 'daily',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active'
  }
};

// Helper functions
export function getFeature(featureId: string) {
  return FEATURE_REGISTRY[featureId];
}

export function getFeaturesByCategory(category: string) {
  return Object.values(FEATURE_REGISTRY).filter(f => f.category === category);
}

export function getActiveFeatures() {
  return Object.values(FEATURE_REGISTRY).filter(f => f.status === 'active');
}

export function getPlannedFeatures() {
  return Object.values(FEATURE_REGISTRY).filter(f => f.status === 'planned');
}