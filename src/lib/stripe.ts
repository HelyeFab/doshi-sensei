import { loadStripe } from '@stripe/stripe-js';

// Replace with your Stripe publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Initialize Stripe
export const stripePromise = loadStripe(stripePublishableKey);

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: stripePublishableKey,
  // These should match your Stripe products/prices
  priceIds: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '',
  },
} as const;
