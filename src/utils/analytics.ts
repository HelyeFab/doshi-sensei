'use client';

import { analyticsTracker } from '@/lib/analytics/analyticsTracker';

export interface AnalyticsEvent {
  id?: string;
  eventType: 'drill_completed' | 'vocabulary_search' | 'mood_board_view' | 'session_start' | 'session_end';
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
}

/**
 * Track an analytics event - migrated to use new analytics system
 */
export async function trackEvent(
  eventType: AnalyticsEvent['eventType'],
  data: Record<string, any> = {},
  userId?: string
): Promise<void> {
  try {
    // Map old event types to new system
    switch (eventType) {
      case 'drill_completed':
        analyticsTracker.trackDrillComplete(
          data.drillType || 'unknown',
          data.correct || 0,
          data.total || 0
        );
        break;
      case 'vocabulary_search':
        // Track as a feature usage
        analyticsTracker.track('feature_discovered', {
          feature: 'vocabulary_search',
          ...data
        });
        break;
      case 'mood_board_view':
        analyticsTracker.track('moodboard_view', {
          boardId: data.moodBoardId || data.boardId,
          ...data
        });
        break;
      case 'session_start':
        // Already handled by analyticsTracker initialization
        break;
      case 'session_end':
        // Already handled by analyticsTracker session management
        break;
      default:

    }
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    // Don't throw here as this is just tracking and shouldn't break the app
  }
}

/**
 * Get analytics data for a specific date range
 * @deprecated This function reads from the old analytics collection. Use admin analytics pages instead.
 */
export async function getAnalyticsData(options: {
  eventType?: AnalyticsEvent['eventType'];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  limitCount?: number;
} = {}): Promise<AnalyticsEvent[]> {

  // Return empty array to prevent errors during migration
  return [];
}

/**
 * Get today's analytics summary
 * @deprecated This function reads from the old analytics collection. Use admin analytics pages instead.
 */
export async function getTodayAnalytics(): Promise<{
  drillsCompleted: number;
  vocabularySearches: number;
  moodBoardViews: number;
  uniqueUsers: number;
}> {

  // Return zeros to prevent errors during migration
  return {
    drillsCompleted: 0,
    vocabularySearches: 0,
    moodBoardViews: 0,
    uniqueUsers: 0,
  };
}

/**
 * Get most popular mood board from analytics
 * @deprecated This function reads from the old analytics collection. Use admin analytics pages instead.
 */
export async function getMostPopularMoodBoard(days: number = 7): Promise<string> {

  return 'No data';
}

/**
 * Calculate average session duration
 * @deprecated This function reads from the old analytics collection. Use admin analytics pages instead.
 */
export async function getAverageSessionDuration(days: number = 7): Promise<number> {

  return 0;
}

// Helper functions for easy tracking - migrated to new analytics system
export const Analytics = {
  // Track drill completion
  trackDrillCompleted: (userId?: string, drillData: Record<string, any> = {}) => {
    analyticsTracker.trackDrillComplete(
      drillData.drillType || 'unknown',
      drillData.correct || 0,
      drillData.total || 0
    );
  },

  // Track vocabulary search
  trackVocabularySearch: (userId?: string, searchData: Record<string, any> = {}) => {
    analyticsTracker.track('feature_discovered', {
      feature: 'vocabulary_search',
      ...searchData
    });
  },

  // Track mood board view
  trackMoodBoardView: (userId?: string, viewData: Record<string, any> = {}) => {
    analyticsTracker.track('moodboard_view', viewData);
  },

  // Track session start - now handled automatically by analyticsTracker
  trackSessionStart: (userId?: string, sessionData: Record<string, any> = {}) => {
    // Session management is now automatic in the new system

  },

  // Track session end - now handled automatically by analyticsTracker
  trackSessionEnd: (userId?: string, sessionData: Record<string, any> = {}) => {
    // Session management is now automatic in the new system

  },
};
