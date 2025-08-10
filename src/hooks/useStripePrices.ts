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
        
        // Use fallback prices from environment or defaults
        setPrices({
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