// Spaced Repetition Push Notifications Service
// Implements FSRS-based notifications for vocabulary review

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface NotificationSchedule {
  wordId: string;
  lessonId: string;
  nextReview: Date;
  interval: number;
  ease: number;
  notificationId?: string;
}

interface NotificationPreferences {
  enabled: boolean;
  times: string[]; // Preferred notification times (e.g., ["09:00", "18:00"])
  minInterval: number; // Minimum hours between notifications
  maxPerDay: number;
}

class SpacedRepetitionNotificationService {
  private readonly STORAGE_KEY = 'sr-notification-prefs';
  private isSupported = false;
  private permission: NotificationPermission = 'default';
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.checkSupport();
  }

  private async checkSupport(): Promise<void> {
    this.isSupported = 
      'Notification' in window && 
      'serviceWorker' in navigator &&
      'PushManager' in window;
    
    if (this.isSupported) {
      this.permission = Notification.permission;
      
      // Get service worker registration
      try {
        this.registration = await navigator.serviceWorker.ready;
      } catch (error) {
        console.error('Failed to get service worker registration:', error);
      }
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    if (this.permission === 'denied') {
      throw new Error('Notifications are blocked. Please enable them in browser settings.');
    }

    // Request permission
    this.permission = await Notification.requestPermission();
    
    if (this.permission === 'granted') {
      // Subscribe to push notifications
      await this.subscribeToPush();
    }
    
    return this.permission;
  }

  // Subscribe to push notifications
  private async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe with VAPID public key (you'll need to generate this)
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.warn('VAPID public key not configured');
          return null;
        }
        
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });
        
        // Save subscription to backend
        await this.saveSubscription(subscription);
      }
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // Convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  // Save subscription to backend
  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    // This would save to your backend
    // For now, we'll save to Firebase
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(
      doc(db, 'users', userId, 'pushSubscriptions', 'default'),
      subscriptionData
    );
  }

  // Schedule notification for a word
  async scheduleNotification(
    wordId: string,
    lessonId: string,
    fsrsData: { interval: number; ease: number }
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    // Calculate next review time (1 day after learning)
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 1); // Start with 1 day
    
    const schedule: NotificationSchedule = {
      wordId,
      lessonId,
      nextReview,
      interval: fsrsData.interval || 1,
      ease: fsrsData.ease || 2.5
    };
    
    // Save schedule to Firebase
    await setDoc(
      doc(db, 'users', userId, 'notificationSchedules', wordId),
      {
        ...schedule,
        nextReview: schedule.nextReview.toISOString()
      }
    );
    
    // Schedule local notification (for immediate notifications)
    await this.scheduleLocalNotification(schedule);
  }

  // Schedule local notification
  private async scheduleLocalNotification(schedule: NotificationSchedule): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }
    
    const now = Date.now();
    const reviewTime = schedule.nextReview.getTime();
    const delay = reviewTime - now;
    
    if (delay <= 0) {
      // Review time has passed, show immediately
      await this.showNotification(schedule);
    } else if (delay < 24 * 60 * 60 * 1000) {
      // Less than 24 hours, use setTimeout
      setTimeout(() => {
        this.showNotification(schedule);
      }, delay);
    }
    // For longer delays, rely on periodic sync or backend scheduling
  }

  // Show notification
  private async showNotification(schedule: NotificationSchedule): Promise<void> {
    if (!this.registration) return;
    
    const title = 'Time to Review!';
    const options: NotificationOptions = {
      body: `Review your vocabulary from lesson ${schedule.lessonId}`,
      icon: '/doshi.png',
      badge: '/favicon-96x96.png',
      tag: `review-${schedule.wordId}`,
      requireInteraction: true,
      actions: [
        {
          action: 'review',
          title: 'Review Now'
        },
        {
          action: 'snooze',
          title: 'Snooze 1 hour'
        }
      ],
      data: {
        wordId: schedule.wordId,
        lessonId: schedule.lessonId
      }
    };
    
    await this.registration.showNotification(title, options);
  }

  // Check and send due notifications
  async checkDueNotifications(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    // Query schedules where nextReview <= now
    const schedulesRef = collection(db, 'users', userId, 'notificationSchedules');
    const q = query(
      schedulesRef,
      where('nextReview', '<=', new Date().toISOString())
    );
    
    const snapshot = await getDocs(q);
    const schedules: NotificationSchedule[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      schedules.push({
        wordId: data.wordId,
        lessonId: data.lessonId,
        nextReview: new Date(data.nextReview),
        interval: data.interval,
        ease: data.ease
      });
    });
    
    // Show notifications for due reviews
    for (const schedule of schedules) {
      await this.showNotification(schedule);
      
      // Update next review time using FSRS
      await this.updateNextReview(schedule);
    }
  }

  // Update next review time after notification
  private async updateNextReview(schedule: NotificationSchedule): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    // Simple FSRS calculation (would use the Web Worker in production)
    const newInterval = schedule.interval * schedule.ease;
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.round(newInterval));
    
    // Update schedule
    await setDoc(
      doc(db, 'users', userId, 'notificationSchedules', schedule.wordId),
      {
        ...schedule,
        interval: newInterval,
        nextReview: nextReview.toISOString()
      },
      { merge: true }
    );
  }

  // Get user preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Default preferences
    return {
      enabled: false,
      times: ['09:00', '18:00'],
      minInterval: 4,
      maxPerDay: 5
    };
  }

  // Save user preferences
  async savePreferences(prefs: NotificationPreferences): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    
    // Save to Firebase as well
    const userId = this.getCurrentUserId();
    if (userId) {
      await setDoc(
        doc(db, 'users', userId, 'preferences', 'notifications'),
        prefs
      );
    }
    
    // Enable/disable notifications based on preference
    if (prefs.enabled && this.permission !== 'granted') {
      await this.requestPermission();
    }
  }

  // Get notification status
  getStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    enabled: boolean;
  } {
    const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: prefs.enabled || false
    };
  }

  // Helper to get current user ID
  private getCurrentUserId(): string | null {
    // This would get from your auth context
    // For now, returning null
    return null;
  }

  // Test notification (for settings page)
  async sendTestNotification(): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      throw new Error('Notifications not enabled');
    }
    
    await this.showNotification({
      wordId: 'test',
      lessonId: 'test',
      nextReview: new Date(),
      interval: 1,
      ease: 2.5
    });
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<void> {
    if (!this.registration) return;
    
    const subscription = await this.registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from backend
      const userId = this.getCurrentUserId();
      if (userId) {
        // Delete subscription from Firebase
        await setDoc(
          doc(db, 'users', userId, 'pushSubscriptions', 'default'),
          { deleted: true, deletedAt: new Date().toISOString() }
        );
      }
    }
  }
}

// Export singleton instance
export const spacedRepetitionNotifications = new SpacedRepetitionNotificationService();

// Export convenience functions
export async function enableSpacedRepetitionNotifications(): Promise<void> {
  const permission = await spacedRepetitionNotifications.requestPermission();
  
  if (permission === 'granted') {
    await spacedRepetitionNotifications.savePreferences({
      enabled: true,
      times: ['09:00', '18:00'],
      minInterval: 4,
      maxPerDay: 5
    });
  }
}

export async function scheduleWordReview(
  wordId: string,
  lessonId: string,
  fsrsData: { interval: number; ease: number }
): Promise<void> {
  return spacedRepetitionNotifications.scheduleNotification(wordId, lessonId, fsrsData);
}

export function getNotificationStatus() {
  return spacedRepetitionNotifications.getStatus();
}