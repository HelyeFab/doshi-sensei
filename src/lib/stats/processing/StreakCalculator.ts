/**
 * Streak calculator for managing user streaks
 * Handles all streak-related calculations and logic
 */

import {
  IStreakCalculator,
  UserStatsV2
} from '../core/interfaces';
import { LOG_PREFIXES } from '../core/constants';

export class StreakCalculator implements IStreakCalculator {
  private logger: (message: string) => void;

  constructor(logger: (message: string) => void = console.log) {
    this.logger = logger;
  }

  /**
   * Calculate current streak from activity dates
   * FIXED: Consistent UTC timezone handling to prevent edge cases at midnight
   */
  calculateCurrentStreak(activityDates: Set<string>): number {
    if (activityDates.size === 0) {
      return 0;
    }

    const today = this.getUTCDateString(Date.now());
    const yesterday = this.getUTCDateString(Date.now() - 24 * 60 * 60 * 1000);

    let streak = 0;
    let checkDate = today;

    this.logger(`${LOG_PREFIXES.STREAK} Calculating current streak from ${today}`);

    // Check if user has activity today
    if (activityDates.has(today)) {
      // User has activity today, count backwards normally
      while (activityDates.has(checkDate)) {
        streak++;
        this.logger(`${LOG_PREFIXES.STREAK} Found activity on ${checkDate}, streak: ${streak}`);
        
        const prevDate = new Date(checkDate + 'T00:00:00.000Z');
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
        checkDate = this.getUTCDateString(prevDate.getTime());
      }
    } else if (activityDates.has(yesterday)) {
      // No activity today yet, but was active yesterday - preserve streak
      this.logger(`${LOG_PREFIXES.STREAK} No activity today, but found yesterday, preserving streak`);
      checkDate = yesterday;
      while (activityDates.has(checkDate)) {
        streak++;
        this.logger(`${LOG_PREFIXES.STREAK} Found activity on ${checkDate}, streak: ${streak}`);
        
        const prevDate = new Date(checkDate + 'T00:00:00.000Z');
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
        checkDate = this.getUTCDateString(prevDate.getTime());
      }
    } else {
      // No activity yesterday or today - streak is broken
      this.logger(`${LOG_PREFIXES.STREAK} No recent activity found, streak is 0`);
      streak = 0;
    }

    this.logger(`${LOG_PREFIXES.STREAK} Calculated current streak: ${streak}`);
    return streak;
  }

  /**
   * Calculate longest streak ever from activity dates
   */
  calculateLongestStreak(activityDates: Set<string>): number {
    if (activityDates.size === 0) {
      return 0;
    }

    const sortedDates = Array.from(activityDates).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: string | null = null;

    this.logger(`${LOG_PREFIXES.STREAK} Calculating longest streak from ${sortedDates.length} activity dates`);

    for (const date of sortedDates) {
      if (lastDate === null) {
        // First date
        currentStreak = 1;
        this.logger(`${LOG_PREFIXES.STREAK} Starting streak from ${date}`);
      } else {
        const lastDateTime = new Date(lastDate + 'T00:00:00.000Z');
        const currentDateTime = new Date(date + 'T00:00:00.000Z');
        const daysDiff = Math.round(
          (currentDateTime.getTime() - lastDateTime.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysDiff === 1) {
          // Consecutive day
          currentStreak++;
          this.logger(`${LOG_PREFIXES.STREAK} Consecutive day ${date}, streak: ${currentStreak}`);
        } else {
          // Gap found - record previous streak and start new one
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
          this.logger(`${LOG_PREFIXES.STREAK} Gap found, previous streak: ${longestStreak}, starting new from ${date}`);
        }
      }
      lastDate = date;
    }

    // Don't forget the final streak
    longestStreak = Math.max(longestStreak, currentStreak);
    
    this.logger(`${LOG_PREFIXES.STREAK} Calculated longest streak: ${longestStreak}`);
    return longestStreak;
  }

  /**
   * Update streak in user stats based on new activity
   * FIXED: Consistent UTC timezone handling
   */
  updateStreak(stats: UserStatsV2, activityDate: string): void {
    const today = this.getUTCDateString(Date.now());
    const yesterday = this.getUTCDateString(Date.now() - 24 * 60 * 60 * 1000);

    this.logger(`${LOG_PREFIXES.STREAK} Updating streak for activity on ${activityDate}`);
    this.logger(`${LOG_PREFIXES.STREAK} Current stats - Streak: ${stats.currentStreak}, Last active: ${stats.lastActiveDate}`);

    // Update first active date
    if (!stats.firstActiveDate || activityDate < stats.firstActiveDate) {
      stats.firstActiveDate = activityDate;
      this.logger(`${LOG_PREFIXES.STREAK} Updated first active date to ${activityDate}`);
    }

    // Only process streak updates for today's activities
    if (activityDate === today) {
      if (!stats.lastActiveDate || stats.lastActiveDate === '') {
        // First activity ever
        stats.currentStreak = 1;
        this.logger(`${LOG_PREFIXES.STREAK} First activity ever, streak: 1`);
      } else if (stats.lastActiveDate === today) {
        // Already processed today - no change needed
        this.logger(`${LOG_PREFIXES.STREAK} Already processed today, no change`);
        return;
      } else if (stats.lastActiveDate === yesterday) {
        // Consecutive day - increment streak
        stats.currentStreak += 1;
        this.logger(`${LOG_PREFIXES.STREAK} Consecutive day, incremented streak to ${stats.currentStreak}`);
      } else {
        // Gap in activity - reset streak to 1
        const previousStreak = stats.currentStreak;
        stats.currentStreak = 1;
        this.logger(`${LOG_PREFIXES.STREAK} Gap found (was ${stats.lastActiveDate}), reset streak from ${previousStreak} to 1`);
      }

      // Update last active date AFTER checking
      stats.lastActiveDate = today;
    } else {
      // For historical activities, just ensure first active date is set
      this.logger(`${LOG_PREFIXES.STREAK} Historical activity (${activityDate}), not updating current streak`);
    }

    // Update longest streak if current exceeded it
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
      this.logger(`${LOG_PREFIXES.STREAK} New longest streak record: ${stats.longestStreak}`);
    }
  }

  /**
   * Validate and potentially fix streak based on actual activity data
   */
  validateStreak(stats: UserStatsV2, activityDates: Set<string>): boolean {
    const calculatedCurrentStreak = this.calculateCurrentStreak(activityDates);
    const calculatedLongestStreak = this.calculateLongestStreak(activityDates);
    
    let needsUpdate = false;
    
    this.logger(`${LOG_PREFIXES.STREAK} Validating streak - Current: ${stats.currentStreak} vs ${calculatedCurrentStreak}, Longest: ${stats.longestStreak} vs ${calculatedLongestStreak}`);

    // Check current streak
    if (stats.currentStreak !== calculatedCurrentStreak) {
      this.logger(`${LOG_PREFIXES.STREAK} Current streak mismatch, correcting: ${stats.currentStreak} → ${calculatedCurrentStreak}`);
      stats.currentStreak = calculatedCurrentStreak;
      needsUpdate = true;
    }

    // Check longest streak (should only increase or stay the same)
    const correctLongestStreak = Math.max(calculatedLongestStreak, stats.longestStreak);
    if (stats.longestStreak !== correctLongestStreak) {
      this.logger(`${LOG_PREFIXES.STREAK} Longest streak correction: ${stats.longestStreak} → ${correctLongestStreak}`);
      stats.longestStreak = correctLongestStreak;
      needsUpdate = true;
    }

    // Update total days active
    const actualTotalDays = activityDates.size;
    if (stats.totalDaysActive !== actualTotalDays) {
      this.logger(`${LOG_PREFIXES.STREAK} Total active days correction: ${stats.totalDaysActive} → ${actualTotalDays}`);
      stats.totalDaysActive = actualTotalDays;
      needsUpdate = true;
    }

    // Update date fields if needed
    if (activityDates.size > 0) {
      const sortedDates = Array.from(activityDates).sort();
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];

      if (!stats.firstActiveDate || firstDate < stats.firstActiveDate) {
        this.logger(`${LOG_PREFIXES.STREAK} First active date correction: ${stats.firstActiveDate} → ${firstDate}`);
        stats.firstActiveDate = firstDate;
        needsUpdate = true;
      }

      if (!stats.lastActiveDate || lastDate > stats.lastActiveDate) {
        this.logger(`${LOG_PREFIXES.STREAK} Last active date correction: ${stats.lastActiveDate} → ${lastDate}`);
        stats.lastActiveDate = lastDate;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      stats.lastUpdated = Date.now();
      this.logger(`${LOG_PREFIXES.STREAK} Streak validation completed with corrections`);
    } else {
      this.logger(`${LOG_PREFIXES.STREAK} Streak validation passed, no corrections needed`);
    }

    return needsUpdate;
  }

  /**
   * Get streak breakdown for debugging
   */
  getStreakBreakdown(activityDates: Set<string>): {
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    streakBreaks: { date: string; previousStreak: number }[];
    activityGaps: { start: string; end: string; days: number }[];
  } {
    const sortedDates = Array.from(activityDates).sort();
    const streakBreaks: { date: string; previousStreak: number }[] = [];
    const activityGaps: { start: string; end: string; days: number }[] = [];
    
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate: string | null = null;

    for (const date of sortedDates) {
      if (lastDate === null) {
        currentStreak = 1;
      } else {
        const daysDiff = this.getDaysDifference(lastDate, date);
        
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          // Record streak break
          streakBreaks.push({
            date,
            previousStreak: currentStreak
          });

          // Record gap
          if (daysDiff > 1) {
            activityGaps.push({
              start: lastDate,
              end: date,
              days: daysDiff - 1
            });
          }

          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
      lastDate = date;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    // Calculate current streak (from today backwards)
    const actualCurrentStreak = this.calculateCurrentStreak(activityDates);

    return {
      currentStreak: actualCurrentStreak,
      longestStreak,
      totalDays: activityDates.size,
      streakBreaks,
      activityGaps
    };
  }

  /**
   * Get date string in YYYY-MM-DD format using UTC timezone
   * FIXED: Renamed to emphasize UTC usage and prevent timezone confusion
   */
  private getUTCDateString(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  /**
   * DEPRECATED: Use getUTCDateString() instead for consistent timezone handling
   * @deprecated
   */
  private getDateString(timestamp: number): string {
    return this.getUTCDateString(timestamp);
  }

  /**
   * Calculate days difference between two date strings
   * FIXED: Already correctly using UTC timezone with explicit 'Z' suffix
   */
  private getDaysDifference(date1: string, date2: string): number {
    const d1 = new Date(date1 + 'T00:00:00.000Z');
    const d2 = new Date(date2 + 'T00:00:00.000Z');
    return Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
  }
}