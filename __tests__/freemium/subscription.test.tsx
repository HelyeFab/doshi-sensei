import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { GuestMigrationManager } from '@/utils/guestMigration';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

// Mock Firebase functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock AuthContext
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User'
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signInWithGoogle: jest.fn(),
  }),
}));

describe('Subscription Context - Freemium Flow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Guest User Flow', () => {
    it('should initialize guest usage correctly', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      // Mock no user for guest
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({ user: null }),
      }));

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('guest');
        expect(contextValue.guestUsage).toBeTruthy();
        expect(contextValue.guestUsage.drillsToday).toBe(0);
      });
    });

    it('should enforce guest drill limits', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      // Mock no user
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({ user: null }),
      }));

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('guest');
      });

      // Test initial state - should allow drills
      expect(contextValue.canDoDrill()).toBe(true);

      // Simulate reaching guest limit
      const today = new Date().toISOString().split('T')[0];
      const maxGuestDrills = SUBSCRIPTION_PLANS.guest.limits.maxDrillsPerDay;

      localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify({
        drillsToday: maxGuestDrills,
        lastDrillDate: today
      }));

      // Re-render to pick up localStorage change
      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.canDoDrill()).toBe(false);
      });
    });

    it('should increment guest drill count correctly', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({ user: null }),
      }));

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('guest');
        expect(contextValue.guestUsage.drillsToday).toBe(0);
      });

      // Increment drill count
      act(() => {
        contextValue.incrementGuestDrillCount();
      });

      await waitFor(() => {
        expect(contextValue.guestUsage.drillsToday).toBe(1);
      });

      // Verify localStorage is updated
      const stored = localStorage.getItem('doshi_sensei_guest_usage');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.drillsToday).toBe(1);
    });

    it('should block guest from creating lists', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({ user: null }),
      }));

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('guest');
        expect(contextValue.canCreateList()).toBe(false);
        expect(contextValue.canSaveProgress()).toBe(false);
        expect(contextValue.isFeatureAvailable('sync')).toBe(false);
      });
    });
  });

  describe('Free User Flow', () => {
    it('should provide free user limits', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      // Mock Firebase snapshot for free user
      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((doc: any, callback: any) => {
        callback({
          data: () => ({
            subscription: {
              subscription: { status: 'active', plan: 'free' },
              limits: SUBSCRIPTION_PLANS.free.limits,
              currentUsage: {
                listsCount: 1,
                drillsToday: 2,
                lastDrillDate: new Date().toISOString().split('T')[0]
              }
            }
          })
        });
        return jest.fn(); // unsubscribe function
      });

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('free');
        expect(contextValue.userSubscription.limits.maxLists).toBe(3);
        expect(contextValue.userSubscription.limits.maxDrillsPerDay).toBe(3);
        expect(contextValue.userSubscription.limits.canSave).toBe(true);
        expect(contextValue.userSubscription.limits.canSync).toBe(false);
      });
    });

    it('should enforce free user list limits', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      // Mock Firebase with user at list limit
      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((doc: any, callback: any) => {
        callback({
          data: () => ({
            subscription: {
              subscription: { status: 'active', plan: 'free' },
              limits: SUBSCRIPTION_PLANS.free.limits,
              currentUsage: {
                listsCount: 3, // At the limit
                drillsToday: 0,
                lastDrillDate: new Date().toISOString().split('T')[0]
              }
            }
          })
        });
        return jest.fn();
      });

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('free');
        expect(contextValue.canCreateList()).toBe(false);
        expect(contextValue.isFeatureAvailable('lists')).toBe(false);
      });
    });

    it('should enforce free user drill limits', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      // Mock Firebase with user at drill limit
      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((doc: any, callback: any) => {
        callback({
          data: () => ({
            subscription: {
              subscription: { status: 'active', plan: 'free' },
              limits: SUBSCRIPTION_PLANS.free.limits,
              currentUsage: {
                listsCount: 1,
                drillsToday: 3, // At the limit
                lastDrillDate: new Date().toISOString().split('T')[0]
              }
            }
          })
        });
        return jest.fn();
      });

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('free');
        expect(contextValue.canDoDrill()).toBe(false);
        expect(contextValue.isFeatureAvailable('drills')).toBe(false);
      });
    });
  });

  describe('Premium User Flow', () => {
    it('should provide unlimited access for premium users', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      // Mock Firebase for premium user
      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((doc: any, callback: any) => {
        callback({
          data: () => ({
            subscription: {
              subscription: { status: 'active', plan: 'monthly' },
              limits: SUBSCRIPTION_PLANS.monthly.limits,
              currentUsage: {
                listsCount: 10,
                drillsToday: 50,
                lastDrillDate: new Date().toISOString().split('T')[0]
              }
            }
          })
        });
        return jest.fn();
      });

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('premium');
        expect(contextValue.canDoDrill()).toBe(true);
        expect(contextValue.canCreateList()).toBe(true);
        expect(contextValue.canSaveProgress()).toBe(true);
        expect(contextValue.isFeatureAvailable('sync')).toBe(true);
        expect(contextValue.userSubscription.limits.maxLists).toBe(-1);
        expect(contextValue.userSubscription.limits.maxDrillsPerDay).toBe(-1);
      });
    });
  });

  describe('Modal Integration', () => {
    it('should show login prompt for guests', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({ user: null, signInWithGoogle: jest.fn() }),
      }));

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('guest');
      });

      // Trigger login prompt
      act(() => {
        contextValue.showLoginPrompt('Test message', 'drills');
      });

      // Should show login modal
      await waitFor(() => {
        expect(screen.getByText('Login Required')).toBeInTheDocument();
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should show upgrade prompt for free users', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useSubscription();
        return <div>Test</div>;
      }

      // Mock Firebase for free user
      const { onSnapshot } = require('firebase/firestore');
      onSnapshot.mockImplementation((doc: any, callback: any) => {
        callback({
          data: () => ({
            subscription: {
              subscription: { status: 'active', plan: 'free' },
              limits: SUBSCRIPTION_PLANS.free.limits,
              currentUsage: {
                listsCount: 1,
                drillsToday: 1,
                lastDrillDate: new Date().toISOString().split('T')[0]
              }
            }
          })
        });
        return jest.fn();
      });

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(contextValue.userType).toBe('free');
      });

      // Trigger upgrade prompt
      act(() => {
        contextValue.showUpgradePrompt('Test upgrade message', 'sync');
      });

      // Should show upgrade modal
      await waitFor(() => {
        expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
        expect(screen.getByText('Test upgrade message')).toBeInTheDocument();
      });
    });
  });
});

describe('Guest Migration Manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should detect when migration is needed', () => {
    // No guest data
    expect(GuestMigrationManager.needsMigration()).toBe(false);

    // Add guest data
    localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify({
      drillsToday: 2,
      lastDrillDate: '2025-01-01'
    }));

    expect(GuestMigrationManager.needsMigration()).toBe(true);

    // Mark as migrated
    GuestMigrationManager.markMigrationComplete();
    expect(GuestMigrationManager.needsMigration()).toBe(false);
  });

  it('should prepare migration data correctly', () => {
    const today = new Date().toISOString().split('T')[0];

    localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify({
      drillsToday: 2,
      lastDrillDate: today
    }));

    const migrationData = GuestMigrationManager.prepareMigrationData();

    expect(migrationData).toBeTruthy();
    expect(migrationData!.drillsToday).toBe(2);
    expect(migrationData!.lastDrillDate).toBe(today);
    expect(migrationData!.migratedAt).toBeTruthy();
  });

  it('should validate drill counts', () => {
    expect(GuestMigrationManager.validateDrillCount(0)).toBe(true);
    expect(GuestMigrationManager.validateDrillCount(5)).toBe(true);
    expect(GuestMigrationManager.validateDrillCount(100)).toBe(true);
    expect(GuestMigrationManager.validateDrillCount(-1)).toBe(false);
    expect(GuestMigrationManager.validateDrillCount(1001)).toBe(false);
    expect(GuestMigrationManager.validateDrillCount(1.5)).toBe(false);
  });

  it('should safely increment guest drill count', () => {
    const result = GuestMigrationManager.incrementGuestDrill();

    expect(result).toBeTruthy();
    expect(result!.drillsToday).toBe(1);

    const stored = localStorage.getItem('doshi_sensei_guest_usage');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.drillsToday).toBe(1);
  });

  it('should provide usage statistics', () => {
    localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify({
      drillsToday: 3,
      lastDrillDate: '2025-01-01'
    }));

    const stats = GuestMigrationManager.getUsageStats();

    expect(stats.hasGuestData).toBe(true);
    expect(stats.hasMigrated).toBe(false);
    expect(stats.currentDrills).toBe(3);
    expect(stats.lastActive).toBe('2025-01-01');
  });
});
