import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications';

export class NotificationService {
  private static instance: NotificationService | null = null;
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(userId: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {

      return;
    }

    this.userId = userId;

    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const app = getApps()[0];
      
      if (!app) {
        throw new Error('Firebase app not initialized');
      }

      this.messaging = getMessaging(app);

      // Listen for foreground messages
      onMessage(this.messaging, (payload) => {

        this.handleForegroundMessage(payload);
      });
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (!this.userId) {
        throw new Error('User not initialized');
      }

      // Check if browser supports notifications
      if (!('Notification' in window)) {

        // Still enable in-app notifications
        await this.enableInAppOnly();
        return true;
      }

      // Request browser permission for push notifications
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // User granted permission - register for push notifications
        try {
          await this.registerToken();
          return true;
        } catch (error) {
          console.error('Failed to register FCM token:', error);
          // Fall back to in-app only
          await this.enableInAppOnly();
          return true;
        }
      } else {
        // User denied or dismissed - enable in-app only
        await this.enableInAppOnly();
        return true;
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }

  private async enableInAppOnly(): Promise<void> {
    const prefsRef = doc(db, 'notificationPreferences', this.userId!);
    const prefsSnap = await getDoc(prefsRef);
    
    if (!prefsSnap.exists()) {
      // Create preferences without FCM token
      const newPrefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        userId: this.userId!,
        // Don't include fcmToken field for in-app only
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await setDoc(prefsRef, newPrefs);
    } else {
      // Enable notifications without FCM
      await updateDoc(prefsRef, {
        enabled: true,
        updatedAt: new Date(),
      });
    }
  }

  private async registerToken(): Promise<void> {
    if (!this.messaging || !this.userId) {
      throw new Error('Messaging not initialized');
    }

    try {
      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY || 'BDhl_OaRcbZ2pxcXeWxX_JrA7OVz4YduiOQWuw8uSJAfUaSU_ZR8UX7soK5wreNZZHJ9A2Sbo90DetC8-2ysIA'
      });

      if (token) {
        this.currentToken = token;

        // Save token to Firestore
        await this.saveTokenToFirestore(token);

        // Register with backend
        await this.registerTokenWithBackend(token);
      }
    } catch (error) {
      console.error('Token registration failed:', error);
      throw error;
    }
  }

  private async saveTokenToFirestore(token: string): Promise<void> {
    if (!this.userId) return;

    const prefsRef = doc(db, 'notificationPreferences', this.userId);
    
    try {
      // Check if preferences exist
      const prefsSnap = await getDoc(prefsRef);
      
      if (prefsSnap.exists()) {
        // Update existing preferences
        await updateDoc(prefsRef, {
          fcmToken: token,
          updatedAt: new Date(),
        });
      } else {
        // Create new preferences with defaults
        const newPrefs: NotificationPreferences = {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          userId: this.userId,
          fcmToken: token,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await setDoc(prefsRef, newPrefs);
      }
    } catch (error) {
      console.error('Failed to save token to Firestore:', error);
      throw error;
    }
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      // Get current user's ID token for authentication
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token with backend');
      }
    } catch (error) {
      console.error('Backend token registration failed:', error);
      // Don't throw - token is saved in Firestore
    }
  }

  async getPreferences(): Promise<NotificationPreferences | null> {
    if (!this.userId) return null;

    try {
      const prefsRef = doc(db, 'notificationPreferences', this.userId);
      const prefsSnap = await getDoc(prefsRef);
      
      if (prefsSnap.exists()) {
        return prefsSnap.data() as NotificationPreferences;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return null;
    }
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    if (!this.userId) {
      throw new Error('User not initialized');
    }

    try {
      const prefsRef = doc(db, 'notificationPreferences', this.userId);
      
      await updateDoc(prefsRef, {
        ...preferences,
        updatedAt: new Date(),
      });

      // Also update backend
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        
        await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(preferences),
        });
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  private handleForegroundMessage(payload: any): void {
    // Check if we should show an in-app notification
    const { notification, data } = payload;
    
    if (notification) {
      // Create in-app notification
      this.showInAppNotification({
        title: notification.title,
        body: notification.body,
        type: data?.type || 'info',
        action: data?.url,
      });
    }
  }

  private showInAppNotification(options: {
    title: string;
    body: string;
    type: string;
    action?: string;
  }): void {
    // This will be handled by the NotificationContext
    // Dispatch a custom event that the notification UI can listen to
    const event = new CustomEvent('app-notification', {
      detail: options,
    });
    
    window.dispatchEvent(event);
  }

  async testNotification(type: string = 'study_reminder'): Promise<void> {
    try {
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Test notification failed');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      throw error;
    }
  }

  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();