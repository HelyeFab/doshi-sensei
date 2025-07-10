import {
  STORAGE_LIMITS,
  EVICTION_GRACE_PERIOD_MS,
  DEFAULT_EVICTION_BATCH_SIZE,
  STORAGE_QUOTA_WARNING_THRESHOLD,
  hasUnlimitedStorage,
  getStorageLimit,
  formatBytes,
} from '../storageLimits';

describe('Storage Limits Configuration', () => {
  describe('STORAGE_LIMITS', () => {
    it('should have correct limits for guest users', () => {
      expect(STORAGE_LIMITS.guest.article).toEqual({ count: 3, sizeBytes: 10 * 1024 * 1024 });
      expect(STORAGE_LIMITS.guest.story).toEqual({ count: 3, sizeBytes: 10 * 1024 * 1024 });
      expect(STORAGE_LIMITS.guest.kanji).toEqual({ count: 100, sizeBytes: 5 * 1024 * 1024 });
    });

    it('should have correct limits for free users', () => {
      expect(STORAGE_LIMITS.free.article).toEqual({ count: 3, sizeBytes: 10 * 1024 * 1024 });
      expect(STORAGE_LIMITS.free.kanji).toEqual({ count: 500, sizeBytes: 25 * 1024 * 1024 });
      expect(STORAGE_LIMITS.free.audio).toEqual({ count: 500, sizeBytes: 250 * 1024 * 1024 });
    });

    it('should have correct limits for premium users', () => {
      expect(STORAGE_LIMITS.monthly.article).toEqual({ count: 50, sizeBytes: 500 * 1024 * 1024 });
      expect(STORAGE_LIMITS.monthly.kanji).toEqual({ count: Infinity, sizeBytes: Infinity });
      expect(STORAGE_LIMITS.yearly).toEqual(STORAGE_LIMITS.monthly);
      expect(STORAGE_LIMITS.premium).toEqual(STORAGE_LIMITS.monthly);
    });

    it('should have progressively higher limits', () => {
      // Guest < Free < Premium for articles
      expect(STORAGE_LIMITS.guest.article.count).toBeLessThanOrEqual(STORAGE_LIMITS.free.article.count);
      expect(STORAGE_LIMITS.free.article.count).toBeLessThan(STORAGE_LIMITS.monthly.article.count);
      
      // Guest < Free for kanji
      expect(STORAGE_LIMITS.guest.kanji.count).toBeLessThan(STORAGE_LIMITS.free.kanji.count);
    });
  });

  describe('Constants', () => {
    it('should have reasonable grace period', () => {
      expect(EVICTION_GRACE_PERIOD_MS).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should have reasonable batch size', () => {
      expect(DEFAULT_EVICTION_BATCH_SIZE).toBe(10);
    });

    it('should have appropriate storage quota threshold', () => {
      expect(STORAGE_QUOTA_WARNING_THRESHOLD).toBe(0.8); // 80%
    });
  });

  describe('hasUnlimitedStorage', () => {
    it('should return true for premium users with unlimited resources', () => {
      expect(hasUnlimitedStorage('monthly', 'kanji')).toBe(true);
      expect(hasUnlimitedStorage('yearly', 'verb')).toBe(true);
      expect(hasUnlimitedStorage('premium', 'audio')).toBe(true);
    });

    it('should return false for premium users with limited resources', () => {
      expect(hasUnlimitedStorage('monthly', 'article')).toBe(false);
      expect(hasUnlimitedStorage('yearly', 'story')).toBe(false);
    });

    it('should return false for non-premium users', () => {
      expect(hasUnlimitedStorage('free', 'kanji')).toBe(false);
      expect(hasUnlimitedStorage('guest', 'audio')).toBe(false);
    });

    it('should handle invalid user types', () => {
      expect(hasUnlimitedStorage('invalid' as any, 'kanji')).toBe(false);
    });
  });

  describe('getStorageLimit', () => {
    it('should return correct limits for valid combinations', () => {
      expect(getStorageLimit('free', 'article')).toEqual({ count: 3, sizeBytes: 10 * 1024 * 1024 });
      expect(getStorageLimit('monthly', 'kanji')).toEqual({ count: Infinity, sizeBytes: Infinity });
    });

    it('should return zero limits for invalid combinations', () => {
      expect(getStorageLimit('invalid' as any, 'article')).toEqual({ count: 0, sizeBytes: 0 });
      expect(getStorageLimit('free', 'invalid')).toEqual({ count: 0, sizeBytes: 0 });
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format infinity', () => {
      expect(formatBytes(Infinity)).toBe('Unlimited');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(512)).toBe('512 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatBytes(1234)).toBe('1.21 KB');
      expect(formatBytes(1234567)).toBe('1.18 MB');
    });
  });

  describe('Type Safety', () => {
    it('should have all user types covered', () => {
      const userTypes = ['guest', 'free', 'monthly', 'yearly', 'premium'];
      userTypes.forEach(userType => {
        expect(STORAGE_LIMITS).toHaveProperty(userType);
      });
    });

    it('should have consistent resource types across user types', () => {
      const resourceTypes = Object.keys(STORAGE_LIMITS.guest);
      const userTypes = Object.keys(STORAGE_LIMITS);
      
      userTypes.forEach(userType => {
        const userResources = Object.keys(STORAGE_LIMITS[userType]);
        expect(userResources.sort()).toEqual(resourceTypes.sort());
      });
    });

    it('should have valid storage limit structure', () => {
      Object.values(STORAGE_LIMITS).forEach(userLimits => {
        Object.values(userLimits).forEach(limit => {
          expect(limit).toHaveProperty('count');
          expect(limit).toHaveProperty('sizeBytes');
          expect(typeof limit.count).toBe('number');
          expect(typeof limit.sizeBytes).toBe('number');
        });
      });
    });
  });
});