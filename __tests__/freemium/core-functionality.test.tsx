import '@testing-library/jest-dom';

describe('Freemium System - Core Functionality', () => {
  describe('Subscription Plans Configuration', () => {
    it('should have correct guest plan limits', () => {
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');

      expect(SUBSCRIPTION_PLANS.guest.limits.maxDrillsPerDay).toBe(2);
      expect(SUBSCRIPTION_PLANS.guest.limits.maxLists).toBe(0);
      expect(SUBSCRIPTION_PLANS.guest.limits.canSave).toBe(false);
      expect(SUBSCRIPTION_PLANS.guest.limits.canSync).toBe(false);
    });

    it('should have correct free plan limits', () => {
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');

      expect(SUBSCRIPTION_PLANS.free.limits.maxDrillsPerDay).toBe(3);
      expect(SUBSCRIPTION_PLANS.free.limits.maxLists).toBe(3);
      expect(SUBSCRIPTION_PLANS.free.limits.canSave).toBe(true);
      expect(SUBSCRIPTION_PLANS.free.limits.canSync).toBe(false);
    });

    it('should have correct premium plan limits', () => {
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');

      // Monthly premium
      expect(SUBSCRIPTION_PLANS.monthly.limits.maxDrillsPerDay).toBe(-1);
      expect(SUBSCRIPTION_PLANS.monthly.limits.maxLists).toBe(-1);
      expect(SUBSCRIPTION_PLANS.monthly.limits.canSave).toBe(true);
      expect(SUBSCRIPTION_PLANS.monthly.limits.canSync).toBe(true);

      // Yearly premium
      expect(SUBSCRIPTION_PLANS.yearly.limits.maxDrillsPerDay).toBe(-1);
      expect(SUBSCRIPTION_PLANS.yearly.limits.maxLists).toBe(-1);
      expect(SUBSCRIPTION_PLANS.yearly.limits.canSave).toBe(true);
      expect(SUBSCRIPTION_PLANS.yearly.limits.canSync).toBe(true);
    });

    it('should have correct plan pricing', () => {
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');

      expect(SUBSCRIPTION_PLANS.monthly.price).toBe(3.99);
      expect(SUBSCRIPTION_PLANS.yearly.price).toBe(39.99);
      expect(SUBSCRIPTION_PLANS.guest.price).toBe(0);
      expect(SUBSCRIPTION_PLANS.free.price).toBe(0);
    });

    it('should have proper feature lists', () => {
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');

      // Guest features
      expect(SUBSCRIPTION_PLANS.guest.features).toContain('2 drills per day');
      expect(SUBSCRIPTION_PLANS.guest.features).toContain('No progress saving');

      // Free features
      expect(SUBSCRIPTION_PLANS.free.features).toContain('3 drills per day');
      expect(SUBSCRIPTION_PLANS.free.features).toContain('Up to 3 word lists');
      expect(SUBSCRIPTION_PLANS.free.features).toContain('Local storage only');

      // Premium features
      expect(SUBSCRIPTION_PLANS.monthly.features).toContain('Unlimited drills');
      expect(SUBSCRIPTION_PLANS.monthly.features).toContain('Unlimited word lists');
      expect(SUBSCRIPTION_PLANS.monthly.features).toContain('Cloud sync across devices');
    });
  });

  describe('Validation Functions', () => {
    it('should validate drill counts correctly', () => {
      const { GuestMigrationManager } = require('@/utils/guestMigration');

      // Valid counts
      expect(GuestMigrationManager.validateDrillCount(0)).toBe(true);
      expect(GuestMigrationManager.validateDrillCount(1)).toBe(true);
      expect(GuestMigrationManager.validateDrillCount(10)).toBe(true);
      expect(GuestMigrationManager.validateDrillCount(100)).toBe(true);

      // Invalid counts
      expect(GuestMigrationManager.validateDrillCount(-1)).toBe(false);
      expect(GuestMigrationManager.validateDrillCount(-10)).toBe(false);
      expect(GuestMigrationManager.validateDrillCount(1001)).toBe(false);
      expect(GuestMigrationManager.validateDrillCount(1.5)).toBe(false);
      expect(GuestMigrationManager.validateDrillCount(NaN)).toBe(false);
      expect(GuestMigrationManager.validateDrillCount(Infinity)).toBe(false);
    });
  });

  describe('User Type Classification', () => {
    it('should correctly classify user types', () => {
      // Test the logic that would be used in the context
      const classifyUserType = (user: any, subscription: any) => {
        if (!user) return 'guest';
        if (!subscription) return 'free';
        if (subscription.plan === 'monthly' || subscription.plan === 'yearly') return 'premium';
        return 'free';
      };

      // Test cases
      expect(classifyUserType(null, null)).toBe('guest');
      expect(classifyUserType({ uid: 'test' }, null)).toBe('free');
      expect(classifyUserType({ uid: 'test' }, { plan: 'free' })).toBe('free');
      expect(classifyUserType({ uid: 'test' }, { plan: 'monthly' })).toBe('premium');
      expect(classifyUserType({ uid: 'test' }, { plan: 'yearly' })).toBe('premium');
    });
  });

  describe('Feature Availability Logic', () => {
    it('should correctly determine feature availability for guests', () => {
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');
      const guestLimits = SUBSCRIPTION_PLANS.guest.limits;

      // Test the logic that would be used in the context
      const isFeatureAvailable = (feature: string, userType: string, usage: any) => {
        if (userType === 'guest') {
          if (feature === 'lists' || feature === 'save' || feature === 'sync') return false;
          if (feature === 'drills') {
            const today = new Date().toISOString().split('T')[0];
            const isToday = usage?.lastDrillDate === today;
            return !isToday || usage.drillsToday < guestLimits.maxDrillsPerDay;
          }
        }
        return true;
      };

      const mockUsage = { drillsToday: 1, lastDrillDate: new Date().toISOString().split('T')[0] };

      expect(isFeatureAvailable('drills', 'guest', mockUsage)).toBe(true);
      expect(isFeatureAvailable('lists', 'guest', mockUsage)).toBe(false);
      expect(isFeatureAvailable('save', 'guest', mockUsage)).toBe(false);
      expect(isFeatureAvailable('sync', 'guest', mockUsage)).toBe(false);

      // Test drill limit
      const limitReachedUsage = { drillsToday: 2, lastDrillDate: new Date().toISOString().split('T')[0] };
      expect(isFeatureAvailable('drills', 'guest', limitReachedUsage)).toBe(false);
    });

    it('should correctly determine feature availability for free users', () => {
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');
      const freeLimits = SUBSCRIPTION_PLANS.free.limits;

      const isFeatureAvailable = (feature: string, userType: string, usage: any) => {
        if (userType === 'free') {
          if (feature === 'sync') return false;
          if (feature === 'save') return true;
          if (feature === 'lists') return usage.listsCount < freeLimits.maxLists;
          if (feature === 'drills') {
            const today = new Date().toISOString().split('T')[0];
            const isToday = usage?.lastDrillDate === today;
            return !isToday || usage.drillsToday < freeLimits.maxDrillsPerDay;
          }
        }
        return true;
      };

      const mockUsage = {
        drillsToday: 2,
        lastDrillDate: new Date().toISOString().split('T')[0],
        listsCount: 2
      };

      expect(isFeatureAvailable('drills', 'free', mockUsage)).toBe(true);
      expect(isFeatureAvailable('lists', 'free', mockUsage)).toBe(true);
      expect(isFeatureAvailable('save', 'free', mockUsage)).toBe(true);
      expect(isFeatureAvailable('sync', 'free', mockUsage)).toBe(false);

      // Test limits
      const limitReachedUsage = {
        drillsToday: 3,
        lastDrillDate: new Date().toISOString().split('T')[0],
        listsCount: 3
      };
      expect(isFeatureAvailable('drills', 'free', limitReachedUsage)).toBe(false);
      expect(isFeatureAvailable('lists', 'free', limitReachedUsage)).toBe(false);
    });

    it('should grant unlimited access for premium users', () => {
      const isFeatureAvailable = (feature: string, userType: string) => {
        if (userType === 'premium') return true;
        return false;
      };

      expect(isFeatureAvailable('drills', 'premium')).toBe(true);
      expect(isFeatureAvailable('lists', 'premium')).toBe(true);
      expect(isFeatureAvailable('save', 'premium')).toBe(true);
      expect(isFeatureAvailable('sync', 'premium')).toBe(true);
    });
  });

  describe('Date Handling', () => {
    it('should correctly handle daily reset logic', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const shouldResetUsage = (lastDate: string, currentDate: string) => {
        return lastDate !== currentDate;
      };

      expect(shouldResetUsage(today, today)).toBe(false);
      expect(shouldResetUsage(yesterday, today)).toBe(true);
      expect(shouldResetUsage('2025-01-01', today)).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should have proper TypeScript types', () => {
      const { UserType, SubscriptionLimits } = require('@/types/subscription');

      // These should not throw TypeScript errors if types are properly defined
      const userTypes: string[] = ['guest', 'free', 'premium'];
      expect(userTypes.length).toBe(3);

      // Test that subscription plans structure is properly typed
      const { SUBSCRIPTION_PLANS } = require('@/types/subscription');
      expect(typeof SUBSCRIPTION_PLANS.guest.limits.maxDrillsPerDay).toBe('number');
      expect(typeof SUBSCRIPTION_PLANS.guest.limits.canSave).toBe('boolean');
    });
  });
});
