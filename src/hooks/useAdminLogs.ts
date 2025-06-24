'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminLog, AdminLogAction } from '@/types/admin';
import { fetchAdminLogs, getRecentAdminActivity } from '@/utils/adminLogs';

interface UseAdminLogsReturn {
  logs: AdminLog[];
  loading: boolean;
  error: string | null;
  refreshLogs: () => Promise<void>;
  totalActions: number;
  actionsByType: Record<AdminLogAction, number>;
  recentActivity: AdminLog[];
}

export function useAdminLogs(options: {
  realtime?: boolean;
  limitCount?: number;
  action?: AdminLogAction;
  targetUserId?: string;
} = {}): UseAdminLogsReturn {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalActions, setTotalActions] = useState(0);
  const [actionsByType, setActionsByType] = useState<Record<AdminLogAction, number>>({
    user_upgraded_to_premium: 0,
    user_downgraded_to_free: 0,
    user_suspended: 0,
    user_unsuspended: 0,
    user_deleted: 0,
    mood_board_created: 0,
    mood_board_updated: 0,
    mood_board_deleted: 0,
    mood_board_published: 0,
    mood_board_unpublished: 0,
    system_backup_created: 0,
    system_settings_updated: 0,
    admin_login: 0,
    admin_logout: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AdminLog[]>([]);

  const { realtime = true, limitCount = 50, action, targetUserId } = options;

  const loadInitialData = async () => {
    try {
      setError(null);
      
      // Fetch logs
      const fetchedLogs = await fetchAdminLogs({
        limitCount,
        action,
        targetUserId,
      });
      
      setLogs(fetchedLogs);

      // Get recent activity summary
      const activitySummary = await getRecentAdminActivity(7);
      setTotalActions(activitySummary.totalActions);
      setActionsByType(activitySummary.actionsByType);
      setRecentActivity(activitySummary.recentLogs);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading admin logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin logs');
      setLoading(false);
    }
  };

  const refreshLogs = async () => {
    setLoading(true);
    await loadInitialData();
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (realtime && db) {
      // Set up real-time listener
      const logsRef = collection(db, 'adminLogs');
      let q = query(logsRef, orderBy('timestamp', 'desc'));
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const fetchedLogs: AdminLog[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date(),
            } as AdminLog));

            setLogs(fetchedLogs);
            setLoading(false);
            setError(null);

            // Update activity summary when logs change
            getRecentAdminActivity(7).then(activitySummary => {
              setTotalActions(activitySummary.totalActions);
              setActionsByType(activitySummary.actionsByType);
              setRecentActivity(activitySummary.recentLogs);
            }).catch(err => {
              console.error('Error updating activity summary:', err);
            });

          } catch (err) {
            console.error('Error processing logs snapshot:', err);
            setError(err instanceof Error ? err.message : 'Failed to process logs');
            setLoading(false);
          }
        },
        (err) => {
          console.error('Error in logs snapshot listener:', err);
          setError(err.message || 'Failed to listen to log changes');
          setLoading(false);
        }
      );
    } else {
      // Load data once without real-time updates
      loadInitialData();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [realtime, limitCount, action, targetUserId]);

  return {
    logs,
    loading,
    error,
    refreshLogs,
    totalActions,
    actionsByType,
    recentActivity,
  };
}