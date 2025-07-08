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
    sharedLimitGroup: 'games'
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
    sharedLimitGroup: 'games'
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
    sharedLimitGroup: 'games'
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