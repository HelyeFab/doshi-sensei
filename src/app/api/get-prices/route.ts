import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    // Fetch prices from Stripe
    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
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
    
    // Return default prices as fallback
    return NextResponse.json({
      monthly: {
        amount: 8.99,
        currency: 'GBP',
        interval: 'month'
      },
      yearly: {
        amount: 89.99,
        currency: 'GBP',
        interval: 'year'
      }
    });
  }
}