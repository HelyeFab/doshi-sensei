/**
 * Review Notification Aggregator
 * 
 * Aggregates due items from all review sources and sends unified notifications
 * for the Unified Review Hub. This replaces individual source notifications
 * with a single aggregated notification system.
 * 
 * Features:
 * - Aggregates due items from all registered review sources
 * - Sends combined notifications instead of individual ones
 * - Supports golden time notifications with Red Panda mascot integration
 * - Respects user notification preferences
 * - Schedules notifications at optimal times
 * - Integrates with existing NotificationService
 */

import { ReviewSourceRegistry } from '@/lib/review-sources/registry';
import { ReviewSource, AggregatedStats } from '@/lib/review-sources/review-source.interface';
import { NotificationService } from './NotificationService';
import { NotificationPreferences, NotificationPayload } from '@/types/notifications';
import { TIME_CONSTANTS } from '@/lib/review-sources/constants';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface DueItemsSummary {
  totalDue: number;
  overdue: number;
  bySource: Record<string, {
    name: string;
    due: number;
    icon: string;
  }>;
  nextReviewTime?: Date;
  highPriorityCount: number;
}

export interface GoldenTimeInfo {
  isActive: boolean;
  type?: 'morning' | 'evening';
  endsAt?: Date;
  nextWindow?: {
    type: 'morning' | 'evening';
    startsAt: Date;
    duration: number;
  };
  bonusMultiplier?: number;
}

export interface NotificationSchedule {
  userId: string;
  nextCheck: Date;
  preferredTimes: string[];
  goldenTimeEnabled: boolean;
  dailyReminderEnabled: boolean;
  lastNotificationSent?: Date;
  timezone: string;
}

// ============================================================================
// Review Notification Aggregator Class
// ============================================================================

export class ReviewNotificationAggregator {
  private static instance: ReviewNotificationAggregator | null = null;
  private registry: ReviewSourceRegistry | null = null;
  private notificationService: NotificationService | null = null;
  private scheduledChecks: Map<string, NodeJS.Timeout> = new Map();
  private lastAggregation: Map<string, DueItemsSummary> = new Map();
  
  private constructor() {}

  static getInstance(): ReviewNotificationAggregator {
    if (!ReviewNotificationAggregator.instance) {
      ReviewNotificationAggregator.instance = new ReviewNotificationAggregator();
    }
    return ReviewNotificationAggregator.instance;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the aggregator with registry and notification service
   */
  async initialize(
    registry: ReviewSourceRegistry,
    notificationService: NotificationService
  ): Promise<void> {
    this.registry = registry;
    this.notificationService = notificationService;

    // Set up event listeners for registry changes
    registry.addEventListener('ITEMS_UPDATED', () => {
      this.handleRegistryUpdate();
    });

    registry.addEventListener('STATS_UPDATED', () => {
      this.handleRegistryUpdate();
    });

    registry.addEventListener('CONFIG_CHANGED', () => {
      this.handleRegistryUpdate();
    });
  }

  /**
   * Handle registry updates by checking if notifications need to be sent
   */
  private async handleRegistryUpdate(): Promise<void> {
    // Debounce updates to avoid spam
    setTimeout(() => {
      this.checkAndSendNotifications();
    }, 1000);
  }

  // ============================================================================
  // Main Notification Methods
  // ============================================================================

  /**
   * Check all sources and send aggregated notifications if needed
   */
  async checkAndSendNotifications(userId?: string): Promise<void> {
    if (!this.registry || !this.notificationService) {
      console.warn('ReviewNotificationAggregator not initialized');
      return;
    }

    try {
      // Get user ID from notification service if not provided
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) {
        return;
      }

      // Get user notification preferences
      const preferences = await this.notificationService.getPreferences();
      if (!preferences?.enabled) {
        return;
      }

      // Check if we're in quiet hours
      if (this.isInQuietHours(preferences)) {
        return;
      }

      // Aggregate due items from all sources
      const dueItemsSummary = await this.aggregateDueItems();
      
      // Check if we should send a notification
      if (!this.shouldSendNotification(dueItemsSummary, preferences, targetUserId)) {
        return;
      }

      // Get golden time information
      const goldenTimeInfo = this.calculateGoldenTimeInfo();

      // Build and send notification
      await this.sendAggregatedNotification(
        dueItemsSummary,
        goldenTimeInfo,
        preferences,
        targetUserId
      );

      // Update last notification tracking
      this.lastAggregation.set(targetUserId, dueItemsSummary);

    } catch (error) {
      console.error('Failed to check and send notifications:', error);
    }
  }

  /**
   * Aggregate due items from all registered sources
   */
  async aggregateDueItems(): Promise<DueItemsSummary> {
    if (!this.registry) {
      throw new Error('Registry not initialized');
    }

    const stats = await this.registry.getAggregatedStats();
    const sources = this.registry.getPrioritizedSources();
    
    const summary: DueItemsSummary = {
      totalDue: stats.totals.dueToday,
      overdue: stats.totals.overdue,
      bySource: {},
      highPriorityCount: 0,
      nextReviewTime: stats.insights?.nextReviewEstimate
    };

    // Aggregate by source
    for (const source of sources) {
      const sourceStats = stats.bySource[source.id];
      if (sourceStats && sourceStats.dueToday > 0) {
        summary.bySource[source.id] = {
          name: source.name,
          due: sourceStats.dueToday,
          icon: source.icon
        };

        // Count high priority items (simplified calculation)
        if (sourceStats.dueToday >= 10) {
          summary.highPriorityCount += Math.ceil(sourceStats.dueToday * 0.3);
        }
      }
    }

    return summary;
  }

  /**
   * Build a user-friendly notification message from aggregated data
   */
  buildNotificationMessage(
    summary: DueItemsSummary, 
    goldenTimeInfo: GoldenTimeInfo
  ): { title: string; body: string } {
    // Build title
    let title = `📚 ${summary.totalDue} Item${summary.totalDue !== 1 ? 's' : ''} Ready for Review!`;
    
    if (goldenTimeInfo.isActive) {
      title = `🌅 Golden Time! ${summary.totalDue} Items Ready!`;
    } else if (summary.overdue > 0) {
      title = `⏰ ${summary.totalDue} Items Due (${summary.overdue} overdue)`;
    }

    // Build body with source breakdown
    const sourceEntries = Object.entries(summary.bySource);
    let body = '';

    if (sourceEntries.length === 1) {
      // Single source
      const [, sourceData] = sourceEntries[0];
      body = `${sourceData.due} items from ${sourceData.name}. `;
    } else if (sourceEntries.length <= 3) {
      // Multiple sources, list them
      const sourceParts = sourceEntries.map(([, sourceData]) => 
        `${sourceData.due} ${sourceData.name}`
      );
      body = `You have: ${sourceParts.join(', ')}. `;
    } else {
      // Many sources, summarize
      const topSources = sourceEntries
        .sort(([, a], [, b]) => b.due - a.due)
        .slice(0, 2)
        .map(([, sourceData]) => `${sourceData.due} ${sourceData.name}`)
        .join(', ');
      const remainingCount = sourceEntries.length - 2;
      body = `You have: ${topSources}, +${remainingCount} more sources. `;
    }

    // Add motivational message
    if (goldenTimeInfo.isActive) {
      body += `Perfect timing for peak learning! 🧠✨`;
    } else if (summary.highPriorityCount > 0) {
      body += `${summary.highPriorityCount} high-priority items. Keep your streak alive! 🔥`;
    } else {
      body += `Keep your streak alive! 🔥`;
    }

    return { title, body };
  }

  /**
   * Send the aggregated notification
   */
  private async sendAggregatedNotification(
    summary: DueItemsSummary,
    goldenTimeInfo: GoldenTimeInfo,
    preferences: NotificationPreferences,
    userId: string
  ): Promise<void> {
    if (!this.notificationService) return;

    const { title, body } = this.buildNotificationMessage(summary, goldenTimeInfo);

    // Create notification payload
    const payload: NotificationPayload = {
      title,
      body,
      icon: '/doshi.png',
      badge: '/favicon-96x96.png',
      tag: 'review-aggregated',
      requireInteraction: true,
      renotify: true,
      actions: [
        {
          action: 'review',
          title: 'Start Review',
          icon: '/icons/review.png'
        },
        {
          action: 'snooze',
          title: 'Remind Later',
          icon: '/icons/snooze.png'
        }
      ],
      data: {
        type: 'review_reminder',
        userId,
        totalDue: summary.totalDue,
        overdue: summary.overdue,
        goldenTime: goldenTimeInfo.isActive,
        path: '/review',
        timestamp: new Date().toISOString(),
        sources: Object.keys(summary.bySource)
      }
    };

    // For now, show in-app notification (extend NotificationService for push)
    this.showInAppNotification({
      title,
      body,
      type: goldenTimeInfo.isActive ? 'golden_time' : 'review_reminder',
      action: '/review'
    });
  }

  // ============================================================================
  // Scheduling Methods
  // ============================================================================

  /**
   * Schedule the next notification check for a user
   */
  async scheduleNextCheck(userId: string, preferences?: NotificationPreferences): Promise<void> {
    // Clear existing schedule
    const existingTimeout = this.scheduledChecks.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Get preferences if not provided
    const prefs = preferences || await this.notificationService?.getPreferences();
    if (!prefs?.enabled || !prefs.preferences.reviewReminders.enabled) {
      return;
    }

    // Calculate next check time
    const nextCheckTime = this.calculateNextCheckTime(prefs);
    const delay = nextCheckTime.getTime() - Date.now();

    if (delay > 0) {
      const timeout = setTimeout(() => {
        this.checkAndSendNotifications(userId);
        this.scheduleNextCheck(userId, prefs); // Schedule next check
      }, delay);

      this.scheduledChecks.set(userId, timeout);
    }
  }

  /**
   * Calculate the next optimal time to check for notifications
   */
  private calculateNextCheckTime(preferences: NotificationPreferences): Date {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Parse preferred times
    const preferredTimes = preferences.preferences.studyReminders.times
      .map(time => {
        const [hour, minute] = time.split(':').map(Number);
        return { hour, minute };
      })
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

    // Find next preferred time
    const currentMinutes = currentHour * 60 + currentMinute;
    
    for (const time of preferredTimes) {
      const timeMinutes = time.hour * 60 + time.minute;
      if (timeMinutes > currentMinutes) {
        // Same day
        const nextCheck = new Date(now);
        nextCheck.setHours(time.hour, time.minute, 0, 0);
        return nextCheck;
      }
    }

    // No time today, use first time tomorrow
    const firstTime = preferredTimes[0];
    const nextCheck = new Date(now);
    nextCheck.setDate(nextCheck.getDate() + 1);
    nextCheck.setHours(firstTime.hour, firstTime.minute, 0, 0);
    
    return nextCheck;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Check if current time is optimal for learning (golden time)
   */
  isGoldenTime(): boolean {
    return this.calculateGoldenTimeInfo().isActive;
  }

  /**
   * Calculate detailed golden time information
   */
  private calculateGoldenTimeInfo(): GoldenTimeInfo {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if we're in golden time
    const inMorningWindow = currentHour >= TIME_CONSTANTS.GOLDEN_TIME.MORNING_START && 
                           currentHour < TIME_CONSTANTS.GOLDEN_TIME.MORNING_END;
    const inEveningWindow = currentHour >= TIME_CONSTANTS.GOLDEN_TIME.EVENING_START && 
                           currentHour < TIME_CONSTANTS.GOLDEN_TIME.EVENING_END;
    
    if (inMorningWindow) {
      const endsAt = new Date(now);
      endsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.MORNING_END, 0, 0, 0);
      
      return {
        isActive: true,
        type: 'morning',
        endsAt,
        bonusMultiplier: TIME_CONSTANTS.GOLDEN_TIME.BONUS_MULTIPLIER
      };
    }
    
    if (inEveningWindow) {
      const endsAt = new Date(now);
      endsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.EVENING_END, 0, 0, 0);
      
      return {
        isActive: true,
        type: 'evening',
        endsAt,
        bonusMultiplier: TIME_CONSTANTS.GOLDEN_TIME.BONUS_MULTIPLIER
      };
    }

    // Calculate next window
    let nextWindow;
    if (currentHour < TIME_CONSTANTS.GOLDEN_TIME.MORNING_START) {
      // Before morning window
      const startsAt = new Date(now);
      startsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.MORNING_START, 0, 0, 0);
      nextWindow = {
        type: 'morning' as const,
        startsAt,
        duration: (TIME_CONSTANTS.GOLDEN_TIME.MORNING_END - TIME_CONSTANTS.GOLDEN_TIME.MORNING_START) * 60
      };
    } else if (currentHour < TIME_CONSTANTS.GOLDEN_TIME.EVENING_START) {
      // Between windows
      const startsAt = new Date(now);
      startsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.EVENING_START, 0, 0, 0);
      nextWindow = {
        type: 'evening' as const,
        startsAt,
        duration: (TIME_CONSTANTS.GOLDEN_TIME.EVENING_END - TIME_CONSTANTS.GOLDEN_TIME.EVENING_START) * 60
      };
    } else {
      // After evening window - next morning
      const startsAt = new Date(now);
      startsAt.setDate(startsAt.getDate() + 1);
      startsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.MORNING_START, 0, 0, 0);
      nextWindow = {
        type: 'morning' as const,
        startsAt,
        duration: (TIME_CONSTANTS.GOLDEN_TIME.MORNING_END - TIME_CONSTANTS.GOLDEN_TIME.MORNING_START) * 60
      };
    }

    return {
      isActive: false,
      nextWindow
    };
  }

  /**
   * Check if we should send a notification based on current state
   */
  private shouldSendNotification(
    summary: DueItemsSummary,
    preferences: NotificationPreferences,
    userId: string
  ): boolean {
    // No due items
    if (summary.totalDue === 0) {
      return false;
    }

    // Review reminders disabled
    if (!preferences.preferences.reviewReminders.enabled) {
      return false;
    }

    // Check minimum interval since last notification
    const lastNotification = this.lastAggregation.get(userId);
    if (lastNotification) {
      const timeSinceLastNotification = Date.now() - (this.getLastNotificationTime(userId) || 0);
      const minInterval = preferences.preferences.reviewReminders.advanceNotice * 60 * 1000;
      
      if (timeSinceLastNotification < minInterval) {
        return false;
      }

      // Don't send if the number of due items hasn't increased significantly
      const increase = summary.totalDue - lastNotification.totalDue;
      if (increase < 5 && summary.overdue === lastNotification.overdue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Show in-app notification (fallback when push notifications aren't available)
   */
  private showInAppNotification(options: {
    title: string;
    body: string;
    type: string;
    action?: string;
  }): void {
    // Dispatch custom event for in-app notifications
    const event = new CustomEvent('app-notification', {
      detail: options,
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  /**
   * Get current user ID (placeholder - would integrate with auth)
   */
  private getCurrentUserId(): string | null {
    // This would integrate with your auth system
    // For now, return null to indicate no user
    return null;
  }

  /**
   * Get timestamp of last notification sent to user
   */
  private getLastNotificationTime(userId: string): number | null {
    // This would be stored persistently
    // For now, return null
    return null;
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Manually trigger a notification check (for testing or immediate needs)
   */
  async triggerNotificationCheck(userId?: string): Promise<void> {
    await this.checkAndSendNotifications(userId);
  }

  /**
   * Enable notifications for a user with default settings
   */
  async enableNotifications(userId: string): Promise<void> {
    if (!this.notificationService) return;

    // Request permission first
    await this.notificationService.requestPermission();

    // Schedule regular checks
    const preferences = await this.notificationService.getPreferences();
    if (preferences) {
      await this.scheduleNextCheck(userId, preferences);
    }
  }

  /**
   * Disable notifications for a user
   */
  async disableNotifications(userId: string): Promise<void> {
    // Clear scheduled checks
    const existingTimeout = this.scheduledChecks.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.scheduledChecks.delete(userId);
    }

    // Clear last aggregation data
    this.lastAggregation.delete(userId);
  }

  /**
   * Get current notification status for debugging
   */
  getNotificationStatus(): {
    initialized: boolean;
    registryConnected: boolean;
    notificationServiceConnected: boolean;
    activeSchedules: number;
    goldenTimeActive: boolean;
  } {
    return {
      initialized: !!(this.registry && this.notificationService),
      registryConnected: !!this.registry,
      notificationServiceConnected: !!this.notificationService,
      activeSchedules: this.scheduledChecks.size,
      goldenTimeActive: this.isGoldenTime()
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all scheduled checks
    this.scheduledChecks.forEach(timeout => clearTimeout(timeout));
    this.scheduledChecks.clear();
    
    // Clear aggregation data
    this.lastAggregation.clear();
    
    // Reset references
    this.registry = null;
    this.notificationService = null;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const reviewNotificationAggregator = ReviewNotificationAggregator.getInstance();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize the review notification system
 */
export async function initializeReviewNotifications(
  registry: ReviewSourceRegistry,
  notificationService: NotificationService
): Promise<void> {
  await reviewNotificationAggregator.initialize(registry, notificationService);
}

/**
 * Enable review notifications for a user
 */
export async function enableReviewNotifications(userId: string): Promise<void> {
  await reviewNotificationAggregator.enableNotifications(userId);
}

/**
 * Disable review notifications for a user
 */
export async function disableReviewNotifications(userId: string): Promise<void> {
  await reviewNotificationAggregator.disableNotifications(userId);
}

/**
 * Manually trigger a notification check
 */
export async function triggerReviewNotificationCheck(userId?: string): Promise<void> {
  await reviewNotificationAggregator.triggerNotificationCheck(userId);
}

/**
 * Check if it's currently golden time for learning
 */
export function isCurrentlyGoldenTime(): boolean {
  return reviewNotificationAggregator.isGoldenTime();
}