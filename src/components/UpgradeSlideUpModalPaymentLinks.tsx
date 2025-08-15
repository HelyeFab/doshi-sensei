'use client';

import React, { useEffect } from 'react';
import SlideUpModal from './SlideUpModal';
import { useAuth } from '@/contexts/AuthContext';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { getPaymentLink, isUsingPaymentLinks } from '@/config/stripe-payment-links';
import { useStrings } from '@/contexts/LanguageContext';
import { useAnalytics } from '@/hooks/useAnalytics';

interface UpgradeSlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  feature?: string;
}

/**
 * Updated Upgrade Modal that uses Stripe Payment Links
 * This automatically supports Google Pay, Apple Pay, and cards
 */
export function UpgradeSlideUpModalPaymentLinks({ isOpen, onClose, message, feature }: UpgradeSlideUpModalProps) {
  const { user } = useAuth();
  const strings = useStrings();
  const { trackUpgradeModalShown, track } = useAnalytics();

  // Track modal shown
  useEffect(() => {
    if (isOpen) {
      trackUpgradeModalShown('feature_limit', feature);

    }
  }, [isOpen, feature, trackUpgradeModalShown]);

  const monthlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'monthly');
  const yearlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'yearly');

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    try {
      // Track upgrade plan selected
      track('upgrade_plan_selected', { plan, feature });

      // Get the payment link URL with user info prefilled
      const paymentUrl = getPaymentLink(
        plan,
        user?.uid,
        user?.email || undefined
      );

      if (!paymentUrl) {
        console.error('Payment link not configured');
        alert('Payment system is being configured. Please try again later.');
        return;
      }

      // Redirect to Stripe Payment Link
      // This will show Google Pay, Apple Pay, and card options automatically
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to start payment process. Please try again.');
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
            {monthlyPlan?.features.map((feature: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment method icons */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-xs text-muted-foreground">Pay with:</div>
          <div className="flex items-center gap-2">
            {/* Card icon */}
            <div className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-xs">💳</span>
            </div>
            {/* Google Pay */}
            <div className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-xs font-bold">G</span>
            </div>
            {/* Apple Pay */}
            <div className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-xs">🍎</span>
            </div>
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
            <div className="text-lg">£{yearlyPlan?.price || '89.99'}/year</div>
            <div className="text-sm opacity-90">{strings.subscriptions?.bestValue || "Best Value"}</div>
          </button>

          <button
            onClick={() => handleUpgrade('monthly')}
            className="w-full px-4 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
          >
            <div className="text-lg">£{monthlyPlan?.price || '8.99'}/month</div>
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
        
        <div className="text-xs text-muted-foreground mt-2">
          🔒 Secure payment via Stripe
        </div>
      </div>
    </SlideUpModal>
  );
}