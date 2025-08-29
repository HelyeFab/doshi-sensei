/**
 * React Hook for Review Notification Aggregator
 * 
 * Provides a convenient interface for React components to interact with
 * the Review Notification Aggregator system. This is separate from the
 * existing useReviewNotifications hook which handles basic preferences.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { reviewNotificationAggregator, DueItemsSummary } from '@/services/notifications/ReviewNotificationAggregator';
import { useAuth } from '@/contexts/AuthContext';

export interface ReviewNotificationStatus {
  initialized: boolean;
  registryConnected: boolean;
  notificationServiceConnected: boolean;
  activeSchedules: number;
  goldenTimeActive: boolean;
  lastCheck?: Date;
}

export interface UseReviewNotificationAggregatorReturn {
  status: ReviewNotificationStatus;
  isGoldenTime: boolean;
  dueItemsSummary?: DueItemsSummary;
  triggerCheck: () => Promise<void>;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  refreshStatus: () => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing review notification aggregation in React components
 */
export function useReviewNotificationAggregator(): UseReviewNotificationAggregatorReturn {
  const { user } = useAuth();
  
  const [status, setStatus] = useState<ReviewNotificationStatus>(() => ({
    ...reviewNotificationAggregator.getNotificationStatus(),
    lastCheck: undefined
  }));

  const [isGoldenTime, setIsGoldenTime] = useState<boolean>(false);
  const [dueItemsSummary, setDueItemsSummary] = useState<DueItemsSummary>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh status from aggregator
  const refreshStatus = useCallback(() => {
    try {
      const newStatus = reviewNotificationAggregator.getNotificationStatus();
      const newIsGoldenTime = reviewNotificationAggregator.isGoldenTime();
      
      setStatus(prev => ({
        ...newStatus,
        lastCheck: prev.lastCheck // Preserve last check time
      }));
      setIsGoldenTime(newIsGoldenTime);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh status';
      setError(errorMessage);
    }
  }, []);

  // Load due items summary
  const loadDueItemsSummary = useCallback(async () => {
    if (!status.initialized) return;
    
    setIsLoading(true);
    try {
      const summary = await reviewNotificationAggregator.aggregateDueItems();
      setDueItemsSummary(summary);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load due items';
      setError(errorMessage);
      console.error('Failed to load due items summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [status.initialized]);

  // Trigger a manual notification check
  const triggerCheck = useCallback(async () => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await reviewNotificationAggregator.triggerNotificationCheck(user.uid);
      setStatus(prev => ({
        ...prev,
        lastCheck: new Date()
      }));
      setError(null);
      
      // Refresh due items after check
      await loadDueItemsSummary();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger notification check';
      setError(errorMessage);
      console.error('Failed to trigger notification check:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, loadDueItemsSummary]);

  // Enable notifications for the current user
  const enableNotifications = useCallback(async () => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await reviewNotificationAggregator.enableNotifications(user.uid);
      refreshStatus();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable notifications';
      setError(errorMessage);
      console.error('Failed to enable notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, refreshStatus]);

  // Disable notifications for the current user
  const disableNotifications = useCallback(async () => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await reviewNotificationAggregator.disableNotifications(user.uid);
      refreshStatus();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable notifications';
      setError(errorMessage);
      console.error('Failed to disable notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, refreshStatus]);

  // Set up periodic status updates
  useEffect(() => {
    // Update status immediately
    refreshStatus();

    // Set up interval to check golden time and general status
    const interval = setInterval(() => {
      refreshStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [refreshStatus]);

  // Load due items when status changes
  useEffect(() => {
    if (status.initialized && status.registryConnected) {
      loadDueItemsSummary();
    }
  }, [status.initialized, status.registryConnected, loadDueItemsSummary]);

  // Listen for custom notification events
  useEffect(() => {
    const handleNotificationEvent = (event: CustomEvent) => {
      console.log('Aggregated notification event received:', event.detail);
      setStatus(prev => ({
        ...prev,
        lastCheck: new Date()
      }));
      
      // Refresh due items summary after notification
      loadDueItemsSummary();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('app-notification', handleNotificationEvent as EventListener);
      
      return () => {
        window.removeEventListener('app-notification', handleNotificationEvent as EventListener);
      };
    }
  }, [loadDueItemsSummary]);

  return {
    status,
    isGoldenTime,
    dueItemsSummary,
    triggerCheck,
    enableNotifications,
    disableNotifications,
    refreshStatus,
    isLoading,
    error
  };
}

/**
 * Simplified hook for components that only need golden time status
 */
export function useGoldenTime() {
  const [isGoldenTime, setIsGoldenTime] = useState<boolean>(false);
  const [timeInfo, setTimeInfo] = useState<{
    nextWindowType?: 'morning' | 'evening';
    nextWindowTime?: Date;
    currentWindowEnds?: Date;
  }>({});

  useEffect(() => {
    const updateGoldenTimeStatus = () => {
      try {
        const newIsGoldenTime = reviewNotificationAggregator.isGoldenTime();
        setIsGoldenTime(newIsGoldenTime);
        
        // Update time information
        // Note: This would require exposing more methods from the aggregator
        // For now, just track the golden time status
        
      } catch (error) {
        console.error('Failed to update golden time status:', error);
      }
    };

    // Update immediately
    updateGoldenTimeStatus();

    // Check every minute
    const interval = setInterval(updateGoldenTimeStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    isGoldenTime,
    ...timeInfo
  };
}

/**
 * Hook for displaying due items summary in components
 */
export function useDueItemsSummary() {
  const [summary, setSummary] = useState<DueItemsSummary>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  const refreshSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newSummary = await reviewNotificationAggregator.aggregateDueItems();
      setSummary(newSummary);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load due items';
      setError(errorMessage);
      console.error('Failed to refresh due items summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load initial data
    refreshSummary();
    
    // Set up periodic refresh every 5 minutes
    const interval = setInterval(refreshSummary, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshSummary]);

  // Listen for updates that might affect the summary
  useEffect(() => {
    const handleUpdate = () => {
      // Debounce updates
      setTimeout(refreshSummary, 1000);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('review-items-updated', handleUpdate);
      window.addEventListener('app-notification', handleUpdate);
      
      return () => {
        window.removeEventListener('review-items-updated', handleUpdate);
        window.removeEventListener('app-notification', handleUpdate);
      };
    }
  }, [refreshSummary]);

  return {
    summary,
    loading,
    error,
    lastUpdated,
    refreshSummary
  };
}

// Export the main hook as default
export default useReviewNotificationAggregator;