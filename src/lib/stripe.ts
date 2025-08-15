import { loadStripe, Stripe } from '@stripe/stripe-js';

// Replace with your Stripe publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Singleton pattern to ensure Stripe is only loaded once
let stripePromiseInstance: Promise<Stripe | null> | null = null;
let loadAttempted = false;

// Smart loading function that checks environment and CSP
async function loadStripeSmartly(): Promise<Stripe | null> {
  // Don't attempt to load if already tried
  if (loadAttempted && stripePromiseInstance) {
    return await stripePromiseInstance;
  }
  
  loadAttempted = true;
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {

    return null;
  }
  
  // Check if we have a valid key
  if (!stripePublishableKey) {

    return null;
  }
  
  try {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {

    }
    
    const stripe = await loadStripe(stripePublishableKey);
    
    if (!stripe) {
      throw new Error('Stripe.js returned null');
    }
    
    if (process.env.NODE_ENV === 'development') {

    }
    
    return stripe;
  } catch (error) {
    // Only log errors in development or if it's a critical error
    if (process.env.NODE_ENV === 'development' || (error as Error).message?.includes('CSP')) {
      console.error('Failed to load Stripe.js:', error);
    }
    
    // Return null to prevent app crashes
    return null;
  }
}

// Defer Stripe initialization until actually needed
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromiseInstance && typeof window !== 'undefined' && stripePublishableKey) {
    stripePromiseInstance = loadStripeSmartly();
  }
  return stripePromiseInstance || Promise.resolve(null);
}

// Export for backward compatibility but recommend using getStripePromise()
export const stripePromise = getStripePromise();

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: stripePublishableKey,
  // These should match your Stripe products/prices
  priceIds: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '',
  },
} as const;
