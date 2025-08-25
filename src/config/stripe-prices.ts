/**
 * Stripe Price Configuration
 * 
 * Reads price IDs from environment variables (.env file)
 * This ensures .env is the single source of truth for price configuration
 */

export interface PriceConfig {
  monthly: string;
  yearly: string;
}

// Read from environment variables - single source of truth
export const STRIPE_PRICE_IDS: PriceConfig = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '',
};

// Helper function to get plan type from price ID
export function getPlanFromPriceId(priceId: string | null | undefined): 'free' | 'monthly' | 'yearly' {
  if (!priceId) return 'free';
  
  if (priceId === STRIPE_PRICE_IDS.monthly) return 'monthly';
  if (priceId === STRIPE_PRICE_IDS.yearly) return 'yearly';
  
  return 'free';
}

// Helper function to validate price ID
export function isValidPriceId(priceId: string): boolean {
  return priceId === STRIPE_PRICE_IDS.monthly || priceId === STRIPE_PRICE_IDS.yearly;
}

// Get the correct price ID for a plan
export function getPriceIdForPlan(plan: 'monthly' | 'yearly'): string {
  return STRIPE_PRICE_IDS[plan];
}

// Environment variable validation (to be called on startup)
export function validatePriceConfiguration(): boolean {
  const monthlyId = STRIPE_PRICE_IDS.monthly;
  const yearlyId = STRIPE_PRICE_IDS.yearly;
  
  if (!monthlyId || !yearlyId) {
    console.error('❌ Stripe price IDs not configured in environment variables');
    console.error('Please set NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID and NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID in .env');
    return false;
  }
  
  console.log('✅ Stripe price configuration loaded from environment:');
  console.log(`  Monthly: ${monthlyId}`);
  console.log(`  Yearly: ${yearlyId}`);
  
  return true;
}