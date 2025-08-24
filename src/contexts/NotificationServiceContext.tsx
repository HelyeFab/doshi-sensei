'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notifications/NotificationService';
import { NotificationPreferences } from '@/types/notifications';
import { useToast } from '@/contexts/ToastContext';

interface NotificationContextType {
  isInitialized: boolean;
  permissionStatus: NotificationPermission;
  preferences: NotificationPreferences | null;
  requestPermission: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  testNotification: (type?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationServiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Initialize notification service when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      initializeService();
    } else {
      setIsInitialized(false);
      setPreferences(null);
      setPermissionStatus('default');
    }
  }, [user?.uid]);

  const initializeService = async () => {
    try {
      await notificationService.initialize(user!.uid);
      
      // Load user preferences
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
      
      // Check actual browser permission status
      const browserPermission = notificationService.getPermissionStatus();
      setPermissionStatus(browserPermission);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  };

  // Listen for in-app notifications
  useEffect(() => {
    const handleInAppNotification = (event: CustomEvent) => {
      const { title, body, type, action } = event.detail;
      
      // Show in-app notification
      toast[type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success'](
        title,
        body
      );
    };

    window.addEventListener('app-notification', handleInAppNotification as EventListener);
    return () => {
      window.removeEventListener('app-notification', handleInAppNotification as EventListener);
    };
  }, [toast]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {

      return false;
    }

    try {
      const granted = await notificationService.requestPermission();
      
      if (granted) {
        // Reload preferences
        const prefs = await notificationService.getPreferences();
        setPreferences(prefs);
        
        // Update permission status
        const browserPermission = notificationService.getPermissionStatus();
        setPermissionStatus(browserPermission);
        
        // Show appropriate message based on permission type
        if (browserPermission === 'granted') {
          toast.success(
            'Push notifications enabled! 🔔',
            'You will receive notifications even when the app is closed.'
          );
        } else {
          toast.success(
            'In-app notifications enabled! 🔔',
            'You will receive notifications while using the app.'
          );
        }
      } else {
        toast.error('Failed to enable notifications');
      }
      
      return granted;
    } catch (error) {
      console.error('Permission request failed:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }, [isInitialized, toast]);

  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    if (!isInitialized) {
      throw new Error('Notification service not initialized');
    }

    try {
      await notificationService.updatePreferences(prefs);
      
      // Update local state
      setPreferences(prev => prev ? { ...prev, ...prefs } : null);
      
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
      throw error;
    }
  }, [isInitialized, toast]);

  const testNotification = useCallback(async (type: string = 'study_reminder') => {
    if (!isInitialized) {
      toast.error('Notification service not initialized');
      return;
    }

    if (permissionStatus !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }

    try {
      await notificationService.testNotification(type);
      toast.success(
        'Test notification sent!',
        'Check your notifications.'
      );
    } catch (error: any) {
      console.error('Test notification failed:', error);
      toast.error(error.message || 'Failed to send test notification');
    }
  }, [isInitialized, permissionStatus, toast]);

  const value: NotificationContextType = {
    isInitialized,
    permissionStatus,
    preferences,
    requestPermission,
    updatePreferences,
    testNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationServiceProvider');
  }
  return context;
}