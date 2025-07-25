/**
 * useSubscription2 Hook (temporary name)
 * New subscription hook that works with the rebuilt system
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionManager } from '@/lib/access';
import { Subscription, SubscriptionCheckResult } from '@/lib/subscriptions/types';
import { UserType } from '@/lib/entitlements/types';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG } from '@/lib/stripe';

interface UseSubscription2Return {
  // Subscription data
  subscription: Subscription | null;
  // Derived user type
  userType: UserType;
  // Subscription status
  isActive: boolean;
  isPremium: boolean;
  daysRemaining: number | undefined;
  // Loading state
  isLoading: boolean;
  // Actions
  createCheckoutSession: (priceId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  // Refresh data
  refresh: () => void;
}

export function useSubscription2(): UseSubscription2Return {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<SubscriptionCheckResult>({
    isActive: false,
    plan: 'free'
  });
  
  // Load subscription data
  const loadSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setCheckResult({ isActive: false, plan: 'free' });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const sub = await subscriptionManager.getSubscription(user.uid);
      setSubscription(sub);
      
      const result = subscriptionManager.checkSubscription(sub);
      setCheckResult(result);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Set up real-time listener
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }
    
    // Initial load
    loadSubscription();
    
    // Real-time updates
    const unsubscribe = subscriptionManager.listenToSubscription(
      user.uid,
      (sub) => {
        setSubscription(sub);
        const result = subscriptionManager.checkSubscription(sub);
        setCheckResult(result);
      }
    );
    
    return () => {
      subscriptionManager.stopListening(user.uid);
    };
  }, [user]);
  
  // Create Stripe checkout session
  const createCheckoutSession = async (priceId: string) => {
    if (!user) {
      throw new Error('Must be logged in to subscribe');
    }
    
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
  
  // Cancel subscription
  const cancelSubscription = async () => {
    if (!user || !subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription to cancel');
    }
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
          idToken,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      // Refresh subscription data
      loadSubscription();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  };
  
  // Derive user type
  const userType = subscriptionManager.getUserType(subscription);
  
  return {
    subscription,
    userType,
    isActive: checkResult.isActive,
    isPremium: userType === 'monthly' || userType === 'yearly',
    daysRemaining: checkResult.daysRemaining,
    isLoading,
    createCheckoutSession,
    cancelSubscription,
    refresh: loadSubscription
  };
}