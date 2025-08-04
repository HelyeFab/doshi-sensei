import { loadStripe, Stripe } from '@stripe/stripe-js';

// Replace with your Stripe publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to load Stripe with retry logic
async function loadStripeWithRetry(attemptNumber = 1): Promise<Stripe | null> {
  try {
    console.log(`Loading Stripe.js (attempt ${attemptNumber}/${MAX_RETRIES})...`);
    const stripe = await loadStripe(stripePublishableKey);
    
    if (!stripe) {
      throw new Error('Stripe.js failed to load');
    }
    
    console.log('Stripe.js loaded successfully');
    return stripe;
  } catch (error) {
    console.error(`Failed to load Stripe.js (attempt ${attemptNumber}/${MAX_RETRIES}):`, error);
    
    if (attemptNumber < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return loadStripeWithRetry(attemptNumber + 1);
    }
    
    console.error('Failed to load Stripe.js after all retries');
    // Return null instead of throwing to prevent app crashes
    return null;
  }
}

// Initialize Stripe with error handling
export const stripePromise = stripePublishableKey 
  ? loadStripeWithRetry()
  : Promise.resolve(null);

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: stripePublishableKey,
  // These should match your Stripe products/prices
  priceIds: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '',
  },
} as const;
