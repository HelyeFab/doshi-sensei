'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, onSnapshot, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  UserSubscription,
  SubscriptionPlan,
  UserType,
  GuestUsage,
  SUBSCRIPTION_PLANS
} from '@/types/subscription';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { UpgradePromptModal } from '@/components/UpgradePromptModal';
import { subscriptionLogger } from '@/utils/subscriptionLogger';
import { subscriptionValidator } from '@/utils/subscriptionValidator';
import { getEntitlementsForUserType, getFeatureLimit } from '@/utils/userEntitlements';

interface SubscriptionContextType {
  userSubscription: UserSubscription | null;
  loading: boolean;
  userType: UserType;
  guestUsage: GuestUsage | null;
  createCheckoutSession: (priceId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  /**
   * Returns true if feature is available, false if not, and undefined if loading (for logged-in users).
   * Consumers MUST check for undefined before making access decisions.
   */
  isFeatureAvailable: (feature: 'lists' | 'drills' | 'sync' | 'save' | 'kanjiquest') => boolean | undefined;
  canCreateList: () => boolean;
  canDoDrill: () => boolean;
  canPlayKanjiQuest: () => boolean;
  canSaveProgress: () => boolean;
  incrementListCount: () => Promise<void>;
  incrementDrillCount: () => Promise<void>;
  incrementGuestDrillCount: () => void;
  incrementKanjiQuestCount: () => Promise<void>;
  incrementGuestKanjiQuestCount: () => void;
  incrementKanaDropCount: () => Promise<void>;
  incrementGuestKanaDropCount: () => void;
  incrementStoryCount: () => Promise<void>;
  incrementGuestStoryCount: () => void;
  incrementArticleCount: () => Promise<void>;
  incrementGuestArticleCount: () => void;
  refreshSubscription: () => Promise<void>;
  showLoginPrompt: (reason: string, feature?: string) => void;
  showUpgradePrompt: (reason: string, feature?: string) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [guestUsage, setGuestUsage] = useState<GuestUsage | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalFeature, setModalFeature] = useState<string | undefined>();

  // Initialize default subscription for new users
  const initializeDefaultSubscription = async (userId: string) => {
    // Get free plan limits from entitlements system
    const freeEntitlements = getEntitlementsForUserType('free');
    const FREE_LIMITS = {
      maxLists: getFeatureLimit('free', 'storage.lists', 'total') || 3,
      maxDrillsPerDay: getFeatureLimit('free', 'learning.drills', 'daily') || 3,
      maxKanjiQuestPerDay: getFeatureLimit('free', 'games.kanjiQuest', 'daily') || 3,
      maxStoriesPerDay: getFeatureLimit('free', 'learning.stories', 'daily') || 3,
      maxArticlesPerDay: getFeatureLimit('free', 'learning.articles', 'daily') || 3,
      canSync: freeEntitlements.system.cloudSync.enabled,
      canSave: freeEntitlements.system.progressTracking.enabled,
    };

    const defaultSubscription: UserSubscription = {
      subscription: {
        status: 'active',
        plan: 'free',
      },
      limits: FREE_LIMITS,
      currentUsage: {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: new Date().toISOString().split('T')[0],
        kanjiQuestToday: 0,
        lastKanjiQuestDate: new Date().toISOString().split('T')[0],
        storiesToday: 0,
        lastStoryDate: new Date().toISOString().split('T')[0],
        articlesToday: 0,
        lastArticleDate: new Date().toISOString().split('T')[0],
      },
    };

    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { subscription: defaultSubscription }, { merge: true });
    return defaultSubscription;
  };

  // Listen to user subscription changes
  useEffect(() => {
    if (!user) {
      setUserSubscription(null);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, async (doc) => {
      try {
        const userData = doc.data();

        if (userData?.subscription) {
          setUserSubscription(userData.subscription);
        } else {
          // Initialize default subscription for new user
          const defaultSub = await initializeDefaultSubscription(user.uid);
          setUserSubscription(defaultSub);
        }
      } catch (error) {
        // Fallback to default subscription without trying to save to Firebase
        const defaultSub = createOfflineDefaultSubscription();
        setUserSubscription(defaultSub);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      // Handle Firebase connection errors
      // Use offline default subscription
      const defaultSub = createOfflineDefaultSubscription();
      setUserSubscription(defaultSub);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Create offline default subscription (doesn't require Firebase)
  const createOfflineDefaultSubscription = (): UserSubscription => {
    // Get free plan limits from entitlements system
    const freeEntitlements = getEntitlementsForUserType('free');
    const FREE_LIMITS = {
      maxLists: getFeatureLimit('free', 'storage.lists', 'total') || 3,
      maxDrillsPerDay: getFeatureLimit('free', 'learning.drills', 'daily') || 3,
      maxKanjiQuestPerDay: getFeatureLimit('free', 'games.kanjiQuest', 'daily') || 3,
      maxStoriesPerDay: getFeatureLimit('free', 'learning.stories', 'daily') || 3,
      maxArticlesPerDay: getFeatureLimit('free', 'learning.articles', 'daily') || 3,
      canSync: freeEntitlements.system.cloudSync.enabled,
      canSave: freeEntitlements.system.progressTracking.enabled,
    };

    const today = new Date().toISOString().split('T')[0];
    return {
      subscription: {
        status: 'active',
        plan: 'free',
      },
      limits: FREE_LIMITS,
      currentUsage: {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: today,
        kanjiQuestToday: 0,
        lastKanjiQuestDate: today,
        kanaDropToday: 0,
        lastKanaDropDate: today,
        storiesToday: 0,
        lastStoryDate: today,
        articlesToday: 0,
        lastArticleDate: today,
      },
    };
  };

  const createCheckoutSession = async (priceId: string) => {
    if (!user) throw new Error('User must be logged in');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const { sessionUrl } = await response.json();

      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
    } catch (error) {
      throw error;
    }
  };

  const cancelSubscription = async () => {
    if (!user || !userSubscription?.subscription.stripeSubscriptionId) {
      throw new Error('No active subscription to cancel');
    }

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: userSubscription.subscription.stripeSubscriptionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      throw error;
    }
  };

  // Load guest usage from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('doshi_sensei_guest_usage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setGuestUsage(parsed);
        } catch (error) {
          // Error parsing guest usage
        }
      } else {
        // Initialize guest usage
        const today = new Date().toISOString().split('T')[0];
        const initialUsage: GuestUsage = {
          drillsToday: 0,
          lastDrillDate: today,
          kanjiQuestToday: 0,
          lastKanjiQuestDate: today,
          kanaDropToday: 0,
          lastKanaDropDate: today,
          storiesToday: 0,
          lastStoryDate: today,
          articlesToday: 0,
          lastArticleDate: today,
        };
        setGuestUsage(initialUsage);
        localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify(initialUsage));
      }
    }
  }, []);

  // Determine user type - FIXED to handle loading state properly
  const userType: UserType = (() => {
    // If no user, they're a guest
    if (!user) return 'guest';

    // If user exists but subscription is still loading, return 'free' temporarily
    // This prevents incorrect limit checks in components that properly wait for loading
    if (loading || !userSubscription) return 'free';

    // Check if user has premium subscription
    if (userSubscription.subscription.status === 'active' &&
      (userSubscription.subscription.plan === 'monthly' ||
        userSubscription.subscription.plan === 'yearly')) {
      return 'premium';
    }

    // Otherwise they're free
    return 'free';
  })();

  // Log subscription state on user type determination
  useEffect(() => {
    if (user && !loading && userSubscription) {
      // Calculate the correct user type for logging
      const actualUserType: UserType = (() => {
        if (!user) return 'guest';
        if (!userSubscription) return 'free';

        // Check if user has premium subscription
        if (userSubscription.subscription.status === 'active' &&
          (userSubscription.subscription.plan === 'monthly' ||
            userSubscription.subscription.plan === 'yearly')) {
          return 'premium';
        }

        return 'free';
      })();

      subscriptionLogger.logUserLogin(user, userSubscription, actualUserType, loading);
    }
  }, [user, userSubscription, loading]);

  /**
   * Returns true if feature is available, false if not, and undefined if loading (for logged-in users).
   * Consumers MUST check for undefined before making access decisions.
   */
  const isFeatureAvailable = (feature: 'lists' | 'drills' | 'sync' | 'save' | 'kanjiquest'): boolean | undefined => {
    // CRITICAL: If user is logged in but subscription data hasn't loaded yet,
    // we should NOT make a decision. This prevents race conditions.
    if (user && loading) {
      return undefined;
    }

    // Use the subscription validator for consistent premium checks
    const validation = subscriptionValidator.validate(user, userSubscription, loading);

    // Debug log for KanjiQuest issues
    if (feature === 'kanjiquest' && process.env.NODE_ENV === 'development') {
      subscriptionValidator.debugSubscriptionState(user, userSubscription, `isFeatureAvailable(${feature})`);
    }

    // Premium users have unlimited access to all features
    if (validation.isPremium) {
      return true;
    }

    if (!user && feature !== 'drills' && feature !== 'kanjiquest') {
      // Guests can only access limited drills and kanji quest
      return false;
    }

    if (!user && feature === 'drills') {
      // Check guest drill limits from entitlements system
      const GUEST_MAX_DRILLS = getFeatureLimit('guest', 'learning.drills', 'daily') || 3;
      if (!guestUsage) return false;
      const today = new Date().toISOString().split('T')[0];
      const isToday = guestUsage.lastDrillDate === today;
      return !isToday || guestUsage.drillsToday < GUEST_MAX_DRILLS;
    }

    if (!user && feature === 'kanjiquest') {
      // Check guest kanji quest limits from entitlements system
      const GUEST_MAX_KANJI_QUEST = getFeatureLimit('guest', 'games.kanjiQuest', 'daily') || 3;
      if (!guestUsage) return false;
      const today = new Date().toISOString().split('T')[0];
      const isToday = guestUsage.lastKanjiQuestDate === today;
      return !isToday || guestUsage.kanjiQuestToday < GUEST_MAX_KANJI_QUEST;
    }

    if (!userSubscription) return false;

    switch (feature) {
      case 'save':
        return userSubscription.limits.canSave;
      case 'sync':
        return userSubscription.limits.canSync;
      case 'lists':
        return userSubscription.limits.maxLists === -1 ||
          userSubscription.currentUsage.listsCount < userSubscription.limits.maxLists;
      case 'drills': {
        const today = new Date().toISOString().split('T')[0];
        const isToday = userSubscription.currentUsage.lastDrillDate === today;
        return userSubscription.limits.maxDrillsPerDay === -1 ||
          !isToday ||
          userSubscription.currentUsage.drillsToday < userSubscription.limits.maxDrillsPerDay;
      }
      case 'kanjiquest': {
        const today = new Date().toISOString().split('T')[0];
        const isToday = userSubscription.currentUsage.lastKanjiQuestDate === today;
        const kanjiQuestToday = userSubscription.currentUsage.kanjiQuestToday || 0;
        return userSubscription.limits.maxKanjiQuestPerDay === -1 ||
          !isToday ||
          kanjiQuestToday < userSubscription.limits.maxKanjiQuestPerDay;
      }
      default:
        return false;
    }
  };

  // Defensive: return false if feature availability is undefined (still loading)
  const canSaveProgress = (): boolean => isFeatureAvailable('save') ?? false;

  const incrementGuestDrillCount = () => {
    if (!guestUsage) return;

    const today = new Date().toISOString().split('T')[0];
    const isToday = guestUsage.lastDrillDate === today;

    const updatedUsage: GuestUsage = {
      ...guestUsage,
      drillsToday: isToday ? guestUsage.drillsToday + 1 : 1,
      lastDrillDate: today,
    };

    setGuestUsage(updatedUsage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify(updatedUsage));
    }
  };

  const incrementGuestKanjiQuestCount = () => {
    if (!guestUsage) return;

    const today = new Date().toISOString().split('T')[0];
    const isToday = guestUsage.lastKanjiQuestDate === today;

    const updatedUsage: GuestUsage = {
      ...guestUsage,
      kanjiQuestToday: isToday ? guestUsage.kanjiQuestToday + 1 : 1,
      lastKanjiQuestDate: today,
    };

    setGuestUsage(updatedUsage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify(updatedUsage));
    }
  };

  const incrementGuestKanaDropCount = () => {
    if (!guestUsage) return;

    const today = new Date().toISOString().split('T')[0];
    const isToday = guestUsage.lastKanaDropDate === today;

    const updatedUsage: GuestUsage = {
      ...guestUsage,
      kanaDropToday: isToday ? guestUsage.kanaDropToday + 1 : 1,
      lastKanaDropDate: today,
    };

    setGuestUsage(updatedUsage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify(updatedUsage));
    }
  };

  const incrementGuestStoryCount = () => {
    if (!guestUsage) return;

    const today = new Date().toISOString().split('T')[0];
    const isToday = guestUsage.lastStoryDate === today;

    const updatedUsage: GuestUsage = {
      ...guestUsage,
      storiesToday: isToday ? guestUsage.storiesToday + 1 : 1,
      lastStoryDate: today,
    };

    setGuestUsage(updatedUsage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify(updatedUsage));
    }
  };

  const incrementGuestArticleCount = () => {
    if (!guestUsage) return;

    const today = new Date().toISOString().split('T')[0];
    const isToday = guestUsage.lastArticleDate === today;

    const updatedUsage: GuestUsage = {
      ...guestUsage,
      articlesToday: isToday ? guestUsage.articlesToday + 1 : 1,
      lastArticleDate: today,
    };

    setGuestUsage(updatedUsage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi_sensei_guest_usage', JSON.stringify(updatedUsage));
    }
  };

  const showLoginPrompt = (reason: string, feature?: string) => {
    // Use subscription validator for consistent premium check
    const validation = subscriptionValidator.validate(user, userSubscription, loading);

    // Don't show login prompt for premium users
    if (validation.isPremium) {
      console.warn('🚫 Blocked login prompt for premium user:', {
        user: user?.email,
        isPremium: validation.isPremium,
        feature,
        reason
      });
      return;
    }

    setModalMessage(reason);
    setModalFeature(feature);
    setShowLoginModal(true);
  };

  const showUpgradePrompt = (reason: string, feature?: string) => {
    // Use subscription validator for consistent premium check
    const validation = subscriptionValidator.validate(user, userSubscription, loading);

    // Don't show upgrade prompt for premium users
    if (validation.isPremium) {
      console.warn('🚫 Blocked upgrade prompt for premium user:', {
        user: user?.email,
        isPremium: validation.isPremium,
        feature,
        reason
      });
      return;
    }

    setModalMessage(reason);
    setModalFeature(feature);
    setShowUpgradeModal(true);
  };

  // Defensive: return false if feature availability is undefined (still loading)
  const canCreateList = (): boolean => isFeatureAvailable('lists') ?? false;
  const canDoDrill = (): boolean => isFeatureAvailable('drills') ?? false;
  const canPlayKanjiQuest = (): boolean => isFeatureAvailable('kanjiquest') ?? false;

  const incrementListCount = async () => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentData = userDoc.data();

        if (!currentData?.subscription) {
          throw new Error('No subscription data found');
        }

        const currentCount = currentData.subscription.currentUsage?.listsCount || 0;

        const updatedSubscription = {
          ...currentData.subscription,
          currentUsage: {
            ...currentData.subscription.currentUsage,
            listsCount: currentCount + 1,
          },
        };

        transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
      });
    } catch (error) {
      throw error;
    }
  };

  const incrementDrillCount = async () => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentData = userDoc.data();

        if (!currentData?.subscription) {
          throw new Error('No subscription data found');
        }

        const currentUsage = currentData.subscription.currentUsage || {};
        const isToday = currentUsage.lastDrillDate === today;
        const currentCount = isToday ? (currentUsage.drillsToday || 0) : 0;

        const updatedSubscription = {
          ...currentData.subscription,
          currentUsage: {
            ...currentUsage,
            drillsToday: currentCount + 1,
            lastDrillDate: today,
          },
        };

        transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
      });
    } catch (error) {
      throw error;
    }
  };

  const incrementKanjiQuestCount = async () => {
    if (!user) {
      // Handle guest users
      incrementGuestKanjiQuestCount();
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentData = userDoc.data();

        if (!currentData?.subscription) {
          throw new Error('No subscription data found');
        }

        const currentUsage = currentData.subscription.currentUsage || {};
        const isToday = currentUsage.lastKanjiQuestDate === today;
        const currentCount = isToday ? (currentUsage.kanjiQuestToday || 0) : 0;

        const updatedSubscription = {
          ...currentData.subscription,
          currentUsage: {
            ...currentUsage,
            kanjiQuestToday: currentCount + 1,
            lastKanjiQuestDate: today,
          },
        };

        transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
      });
    } catch (error) {
      throw error;
    }
  };

  const incrementKanaDropCount = async () => {
    if (!user) {
      // Handle guest users
      incrementGuestKanaDropCount();
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentData = userDoc.data();

        if (!currentData?.subscription) {
          throw new Error('No subscription data found');
        }

        const currentUsage = currentData.subscription.currentUsage || {};
        const isToday = currentUsage.lastKanaDropDate === today;
        const currentCount = isToday ? (currentUsage.kanaDropToday || 0) : 0;

        const updatedSubscription = {
          ...currentData.subscription,
          currentUsage: {
            ...currentUsage,
            kanaDropToday: currentCount + 1,
            lastKanaDropDate: today,
          },
        };

        transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
      });
    } catch (error) {
      throw error;
    }
  };

  const incrementStoryCount = async () => {
    if (!user) {
      // Handle guest users
      incrementGuestStoryCount();
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentData = userDoc.data();

        if (!currentData?.subscription) {
          throw new Error('No subscription data found');
        }

        const currentUsage = currentData.subscription.currentUsage || {};
        const isToday = currentUsage.lastStoryDate === today;
        const currentCount = isToday ? (currentUsage.storiesToday || 0) : 0;

        const updatedSubscription = {
          ...currentData.subscription,
          currentUsage: {
            ...currentUsage,
            storiesToday: currentCount + 1,
            lastStoryDate: today,
          },
        };

        transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
      });
    } catch (error) {
      throw error;
    }
  };

  const incrementArticleCount = async () => {
    if (!user) {
      // Handle guest users
      incrementGuestArticleCount();
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().split('T')[0];

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentData = userDoc.data();

        if (!currentData?.subscription) {
          throw new Error('No subscription data found');
        }

        const currentUsage = currentData.subscription.currentUsage || {};
        const isToday = currentUsage.lastArticleDate === today;
        const currentCount = isToday ? (currentUsage.articlesToday || 0) : 0;

        const updatedSubscription = {
          ...currentData.subscription,
          currentUsage: {
            ...currentUsage,
            articlesToday: currentCount + 1,
            lastArticleDate: today,
          },
        };

        transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
      });
    } catch (error) {
      throw error;
    }
  };

  const refreshSubscription = async () => {
    if (!user) return;

    // Force refresh by re-fetching from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists() && docSnap.data()?.subscription) {
      setUserSubscription(docSnap.data().subscription);
    }
  };

  const value: SubscriptionContextType = {
    userSubscription,
    loading,
    userType,
    guestUsage,
    createCheckoutSession,
    cancelSubscription,
    isFeatureAvailable,
    canCreateList,
    canDoDrill,
    canPlayKanjiQuest,
    canSaveProgress,
    incrementListCount,
    incrementDrillCount,
    incrementGuestDrillCount,
    incrementKanjiQuestCount,
    incrementGuestKanjiQuestCount,
    incrementKanaDropCount,
    incrementGuestKanaDropCount,
    incrementStoryCount,
    incrementGuestStoryCount,
    incrementArticleCount,
    incrementGuestArticleCount,
    refreshSubscription,
    showLoginPrompt,
    showUpgradePrompt,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={modalMessage}
        feature={modalFeature}
      />

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message={modalMessage}
        feature={modalFeature}
      />
    </SubscriptionContext.Provider>
  );
}
