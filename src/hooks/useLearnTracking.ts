/**
 * Universal Learning Analytics Hook
 * The core "bug" that tracks everything
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { 
  LearningEvent, 
  EventType, 
  ContentCategory,
  ContentData,
  EventMetrics,
  UserLearningStats 
} from '@/types/analytics';
import { storageManager } from '@/services/analytics/StorageManager';
import { eventQueueManager } from '@/services/analytics/EventQueueManager';

// Generate a unique session ID for this page load
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export interface UseLearnTrackingOptions {
  enabled?: boolean;
  debug?: boolean;
  autoTrack?: boolean;
}

export interface UseLearnTrackingReturn {
  track: (event: Partial<LearningEvent>) => void;
  getStats: () => Promise<UserLearningStats | null>;
  getRecentEvents: (limit?: number) => Promise<LearningEvent[]>;
  clearEvents: () => Promise<void>;
  sessionId: string;
}

export function useLearnTracking(
  options: UseLearnTrackingOptions = {}
): UseLearnTrackingReturn {
  const { enabled = true, debug = false, autoTrack = true } = options;
  const { user } = useAuth();
  const pathname = usePathname();
  const sessionId = useRef(generateSessionId());
  const pageLoadTime = useRef(Date.now());
  
  // Auto-track page views
  useEffect(() => {
    if (!enabled || !autoTrack || !user) return;
    
    // Track page view
    track({
      type: 'view',
      category: 'page' as ContentCategory,
      content: {
        value: pathname,
        metadata: {
          referrer: document.referrer,
          title: document.title
        }
      }
    });
    
    // Track page leave
    return () => {
      const duration = Date.now() - pageLoadTime.current;
      track({
        type: 'complete',
        category: 'page' as ContentCategory,
        content: { value: pathname },
        metrics: { duration }
      });
    };
  }, [pathname, enabled, autoTrack, user]);
  
  const track = useCallback((eventData: Partial<LearningEvent>) => {
    if (!enabled) return;
    
    // Skip if no user (unless it's a guest-allowed event)
    const userId = user?.uid || 'guest';
    
    // Create complete event
    const event: LearningEvent = {
      id: uuidv4(),
      userId,
      timestamp: Date.now(),
      type: eventData.type || 'view',
      category: eventData.category || 'unknown' as ContentCategory,
      content: eventData.content || { value: 'unknown' },
      sessionId: sessionId.current,
      context: {
        page: pathname,
        feature: getFeatureFromPath(pathname),
        device: getDeviceType(),
        platform: 'web',
        ...eventData.context
      },
      metrics: eventData.metrics,
      metadata: eventData.metadata,
      synced: false
    };
    
    // Debug logging
    if (debug || process.env.NODE_ENV === 'development') {
      console.log('📊 [ULAS] Tracking Event:', {
        type: event.type,
        category: event.category,
        content: event.content.value,
        metrics: event.metrics
      });
    }
    
    // Queue the event
    eventQueueManager.queueEvent(event).catch(error => {
      console.error('Failed to queue event:', error);
    });
  }, [enabled, user, pathname, debug]);
  
  const getStats = useCallback(async (): Promise<UserLearningStats | null> => {
    if (!user) return null;
    
    try {
      // Get from storage
      let stats = await storageManager.getUserStats(user.uid);
      
      // If no stats, calculate from events
      if (!stats) {
        const events = await storageManager.getEvents(user.uid);
        stats = calculateUserStats(events, user.uid);
        await storageManager.updateUserStats(stats);
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  }, [user]);
  
  const getRecentEvents = useCallback(async (limit: number = 100): Promise<LearningEvent[]> => {
    if (!user) return [];
    
    try {
      return await storageManager.getRecentEvents(user.uid, limit);
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }, [user]);
  
  const clearEvents = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      await storageManager.clearUserData(user.uid);
    } catch (error) {
      console.error('Failed to clear events:', error);
    }
  }, [user]);
  
  return {
    track,
    getStats,
    getRecentEvents,
    clearEvents,
    sessionId: sessionId.current
  };
}

// Helper functions
function getFeatureFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 'home';
  if (segments.length === 1) return segments[0];
  return segments.join('_');
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function calculateUserStats(events: LearningEvent[], userId: string): UserLearningStats {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  // Unique content tracking
  const uniqueKanji = new Set<string>();
  const uniqueVocab = new Set<string>();
  const uniqueGrammar = new Set<string>();
  
  // Category stats
  const byCategory: UserLearningStats['byCategory'] = {};
  
  // Recent items (last 10 of each)
  const recentKanji: string[] = [];
  const recentVocab: string[] = [];
  const recentGrammar: string[] = [];
  
  // Process events
  events.forEach(event => {
    // Track unique content
    if (event.category === 'kanji' && event.content.value) {
      uniqueKanji.add(event.content.value);
      if (recentKanji.length < 10 && !recentKanji.includes(event.content.value)) {
        recentKanji.push(event.content.value);
      }
    } else if (event.category === 'vocabulary' && event.content.value) {
      uniqueVocab.add(event.content.value);
      if (recentVocab.length < 10 && !recentVocab.includes(event.content.value)) {
        recentVocab.push(event.content.value);
      }
    } else if (event.category === 'grammar' && event.content.value) {
      uniqueGrammar.add(event.content.value);
      if (recentGrammar.length < 10 && !recentGrammar.includes(event.content.value)) {
        recentGrammar.push(event.content.value);
      }
    }
    
    // Update category stats
    if (!byCategory[event.category]) {
      byCategory[event.category] = {
        total: 0,
        unique: 0,
        lastSeen: 0
      };
    }
    
    byCategory[event.category]!.total++;
    byCategory[event.category]!.lastSeen = Math.max(
      byCategory[event.category]!.lastSeen,
      event.timestamp
    );
  });
  
  // Calculate unique counts per category
  Object.keys(byCategory).forEach(category => {
    const cat = category as ContentCategory;
    const uniqueValues = new Set(
      events
        .filter(e => e.category === cat)
        .map(e => e.content.value)
    );
    byCategory[cat]!.unique = uniqueValues.size;
  });
  
  // Calculate learning velocity (events per day over last 7 days)
  const sevenDaysAgo = now - (7 * dayInMs);
  const recentEvents = events.filter(e => e.timestamp > sevenDaysAgo);
  const learningVelocity = recentEvents.length / 7;
  
  // Calculate study streak
  const studyDays = new Set<string>();
  events.forEach(event => {
    const date = new Date(event.timestamp).toDateString();
    studyDays.add(date);
  });
  
  // Check consecutive days backwards from today
  let studyStreak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (studyDays.has(checkDate.toDateString())) {
      studyStreak++;
    } else if (i > 0) {
      break; // Streak broken (allow today to be empty)
    }
  }
  
  // Determine learning patterns
  const hourCounts: Record<number, number> = {};
  events.forEach(event => {
    const hour = new Date(event.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const bestHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || '20';
  
  const bestTimeToStudy = `${bestHour}:00-${(parseInt(bestHour) + 2) % 24}:00`;
  
  // Determine preferred content
  const preferredContent = Object.entries(byCategory)
    .sort(([, a], [, b]) => b.total - a.total)[0]?.[0] as ContentCategory || 'kanji';
  
  return {
    totalEvents: events.length,
    uniqueKanji: uniqueKanji.size,
    uniqueVocab: uniqueVocab.size,
    uniqueGrammar: uniqueGrammar.size,
    studyStreak,
    learningVelocity,
    lastActivityAt: events[events.length - 1]?.timestamp || now,
    byCategory,
    recentItems: {
      kanji: recentKanji,
      vocabulary: recentVocab,
      grammar: recentGrammar
    },
    patterns: {
      bestTimeToStudy,
      averageSessionLength: 25, // TODO: Calculate from session data
      preferredContent,
      learningStyle: 'mixed' // TODO: Determine from interaction patterns
    }
  };
}