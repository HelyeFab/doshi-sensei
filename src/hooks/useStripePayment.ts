/**
 * useStripePayment Hook
 * Provides Stripe payment functionality with Google Pay and Apple Pay support
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { getStripe, checkPaymentRequestAvailable, formatPrice } from '@/lib/stripe';
import { subscriptionPricing } from '@/config/payment-providers';

export type PaymentMethod = 'card' | 'google_pay' | 'apple_pay';
export type SubscriptionInterval = 'monthly' | 'yearly';

interface PaymentRequestStatus {
  available: boolean;
  applePay: boolean;
  googlePay: boolean;
}

interface UseStripePaymentReturn {
  // Payment method availability
  paymentMethods: {
    card: boolean;
    googlePay: boolean;
    applePay: boolean;
  };
  
  // Loading states
  isLoading: boolean;
  isProcessing: boolean;
  
  // Actions
  createCheckoutSession: (interval: SubscriptionInterval, paymentMethod?: PaymentMethod) => Promise<void>;
  createPortalSession: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  
  // Utilities
  formatPrice: (amount: number) => string;
  pricing: typeof subscriptionPricing;
}

export function useStripePayment(): UseStripePaymentReturn {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentRequestStatus, setPaymentRequestStatus] = useState<PaymentRequestStatus>({
    available: false,
    applePay: false,
    googlePay: false,
  });

  // Check payment method availability on mount
  useEffect(() => {
    async function checkAvailability() {
      try {
        const status = await checkPaymentRequestAvailable();
        setPaymentRequestStatus(status);
      } catch (error) {
        console.error('Error checking payment methods:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAvailability();
  }, []);

  // Create checkout session
  const createCheckoutSession = useCallback(async (
    interval: SubscriptionInterval,
    paymentMethod: PaymentMethod = 'card'
  ) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      router.push('/account');
      return;
    }

    setIsProcessing(true);

    try {
      // For Google Pay and Apple Pay, we use Payment Request API
      if (paymentMethod === 'google_pay' || paymentMethod === 'apple_pay') {
        const stripe = await getStripe();
        if (!stripe) {
          throw new Error('Stripe not initialized');
        }

        // Create payment request for Google Pay / Apple Pay
        const pricing = subscriptionPricing[interval];
        const paymentRequest = stripe.paymentRequest({
          country: 'GB',
          currency: pricing.currency.toLowerCase(),
          total: {
            label: `Doshi Sensei ${interval === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`,
            amount: Math.round(pricing.amount * 100),
          },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        // Handle payment method
        paymentRequest.on('paymentmethod', async (ev) => {
          try {
            // Create checkout session with payment method
            const response = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                priceId: interval === 'monthly' 
                  ? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
                  : process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
                userId: user.uid,
                email: user.email,
                paymentMethodId: ev.paymentMethod.id,
                usePaymentRequest: true,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to create checkout session');
            }

            // Complete the payment
            ev.complete('success');
            
            // Redirect to success page
            router.push('/account?subscription=success');
          } catch (error) {
            ev.complete('fail');
            throw error;
          }
        });

        // Show payment request UI
        const result = await paymentRequest.canMakePayment();
        if (result) {
          paymentRequest.show();
        } else {
          throw new Error('Payment method not available');
        }
      } else {
        // Standard card checkout
        // Get Firebase ID token for authentication
        const idToken = await user.getIdToken();
        
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: interval === 'monthly' 
              ? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
              : process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
            userId: user.uid,
            userEmail: user.email,
            idToken: idToken,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        if (data.sessionUrl) {
          // Direct URL redirect (from Cloud Function)
          window.location.href = data.sessionUrl;
        } else if (data.sessionId) {
          // Legacy session ID redirect
          const stripe = await getStripe();
          if (!stripe) {
            throw new Error('Stripe not initialized');
          }

          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });

          if (error) {
            throw error;
          }
        } else {
          throw new Error('No checkout session URL received');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, router, toast]);

  // Create customer portal session
  const createPortalSession = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to manage your subscription');
      router.push('/account');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, router, toast]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to cancel your subscription');
      router.push('/account');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      router.push('/account?subscription=cancelled');
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, router, toast]);

  return {
    paymentMethods: {
      card: true, // Always available
      googlePay: paymentRequestStatus.googlePay,
      applePay: paymentRequestStatus.applePay,
    },
    isLoading,
    isProcessing,
    createCheckoutSession,
    createPortalSession,
    cancelSubscription,
    formatPrice,
    pricing: subscriptionPricing,
  };
}