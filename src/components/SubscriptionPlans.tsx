'use client';

import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { STRIPE_CONFIG } from '@/lib/stripe';

export default function SubscriptionPlans() {
  const { userSubscription, createCheckoutSession, cancelSubscription } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    setIsProcessing(true);
    try {
      const priceId = plan === 'monthly'
        ? STRIPE_CONFIG.priceIds.monthly
        : STRIPE_CONFIG.priceIds.yearly;

      await createCheckoutSession(priceId);
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.')) {
      return;
    }

    setIsProcessing(true);
    try {
      await cancelSubscription();
      alert('Subscription cancelled successfully. You will continue to have access until the end of your current billing period.');
    } catch (error) {
      console.error('Error cancelling:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPlan = userSubscription?.subscription.plan || 'free';
  const currentPlanData = SUBSCRIPTION_PLANS[currentPlan];

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Current Plan</h3>
          {currentPlan !== 'free' && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {currentPlanData.name}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="text-sm font-medium text-foreground">
              {currentPlanData.name} {currentPlan !== 'free' && `($${currentPlanData.price}/${currentPlan === 'monthly' ? 'month' : 'year'})`}
            </span>
          </div>

          {userSubscription && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Word Lists</span>
                <span className="text-sm font-medium text-foreground">
                  {userSubscription.limits.maxLists === -1 ? 'Unlimited' : `${userSubscription.currentUsage.listsCount}/${userSubscription.limits.maxLists}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Daily Drills</span>
                <span className="text-sm font-medium text-foreground">
                  {userSubscription.limits.maxDrillsPerDay === -1 ? 'Unlimited' : `${userSubscription.currentUsage.drillsToday}/${userSubscription.limits.maxDrillsPerDay}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cloud Sync</span>
                <span className="text-sm font-medium text-foreground">
                  {userSubscription.limits.canSync ? '✅ Available' : '❌ Not Available'}
                </span>
              </div>
            </>
          )}
        </div>

        {currentPlan !== 'free' && userSubscription?.subscription.stripeSubscriptionId && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-destructive border border-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Cancel Subscription'}
            </button>
          </div>
        )}
      </div>

      {/* Upgrade Options */}
      {currentPlan === 'free' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Upgrade Plans</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-foreground">Monthly</h4>
                <div className="text-3xl font-bold text-primary mt-2">
                  ${SUBSCRIPTION_PLANS.monthly.price}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {SUBSCRIPTION_PLANS.monthly.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-foreground">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade('monthly')}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                {isProcessing ? 'Processing...' : 'Upgrade to Monthly'}
              </button>
            </div>

            {/* Yearly Plan */}
            <div className="bg-card border border-primary rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  Best Value
                </span>
              </div>

              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-foreground">Yearly</h4>
                <div className="text-3xl font-bold text-primary mt-2">
                  ${SUBSCRIPTION_PLANS.yearly.price}
                  <span className="text-sm font-normal text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-green-600 mt-1">2 months free!</p>
              </div>

              <ul className="space-y-2 mb-6">
                {SUBSCRIPTION_PLANS.yearly.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-foreground">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade('yearly')}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                {isProcessing ? 'Processing...' : 'Upgrade to Yearly'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Plan Limitations */}
      {currentPlan === 'free' && userSubscription && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-500 text-lg">⚠️</span>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Free Plan Limitations</h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Limited to {userSubscription.limits.maxLists} word lists</li>
                <li>• Maximum {userSubscription.limits.maxDrillsPerDay} drills per day</li>
                <li>• No cloud sync across devices</li>
                <li>• Local storage only</li>
              </ul>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                Upgrade to unlock unlimited features and cloud sync!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
