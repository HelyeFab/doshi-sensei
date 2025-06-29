'use client';

import { GuestUsage } from '@/types/subscription';

/**
 * Utilities for migrating guest data when users sign up
 */

export class GuestMigrationManager {
  private static readonly GUEST_USAGE_KEY = 'doshi_sensei_guest_usage';
  private static readonly GUEST_MIGRATION_KEY = 'doshi_sensei_guest_migrated';

  /**
   * Get current guest usage from localStorage
   */
  static getGuestUsage(): GuestUsage | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.GUEST_USAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error parsing guest usage:', error);
    }

    return null;
  }

  /**
   * Check if guest data needs migration
   */
  static needsMigration(): boolean {
    if (typeof window === 'undefined') return false;

    const guestUsage = this.getGuestUsage();
    const alreadyMigrated = localStorage.getItem(this.GUEST_MIGRATION_KEY);

    return guestUsage !== null && !alreadyMigrated;
  }

  /**
   * Prepare migration data for new user
   */
  static prepareMigrationData() {
    const guestUsage = this.getGuestUsage();
    if (!guestUsage) return null;

    const today = new Date().toISOString().split('T')[0];
    const isToday = guestUsage.lastDrillDate === today;

    return {
      drillsToday: isToday ? guestUsage.drillsToday : 0,
      lastDrillDate: guestUsage.lastDrillDate,
      migratedAt: new Date().toISOString()
    };
  }

  /**
   * Mark migration as completed
   */
  static markMigrationComplete() {
    if (typeof window === 'undefined') return;

    localStorage.setItem(this.GUEST_MIGRATION_KEY, new Date().toISOString());

    // Optionally keep guest data for reference, or remove it
    // localStorage.removeItem(this.GUEST_USAGE_KEY);
  }

  /**
   * Reset guest data (for testing or cleanup)
   */
  static resetGuestData() {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(this.GUEST_USAGE_KEY);
    localStorage.removeItem(this.GUEST_MIGRATION_KEY);
  }

  /**
   * Validate drill count integrity
   */
  static validateDrillCount(drillCount: number): boolean {
    // Basic validation - drill count should be reasonable
    return Number.isInteger(drillCount) && drillCount >= 0 && drillCount <= 100; // Max 100 per day seems reasonable
  }

  /**
   * Safely increment guest drill count with validation
   */
  static incrementGuestDrill(): GuestUsage | null {
    if (typeof window === 'undefined') return null;

    try {
      const currentUsage = this.getGuestUsage();
      const today = new Date().toISOString().split('T')[0];

      let newUsage: GuestUsage;

      if (!currentUsage) {
        newUsage = {
          drillsToday: 1,
          lastDrillDate: today,
          kanjiQuestToday: 0,
          lastKanjiQuestDate: today,
          storiesToday: 0,
          lastStoryDate: today
        };
      } else {
        const isToday = currentUsage.lastDrillDate === today;
        newUsage = {
          drillsToday: isToday ? currentUsage.drillsToday + 1 : 1,
          lastDrillDate: today,
          kanjiQuestToday: currentUsage.kanjiQuestToday || 0,
          lastKanjiQuestDate: currentUsage.lastKanjiQuestDate || today,
          storiesToday: currentUsage.storiesToday || 0,
          lastStoryDate: currentUsage.lastStoryDate || today
        };
      }

      // Validate before saving
      if (!this.validateDrillCount(newUsage.drillsToday)) {
        console.error('Invalid drill count detected:', newUsage.drillsToday);
        return currentUsage;
      }

      localStorage.setItem(this.GUEST_USAGE_KEY, JSON.stringify(newUsage));
      return newUsage;

    } catch (error) {
      console.error('Error incrementing guest drill count:', error);
      return null;
    }
  }

  /**
   * Get usage statistics for analytics
   */
  static getUsageStats() {
    const guestUsage = this.getGuestUsage();
    const migrationStatus = localStorage.getItem(this.GUEST_MIGRATION_KEY);

    return {
      hasGuestData: guestUsage !== null,
      hasMigrated: migrationStatus !== null,
      currentDrills: guestUsage?.drillsToday || 0,
      lastActive: guestUsage?.lastDrillDate,
      migratedAt: migrationStatus
    };
  }
}
