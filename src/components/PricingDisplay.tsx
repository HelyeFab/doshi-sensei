'use client';

import { useStripePrices } from '@/hooks/useStripePrices';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

interface PricingDisplayProps {
  planId: 'monthly' | 'yearly';
  showInterval?: boolean;
  className?: string;
}

export function PricingDisplay({ planId, showInterval = true, className = '' }: PricingDisplayProps) {
  const { prices, loading, formatPrice } = useStripePrices();
  
  // Fallback to static data if dynamic loading fails
  const staticPlan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  
  if (loading) {
    return <span className={`animate-pulse ${className}`}>...</span>;
  }
  
  if (!prices || !prices[planId]) {
    // Use static fallback
    const symbol = staticPlan?.currency === 'GBP' ? '£' : '$';
    return (
      <span className={className}>
        {symbol}{staticPlan?.price || '0'}
        {showInterval && <span className="text-sm">/{staticPlan?.interval || 'month'}</span>}
      </span>
    );
  }
  
  const price = prices[planId];
  
  return (
    <span className={className}>
      {formatPrice(price)}
      {showInterval && <span className="text-sm">/{price.interval}</span>}
    </span>
  );
}

export function PricingComparison() {
  const { prices, loading, formatPrice } = useStripePrices();
  
  if (!prices || loading) {
    return null;
  }
  
  const monthlyCost = prices.monthly.amount * 12;
  const yearlyCost = prices.yearly.amount;
  const savings = monthlyCost - yearlyCost;
  const savingsPercent = Math.round((savings / monthlyCost) * 100);
  
  if (savings <= 0) return null;
  
  return (
    <div className="text-sm text-green-600 dark:text-green-400">
      Save {formatPrice({ ...prices.monthly, amount: savings })} ({savingsPercent}%) with annual billing
    </div>
  );
}