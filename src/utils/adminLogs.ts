'use client';

import { addDoc, collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminLog, AdminLogAction } from '@/types/admin';

const ADMIN_EMAIL = 'emmanuelfabiani23@gmail.com';

export interface LogAdminActionParams {
  action: AdminLogAction;
  targetUserId?: string;
  targetMoodBoardId?: string;
  details?: Record<string, any>;
  adminEmail?: string;
}

/**
 * Log an admin action to Firestore
 */
export async function logAdminAction({
  action,
  targetUserId,
  targetMoodBoardId,
  details = {},
  adminEmail = ADMIN_EMAIL
}: LogAdminActionParams): Promise<void> {
  try {
    if (!db) {
      console.warn('Firebase not initialized, cannot log admin action');
      return;
    }

    const logData: any = {
      action,
      adminEmail,
      details,
      timestamp: Timestamp.now(),
    };

    // Only add targetUserId and targetMoodBoardId if they have values
    if (targetUserId) {
      logData.targetUserId = targetUserId;
    }
    if (targetMoodBoardId) {
      logData.targetMoodBoardId = targetMoodBoardId;
    }

    const logsRef = collection(db, 'adminLogs');
    await addDoc(logsRef, logData);

    console.log('Admin action logged:', { action, adminEmail, timestamp: new Date() });
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw here as this is just logging
  }
}

/**
 * Fetch admin logs with optional filtering
 */
export async function fetchAdminLogs(options: {
  limitCount?: number;
  action?: AdminLogAction;
  targetUserId?: string;
  adminEmail?: string;
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<AdminLog[]> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const logsRef = collection(db, 'adminLogs');
    let q = query(logsRef, orderBy('timestamp', 'desc'));

    // Apply filters
    if (options.action) {
      q = query(q, where('action', '==', options.action));
    }
    
    if (options.targetUserId) {
      q = query(q, where('targetUserId', '==', options.targetUserId));
    }
    
    if (options.adminEmail) {
      q = query(q, where('adminEmail', '==', options.adminEmail));
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
    } as AdminLog));

  } catch (error) {
    console.error('Error fetching admin logs:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch admin logs');
  }
}

/**
 * Get recent admin activity summary
 */
export async function getRecentAdminActivity(days: number = 7): Promise<{
  totalActions: number;
  actionsByType: Record<AdminLogAction, number>;
  recentLogs: AdminLog[];
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await fetchAdminLogs({ 
      startDate,
      limitCount: 100 
    });

    const actionsByType: Record<AdminLogAction, number> = {
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
    };

    logs.forEach(log => {
      if (actionsByType.hasOwnProperty(log.action)) {
        actionsByType[log.action]++;
      }
    });

    return {
      totalActions: logs.length,
      actionsByType,
      recentLogs: logs.slice(0, 10), // Most recent 10 logs
    };

  } catch (error) {
    console.error('Error getting recent admin activity:', error);
    throw new Error('Failed to get recent admin activity');
  }
}

/**
 * Helper function to format log action for display
 */
export function formatLogAction(action: AdminLogAction): string {
  const actionMap: Record<AdminLogAction, string> = {
    user_upgraded_to_premium: 'User Upgraded to Premium',
    user_downgraded_to_free: 'User Downgraded to Free',
    user_suspended: 'User Suspended',
    user_unsuspended: 'User Unsuspended',
    user_deleted: 'User Deleted',
    mood_board_created: 'Mood Board Created',
    mood_board_updated: 'Mood Board Updated',
    mood_board_deleted: 'Mood Board Deleted',
    mood_board_published: 'Mood Board Published',
    mood_board_unpublished: 'Mood Board Unpublished',
    system_backup_created: 'System Backup Created',
    system_settings_updated: 'System Settings Updated',
    admin_login: 'Admin Login',
    admin_logout: 'Admin Logout',
  };

  return actionMap[action] || action;
}

/**
 * Helper function to get action severity/color
 */
export function getActionSeverity(action: AdminLogAction): 'info' | 'success' | 'warning' | 'error' {
  const severityMap: Record<AdminLogAction, 'info' | 'success' | 'warning' | 'error'> = {
    user_upgraded_to_premium: 'success',
    user_downgraded_to_free: 'warning',
    user_suspended: 'error',
    user_unsuspended: 'success',
    user_deleted: 'error',
    mood_board_created: 'success',
    mood_board_updated: 'info',
    mood_board_deleted: 'error',
    mood_board_published: 'success',
    mood_board_unpublished: 'warning',
    system_backup_created: 'success',
    system_settings_updated: 'info',
    admin_login: 'info',
    admin_logout: 'info',
  };

  return severityMap[action] || 'info';
}