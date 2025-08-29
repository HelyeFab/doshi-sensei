/**
 * Review Source Constants - Configuration and Defaults
 * 
 * This file contains all constants, configurations, and default values
 * for the Unified Review Hub system.
 */

import {
  ReviewSourceType,
  SourcePriority,
  SourceStatus,
  SourceConfig
} from './review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';

// ============================================================================
// Source Type Configurations
// ============================================================================

/**
 * Configuration metadata for each review source type
 */
export const REVIEW_SOURCE_CONFIGS = {
  [ReviewSourceType.KANJI_MASTERY]: {
    name: 'Kanji Mastery',
    icon: '🈳',
    description: 'Spaced repetition system for kanji learning with FSRS algorithm',
    supportedContentTypes: [ContentType.KANJI, ContentType.RADICAL],
    defaultStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
    paths: {
      main: '/tools/kanji-mastery',
      settings: '/tools/kanji-mastery/settings',
      stats: '/tools/kanji-mastery/stats'
    },
    defaultConfig: {
      enabled: true,
      maxItems: 50,
      priorityMultiplier: 1.0,
      settings: {
        algorithm: 'fsrs',
        newCardsPerDay: 20,
        maxReviewsPerDay: 200,
        enableFurigana: true,
        showStrokeOrder: true
      }
    } as SourceConfig
  },

  [ReviewSourceType.TEXTBOOK_VOCABULARY]: {
    name: 'Textbook Vocabulary',
    icon: '📚',
    description: 'Interactive vocabulary learning from Genki and Minna no Nihongo',
    supportedContentTypes: [ContentType.VOCABULARY],
    defaultStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
    paths: {
      main: '/tools/textbook-vocabulary',
      settings: '/tools/textbook-vocabulary/settings'
    },
    defaultConfig: {
      enabled: true,
      maxItems: 30,
      priorityMultiplier: 1.2,
      settings: {
        textbooks: ['genki-1', 'genki-2'],
        showFurigana: true,
        playAudio: true,
        includeExamples: true
      }
    } as SourceConfig
  },

  [ReviewSourceType.FLASHCARDS]: {
    name: 'Flashcards',
    icon: '🗃️',
    description: 'Custom flashcard decks with multimedia support',
    supportedContentTypes: [ContentType.FLASHCARD, ContentType.CUSTOM],
    defaultStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
    paths: {
      main: '/drill/flashcards',
      settings: '/settings/flashcards'
    },
    defaultConfig: {
      enabled: true,
      maxItems: 40,
      priorityMultiplier: 0.8,
      settings: {
        showHints: true,
        autoPlayAudio: false,
        cardOrder: 'due_date'
      }
    } as SourceConfig
  },

  [ReviewSourceType.GRAMMAR_DRILLS]: {
    name: 'Grammar Drills',
    icon: '📝',
    description: 'Structured grammar practice with conjugations and patterns',
    supportedContentTypes: [ContentType.GRAMMAR, ContentType.SENTENCE],
    defaultStudyModes: [StudyMode.PRODUCTION, StudyMode.TYPING, StudyMode.RECOGNITION],
    paths: {
      main: '/drill/grammar',
      settings: '/drill/grammar/settings'
    },
    defaultConfig: {
      enabled: true,
      maxItems: 25,
      priorityMultiplier: 1.1,
      settings: {
        includeConjugation: true,
        showExplanations: true,
        practiceTypes: ['fill_blank', 'multiple_choice', 'typing']
      }
    } as SourceConfig
  },

  [ReviewSourceType.CUSTOM_LISTS]: {
    name: 'Custom Lists',
    icon: '📋',
    description: 'User-created study lists and custom content',
    supportedContentTypes: [ContentType.VOCABULARY, ContentType.KANJI, ContentType.CUSTOM],
    defaultStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
    paths: {
      main: '/vocabulary',
      settings: '/vocabulary/settings'
    },
    defaultConfig: {
      enabled: true,
      maxItems: 35,
      priorityMultiplier: 0.9,
      settings: {
        allowDuplicates: false,
        sortOrder: 'creation_date',
        showProgress: true
      }
    } as SourceConfig
  },

  [ReviewSourceType.SHADOWING_PRACTICE]: {
    name: 'Shadowing Practice',
    icon: '🎧',
    description: 'YouTube video shadowing with transcript caching',
    supportedContentTypes: [ContentType.VOCABULARY, ContentType.SENTENCE],
    defaultStudyModes: [StudyMode.LISTENING, StudyMode.RECOGNITION],
    paths: {
      main: '/tools/youtube-shadowing',
      settings: '/tools/youtube-shadowing/settings'
    },
    defaultConfig: {
      enabled: false, // Disabled by default as it requires more setup
      maxItems: 20,
      priorityMultiplier: 0.7,
      settings: {
        showTranscript: true,
        showFurigana: true,
        playbackSpeed: 1.0,
        subtitleLanguage: 'ja'
      }
    } as SourceConfig
  },

  [ReviewSourceType.READING_COMPREHENSION]: {
    name: 'Reading Comprehension',
    icon: '📖',
    description: 'Article reading with comprehension questions',
    supportedContentTypes: [ContentType.VOCABULARY, ContentType.SENTENCE],
    defaultStudyModes: [StudyMode.READING, StudyMode.RECOGNITION],
    paths: {
      main: '/news',
      settings: '/settings/reading'
    },
    defaultConfig: {
      enabled: false, // Optional feature
      maxItems: 15,
      priorityMultiplier: 0.6,
      settings: {
        showFurigana: true,
        includeQuestions: true,
        trackReadingTime: true
      }
    } as SourceConfig
  },

  [ReviewSourceType.LISTENING_PRACTICE]: {
    name: 'Listening Practice',
    icon: '🎵',
    description: 'Audio-based vocabulary and sentence practice',
    supportedContentTypes: [ContentType.VOCABULARY, ContentType.SENTENCE],
    defaultStudyModes: [StudyMode.LISTENING, StudyMode.RECOGNITION],
    paths: {
      main: '/practice/listening',
      settings: '/practice/listening/settings'
    },
    defaultConfig: {
      enabled: false, // Optional feature
      maxItems: 25,
      priorityMultiplier: 0.8,
      settings: {
        playbackSpeed: 1.0,
        showTranscript: false,
        repeatAudio: true
      }
    } as SourceConfig
  }
} as const;

// ============================================================================
// Priority Configurations
// ============================================================================

/**
 * Priority level configurations with display properties
 */
export const PRIORITY_CONFIGS = {
  [SourcePriority.LOW]: {
    label: 'Low Priority',
    color: '#6b7280', // gray-500
    bgClass: 'bg-gray-100 dark:bg-gray-900/30',
    textClass: 'text-gray-600 dark:text-gray-400',
    weight: 0.5,
    icon: '⬇️',
    description: 'Review when time permits'
  },
  [SourcePriority.MEDIUM]: {
    label: 'Medium Priority',
    color: '#3b82f6', // blue-500
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    weight: 1.0,
    icon: '➡️',
    description: 'Standard review frequency'
  },
  [SourcePriority.HIGH]: {
    label: 'High Priority',
    color: '#f59e0b', // amber-500
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-600 dark:text-amber-400',
    weight: 1.5,
    icon: '⬆️',
    description: 'Prioritize in review sessions'
  },
  [SourcePriority.URGENT]: {
    label: 'Urgent',
    color: '#ef4444', // red-500
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-600 dark:text-red-400',
    weight: 2.0,
    icon: '🔥',
    description: 'Critical - review immediately'
  }
} as const;

// ============================================================================
// Content Type Configurations
// ============================================================================

/**
 * Content type display configurations
 */
export const CONTENT_TYPE_CONFIGS = {
  [ContentType.KANJI]: {
    label: 'Kanji',
    color: '#dc2626', // red-600
    icon: '漢',
    description: 'Japanese characters'
  },
  [ContentType.VOCABULARY]: {
    label: 'Vocabulary',
    color: '#059669', // emerald-600
    icon: '語',
    description: 'Words and phrases'
  },
  [ContentType.FLASHCARD]: {
    label: 'Flashcards',
    color: '#7c3aed', // violet-600
    icon: '🗃️',
    description: 'Custom flashcards'
  },
  [ContentType.GRAMMAR]: {
    label: 'Grammar',
    color: '#db2777', // pink-600
    icon: '文',
    description: 'Grammar patterns'
  },
  [ContentType.SENTENCE]: {
    label: 'Sentences',
    color: '#0891b2', // cyan-600
    icon: '文章',
    description: 'Full sentences'
  },
  [ContentType.RADICAL]: {
    label: 'Radicals',
    color: '#c2410c', // orange-600
    icon: '部',
    description: 'Kanji components'
  },
  [ContentType.CUSTOM]: {
    label: 'Custom',
    color: '#6b7280', // gray-500
    icon: '✏️',
    description: 'Custom content'
  }
} as const;

// ============================================================================
// Study Mode Configurations
// ============================================================================

/**
 * Study mode display configurations
 */
export const STUDY_MODE_CONFIGS = {
  [StudyMode.RECOGNITION]: {
    label: 'Recognition',
    color: '#059669', // emerald-600
    icon: '👁️',
    description: 'See → Recall meaning',
    difficulty: 1
  },
  [StudyMode.PRODUCTION]: {
    label: 'Production',
    color: '#dc2626', // red-600
    icon: '✍️',
    description: 'See meaning → Produce',
    difficulty: 3
  },
  [StudyMode.READING]: {
    label: 'Reading',
    color: '#3b82f6', // blue-600
    icon: '📖',
    description: 'See kanji → Recall reading',
    difficulty: 2
  },
  [StudyMode.LISTENING]: {
    label: 'Listening',
    color: '#7c3aed', // violet-600
    icon: '🎧',
    description: 'Hear → Recall/identify',
    difficulty: 4
  },
  [StudyMode.TYPING]: {
    label: 'Typing',
    color: '#f59e0b', // amber-600
    icon: '⌨️',
    description: 'Type the answer',
    difficulty: 5
  }
} as const;

// ============================================================================
// Default Limits and Thresholds
// ============================================================================

/**
 * System-wide limits and thresholds
 */
export const SYSTEM_LIMITS = {
  /** Maximum items per review session */
  MAX_SESSION_ITEMS: 200,
  
  /** Default session size */
  DEFAULT_SESSION_SIZE: 50,
  
  /** Maximum items per source in a session */
  MAX_ITEMS_PER_SOURCE: 50,
  
  /** Minimum items to consider for a session */
  MIN_SESSION_ITEMS: 5,
  
  /** Cache duration for statistics (milliseconds) */
  STATS_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  /** Maximum number of sources that can be registered */
  MAX_SOURCES: 20,
  
  /** Default priority for new sources */
  DEFAULT_PRIORITY: SourcePriority.MEDIUM,
  
  /** Retention rate threshold for struggling areas */
  STRUGGLING_RETENTION_THRESHOLD: 60, // percent
  
  /** Overdue items threshold for warnings */
  OVERDUE_WARNING_THRESHOLD: 10
} as const;

// ============================================================================
// Status Configurations
// ============================================================================

/**
 * Source status display configurations
 */
export const STATUS_CONFIGS = {
  [SourceStatus.ACTIVE]: {
    label: 'Active',
    color: '#059669', // emerald-600
    icon: '✅',
    description: 'Source is working normally'
  },
  [SourceStatus.PAUSED]: {
    label: 'Paused',
    color: '#f59e0b', // amber-600
    icon: '⏸️',
    description: 'Source is temporarily paused'
  },
  [SourceStatus.DISABLED]: {
    label: 'Disabled',
    color: '#6b7280', // gray-500
    icon: '⏹️',
    description: 'Source is disabled'
  },
  [SourceStatus.ERROR]: {
    label: 'Error',
    color: '#dc2626', // red-600
    icon: '❌',
    description: 'Source encountered an error'
  }
} as const;

// ============================================================================
// Time Constants
// ============================================================================

/**
 * Time-related constants for scheduling and calculations
 */
export const TIME_CONSTANTS = {
  /** Milliseconds in different time units */
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  
  /** Default review intervals */
  DEFAULT_INTERVALS: {
    NEW: 1, // 1 day
    EASY: 4, // 4 days
    GOOD: 2, // 2 days
    HARD: 1, // 1 day
    AGAIN: 0.25 // 6 hours
  },
  
  /** Golden time calculations */
  GOLDEN_TIME: {
    /** Optimal study window (morning) */
    MORNING_START: 7, // 7 AM
    MORNING_END: 10, // 10 AM
    
    /** Secondary study window (evening) */
    EVENING_START: 18, // 6 PM
    EVENING_END: 21, // 9 PM
    
    /** Multiplier for golden time sessions */
    BONUS_MULTIPLIER: 1.2
  }
} as const;

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Standard error messages for the review source system
 */
export const ERROR_MESSAGES = {
  SOURCE_NOT_FOUND: 'Review source not found',
  SOURCE_ALREADY_REGISTERED: 'Source is already registered',
  SOURCE_NOT_INITIALIZED: 'Source is not initialized',
  INITIALIZATION_FAILED: 'Failed to initialize source',
  INVALID_CONFIGURATION: 'Invalid source configuration',
  STATS_UNAVAILABLE: 'Statistics are not available',
  ITEMS_FETCH_FAILED: 'Failed to fetch items from source',
  REGISTRY_NOT_INITIALIZED: 'Registry is not initialized',
  INVALID_PRIORITY: 'Invalid priority level',
  STORAGE_ERROR: 'Local storage error',
  NETWORK_ERROR: 'Network connection error'
} as const;

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event type configurations for the registry system
 */
export const EVENT_CONFIGS = {
  ITEMS_UPDATED: {
    label: 'Items Updated',
    description: 'Source items have been updated'
  },
  CONFIG_CHANGED: {
    label: 'Configuration Changed',
    description: 'Source configuration has been modified'
  },
  STATUS_CHANGED: {
    label: 'Status Changed',
    description: 'Source status has changed'
  },
  ERROR_OCCURRED: {
    label: 'Error Occurred',
    description: 'An error occurred in the source'
  },
  STATS_UPDATED: {
    label: 'Statistics Updated',
    description: 'Source statistics have been refreshed'
  }
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature flags for optional functionality
 */
export const FEATURE_FLAGS = {
  /** Enable source analytics */
  ENABLE_ANALYTICS: true,
  
  /** Enable source priorities */
  ENABLE_PRIORITIES: true,
  
  /** Enable source event system */
  ENABLE_EVENTS: true,
  
  /** Enable statistics caching */
  ENABLE_STATS_CACHE: true,
  
  /** Enable debug logging */
  ENABLE_DEBUG_LOGGING: false,
  
  /** Enable experimental sources */
  ENABLE_EXPERIMENTAL: false
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get configuration for a review source type
 */
export function getSourceTypeConfig(type: ReviewSourceType) {
  return REVIEW_SOURCE_CONFIGS[type];
}

/**
 * Get configuration for a priority level
 */
export function getPriorityConfig(priority: SourcePriority) {
  return PRIORITY_CONFIGS[priority];
}

/**
 * Get configuration for a content type
 */
export function getContentTypeConfig(contentType: ContentType) {
  return CONTENT_TYPE_CONFIGS[contentType];
}

/**
 * Get configuration for a study mode
 */
export function getStudyModeConfig(studyMode: StudyMode) {
  return STUDY_MODE_CONFIGS[studyMode];
}

/**
 * Get configuration for a source status
 */
export function getStatusConfig(status: SourceStatus) {
  return STATUS_CONFIGS[status];
}