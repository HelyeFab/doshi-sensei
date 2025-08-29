/**
 * Unified Reviews Collection Types
 * Premium-only Firebase collection for consolidating all review types
 */

// Review source types
export type ReviewSource = 
  | 'textbook-vocabulary'
  | 'kanji-mastery'
  | 'custom-flashcards'
  | 'grammar-patterns'
  | 'reading-comprehension'
  | 'listening-practice'
  | 'shadowing-practice';

// Review priority levels
export type ReviewPriority = 'low' | 'normal' | 'high' | 'critical';

// Review session status
export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed' | 'cancelled';

// Review schedule frequency
export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

// Individual review priority configuration
export interface ReviewPriorityConfig {
  source: ReviewSource;
  priority: ReviewPriority;
  weight: number; // 0-1, how much to prioritize this source
  enabled: boolean;
  maxItemsPerSession: number;
  preferredTimeSlots: string[]; // ['morning', 'afternoon', 'evening', 'night']
  customSettings?: Record<string, unknown>;
}

// Session state for each review source
export interface ReviewSessionState {
  source: ReviewSource;
  status: SessionStatus;
  currentItemId?: string;
  currentItemIndex: number;
  totalItems: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedItems: number;
  sessionStartTime?: Date;
  sessionEndTime?: Date;
  estimatedTimeRemaining?: number; // minutes
  lastInteractionTime?: Date;
  sessionData?: Record<string, unknown>; // source-specific data
}

// Completion statistics for each review source
export interface CompletionStats {
  source: ReviewSource;
  totalSessions: number;
  completedSessions: number;
  totalItemsReviewed: number;
  totalCorrectAnswers: number;
  averageAccuracy: number; // 0-1
  averageSessionTime: number; // minutes
  streakDays: number;
  longestStreak: number;
  lastCompletedSession?: Date;
  lastStudiedDate?: Date;
  weeklyGoalProgress: number; // 0-1
  monthlyGoalProgress: number; // 0-1
  masteredItems: number;
  strugglingItems: number; // items with low accuracy
}

// Custom review schedule configuration
export interface CustomSchedule {
  id: string;
  name: string;
  sources: ReviewSource[];
  frequency: ScheduleFrequency;
  customInterval?: number; // days for custom frequency
  timeSlots: string[];
  reminderEnabled: boolean;
  reminderOffset: number; // minutes before scheduled time
  adaptiveScheduling: boolean; // adjust based on performance
  maxSessionLength: number; // minutes
  minItemsPerSession: number;
  maxItemsPerSession: number;
  difficultyBalancing: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Main unified reviews document structure
export interface UnifiedReviews {
  userId: string;
  
  // Review priorities by source
  reviewPriorities: {
    [key in ReviewSource]?: ReviewPriorityConfig;
  };
  
  // Current session states
  sessionStates: {
    [key in ReviewSource]?: ReviewSessionState;
  };
  
  // Completion statistics
  completionStats: {
    [key in ReviewSource]?: CompletionStats;
  };
  
  // Last synchronization timestamp
  lastSyncTimestamp: Date;
  
  // Custom review schedules
  customSchedules: {
    [scheduleId: string]: CustomSchedule;
  };
  
  // Global settings
  globalSettings?: {
    dailyGoalMinutes: number;
    weeklyGoalSessions: number;
    preferredStudyTimes: string[];
    enableNotifications: boolean;
    enableAdaptiveScheduling: boolean;
    enableStreakTracking: boolean;
    difficultyProgression: 'conservative' | 'balanced' | 'aggressive';
    autoAdvanceOnMastery: boolean;
    showProgressInsights: boolean;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version?: string; // for future schema migrations
}

// Utility types for working with unified reviews
export type ReviewSourceStats = Pick<CompletionStats, 
  'totalSessions' | 'averageAccuracy' | 'streakDays' | 'masteredItems'>;

export type ActiveSessionSummary = {
  source: ReviewSource;
  progress: number; // 0-1
  timeSpent: number; // minutes
  accuracy: number; // 0-1
  itemsRemaining: number;
};

export type ReviewInsight = {
  type: 'strength' | 'weakness' | 'improvement' | 'milestone';
  source: ReviewSource;
  message: string;
  actionSuggestion?: string;
  priority: ReviewPriority;
  timestamp: Date;
};

// Firebase document converter helpers
export interface UnifiedReviewsFirestore extends Omit<UnifiedReviews, 
  'lastSyncTimestamp' | 'createdAt' | 'updatedAt' | 'customSchedules'> {
  lastSyncTimestamp: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  customSchedules: {
    [scheduleId: string]: Omit<CustomSchedule, 'createdAt' | 'updatedAt'> & {
      createdAt: FirebaseFirestore.Timestamp;
      updatedAt: FirebaseFirestore.Timestamp;
    };
  };
}

// API request/response types
export interface CreateUnifiedReviewsRequest {
  userId: string;
  initialSources?: ReviewSource[];
  globalSettings?: UnifiedReviews['globalSettings'];
}

export interface UpdateUnifiedReviewsRequest {
  userId: string;
  reviewPriorities?: Partial<UnifiedReviews['reviewPriorities']>;
  sessionStates?: Partial<UnifiedReviews['sessionStates']>;
  completionStats?: Partial<UnifiedReviews['completionStats']>;
  customSchedules?: Partial<UnifiedReviews['customSchedules']>;
  globalSettings?: Partial<UnifiedReviews['globalSettings']>;
}

export interface GetUnifiedReviewsResponse {
  success: boolean;
  data?: UnifiedReviews;
  error?: string;
}

// Hook return types
export interface UseUnifiedReviewsReturn {
  unifiedReviews: UnifiedReviews | null;
  loading: boolean;
  error: string | null;
  updateReviews: (updates: UpdateUnifiedReviewsRequest) => Promise<void>;
  createReviews: (request: CreateUnifiedReviewsRequest) => Promise<void>;
  syncWithSources: () => Promise<void>;
  getActiveSession: () => ActiveSessionSummary | null;
  getInsights: () => ReviewInsight[];
  resetStats: (source?: ReviewSource) => Promise<void>;
}

// Constants
export const REVIEW_SOURCES: Record<ReviewSource, string> = {
  'textbook-vocabulary': 'Textbook Vocabulary',
  'kanji-mastery': 'Kanji Mastery',
  'custom-flashcards': 'Custom Flashcards',
  'grammar-patterns': 'Grammar Patterns',
  'reading-comprehension': 'Reading Comprehension',
  'listening-practice': 'Listening Practice',
  'shadowing-practice': 'Shadowing Practice',
};

export const DEFAULT_PRIORITY_CONFIG: Omit<ReviewPriorityConfig, 'source'> = {
  priority: 'normal',
  weight: 0.5,
  enabled: true,
  maxItemsPerSession: 20,
  preferredTimeSlots: ['morning', 'evening'],
};

export const DEFAULT_GLOBAL_SETTINGS: UnifiedReviews['globalSettings'] = {
  dailyGoalMinutes: 30,
  weeklyGoalSessions: 5,
  preferredStudyTimes: ['morning', 'evening'],
  enableNotifications: true,
  enableAdaptiveScheduling: true,
  enableStreakTracking: true,
  difficultyProgression: 'balanced',
  autoAdvanceOnMastery: false,
  showProgressInsights: true,
};