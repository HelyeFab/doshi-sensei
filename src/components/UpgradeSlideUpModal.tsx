'use client';

import React, { useEffect } from 'react';
import SlideUpModal from './SlideUpModal';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { STRIPE_CONFIG } from '@/lib/stripe';
import { useStrings } from '@/contexts/LanguageContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStripePrices } from '@/hooks/useStripePrices';
import { useSubscriptionFeatures } from '@/hooks/useSubscriptionFeatures';

interface UpgradeSlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  feature?: string;
}

export function UpgradeSlideUpModal({ isOpen, onClose, message, feature }: UpgradeSlideUpModalProps) {
  const { createCheckoutSession } = useSubscription2();
  const strings = useStrings();
  const { trackUpgradeModalShown, track } = useAnalytics();
  const { prices, loading: pricesLoading, formatPrice } = useStripePrices();
  const { features: dynamicFeatures, loading: featuresLoading } = useSubscriptionFeatures();

  // Track modal shown
  useEffect(() => {
    if (isOpen) {
      trackUpgradeModalShown('feature_limit', feature);

    }
  }, [isOpen, feature, trackUpgradeModalShown]);

  const monthlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'monthly');
  const yearlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'yearly');

  // Calculate savings percentage dynamically
  const calculateSavings = () => {
    if (!prices?.monthly || !prices?.yearly) return 0;
    const monthlyTotal = prices.monthly.amount * 12;
    const yearlyTotal = prices.yearly.amount;
    const savings = ((monthlyTotal - yearlyTotal) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  const savingsPercent = calculateSavings();

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    try {
      // Track upgrade plan selected
      track('upgrade_plan_selected', { plan, feature });

      const priceId = plan === 'monthly'
        ? STRIPE_CONFIG.priceIds.monthly
        : STRIPE_CONFIG.priceIds.yearly;

      await createCheckoutSession(priceId);
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  const handleClose = () => {
    track('upgrade_modal_dismissed', { feature });

    onClose();
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={handleClose}
      height="auto"
      title={strings.subscriptions?.upgradeToPremium || "Upgrade to Premium"}
      showHandle={false}
    >
      <div className="text-center">
        <div className="text-4xl mb-4">✨</div>
        <p className="text-muted-foreground mb-6 text-sm">
          {message}
        </p>

        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 mb-6">
          <div className="text-sm text-muted-foreground mb-2">
            <strong>{strings.subscriptions?.premiumBenefits || "Premium Benefits"}</strong>
          </div>
          <div className="text-sm text-foreground space-y-1">
            {featuresLoading ? (
              <div className="text-center py-2">Loading features...</div>
            ) : (
              // Use dynamic features from Firestore, defaulting to monthly plan features
              (dynamicFeatures.monthly || dynamicFeatures.yearly || []).map((feature, index) => (
                <div key={feature.id || index} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{feature.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <button
            onClick={() => handleUpgrade('yearly')}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium relative"
            disabled={pricesLoading}
          >
            {savingsPercent > 0 && (
              <div className="absolute top-0 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-b transform translate-y-0">
                Save {savingsPercent}%
              </div>
            )}
            <div className="text-lg">
              {pricesLoading ? 
                "Loading..." : 
                prices?.yearly ? 
                  `${formatPrice(prices.yearly)}/year` : 
                  "$89/year"
              }
            </div>
            <div className="text-sm opacity-90">{strings.subscriptions?.bestValue || "Best Value"}</div>
          </button>

          <button
            onClick={() => handleUpgrade('monthly')}
            className="w-full px-4 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
            disabled={pricesLoading}
          >
            <div className="text-lg">
              {pricesLoading ? 
                "Loading..." : 
                prices?.monthly ? 
                  `${formatPrice(prices.monthly)}/month` : 
                  "$9/month"
              }
            </div>
            <div className="text-sm opacity-70">{strings.subscriptions?.monthlyPlan || "Monthly Plan"}</div>
          </button>
        </div>

        <button
          onClick={handleClose}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {strings.subscriptions?.maybeLater || "Maybe Later"}
        </button>

        <div className="text-xs text-muted-foreground mt-3">
          {strings.subscriptions?.cancelAnytime || "Cancel anytime, no questions asked"}
        </div>
      </div>
    </SlideUpModal>
  );
}