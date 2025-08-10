import { useState, useEffect } from 'react';

interface PriceInfo {
  id?: string;
  amount: number;
  currency: string;
  interval: string;
}

interface StripePrices {
  monthly: PriceInfo;
  yearly: PriceInfo;
}

export function useStripePrices() {
  const [prices, setPrices] = useState<StripePrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const response = await fetch('/api/get-prices');
        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }
        const data = await response.json();
        setPrices(data);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load prices');
        
        // Use fallback prices from environment
        const fallbackMonthly = process.env.NEXT_PUBLIC_FALLBACK_MONTHLY_PRICE ? 
          parseFloat(process.env.NEXT_PUBLIC_FALLBACK_MONTHLY_PRICE) : 8.99;
        const fallbackYearly = process.env.NEXT_PUBLIC_FALLBACK_YEARLY_PRICE ? 
          parseFloat(process.env.NEXT_PUBLIC_FALLBACK_YEARLY_PRICE) : 89.99;
        const fallbackCurrency = process.env.NEXT_PUBLIC_FALLBACK_CURRENCY || 'GBP';
        
        setPrices({
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
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  const formatPrice = (price: PriceInfo) => {
    const symbol = price.currency === 'GBP' ? '£' : 
                   price.currency === 'EUR' ? '€' : 
                   price.currency === 'JPY' ? '¥' : '$';
    
    // For JPY, don't show decimals
    const amount = price.currency === 'JPY' ? 
      Math.round(price.amount) : 
      price.amount.toFixed(2);
    
    return `${symbol}${amount}`;
  };

  return {
    prices,
    loading,
    error,
    formatPrice
  };
}