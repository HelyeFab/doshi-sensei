'use client';

import { addDoc, collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AnalyticsEvent {
  id?: string;
  eventType: 'drill_completed' | 'vocabulary_search' | 'mood_board_view' | 'session_start' | 'session_end';
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  eventType: AnalyticsEvent['eventType'], 
  data: Record<string, any> = {},
  userId?: string
): Promise<void> {
  try {
    if (!db) {
      console.warn('Firebase not initialized, cannot track analytics event');
      return;
    }

    const eventData = {
      eventType,
      userId: userId || null,
      timestamp: Timestamp.now(),
      data,
    };

    const analyticsRef = collection(db, 'analytics');
    await addDoc(analyticsRef, eventData);

  } catch (error) {
    // Check if it's a permission error (user already signed out)
    if (error instanceof Error && error.message.includes('permissions')) {
      console.warn('Analytics tracking skipped due to permissions (user may be signed out):', eventType);
    } else {
      console.error('Error tracking analytics event:', error);
    }
    // Don't throw here as this is just tracking and shouldn't break the app
  }
}

/**
 * Get analytics data for a specific date range
 */
export async function getAnalyticsData(options: {
  eventType?: AnalyticsEvent['eventType'];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  limitCount?: number;
} = {}): Promise<AnalyticsEvent[]> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const analyticsRef = collection(db, 'analytics');
    let q = query(analyticsRef, orderBy('timestamp', 'desc'));

    // Apply filters
    if (options.eventType) {
      q = query(q, where('eventType', '==', options.eventType));
    }
    
    if (options.userId) {
      q = query(q, where('userId', '==', options.userId));
    }

    if (options.startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
    }

    if (options.endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
    }

    // Apply limit
    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    } as AnalyticsEvent));

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    
    // Handle specific Firestore index errors
    if (error instanceof Error && error.message.includes('requires an index')) {
      throw new Error('Analytics query requires a database index. Please check the Firebase console or contact an administrator.');
    }
    
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch analytics data');
  }
}

/**
 * Get today's analytics summary
 */
export async function getTodayAnalytics(): Promise<{
  drillsCompleted: number;
  vocabularySearches: number;
  moodBoardViews: number;
  uniqueUsers: number;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use Promise.allSettled to handle individual query failures gracefully
    const [drillResult, searchResult, viewResult] = await Promise.allSettled([
      getAnalyticsData({ 
        eventType: 'drill_completed', 
        startDate: today, 
        endDate: tomorrow 
      }),
      getAnalyticsData({ 
        eventType: 'vocabulary_search', 
        startDate: today, 
        endDate: tomorrow 
      }),
      getAnalyticsData({ 
        eventType: 'mood_board_view', 
        startDate: today, 
        endDate: tomorrow 
      }),
    ]);

    const drillEvents = drillResult.status === 'fulfilled' ? drillResult.value : [];
    const searchEvents = searchResult.status === 'fulfilled' ? searchResult.value : [];
    const viewEvents = viewResult.status === 'fulfilled' ? viewResult.value : [];

    // Get unique users from all events
    const allUserIds = new Set([
      ...drillEvents.map(e => e.userId).filter(Boolean),
      ...searchEvents.map(e => e.userId).filter(Boolean),
      ...viewEvents.map(e => e.userId).filter(Boolean),
    ]);

    return {
      drillsCompleted: drillEvents.length,
      vocabularySearches: searchEvents.length,
      moodBoardViews: viewEvents.length,
      uniqueUsers: allUserIds.size,
    };

  } catch (error) {
    console.error('Error getting today analytics:', error);
    return {
      drillsCompleted: 0,
      vocabularySearches: 0,
      moodBoardViews: 0,
      uniqueUsers: 0,
    };
  }
}

/**
 * Get most popular mood board from analytics
 */
export async function getMostPopularMoodBoard(days: number = 7): Promise<string> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const viewEvents = await getAnalyticsData({
      eventType: 'mood_board_view',
      startDate,
      limitCount: 1000,
    });

    // Count views by mood board
    const moodBoardCounts: Record<string, number> = {};
    viewEvents.forEach(event => {
      const boardId = event.data.moodBoardId || event.data.boardId;
      if (boardId) {
        moodBoardCounts[boardId] = (moodBoardCounts[boardId] || 0) + 1;
      }
    });

    // Find most popular
    const mostPopular = Object.entries(moodBoardCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return mostPopular ? mostPopular[0] : 'No data';

  } catch (error) {
    console.error('Error getting most popular mood board:', error);
    return 'Error loading data';
  }
}

/**
 * Calculate average session duration
 */
export async function getAverageSessionDuration(days: number = 7): Promise<number> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Use Promise.allSettled to handle index errors gracefully
    const [startResult, endResult] = await Promise.allSettled([
      getAnalyticsData({
        eventType: 'session_start',
        startDate,
        limitCount: 1000,
      }),
      getAnalyticsData({
        eventType: 'session_end',
        startDate,
        limitCount: 1000,
      }),
    ]);

    // Return 0 if either query failed (likely due to missing indexes)
    if (startResult.status === 'rejected' || endResult.status === 'rejected') {
      console.warn('Session analytics queries failed, likely due to missing database indexes');
      return 0;
    }

    const sessionStarts = startResult.value;
    const sessionEnds = endResult.value;

    // Calculate session durations
    const durations: number[] = [];
    sessionStarts.forEach(start => {
      if (start.userId) {
        const end = sessionEnds.find(e => 
          e.userId === start.userId && 
          e.timestamp > start.timestamp
        );
        if (end) {
          const duration = (end.timestamp.getTime() - start.timestamp.getTime()) / (1000 * 60); // minutes
          if (duration > 0 && duration < 180) { // Filter out unrealistic durations
            durations.push(duration);
          }
        }
      }
    });

    if (durations.length === 0) {
      return 0;
    }

    const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place

  } catch (error) {
    console.error('Error calculating average session duration:', error);
    return 0;
  }
}

// Helper functions for easy tracking
export const Analytics = {
  // Track drill completion
  trackDrillCompleted: (userId?: string, drillData: Record<string, any> = {}) => 
    trackEvent('drill_completed', drillData, userId),

  // Track vocabulary search
  trackVocabularySearch: (userId?: string, searchData: Record<string, any> = {}) => 
    trackEvent('vocabulary_search', searchData, userId),

  // Track mood board view
  trackMoodBoardView: (userId?: string, viewData: Record<string, any> = {}) => 
    trackEvent('mood_board_view', viewData, userId),

  // Track session start
  trackSessionStart: (userId?: string, sessionData: Record<string, any> = {}) => 
    trackEvent('session_start', sessionData, userId),

  // Track session end
  trackSessionEnd: (userId?: string, sessionData: Record<string, any> = {}) => 
    trackEvent('session_end', sessionData, userId),
};