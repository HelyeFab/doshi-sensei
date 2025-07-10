'use client';

import { useState } from 'react';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useFeature } from '@/hooks/useFeature';
import { useNotification } from '@/contexts/NotificationContext';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { STRIPE_CONFIG } from '@/lib/stripe';
import { useStrings } from '@/hooks/useLanguage';

export default function SubscriptionPlans() {
  const strings = useStrings();
  const { subscription, isPremium, userType, isLoading, createCheckoutSession, cancelSubscription } = useSubscription2();
  const { feature: drillFeature, access: drillAccess } = useFeature('drill_practice');
  const { feature: listFeature, access: listAccess } = useFeature('word_lists');
  const { feature: articleFeature, access: articleAccess } = useFeature('article_reading');
  const { feature: gameFeature, access: gameAccess } = useFeature('kanji_quest');
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    setIsProcessing(true);
    try {
      const priceId = plan === 'monthly'
        ? STRIPE_CONFIG.priceIds.monthly
        : STRIPE_CONFIG.priceIds.yearly;

      await createCheckoutSession(priceId);
    } catch (error) {
      console.error('Error upgrading:', error);
      showNotification({
        title: strings.subscriptions.upgradeFailed,
        message: strings.subscriptions.upgradeFailedMessage,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    setShowCancelConfirm(false);
    setIsProcessing(true);
    try {
      await cancelSubscription();
      showNotification({
        title: strings.subscriptions.subscriptionCancelled,
        message: strings.subscriptions.subscriptionCancelledMessage,
        type: 'success'
      });
    } catch (error) {
      console.error('Error cancelling:', error);
      showNotification({
        title: strings.subscriptions.cancellationFailed,
        message: strings.subscriptions.cancellationFailedMessage,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPlan = subscription?.plan || 'free';
  const currentPlanData = SUBSCRIPTION_PLANS.find(plan => plan.id === currentPlan);
  const monthlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'monthly');
  const yearlyPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === 'yearly');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{strings.subscriptions.currentPlan}</h3>
          {currentPlan !== 'free' && currentPlanData && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {currentPlanData.name}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{strings.subscriptions.plan}</span>
            <span className="text-sm font-medium text-foreground">
              {currentPlanData?.name || 'Free'} {currentPlan !== 'free' && currentPlanData && `($${currentPlanData.price}/${currentPlan === 'monthly' ? 'month' : 'year'})`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{strings.subscriptions.wordLists}</span>
            <span className="text-sm font-medium text-foreground">
              {isPremium ? strings.subscriptions.unlimited : listAccess?.limit === -1 ? strings.subscriptions.unlimited : `${listAccess?.limit || 3} max`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{strings.subscriptions.dailyDrills}</span>
            <span className="text-sm font-medium text-foreground">
              {isPremium ? strings.subscriptions.unlimited : drillAccess?.limit === -1 ? strings.subscriptions.unlimited : `${drillAccess?.limit || 3}/day`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{strings.subscriptions.dailyArticles}</span>
            <span className="text-sm font-medium text-foreground">
              {isPremium ? strings.subscriptions.unlimited : articleAccess?.limit === -1 ? strings.subscriptions.unlimited : `${articleAccess?.limit || 3}/day`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{strings.subscriptions.dailyGames}</span>
            <span className="text-sm font-medium text-foreground">
              {isPremium ? strings.subscriptions.unlimited : gameAccess?.limit === -1 ? strings.subscriptions.unlimited : `${gameAccess?.limit || 3}/day`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{strings.subscriptions.cloudSync}</span>
            <span className="text-sm font-medium text-foreground">
              {isPremium || userType !== 'guest' ? strings.subscriptions.available : strings.subscriptions.notAvailable}
            </span>
          </div>
        </div>

        {currentPlan !== 'free' && subscription?.stripeSubscriptionId && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-destructive border border-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {isProcessing ? strings.subscriptions.processing : strings.subscriptions.cancelSubscription}
            </button>
          </div>
        )}
      </div>

      {/* Upgrade Options */}
      {currentPlan === 'free' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{strings.subscriptions.upgradePlans}</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            {monthlyPlan && (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-foreground">Monthly</h4>
                  <div className="text-3xl font-bold text-primary mt-2">
                    ${monthlyPlan.price}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {monthlyPlan.features.map((feature: string, index: number) => (
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
                  {isProcessing ? strings.subscriptions.processing : strings.subscriptions.upgradeToMonthly}
                </button>
              </div>
            )}

            {/* Yearly Plan */}
            {yearlyPlan && (
              <div className="bg-card border border-primary rounded-lg p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    {strings.subscriptions.bestValue}
                  </span>
                </div>

                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-foreground">Yearly</h4>
                  <div className="text-3xl font-bold text-primary mt-2">
                    ${yearlyPlan.price}
                    <span className="text-sm font-normal text-muted-foreground">/year</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">{strings.subscriptions.twoMonthsFree}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {yearlyPlan.features.map((feature: string, index: number) => (
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
                  {isProcessing ? strings.subscriptions.processing : strings.subscriptions.upgradeToYearly}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Free Plan Limitations */}
      {currentPlan === 'free' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Free Plan Limitations</h4>
              <ul className="text-sm text-yellow-900 dark:text-yellow-100 space-y-1 font-medium">
                <li>• Limited to {listFeature?.limit || 3} word lists</li>
                <li>• Maximum {drillFeature?.limit || 3} drills per day</li>
                <li>• No cloud sync across devices</li>
                <li>• Local storage only</li>
              </ul>
              <p className="text-sm text-yellow-900 dark:text-yellow-100 mt-3 font-medium">
                ⬆️ Upgrade to unlock unlimited features and cloud sync!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-lg font-semibold mb-4">Cancel Subscription?</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={confirmCancel}
                disabled={isProcessing}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
