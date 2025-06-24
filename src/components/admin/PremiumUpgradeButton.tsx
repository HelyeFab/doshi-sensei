'use client';

import { useState } from 'react';
import { AdminUserDetails } from '@/types/admin';
import { isPremiumPlan } from '@/types/subscription';

interface PremiumUpgradeButtonProps {
  user: AdminUserDetails;
  onUpgrade: (userId: string, plan: 'monthly' | 'yearly') => Promise<void>;
}

export function PremiumUpgradeButton({ user, onUpgrade }: PremiumUpgradeButtonProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const isPremium = user.subscription?.subscription?.plan === 'monthly' ||
                   user.subscription?.subscription?.plan === 'yearly';

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    if (isUpgrading) return;

    setIsUpgrading(true);
    try {
      await onUpgrade(user.id, plan);
      setShowOptions(false);
    } catch (error) {
      console.error('Upgrade failed:', error);
      // TODO: Show error notification
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isPremium) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
          ✓ Premium
        </span>
        <span className="text-xs text-muted-foreground">
          ({user.subscription?.subscription?.plan})
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isUpgrading}
        className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isUpgrading ? (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Upgrading...</span>
          </div>
        ) : (
          'Upgrade to Premium'
        )}
      </button>

      {showOptions && !isUpgrading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowOptions(false)}
          />

          {/* Options menu */}
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[200px]">
            <div className="p-3">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Choose Premium Plan
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() => handleUpgrade('monthly')}
                  className="w-full text-left p-2 hover:bg-muted rounded-lg transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">Monthly</div>
                      <div className="text-xs text-muted-foreground">$3.99/month</div>
                    </div>
                    <div className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                      📅
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpgrade('yearly')}
                  className="w-full text-left p-2 hover:bg-muted rounded-lg transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">Yearly</div>
                      <div className="text-xs text-muted-foreground">$39.99/year</div>
                      <div className="text-xs text-green-600 dark:text-green-400">Save 2 months!</div>
                    </div>
                    <div className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded">
                      🗓️
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-3 pt-2 border-t border-border">
                <button
                  onClick={() => setShowOptions(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
