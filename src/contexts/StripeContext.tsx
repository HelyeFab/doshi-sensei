/**
 * Stripe Context Provider
 * Provides Stripe instance and payment utilities to the app
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Stripe } from '@stripe/stripe-js';
import { getStripe } from '@/lib/stripe';

interface StripeContextType {
  stripe: Stripe | null;
  isLoading: boolean;
  error: Error | null;
}

const StripeContext = createContext<StripeContextType>({
  stripe: null,
  isLoading: true,
  error: null,
});

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadStripe() {
      try {
        const stripeInstance = await getStripe();
        setStripe(stripeInstance);
      } catch (err) {
        console.error('Failed to load Stripe:', err);
        setError(err instanceof Error ? err : new Error('Failed to load Stripe'));
      } finally {
        setIsLoading(false);
      }
    }

    loadStripe();
  }, []);

  return (
    <StripeContext.Provider value={{ stripe, isLoading, error }}>
      {children}
    </StripeContext.Provider>
  );
}

export function useStripe() {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
}