// Notification Types and Interfaces

export type NotificationType = 'study_reminder' | 'review_reminder' | 'streak_reminder' | 'announcement' | 'achievement';

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  fcmToken?: string;
  timezone: string; // IANA timezone (e.g., "Asia/Tokyo")
  preferences: {
    studyReminders: {
      enabled: boolean;
      times: string[]; // ["09:00", "19:00"]
      smartScheduling: boolean;
    };
    reviewReminders: {
      enabled: boolean;
      advanceNotice: number; // minutes before due
    };
    streakReminders: {
      enabled: boolean;
      time: string; // "20:00"
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "07:00"
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
  data?: Record<string, any>;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationLog {
  userId: string;
  notificationType: NotificationType;
  sentAt: Date;
  delivered: boolean;
  clicked: boolean;
  clickedAt?: Date;
  dismissedAt?: Date;
  payload: NotificationPayload;
  error?: string;
}

export interface NotificationToken {
  token: string;
  userId: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: Date;
  lastUsed: Date;
  active: boolean;
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'fcmToken' | 'createdAt' | 'updatedAt'> = {
  enabled: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  preferences: {
    studyReminders: {
      enabled: true,
      times: ['09:00', '19:00'],
      smartScheduling: false,
    },
    reviewReminders: {
      enabled: true,
      advanceNotice: 30, // 30 minutes
    },
    streakReminders: {
      enabled: true,
      time: '20:00',
    },
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
  },
};