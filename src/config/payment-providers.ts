/**
 * Payment Provider Configuration
 * Centralized configuration for all payment methods
 */

export interface PaymentProvider {
  id: 'stripe' | 'paypal' | 'googlepay';
  name: string;
  enabled: boolean;
  icon?: string;
  requiresAuth?: boolean;
  supportsSubscriptions: boolean;
  supportedCountries?: string[];
}

export interface StripeConfig extends PaymentProvider {
  id: 'stripe';
  publishableKey: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  webhookSecret?: string;
}

export interface PayPalConfig extends PaymentProvider {
  id: 'paypal';
  clientId: string;
  monthlyPlanId: string;
  yearlyPlanId: string;
  environment: 'sandbox' | 'production';
  webhookId?: string;
}

export interface GooglePayConfig extends PaymentProvider {
  id: 'googlepay';
  merchantId: string;
  merchantName: string;
  environment: 'TEST' | 'PRODUCTION';
  gateway: string;
  gatewayMerchantId: string;
}

export type PaymentProviderConfig = StripeConfig | PayPalConfig | GooglePayConfig;

// Payment provider configuration
export const PAYMENT_PROVIDERS: Record<string, PaymentProviderConfig> = {
  stripe: {
    id: 'stripe',
    name: 'Credit/Debit Card',
    enabled: true,
    supportsSubscriptions: true,
    icon: '💳',
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    enabled: process.env.NEXT_PUBLIC_PAYPAL_ENABLED === 'true',
    supportsSubscriptions: true,
    icon: '🅿️',
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    monthlyPlanId: process.env.NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID || '',
    yearlyPlanId: process.env.NEXT_PUBLIC_PAYPAL_YEARLY_PLAN_ID || '',
    environment: (process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
    supportedCountries: ['US', 'UK', 'CA', 'AU', 'JP', 'EU'],
  },
  googlepay: {
    id: 'googlepay',
    name: 'Google Pay',
    enabled: process.env.NEXT_PUBLIC_GOOGLEPAY_ENABLED === 'true',
    supportsSubscriptions: false, // Google Pay will process through Stripe
    icon: '🅶',
    merchantId: process.env.NEXT_PUBLIC_GOOGLEPAY_MERCHANT_ID || '',
    merchantName: 'Doshi Sensei',
    environment: (process.env.NEXT_PUBLIC_GOOGLEPAY_ENVIRONMENT as 'TEST' | 'PRODUCTION') || 'TEST',
    gateway: 'stripe',
    gatewayMerchantId: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    supportedCountries: ['US', 'UK', 'CA', 'AU', 'JP'],
  },
};

// Helper functions
export function getEnabledProviders(): PaymentProviderConfig[] {
  return Object.values(PAYMENT_PROVIDERS).filter(provider => provider.enabled);
}

export function getProvider(id: string): PaymentProviderConfig | undefined {
  return PAYMENT_PROVIDERS[id];
}

export function isProviderEnabled(id: string): boolean {
  const provider = PAYMENT_PROVIDERS[id];
  return provider?.enabled || false;
}

export function getSubscriptionProviders(): PaymentProviderConfig[] {
  return Object.values(PAYMENT_PROVIDERS).filter(
    provider => provider.enabled && provider.supportsSubscriptions
  );
}

// Price formatting helper
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Get price based on provider and plan
export function getProviderPrice(provider: string, plan: 'monthly' | 'yearly'): number {
  // These should match your actual prices
  const prices = {
    monthly: 8.99, // £8.99
    yearly: 89.99, // £89.99
  };
  
  return prices[plan];
}