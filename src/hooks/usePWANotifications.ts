import { useState, useEffect, useCallback, useRef } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
  vibrate?: number | number[];
  silent?: boolean;
  renotify?: boolean;
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
  timestamp?: number;
}

export function usePWANotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const scheduledNotifications = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const nextId = useRef(1);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      // Set initial permission state
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Notifications are not supported in this browser');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ): Promise<void> => {
    console.log('[usePWANotifications] showNotification called');
    console.log('- isSupported:', isSupported);
    console.log('- permission:', permission);
    console.log('- serviceWorker in navigator:', 'serviceWorker' in navigator);
    console.log('- navigator.serviceWorker?.controller:', navigator.serviceWorker?.controller);
    
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    if (permission !== 'granted') {
      throw new Error(`Notification permission not granted (current: ${permission})`);
    }

    try {
      // Check if we have a service worker to show the notification
      if ('serviceWorker' in navigator) {
        console.log('[usePWANotifications] Waiting for service worker...');
        const registration = await navigator.serviceWorker.ready;
        console.log('[usePWANotifications] Service worker ready, registration:', registration);
        console.log('[usePWANotifications] Showing notification via SW...');
        await registration.showNotification(title, options);
        console.log('[usePWANotifications] Notification shown successfully via SW');
      } else {
        // Fallback to regular Notification API
        console.log('[usePWANotifications] Using fallback Notification API');
        const notification = new Notification(title, options);
        
        // Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Handle notification error
        notification.onerror = (error) => {
          console.error('Notification error:', error);
        };
      }
    } catch (error) {
      console.error('[usePWANotifications] Error showing notification:', error);
      throw error;
    }
  }, [isSupported, permission]);

  const scheduleNotification = useCallback(async (
    title: string,
    options: NotificationOptions,
    delay: number
  ): Promise<number> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    const id = nextId.current++;
    
    const timeoutId = setTimeout(async () => {
      try {
        await showNotification(title, options);
        scheduledNotifications.current.delete(id);
      } catch (error) {
        console.error('Error showing scheduled notification:', error);
      }
    }, delay);

    scheduledNotifications.current.set(id, timeoutId);
    return id;
  }, [isSupported, permission, showNotification]);

  const cancelScheduledNotification = useCallback((id: number): void => {
    const timeoutId = scheduledNotifications.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      scheduledNotifications.current.delete(id);
    }
  }, []);

  const cancelAllScheduledNotifications = useCallback((): void => {
    scheduledNotifications.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    scheduledNotifications.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllScheduledNotifications();
    };
  }, [cancelAllScheduledNotifications]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    scheduleNotification,
    cancelScheduledNotification,
    cancelAllScheduledNotifications
  };
}