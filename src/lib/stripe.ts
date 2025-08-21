/**
 * Stripe Configuration and Utilities
 * Provides Stripe initialization and helper functions
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { stripeConfig } from '@/config/payment-providers';

// Initialize Stripe instance (singleton)
let stripePromise: Promise<Stripe | null>;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!stripeConfig.publishableKey) {
      console.warn('Stripe publishable key not found');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(stripeConfig.publishableKey);
  }
  return stripePromise;
}

// Stripe payment request options for Google Pay and Apple Pay
export function getPaymentRequestOptions(amount: number, label: string = 'Doshi Sensei Subscription') {
  return {
    country: stripeConfig.paymentRequestOptions.country,
    currency: stripeConfig.paymentRequestOptions.currency,
    total: {
      label,
      amount: Math.round(amount * 100), // Convert to cents/pence
    },
    requestPayerName: stripeConfig.paymentRequestOptions.requestPayerName,
    requestPayerEmail: stripeConfig.paymentRequestOptions.requestPayerEmail,
  };
}

// Check if payment request (Google Pay/Apple Pay) is available
export async function checkPaymentRequestAvailable(): Promise<{
  available: boolean;
  applePay: boolean;
  googlePay: boolean;
}> {
  const stripe = await getStripe();
  if (!stripe) {
    return { available: false, applePay: false, googlePay: false };
  }

  const paymentRequest = stripe.paymentRequest(getPaymentRequestOptions(1000, 'Test'));
  
  const result = await paymentRequest.canMakePayment();
  
  return {
    available: result !== null,
    applePay: result?.applePay ?? false,
    googlePay: !result?.applePay && result !== null,
  };
}

// Format price for display
export function formatPrice(amount: number, currency: string = stripeConfig.currency): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Get subscription price IDs
export function getSubscriptionPriceIds() {
  return {
    monthly: stripeConfig.monthlyPriceId,
    yearly: stripeConfig.yearlyPriceId,
  };
}

// Validate Stripe configuration
export function isStripeConfigured(): boolean {
  return !!(
    stripeConfig.publishableKey &&
    stripeConfig.monthlyPriceId &&
    stripeConfig.yearlyPriceId
  );
}

// Export STRIPE_CONFIG for backward compatibility
export const STRIPE_CONFIG = {
  publishableKey: stripeConfig.publishableKey,
  priceIds: {
    monthly: stripeConfig.monthlyPriceId || '',
    yearly: stripeConfig.yearlyPriceId || '',
  },
} as const;