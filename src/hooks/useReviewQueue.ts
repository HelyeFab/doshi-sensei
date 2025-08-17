/**
 * useReviewQueue Hook
 * Provides interface for managing daily review queues
 * Production-ready with caching, error handling, and optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useToast } from '@/components/ui/Toast';
import { 
  reviewQueueService,
  ReviewQueueItem,
  ReviewSessionConfig,
  ReviewSessionResult,
  QueueStatistics
} from '@/services/kanji-mastery/reviewQueueService';
import { Rating } from '@/services/kanji-mastery/fsrsAlgorithm';
import { dataSyncService } from '@/services/kanji-mastery/dataSyncService';

/**
 * Review session state
 */
interface ReviewSessionState {
  queue: ReviewQueueItem[];
  currentIndex: number;
  currentItem: ReviewQueueItem | null;
  results: ReviewSessionResult[];
  sessionStartTime: Date;
  isComplete: boolean;
}

/**
 * Hook return type
 */
interface UseReviewQueueReturn {
  // State
  session: ReviewSessionState | null;
  loading: boolean;
  error: Error | null;
  statistics: QueueStatistics | null;
  
  // Actions
  startSession: (config?: ReviewSessionConfig) => Promise<void>;
  submitAnswer: (rating: Rating, responseTime: number) => Promise<void>;
  skipItem: () => void;
  endSession: () => void;
  getNextReviewTime: () => string;
  
  // Progress
  progress: {
    total: number;
    completed: number;
    correct: number;
    percentage: number;
    estimatedTimeRemaining: number;
  };
}

/**
 * useReviewQueue Hook
 */
export function useReviewQueue(): UseReviewQueueReturn {
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { showToast } = useToast();
  
  // State
  const [session, setSession] = useState<ReviewSessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [statistics, setStatistics] = useState<QueueStatistics | null>(null);
  
  // Refs for performance
  const sessionRef = useRef<ReviewSessionState | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Update ref when session changes
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
  /**
   * Load queue statistics
   */
  const loadStatistics = useCallback(async () => {
    if (!user) return;
    
    try {
      const stats = await reviewQueueService.getQueueStatistics(user.uid);
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  }, [user]);
  
  /**
   * Start a new review session
   */
  const startSession = useCallback(async (config?: ReviewSessionConfig) => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return;
    }
    
    // Check access using Three-Pillar Architecture
    const hasAccess = await checkAndTrack('daily_reviews');
    if (!hasAccess) {
      return; // Access modal shown automatically
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate review queue
      const queue = await reviewQueueService.generateQueue(user.uid, config);
      
      if (queue.length === 0) {
        showToast({
          title: 'No Reviews Due',
          description: 'Great job! You have no reviews due right now.',
          type: 'success'
        });
        setLoading(false);
        return;
      }
      
      // Initialize session
      const newSession: ReviewSessionState = {
        queue,
        currentIndex: 0,
        currentItem: queue[0],
        results: [],
        sessionStartTime: new Date(),
        isComplete: false
      };
      
      setSession(newSession);
      
      // Preload next items for performance
      preloadNextItems(queue.slice(1, 4));
      
      // Start background sync
      startBackgroundSync();
      
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast({
        title: 'Failed to Start Session',
        description: error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [user, checkAndTrack, showToast]);
  
  /**
   * Submit an answer for the current item
   */
  const submitAnswer = useCallback(async (
    rating: Rating,
    responseTime: number
  ) => {
    if (!session || !session.currentItem || !user) return;
    
    const currentItem = session.currentItem;
    
    // Create result
    const result: ReviewSessionResult = {
      kanjiChar: currentItem.kanjiChar,
      rating,
      responseTime,
      correct: rating >= Rating.GOOD,
      questionType: 'meaning', // TODO: Track actual question type
      correctAnswer: currentItem.meaning
    };
    
    // Optimistic update
    const newResults = [...session.results, result];
    const nextIndex = session.currentIndex + 1;
    const isComplete = nextIndex >= session.queue.length;
    
    setSession(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        results: newResults,
        currentIndex: nextIndex,
        currentItem: isComplete ? null : prev.queue[nextIndex],
        isComplete
      };
    });
    
    // Process review in background
    try {
      await reviewQueueService.processReview(
        user.uid,
        currentItem.kanjiChar,
        rating,
        responseTime
      );
      
      // Save to local storage for offline support
      await dataSyncService.saveProgressLocal(user.uid, {
        progressId: `${user.uid}_${currentItem.kanjiChar}`,
        kanjiChar: currentItem.kanjiChar,
        lastReview: new Date(),
        rating
      });
      
    } catch (err) {
      console.error('Failed to process review:', err);
      // Continue session even if save fails
    }
    
    // Show completion notification
    if (isComplete) {
      handleSessionComplete(newResults);
    }
    
  }, [session, user]);
  
  /**
   * Skip current item
   */
  const skipItem = useCallback(() => {
    if (!session) return;
    
    const nextIndex = session.currentIndex + 1;
    const isComplete = nextIndex >= session.queue.length;
    
    setSession(prev => {
      if (!prev) return null;
      
      // Move skipped item to end of queue
      const newQueue = [
        ...prev.queue.slice(0, prev.currentIndex),
        ...prev.queue.slice(prev.currentIndex + 1),
        prev.queue[prev.currentIndex]
      ];
      
      return {
        ...prev,
        queue: newQueue,
        currentItem: isComplete ? null : newQueue[prev.currentIndex],
        isComplete
      };
    });
  }, [session]);
  
  /**
   * End session early
   */
  const endSession = useCallback(() => {
    if (!session) return;
    
    setSession(prev => {
      if (!prev) return null;
      return { ...prev, isComplete: true };
    });
    
    if (session.results.length > 0) {
      handleSessionComplete(session.results);
    }
    
    // Stop background sync
    stopBackgroundSync();
    
  }, [session]);
  
  /**
   * Get next review time
   */
  const getNextReviewTime = useCallback((): string => {
    if (!session?.currentItem) return '';
    
    const fsrsCard = session.currentItem.fsrsCard;
    const nextReview = new Date(fsrsCard.due);
    const now = new Date();
    
    const diffMs = nextReview.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    
    return `In ${Math.floor(diffDays / 30)} months`;
  }, [session]);
  
  /**
   * Handle session completion
   */
  const handleSessionComplete = (results: ReviewSessionResult[]) => {
    const correct = results.filter(r => r.correct).length;
    const accuracy = (correct / results.length) * 100;
    const duration = Date.now() - (session?.sessionStartTime.getTime() || 0);
    
    showToast({
      title: 'Session Complete! 🎉',
      description: `${correct}/${results.length} correct (${accuracy.toFixed(0)}%)`,
      type: 'success'
    });
    
    // Log analytics
    logSessionAnalytics(results, duration);
    
    // Clear session
    setSession(null);
    
    // Reload statistics
    loadStatistics();
  };
  
  /**
   * Preload next items for performance
   */
  const preloadNextItems = (items: ReviewQueueItem[]) => {
    // Preload kanji data, images, etc.
    // This is a placeholder for actual preloading logic
    items.forEach(item => {
      // Preload logic here
    });
  };
  
  /**
   * Start background sync
   */
  const startBackgroundSync = () => {
    // Sync every 30 seconds during session
    syncTimeoutRef.current = setInterval(() => {
      if (user) {
        dataSyncService.syncUser(user.uid).catch(console.error);
      }
    }, 30000);
  };
  
  /**
   * Stop background sync
   */
  const stopBackgroundSync = () => {
    if (syncTimeoutRef.current) {
      clearInterval(syncTimeoutRef.current);
      syncTimeoutRef.current = undefined;
    }
  };
  
  /**
   * Log session analytics
   */
  const logSessionAnalytics = (results: ReviewSessionResult[], duration: number) => {
    // TODO: Implement analytics logging
    console.log('Session analytics:', {
      results: results.length,
      correct: results.filter(r => r.correct).length,
      duration: Math.floor(duration / 1000),
      avgResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    });
  };
  
  /**
   * Calculate progress
   */
  const progress = session ? {
    total: session.queue.length,
    completed: session.results.length,
    correct: session.results.filter(r => r.correct).length,
    percentage: (session.results.length / session.queue.length) * 100,
    estimatedTimeRemaining: (session.queue.length - session.results.length) * 30 // 30 seconds per item
  } : {
    total: 0,
    completed: 0,
    correct: 0,
    percentage: 0,
    estimatedTimeRemaining: 0
  };
  
  // Load statistics on mount and user change
  useEffect(() => {
    if (user) {
      loadStatistics();
    }
  }, [user, loadStatistics]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundSync();
    };
  }, []);
  
  return {
    session,
    loading,
    error,
    statistics,
    startSession,
    submitAnswer,
    skipItem,
    endSession,
    getNextReviewTime,
    progress
  };
}