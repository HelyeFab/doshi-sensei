'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  UserSubscription,
  Subscription,
  SubscriptionPlan,
  SUBSCRIPTION_PLANS
} from '@/types/subscription';

interface SubscriptionContextType {
  userSubscription: UserSubscription | null;
  loading: boolean;
  createCheckoutSession: (priceId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  isFeatureAvailable: (feature: 'lists' | 'drills' | 'sync') => boolean;
  canCreateList: () => boolean;
  canDoDrill: () => boolean;
  incrementListCount: () => Promise<void>;
  incrementDrillCount: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  // Initialize default subscription for new users
  const initializeDefaultSubscription = async (userId: string) => {
    const defaultSubscription: UserSubscription = {
      subscription: {
        status: 'active',
        plan: 'free',
      },
      limits: SUBSCRIPTION_PLANS.free.limits,
      currentUsage: {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: new Date().toISOString().split('T')[0],
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
        console.error('Error loading subscription:', error);
        // Fallback to default subscription
        const defaultSub = await initializeDefaultSubscription(user.uid);
        setUserSubscription(defaultSub);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [user]);

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
      console.error('Error creating checkout session:', error);
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
      console.error('Error canceling subscription:', error);
      throw error;
    }
  };

  const isFeatureAvailable = (feature: 'lists' | 'drills' | 'sync'): boolean => {
    if (!userSubscription) return false;

    switch (feature) {
      case 'sync':
        return userSubscription.limits.canSync;
      case 'lists':
        return userSubscription.limits.maxLists === -1 ||
               userSubscription.currentUsage.listsCount < userSubscription.limits.maxLists;
      case 'drills':
        const today = new Date().toISOString().split('T')[0];
        const isToday = userSubscription.currentUsage.lastDrillDate === today;
        return userSubscription.limits.maxDrillsPerDay === -1 ||
               !isToday ||
               userSubscription.currentUsage.drillsToday < userSubscription.limits.maxDrillsPerDay;
      default:
        return false;
    }
  };

  const canCreateList = (): boolean => isFeatureAvailable('lists');
  const canDoDrill = (): boolean => isFeatureAvailable('drills');

  const incrementListCount = async () => {
    if (!user || !userSubscription) return;

    const updatedSubscription = {
      ...userSubscription,
      currentUsage: {
        ...userSubscription.currentUsage,
        listsCount: userSubscription.currentUsage.listsCount + 1,
      },
    };

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { subscription: updatedSubscription }, { merge: true });
  };

  const incrementDrillCount = async () => {
    if (!user || !userSubscription) return;

    const today = new Date().toISOString().split('T')[0];
    const isToday = userSubscription.currentUsage.lastDrillDate === today;

    const updatedSubscription = {
      ...userSubscription,
      currentUsage: {
        ...userSubscription.currentUsage,
        drillsToday: isToday ? userSubscription.currentUsage.drillsToday + 1 : 1,
        lastDrillDate: today,
      },
    };

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { subscription: updatedSubscription }, { merge: true });
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
    createCheckoutSession,
    cancelSubscription,
    isFeatureAvailable,
    canCreateList,
    canDoDrill,
    incrementListCount,
    incrementDrillCount,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
