/**
 * Notification Scheduler for Unified Review Engine
 * 
 * Manages intelligent review reminders across multiple channels:
 * - In-app notifications
 * - Push notifications 
 * - Email reminders (future)
 * - Smart timing based on user patterns
 */

import {
  ReviewProgress,
  NotificationChannelType,
  NotificationOptions,
  NotificationAction
} from '../types';
import { GoldenTimeCalculator } from './golden-time';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  /** Enabled notification channels */
  channels: NotificationChannelType[];
  
  /** Minimum time between notifications (minutes) */
  minInterval: number;
  
  /** Maximum notifications per day */
  maxDaily: number;
  
  /** Preferred notification times (24h format) */
  preferredTimes: number[];
  
  /** Enable smart timing based on user patterns */
  smartTiming: boolean;
  
  /** Quiet hours (no notifications) */
  quietHours: {
    start: number; // 24h format
    end: number;   // 24h format
  };
  
  /** Notification urgency thresholds */
  urgencyThresholds: {
    low: number;    // Hours overdue for low priority
    medium: number; // Hours overdue for medium priority  
    high: number;   // Hours overdue for high priority
  };
}

/**
 * Scheduled notification info
 */
export interface ScheduledNotification {
  /** Notification ID */
  id: string;
  
  /** User ID */
  userId: string;
  
  /** Scheduled time */
  scheduledTime: Date;
  
  /** Notification channel */
  channel: NotificationChannelType;
  
  /** Associated review items */
  items: ReviewProgress[];
  
  /** Notification content */
  content: NotificationOptions;
  
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
  
  /** Status */
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  
  /** Retry attempts */
  retryCount?: number;
  
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  /** Total notifications sent today */
  sentToday: number;
  
  /** Notifications by channel */
  byChannel: Record<NotificationChannelType, number>;
  
  /** Success rate */
  successRate: number;
  
  /** Average response time (how quickly user responds) */
  averageResponseTime: number;
  
  /** Most effective time */
  mostEffectiveTime: number;
}

/**
 * Default notification configuration
 */
const DEFAULT_CONFIG: NotificationConfig = {
  channels: ['in-app', 'push'],
  minInterval: 240, // 4 hours
  maxDaily: 3,
  preferredTimes: [9, 14, 19], // 9 AM, 2 PM, 7 PM
  smartTiming: true,
  quietHours: {
    start: 22, // 10 PM
    end: 7     // 7 AM
  },
  urgencyThresholds: {
    low: 24,  // 1 day overdue
    medium: 48, // 2 days overdue
    high: 72   // 3 days overdue
  }
};

/**
 * Notification Scheduler Implementation
 */
export class NotificationScheduler {
  private config: NotificationConfig;
  private goldenTimeCalculator: GoldenTimeCalculator;
  private scheduledNotifications = new Map<string, ScheduledNotification>();
  private notificationHistory: ScheduledNotification[] = [];

  constructor(
    config: Partial<NotificationConfig> = {},
    goldenTimeCalculator?: GoldenTimeCalculator
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.goldenTimeCalculator = goldenTimeCalculator || new GoldenTimeCalculator({
      preferredTimes: this.config.preferredTimes
    });
  }

  /**
   * Schedule notifications for due items
   */
  public async scheduleNotifications(
    userId: string,
    dueItems: ReviewProgress[],
    options: Partial<{
      immediate: boolean;
      channels: NotificationChannelType[];
      customTime: Date;
    }> = {}
  ): Promise<ScheduledNotification[]> {
    if (dueItems.length === 0) {
      return [];
    }

    const notifications: ScheduledNotification[] = [];

    // Check if we've hit daily limits
    const todayStats = await this.getTodayStats(userId);
    if (todayStats.sentToday >= this.config.maxDaily) {
      console.log('Daily notification limit reached');
      return [];
    }

    // Group items by urgency
    const urgencyGroups = this.groupItemsByUrgency(dueItems);
    
    // Schedule notifications for each urgency level
    for (const [priority, items] of Object.entries(urgencyGroups)) {
      if (items.length === 0) continue;
      
      const channels = options.channels || this.getChannelsForPriority(priority as any);
      
      for (const channel of channels) {
        const notification = await this.createNotification(
          userId,
          items,
          channel,
          priority as any,
          options.immediate,
          options.customTime
        );
        
        if (notification) {
          notifications.push(notification);
          this.scheduledNotifications.set(notification.id, notification);
        }
      }
    }

    return notifications;
  }

  /**
   * Get optimal notification time for user
   */
  public getOptimalNotificationTime(
    userId: string,
    items: ReviewProgress[],
    referenceTime: Date = new Date()
  ): Date {
    // Check golden time assessment
    const goldenTime = this.goldenTimeCalculator.assessCurrentTime(items);
    
    // If current time is good and not in quiet hours, use it
    if (goldenTime.isOptimal && !this.isQuietTime(referenceTime)) {
      return referenceTime;
    }

    // Find next optimal time
    const nextOptimal = goldenTime.nextOptimalTime;
    if (nextOptimal && !this.isQuietTime(nextOptimal)) {
      return nextOptimal;
    }

    // Fall back to next preferred time
    return this.getNextPreferredTime(referenceTime);
  }

  /**
   * Cancel scheduled notification
   */
  public async cancelNotification(notificationId: string): Promise<boolean> {
    const notification = this.scheduledNotifications.get(notificationId);
    if (!notification) {
      return false;
    }

    notification.status = 'cancelled';
    this.scheduledNotifications.delete(notificationId);
    
    // Add to history
    this.notificationHistory.push(notification);
    
    return true;
  }

  /**
   * Process scheduled notifications (call periodically)
   */
  public async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    const dueNotifications = Array.from(this.scheduledNotifications.values())
      .filter(n => n.scheduledTime <= now && n.status === 'scheduled');

    for (const notification of dueNotifications) {
      try {
        await this.sendNotification(notification);
        notification.status = 'sent';
        this.notificationHistory.push(notification);
        this.scheduledNotifications.delete(notification.id);
      } catch (error) {
        console.error('Failed to send notification:', error);
        notification.status = 'failed';
        notification.retryCount = (notification.retryCount || 0) + 1;
        
        // Retry up to 3 times with exponential backoff
        if (notification.retryCount < 3) {
          notification.scheduledTime = new Date(
            now.getTime() + Math.pow(2, notification.retryCount) * 60000
          );
          notification.status = 'scheduled';
        } else {
          // Max retries reached
          this.notificationHistory.push(notification);
          this.scheduledNotifications.delete(notification.id);
        }
      }
    }
  }

  /**
   * Get notification statistics for user
   */
  public async getNotificationStats(
    userId: string,
    days: number = 7
  ): Promise<NotificationStats> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentNotifications = this.notificationHistory.filter(n => 
      n.userId === userId && n.createdAt >= cutoffDate
    );

    const sentNotifications = recentNotifications.filter(n => n.status === 'sent');
    const todayNotifications = recentNotifications.filter(n => 
      this.isSameDay(n.createdAt, new Date())
    );

    // Calculate success rate
    const totalAttempts = recentNotifications.length;
    const successRate = totalAttempts > 0 ? (sentNotifications.length / totalAttempts) * 100 : 0;

    // Group by channel
    const byChannel: Record<NotificationChannelType, number> = {
      'in-app': 0,
      'push': 0,
      'email': 0,
      'sms': 0
    };

    for (const notification of sentNotifications) {
      byChannel[notification.channel]++;
    }

    // Find most effective time (placeholder - would need user response data)
    const mostEffectiveTime = this.config.preferredTimes[0];

    return {
      sentToday: todayNotifications.filter(n => n.status === 'sent').length,
      byChannel,
      successRate,
      averageResponseTime: 0, // Would calculate from user response data
      mostEffectiveTime
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create a notification for items
   */
  private async createNotification(
    userId: string,
    items: ReviewProgress[],
    channel: NotificationChannelType,
    priority: 'low' | 'medium' | 'high',
    immediate: boolean = false,
    customTime?: Date
  ): Promise<ScheduledNotification | null> {
    // Check if we've sent a notification recently
    const lastNotification = this.getLastNotificationTime(userId, channel);
    if (lastNotification && !immediate) {
      const minutesSince = (Date.now() - lastNotification.getTime()) / (1000 * 60);
      if (minutesSince < this.config.minInterval) {
        return null; // Too soon
      }
    }

    // Determine scheduled time
    let scheduledTime: Date;
    if (immediate) {
      scheduledTime = new Date();
    } else if (customTime) {
      scheduledTime = customTime;
    } else {
      scheduledTime = this.getOptimalNotificationTime(userId, items);
    }

    // Create notification content
    const content = this.createNotificationContent(items, priority);

    const notification: ScheduledNotification = {
      id: this.generateNotificationId(),
      userId,
      scheduledTime,
      channel,
      items,
      content,
      priority,
      status: 'scheduled',
      createdAt: new Date()
    };

    return notification;
  }

  /**
   * Create notification content based on items and priority
   */
  private createNotificationContent(
    items: ReviewProgress[],
    priority: 'low' | 'medium' | 'high'
  ): NotificationOptions {
    const itemCount = items.length;
    const overdueCount = items.filter(item => 
      item.nextReview < new Date()
    ).length;

    let title: string;
    let message: string;

    if (priority === 'high') {
      title = '🔥 Urgent Review Needed!';
      message = overdueCount > 0 
        ? `You have ${overdueCount} overdue items and ${itemCount - overdueCount} items due for review`
        : `${itemCount} items are ready for review`;
    } else if (priority === 'medium') {
      title = '📚 Time for Review';
      message = itemCount === 1 
        ? 'You have 1 item ready for review'
        : `You have ${itemCount} items ready for review`;
    } else {
      title = '✨ Review Available';
      message = `${itemCount} items are coming up for review soon`;
    }

    const actions: NotificationAction[] = [
      {
        action: 'review',
        title: 'Start Review',
        icon: '▶️'
      },
      {
        action: 'snooze',
        title: 'Remind Later',
        icon: '⏰'
      }
    ];

    return {
      title,
      message,
      actions,
      priority: priority === 'high' ? 'high' : 'normal'
    };
  }

  /**
   * Group items by urgency level
   */
  private groupItemsByUrgency(items: ReviewProgress[]): Record<'low' | 'medium' | 'high', ReviewProgress[]> {
    const now = new Date();
    const groups: Record<'low' | 'medium' | 'high', ReviewProgress[]> = {
      low: [],
      medium: [],
      high: []
    };

    for (const item of items) {
      const hoursOverdue = (now.getTime() - item.nextReview.getTime()) / (1000 * 60 * 60);
      
      if (hoursOverdue >= this.config.urgencyThresholds.high) {
        groups.high.push(item);
      } else if (hoursOverdue >= this.config.urgencyThresholds.medium) {
        groups.medium.push(item);
      } else if (hoursOverdue >= this.config.urgencyThresholds.low) {
        groups.low.push(item);
      }
    }

    return groups;
  }

  /**
   * Get notification channels for priority level
   */
  private getChannelsForPriority(priority: 'low' | 'medium' | 'high'): NotificationChannelType[] {
    if (priority === 'high') {
      return this.config.channels; // All channels for high priority
    } else if (priority === 'medium') {
      return this.config.channels.filter(c => c !== 'email'); // Skip email for medium
    } else {
      return ['in-app']; // Only in-app for low priority
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietTime(time: Date): boolean {
    const hour = time.getHours();
    const { start, end } = this.config.quietHours;
    
    if (start < end) {
      return hour >= start && hour < end;
    } else {
      // Quiet hours span midnight
      return hour >= start || hour < end;
    }
  }

  /**
   * Get next preferred notification time
   */
  private getNextPreferredTime(from: Date): Date {
    const currentHour = from.getHours();
    
    // Find next preferred time today
    for (const hour of this.config.preferredTimes.sort((a, b) => a - b)) {
      if (hour > currentHour && !this.isQuietTime(new Date(from.getTime()).setHours(hour, 0, 0, 0) as any)) {
        const nextTime = new Date(from);
        nextTime.setHours(hour, 0, 0, 0);
        return nextTime;
      }
    }
    
    // No suitable time today, try tomorrow
    const tomorrow = new Date(from);
    tomorrow.setDate(from.getDate() + 1);
    tomorrow.setHours(this.config.preferredTimes[0], 0, 0, 0);
    
    return tomorrow;
  }

  /**
   * Send notification through appropriate channel
   */
  private async sendNotification(notification: ScheduledNotification): Promise<void> {
    // This would integrate with actual notification services
    // For now, it's a placeholder
    
    console.log(`Sending ${notification.channel} notification:`, {
      id: notification.id,
      title: notification.content.title,
      message: notification.content.message,
      items: notification.items.length
    });
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, this would:
    // 1. Send push notifications via Firebase/OneSignal
    // 2. Send in-app notifications via WebSocket/EventSource
    // 3. Send emails via SendGrid/Mailgun
    // 4. Handle delivery confirmations and failures
  }

  /**
   * Get last notification time for user and channel
   */
  private getLastNotificationTime(userId: string, channel: NotificationChannelType): Date | null {
    const userNotifications = this.notificationHistory
      .filter(n => n.userId === userId && n.channel === channel && n.status === 'sent')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return userNotifications[0]?.createdAt || null;
  }

  /**
   * Get today's notification statistics
   */
  private async getTodayStats(userId: string): Promise<{ sentToday: number }> {
    const today = new Date();
    const todayNotifications = this.notificationHistory.filter(n => 
      n.userId === userId && 
      n.status === 'sent' && 
      this.isSameDay(n.createdAt, today)
    );

    return { sentToday: todayNotifications.length };
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update notification configuration
   */
  public updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.preferredTimes) {
      this.goldenTimeCalculator.updateConfig({
        preferredTimes: config.preferredTimes
      });
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Clear old notification history
   */
  public clearOldHistory(days: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const initialLength = this.notificationHistory.length;
    this.notificationHistory = this.notificationHistory.filter(n => 
      n.createdAt >= cutoffDate
    );
    
    return initialLength - this.notificationHistory.length;
  }
}