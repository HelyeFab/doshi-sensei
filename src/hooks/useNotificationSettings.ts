// Hook to integrate PWA notifications with existing settings UI
// Bridges the gap between our spaced repetition service and the settings page

import { useState, useEffect, useCallback } from 'react';
import { spacedRepetitionNotifications } from '@/services/notifications/spacedRepetitionNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface NotificationSettings {
  studyReminders: boolean;
  reviewReminders: boolean; // This will trigger our PWA notifications
  streakReminders: boolean;
  reminderTimes: string[];
  pushEnabled: boolean; // PWA push notification status
  browserPermission: NotificationPermission;
}

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    studyReminders: false,
    reviewReminders: false,
    streakReminders: false,
    reminderTimes: ['08:00', '12:00', '19:00'],
    pushEnabled: false,
    browserPermission: 'default'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [user?.uid]);

  const loadSettings = async () => {
    setIsLoading(true);
    
    try {
      // Get PWA notification status
      const pwaStatus = spacedRepetitionNotifications.getStatus();
      
      // Get user settings from Firebase
      if (user?.uid) {
        const settingsDoc = await getDoc(
          doc(db, 'users', user.uid, 'settings', 'notifications')
        );
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            studyReminders: data.studyReminders || false,
            reviewReminders: data.reviewReminders || false,
            streakReminders: data.streakReminders || false,
            reminderTimes: data.reminderTimes || ['08:00', '12:00', '19:00'],
            pushEnabled: pwaStatus.enabled,
            browserPermission: pwaStatus.permission
          });
        } else {
          // Set default with PWA status
          setSettings(prev => ({
            ...prev,
            pushEnabled: pwaStatus.enabled,
            browserPermission: pwaStatus.permission
          }));
        }
      } else {
        // Guest user - check local storage
        const localSettings = localStorage.getItem('notification-settings');
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          setSettings({
            ...parsed,
            pushEnabled: pwaStatus.enabled,
            browserPermission: pwaStatus.permission
          });
        } else {
          setSettings(prev => ({
            ...prev,
            pushEnabled: pwaStatus.enabled,
            browserPermission: pwaStatus.permission
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle study reminders
  const toggleStudyReminders = useCallback(async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, studyReminders: enabled }));
    await saveSettings({ ...settings, studyReminders: enabled });
  }, [settings]);

  // Toggle review reminders (this enables PWA notifications)
  const toggleReviewReminders = useCallback(async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, reviewReminders: enabled }));
    
    // If enabling, request PWA notification permission
    if (enabled && settings.browserPermission !== 'granted') {
      try {
        const permission = await spacedRepetitionNotifications.requestPermission();
        
        if (permission === 'granted') {
          // Save preferences to PWA service
          await spacedRepetitionNotifications.savePreferences({
            enabled: true,
            times: settings.reminderTimes,
            minInterval: 4,
            maxPerDay: 5
          });
          
          setSettings(prev => ({
            ...prev,
            reviewReminders: true,
            pushEnabled: true,
            browserPermission: 'granted'
          }));
        } else {
          // Permission denied, keep toggle off
          setSettings(prev => ({
            ...prev,
            reviewReminders: false,
            browserPermission: permission
          }));
          
          // Show user message about needing permission
          return false;
        }
      } catch (error) {
        console.error('Failed to enable review reminders:', error);
        return false;
      }
    } else if (!enabled) {
      // Disable PWA notifications
      await spacedRepetitionNotifications.savePreferences({
        enabled: false,
        times: settings.reminderTimes,
        minInterval: 4,
        maxPerDay: 5
      });
      
      setSettings(prev => ({
        ...prev,
        reviewReminders: false,
        pushEnabled: false
      }));
    }
    
    await saveSettings({ ...settings, reviewReminders: enabled });
    return true;
  }, [settings]);

  // Toggle streak reminders
  const toggleStreakReminders = useCallback(async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, streakReminders: enabled }));
    await saveSettings({ ...settings, streakReminders: enabled });
  }, [settings]);

  // Update reminder times
  const updateReminderTimes = useCallback(async (times: string[]) => {
    setSettings(prev => ({ ...prev, reminderTimes: times }));
    
    // Update PWA notification times if review reminders are enabled
    if (settings.reviewReminders) {
      await spacedRepetitionNotifications.savePreferences({
        enabled: true,
        times: times,
        minInterval: 4,
        maxPerDay: 5
      });
    }
    
    await saveSettings({ ...settings, reminderTimes: times });
  }, [settings]);

  // Save settings to Firebase/localStorage
  const saveSettings = async (newSettings: NotificationSettings) => {
    setIsSaving(true);
    
    try {
      if (user?.uid) {
        // Save to Firebase
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'notifications'),
          {
            studyReminders: newSettings.studyReminders,
            reviewReminders: newSettings.reviewReminders,
            streakReminders: newSettings.streakReminders,
            reminderTimes: newSettings.reminderTimes,
            updatedAt: new Date().toISOString()
          }
        );
      } else {
        // Save to localStorage for guests
        localStorage.setItem('notification-settings', JSON.stringify({
          studyReminders: newSettings.studyReminders,
          reviewReminders: newSettings.reviewReminders,
          streakReminders: newSettings.streakReminders,
          reminderTimes: newSettings.reminderTimes
        }));
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (settings.browserPermission !== 'granted') {
      throw new Error('Notifications not enabled. Please enable Review Reminders first.');
    }
    
    await spacedRepetitionNotifications.sendTestNotification();
  }, [settings.browserPermission]);

  // Check if browser supports notifications
  const isSupported = useCallback(() => {
    return spacedRepetitionNotifications.getStatus().supported;
  }, []);

  // Re-request permission if previously denied
  const requestPermissionAgain = useCallback(async () => {
    if (settings.browserPermission === 'denied') {
      // Can't re-request if denied, user must change in browser settings
      throw new Error('Notifications are blocked. Please enable them in your browser settings.');
    }
    
    try {
      const permission = await spacedRepetitionNotifications.requestPermission();
      setSettings(prev => ({ ...prev, browserPermission: permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }, [settings.browserPermission]);

  return {
    settings,
    isLoading,
    isSaving,
    toggleStudyReminders,
    toggleReviewReminders,
    toggleStreakReminders,
    updateReminderTimes,
    sendTestNotification,
    isSupported,
    requestPermissionAgain,
    // Computed values
    canEnableNotifications: settings.browserPermission !== 'denied',
    needsPermission: settings.browserPermission === 'default',
    notificationsBlocked: settings.browserPermission === 'denied'
  };
}