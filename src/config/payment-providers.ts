/**
 * Payment Provider Configuration
 * Configures Stripe as the primary payment provider with support for
 * Google Pay and Apple Pay through Stripe's Payment Request API
 */

export interface PaymentProvider {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  icon?: string;
  supportsSubscriptions: boolean;
  supportsDonations: boolean;
  requiresSetup?: boolean;
}

export interface PaymentConfig {
  providers: PaymentProvider[];
  defaultProvider: string;
  currency: string;
  countryCode: string;
}

// Payment providers configuration
export const paymentProviders: PaymentProvider[] = [
  {
    id: 'stripe',
    name: 'Card Payment',
    description: 'Pay with credit or debit card',
    enabled: true,
    icon: '💳',
    supportsSubscriptions: true,
    supportsDonations: true,
    requiresSetup: false,
  },
  {
    id: 'google_pay',
    name: 'Google Pay',
    description: 'Fast checkout with Google Pay',
    enabled: true,
    icon: '🔵',
    supportsSubscriptions: true,
    supportsDonations: true,
    requiresSetup: false, // Handled through Stripe Payment Request
  },
  {
    id: 'apple_pay',
    name: 'Apple Pay',
    description: 'Fast checkout with Apple Pay',
    enabled: true,
    icon: '🍎',
    supportsSubscriptions: true,
    supportsDonations: true,
    requiresSetup: false, // Handled through Stripe Payment Request
  },
];

// Main payment configuration
export const paymentConfig: PaymentConfig = {
  providers: paymentProviders,
  defaultProvider: 'stripe',
  currency: process.env.NEXT_PUBLIC_CURRENCY || 'GBP',
  countryCode: process.env.NEXT_PUBLIC_COUNTRY_CODE || 'GB',
};

// Helper functions
export function getEnabledProviders(): PaymentProvider[] {
  return paymentProviders.filter(provider => provider.enabled);
}

export function getProvider(id: string): PaymentProvider | undefined {
  return paymentProviders.find(provider => provider.id === id);
}

export function isProviderEnabled(id: string): boolean {
  const provider = getProvider(id);
  return provider?.enabled ?? false;
}

export function supportsSubscriptions(id: string): boolean {
  const provider = getProvider(id);
  return provider?.supportsSubscriptions ?? false;
}

export function supportsDonations(id: string): boolean {
  const provider = getProvider(id);
  return provider?.supportsDonations ?? false;
}

// Stripe-specific configuration
export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '',
  yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || '',
  currency: process.env.NEXT_PUBLIC_CURRENCY || 'GBP',
  // Payment Request API options for Google Pay and Apple Pay
  paymentRequestOptions: {
    country: process.env.NEXT_PUBLIC_COUNTRY_CODE || 'GB',
    currency: (process.env.NEXT_PUBLIC_CURRENCY || 'GBP').toLowerCase(),
    requestPayerName: true,
    requestPayerEmail: true,
  },
};

// Subscription pricing (with fallbacks)
export const subscriptionPricing = {
  monthly: {
    amount: parseFloat(process.env.NEXT_PUBLIC_MONTHLY_PRICE || '8.99'),
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'GBP',
    interval: 'month' as const,
  },
  yearly: {
    amount: parseFloat(process.env.NEXT_PUBLIC_YEARLY_PRICE || '89.99'),
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'GBP',
    interval: 'year' as const,
  },
};