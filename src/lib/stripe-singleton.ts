'use client';

import { Stripe } from '@stripe/stripe-js';
import { stripePromise } from './stripe';

// Global singleton to track Stripe loading state
class StripeSingleton {
  private static instance: StripeSingleton;
  private loadPromise: Promise<Stripe | null> | null = null;
  private stripe: Stripe | null = null;
  private isLoading = false;
  private hasLoaded = false;
  private loadError: Error | null = null;

  private constructor() {}

  static getInstance(): StripeSingleton {
    if (!StripeSingleton.instance) {
      StripeSingleton.instance = new StripeSingleton();
    }
    return StripeSingleton.instance;
  }

  async getStripe(): Promise<Stripe | null> {
    // If already loaded, return immediately
    if (this.hasLoaded) {
      return this.stripe;
    }

    // If currently loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // If previously failed, don't retry
    if (this.loadError) {
      return null;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.loadStripeOnce();
    
    try {
      const result = await this.loadPromise;
      this.stripe = result;
      this.hasLoaded = true;
      return result;
    } catch (error) {
      this.loadError = error as Error;
      this.hasLoaded = true;
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadStripeOnce(): Promise<Stripe | null> {
    try {
      // Use the existing stripePromise
      const stripe = await stripePromise;
      return stripe;
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('StripeSingleton: Failed to load Stripe', error);
      }
      throw error;
    }
  }

  // Method to check if Stripe is available without triggering a load
  isAvailable(): boolean {
    return this.hasLoaded && this.stripe !== null;
  }

  // Method to check if loading failed
  hasFailed(): boolean {
    return this.hasLoaded && this.stripe === null;
  }
}

// Export the singleton instance
export const stripeSingleton = StripeSingleton.getInstance();

// Export a hook for React components
export function useStripeSingleton() {
  return {
    getStripe: () => stripeSingleton.getStripe(),
    isAvailable: () => stripeSingleton.isAvailable(),
    hasFailed: () => stripeSingleton.hasFailed(),
  };
}