/**
 * Universal Learning Analytics Hook
 * Now properly integrated with tiered storage system
 */

import { useCallback, useRef, useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
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
import { learningEventsService } from '@/services/analytics/LearningEventsService';

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
  
  // Use context directly to avoid errors when AuthContext is not available
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const subscription = authContext?.subscription || null;
  
  const pathname = usePathname();
  const sessionId = useRef(generateSessionId());
  const pageLoadTime = useRef(Date.now());
  
  // Initialize learning events service with user on mount/change
  useEffect(() => {
    learningEventsService.setUser(user, subscription);
  }, [user, subscription]);
  
  // Auto-track page views (for logged-in users only, not guests)
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
    
    // Determine user tier for proper storage
    const userId = user?.uid || 'guest';
    const isGuest = !user;
    
    // For guests, only track in memory (no persistence)
    // For free/premium users, track according to their tier
    
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
    
    if (debug) {
      const userTier = isGuest ? 'guest' : 
                       subscription?.plan === 'monthly' ? 'monthly' :
                       subscription?.plan === 'yearly' ? 'yearly' : 'free';
      console.log(`[Track] Event (${userTier}):`, event.type, event.category, event.content.value);
    }
    
    // Queue the event (will be handled according to user tier)
    eventQueueManager.queueEvent(event).catch(() => {
      // Failed to queue event - this is fine for guests
    });
  }, [enabled, user, pathname, debug, subscription]);
  
  const getStats = useCallback(async (): Promise<UserLearningStats | null> => {
    // Guests can get temporary stats from memory
    // Free users get stats from local storage
    // Premium users get stats from cloud+local
    
    try {
      // Use the new service to get stats
      const rawStats = await learningEventsService.getStats();
      
      if (!rawStats) return null;
      
      // Get recent events for more detailed stats
      const events = await learningEventsService.getRecentEvents(1000);
      
      // Calculate detailed stats
      return calculateUserStats(events, user?.uid || 'guest');
    } catch (error) {
      console.error('[useLearnTracking] Failed to get stats:', error);
      return null;
    }
  }, [user]);
  
  const getRecentEvents = useCallback(async (limit: number = 100): Promise<LearningEvent[]> => {
    // Use the new service which handles tiered storage properly
    try {
      return await learningEventsService.getRecentEvents(limit);
    } catch (error) {
      console.error('[useLearnTracking] Failed to get recent events:', error);
      return [];
    }
  }, []);
  
  const clearEvents = useCallback(async (): Promise<void> => {
    // Use the new service to clear data properly
    try {
      await learningEventsService.deleteAllUserData();
      console.log('[useLearnTracking] Events cleared');
    } catch (error) {
      console.error('[useLearnTracking] Failed to clear events:', error);
    }
  }, []);
  
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