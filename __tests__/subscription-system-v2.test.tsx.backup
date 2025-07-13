import '@testing-library/jest-dom';

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true
});

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

describe('Subscription System V2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  describe('New Architecture', () => {
    it('should have three pillars: entitlements, features, and subscriptions', () => {
      // Verify the modules exist
      expect(() => require('@/lib/entitlements')).not.toThrow();
      expect(() => require('@/lib/features')).not.toThrow();
      expect(() => require('@/lib/subscriptions')).not.toThrow();
      expect(() => require('@/lib/access')).not.toThrow();
    });

    it('should export the necessary hooks', () => {
      const { useAccess } = require('@/hooks/useAccess');
      const { useFeature } = require('@/hooks/useFeature');
      const { useSubscription2 } = require('@/hooks/useSubscription2');

      expect(useAccess).toBeDefined();
      expect(useFeature).toBeDefined();
      expect(useSubscription2).toBeDefined();
    });
  });

  describe('Feature Registry', () => {
    it('should have core features defined', () => {
      const { featureRegistry } = require('@/lib/features/registry');
      
      expect(featureRegistry['drill_practice']).toBeDefined();
      expect(featureRegistry['kanji_quest']).toBeDefined();
      expect(featureRegistry['kana_drop']).toBeDefined();
      expect(featureRegistry['word_lists']).toBeDefined();
      expect(featureRegistry['cloud_sync']).toBeDefined();
      expect(featureRegistry['news_articles']).toBeDefined();
    });

    it('should have proper feature structure', () => {
      const { featureRegistry } = require('@/lib/features/registry');
      
      const drillFeature = featureRegistry['drill_practice'];
      expect(drillFeature).toHaveProperty('id', 'drill_practice');
      expect(drillFeature).toHaveProperty('name');
      expect(drillFeature).toHaveProperty('description');
      expect(drillFeature).toHaveProperty('category');
      expect(drillFeature).toHaveProperty('type');
      expect(drillFeature).toHaveProperty('resetSchedule');
    });
  });

  describe('Entitlement Rules', () => {
    it('should define rules for all user types', () => {
      const { defaultRules } = require('@/lib/entitlements/default-rules');
      
      expect(defaultRules['guest']).toBeDefined();
      expect(defaultRules['free']).toBeDefined();
      expect(defaultRules['monthly']).toBeDefined();
      expect(defaultRules['yearly']).toBeDefined();
    });

    it('should have proper limit structure', () => {
      const { defaultRules } = require('@/lib/entitlements/default-rules');
      
      // Check guest limits
      expect(defaultRules.guest.drill_practice.limit).toBe(3);
      expect(defaultRules.guest.kanji_quest.limit).toBe(3);
      expect(defaultRules.guest.kana_drop.limit).toBe(3);
      
      // Check premium limits (unlimited = -1)
      expect(defaultRules.monthly.drill_practice.limit).toBe(-1);
      expect(defaultRules.yearly.drill_practice.limit).toBe(-1);
    });
  });

  describe('Subscription Manager', () => {
    it('should correctly identify user types', () => {
      const { subscriptionManager } = require('@/lib/subscriptions/manager');
      
      expect(subscriptionManager.getUserType(null)).toBe('guest');
      expect(subscriptionManager.getUserType({ plan: 'free', status: 'active' })).toBe('free');
      expect(subscriptionManager.getUserType({ plan: 'monthly', status: 'active' })).toBe('monthly');
      expect(subscriptionManager.getUserType({ plan: 'yearly', status: 'active' })).toBe('yearly');
    });

    it('should handle canceled subscriptions', () => {
      const { subscriptionManager } = require('@/lib/subscriptions/manager');
      
      expect(subscriptionManager.getUserType({ plan: 'monthly', status: 'canceled' })).toBe('free');
      expect(subscriptionManager.getUserType({ plan: 'yearly', status: 'past_due' })).toBe('free');
    });
  });

  describe('Access Control', () => {
    it('should provide unified access API', () => {
      const { accessControl } = require('@/lib/access');
      
      expect(accessControl.canUserAccess).toBeDefined();
      expect(accessControl.trackUsage).toBeDefined();
      expect(accessControl.getRemainingUsage).toBeDefined();
      expect(accessControl.resetDailyUsage).toBeDefined();
      expect(accessControl.getFeature).toBeDefined();
    });
  });
});