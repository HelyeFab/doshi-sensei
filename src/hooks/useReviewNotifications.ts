'use client';

import { useState, useEffect } from 'react';
import { NotificationChannelType, NotificationOptions } from '@/lib/unified-review';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';

interface NotificationPreferences {
  enabled: boolean;
  channels: {
    'in-app': boolean;
    'push': boolean;
    'email': boolean;
  };
  reminderTimes: string[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  reviewThreshold: number;
  advanceNotice: number;
}

interface UseReviewNotificationsReturn {
  /**
   * Current notification preferences
   */
  preferences: NotificationPreferences | null;
  
  /**
   * Update notification preferences
   */
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
  
  /**
   * Send a test notification
   */
  testNotification: (options: NotificationOptions) => Promise<void>;
  
  /**
   * Request permissions for a specific channel
   */
  requestPermissions: (channel: NotificationChannelType) => Promise<boolean>;
  
  /**
   * Check if we have permissions for a channel
   */
  checkPermissions: (channel: NotificationChannelType) => Promise<boolean>;
  
  /**
   * Schedule review reminders
   */
  scheduleReminders: () => Promise<void>;
  
  /**
   * Cancel scheduled reminders
   */
  cancelReminders: () => Promise<void>;
  
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error state
   */
  error: string | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  channels: {
    'in-app': true,
    'push': false,
    'email': false
  },
  reminderTimes: ['09:00', '18:00'],
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00'
  },
  reviewThreshold: 5,
  advanceNotice: 1
};

const STORAGE_KEY = 'doshi_notification_preferences';

/**
 * Custom hook for managing review notification preferences and functionality
 * 
 * This hook handles:
 * - Notification preferences persistence
 * - Permission management for different channels
 * - Test notification functionality
 * - Integration with browser notification APIs
 * - Reminder scheduling
 */
export function useReviewNotifications(): UseReviewNotificationsReturn {
  const { user } = useAuth();
  const { checkAndTrack } = useFeature('review_notifications');
  
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from storage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences(parsed);
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update preferences
  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    // Check access before updating
    const hasAccess = await checkAndTrack();
    if (!hasAccess) {
      throw new Error('Access denied for notification settings');
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
      
      // If enabled, schedule reminders
      if (newPreferences.enabled) {
        await scheduleReminders();
      } else {
        await cancelReminders();
      }
      
      setError(null);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to update preferences');
      throw error;
    }
  };

  // Request permissions for a specific channel
  const requestPermissions = async (channel: NotificationChannelType): Promise<boolean> => {
    try {
      switch (channel) {
        case 'push':
          if (!('Notification' in window)) {
            throw new Error('Push notifications not supported');
          }
          
          const permission = await Notification.requestPermission();
          return permission === 'granted';
          
        case 'in-app':
          return true; // No permission needed
          
        case 'email':
          // Email notifications would be handled server-side
          return user ? true : false;
          
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to request ${channel} permissions:`, error);
      return false;
    }
  };

  // Check permissions for a channel
  const checkPermissions = async (channel: NotificationChannelType): Promise<boolean> => {
    try {
      switch (channel) {
        case 'push':
          if (!('Notification' in window)) {
            return false;
          }
          return Notification.permission === 'granted';
          
        case 'in-app':
          return true;
          
        case 'email':
          return user ? true : false;
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to check ${channel} permissions:`, error);
      return false;
    }
  };

  // Send a test notification
  const testNotification = async (options: NotificationOptions) => {
    if (!preferences?.enabled) {
      throw new Error('Notifications are disabled');
    }

    try {
      // Try different channels based on preferences
      if (preferences.channels['push'] && await checkPermissions('push')) {
        // Send push notification
        const notification = new Notification(options.title, {
          body: options.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/monochrome-96x96.png',
          tag: 'test-notification',
          requireInteraction: false,
          timestamp: Date.now()
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } else if (preferences.channels['in-app']) {
        // Show in-app notification (could integrate with toast system)
        console.log('In-app notification:', options);
        
        // You could integrate this with your toast system
        // showToast({ 
        //   title: options.title, 
        //   message: options.message,
        //   type: 'info'
        // });
      }
      
      setError(null);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to send notification');
      throw error;
    }
  };

  // Schedule review reminders (simplified implementation)
  const scheduleReminders = async () => {
    if (!preferences?.enabled || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      // This would typically involve registering with a service worker
      // For now, we'll just log the scheduling
      console.log('Scheduling reminders for times:', preferences.reminderTimes);
      
      // In a full implementation, you would:
      // 1. Register service worker
      // 2. Send reminder schedule to service worker
      // 3. Service worker would handle showing notifications at scheduled times
      // 4. Integrate with backend for server-side scheduling
      
      setError(null);
    } catch (error) {
      console.error('Failed to schedule reminders:', error);
      setError(error instanceof Error ? error.message : 'Failed to schedule reminders');
    }
  };

  // Cancel scheduled reminders
  const cancelReminders = async () => {
    try {
      console.log('Cancelling scheduled reminders');
      
      // In a full implementation, you would:
      // 1. Clear service worker scheduled notifications
      // 2. Cancel server-side scheduled notifications
      
      setError(null);
    } catch (error) {
      console.error('Failed to cancel reminders:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel reminders');
    }
  };

  return {
    preferences,
    updatePreferences,
    testNotification,
    requestPermissions,
    checkPermissions,
    scheduleReminders,
    cancelReminders,
    isLoading,
    error
  };
}