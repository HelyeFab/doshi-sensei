'use client';

import React, { useEffect } from 'react';
import SlideUpModal from './SlideUpModal';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { STRIPE_CONFIG } from '@/lib/stripe';
import { useStrings } from '@/contexts/LanguageContext';
import { useAnalytics } from '@/hooks/useAnalytics';

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

  // Track modal shown
  useEffect(() => {
    if (isOpen) {
      trackUpgradeModalShown('feature_limit', feature);
      console.log('📊 [Analytics] Upgrade modal shown:', { trigger: 'feature_limit', feature });
    }
  }, [isOpen, feature, trackUpgradeModalShown]);

  const monthlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'monthly');
  const yearlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'yearly');

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    try {
      // Track upgrade plan selected
      track('upgrade_plan_selected', { plan, feature });
      console.log('📊 [Analytics] Upgrade plan selected:', { plan, feature });
      
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
    console.log('📊 [Analytics] Upgrade modal dismissed:', { feature });
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
            {monthlyPlan?.features.map((feature: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <button
            onClick={() => handleUpgrade('yearly')}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium relative"
          >
            <div className="absolute top-0 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-b transform translate-y-0">
              {strings.subscriptions?.savePercent || "Save 17%"}
            </div>
            <div className="text-lg">${yearlyPlan?.price}/year</div>
            <div className="text-sm opacity-90">{strings.subscriptions?.bestValue || "Best Value"}</div>
          </button>

          <button
            onClick={() => handleUpgrade('monthly')}
            className="w-full px-4 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
          >
            <div className="text-lg">${monthlyPlan?.price}/month</div>
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