/**
 * Universal Learning Analytics System - Type Definitions
 */

export type EventType = 
  | 'view'        // Content viewed
  | 'search'      // Search performed
  | 'practice'    // Practice session
  | 'test'        // Test/quiz taken
  | 'success'     // Correct answer
  | 'failure'     // Incorrect answer
  | 'save'        // Content saved
  | 'share'       // Content shared
  | 'complete'    // Section completed
  | 'abandon';    // Section abandoned

export type ContentCategory = 
  | 'kanji'
  | 'vocabulary' 
  | 'grammar'
  | 'kana'
  | 'sentence'
  | 'article'
  | 'video'
  | 'audio'
  | 'game'
  | 'drill'
  | 'flashcard'
  | 'textbook'
  | 'story';

export type InteractionType = 
  | 'click'
  | 'hover'
  | 'scroll'
  | 'focus'
  | 'keyboard'
  | 'touch'
  | 'voice';

export interface ContentData {
  id?: string;           // Unique identifier
  value: string;         // The actual content (kanji, word, etc.)
  jlptLevel?: 1 | 2 | 3 | 4 | 5;
  frequency?: number;    // Usage frequency rank
  difficulty?: 'easy' | 'medium' | 'hard';
  metadata?: {
    meanings?: string[];
    readings?: string[];
    tags?: string[];
    source?: string;
    [key: string]: any;
  };
}

export interface EventContext {
  page: string;          // Current route/page
  feature: string;       // Feature being used
  referrer?: string;     // Previous page
  experiment?: string;   // A/B test variant
  device?: 'mobile' | 'tablet' | 'desktop';
  platform?: 'web' | 'ios' | 'android';
}

export interface EventMetrics {
  duration?: number;     // Time spent (milliseconds)
  accuracy?: number;     // 0-100 percentage
  attempts?: number;     // Number of tries
  score?: number;        // Game/test score
  level?: number;        // Difficulty level
  scrollDepth?: number;  // 0-100 percentage
  interaction?: InteractionType;
}

export interface LearningEvent {
  // Required fields
  id: string;
  userId: string;
  timestamp: number;
  type: EventType;
  category: ContentCategory;
  content: ContentData;
  
  // Optional fields
  sessionId?: string;
  context?: EventContext;
  metrics?: EventMetrics;
  metadata?: Record<string, any>;
  
  // Sync status
  synced?: boolean;
  syncedAt?: number;
}

export interface UserLearningStats {
  totalEvents: number;
  uniqueKanji: number;
  uniqueVocab: number;
  uniqueGrammar: number;
  studyStreak: number;
  learningVelocity: number; // Events per day average
  lastActivityAt: number;
  
  // By category
  byCategory: {
    [key in ContentCategory]?: {
      total: number;
      unique: number;
      lastSeen: number;
    };
  };
  
  // Recent activity
  recentItems: {
    kanji: string[];
    vocabulary: string[];
    grammar: string[];
  };
  
  // Learning patterns
  patterns: {
    bestTimeToStudy: string;
    averageSessionLength: number; // minutes
    preferredContent: ContentCategory;
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  };
}

export interface LearningSession {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  events: LearningEvent[];
  summary?: {
    itemsStudied: number;
    accuracy?: number;
    focusArea: ContentCategory;
  };
}