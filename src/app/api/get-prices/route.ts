import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe only if the secret key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
  maxNetworkRetries: 2,
  timeout: 10000, // 10 second timeout
}) : null;

// Cache prices for 1 hour to avoid excessive API calls
let pricesCache: any = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Return cached prices if still valid
    if (pricesCache && Date.now() - cacheTime < CACHE_DURATION) {
      return NextResponse.json(pricesCache);
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.error('Stripe is not configured - missing STRIPE_SECRET_KEY');
      throw new Error('Payment service not configured');
    }

    // Fetch prices from Stripe
    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      console.error('Price IDs not configured:', { monthlyPriceId, yearlyPriceId });
      throw new Error('Price IDs not configured');
    }

    const [monthlyPrice, yearlyPrice] = await Promise.all([
      stripe.prices.retrieve(monthlyPriceId, { expand: ['product'] }),
      stripe.prices.retrieve(yearlyPriceId, { expand: ['product'] })
    ]);

    const prices = {
      monthly: {
        id: monthlyPrice.id,
        amount: monthlyPrice.unit_amount ? monthlyPrice.unit_amount / 100 : 0,
        currency: monthlyPrice.currency.toUpperCase(),
        interval: monthlyPrice.recurring?.interval || 'month'
      },
      yearly: {
        id: yearlyPrice.id,
        amount: yearlyPrice.unit_amount ? yearlyPrice.unit_amount / 100 : 0,
        currency: yearlyPrice.currency.toUpperCase(),
        interval: yearlyPrice.recurring?.interval || 'year'
      }
    };

    // Cache the results
    pricesCache = prices;
    cacheTime = Date.now();

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching prices:', error);
    
    // Return fallback prices from environment
    const fallbackMonthly = process.env.FALLBACK_MONTHLY_PRICE ? 
      parseFloat(process.env.FALLBACK_MONTHLY_PRICE) : 8.99;
    const fallbackYearly = process.env.FALLBACK_YEARLY_PRICE ? 
      parseFloat(process.env.FALLBACK_YEARLY_PRICE) : 89.99;
    const fallbackCurrency = process.env.FALLBACK_CURRENCY || 'GBP';
    
    return NextResponse.json({
      monthly: {
        amount: fallbackMonthly,
        currency: fallbackCurrency,
        interval: 'month'
      },
      yearly: {
        amount: fallbackYearly,
        currency: fallbackCurrency,
        interval: 'year'
      }
    });
  }
}