'use client';

import { AdminUserDetails } from '@/types/admin';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';
import { formatLimit, isPremiumPlan } from '@/types/subscription';

interface UserDetailsModalProps {
  user: AdminUserDetails;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (userId: string, plan: 'monthly' | 'yearly') => Promise<void>;
}

export function UserDetailsModal({ user, isOpen, onClose, onUpgrade }: UserDetailsModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date | undefined | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(date));
  };

  const getSubscriptionStatus = () => {
    const plan = user.subscription?.subscription?.plan;
    const status = user.subscription?.subscription?.status;

    if (plan === 'monthly' || plan === 'yearly') {
      return {
        type: 'Premium',
        plan: plan,
        status: status || 'active',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
      };
    }

    return {
      type: 'Free',
      plan: 'free',
      status: 'active',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
    };
  };

  const subscriptionInfo = getSubscriptionStatus();
  const limits = user.subscription?.limits;
  const usage = user.subscription?.currentUsage;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">
                User Details
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* User info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  {user.displayName?.[0] || user.email[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {user.displayName || 'Anonymous User'}
                  </h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    User ID: <code className="bg-muted px-1 rounded text-xs">{user.id}</code>
                  </p>
                </div>
              </div>

              {/* Account status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Account Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registered:</span>
                      <span className="text-foreground text-sm">{formatDate(user.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Login:</span>
                      <span className="text-foreground text-sm">{formatDate(user.lastLoginAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Subscription</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Plan:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${subscriptionInfo.bgColor} ${subscriptionInfo.color}`}>
                        {subscriptionInfo.type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing:</span>
                      <span className="text-foreground text-sm capitalize">{subscriptionInfo.plan}</span>
                    </div>
                    {user.subscription?.subscription?.renewalDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Renewal:</span>
                        <span className="text-foreground text-sm">
                          {formatDate(new Date(user.subscription.subscription.renewalDate))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Usage limits and current usage */}
              {limits && usage && (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Usage & Limits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Word Lists:</span>
                        <span className="text-foreground">
                          {usage.listsCount} / {limits.maxLists === -1 ? '∞' : limits.maxLists}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Drills Today:</span>
                        <span className="text-foreground">
                          {usage.drillsToday} / {limits.maxDrillsPerDay === -1 ? '∞' : limits.maxDrillsPerDay}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cloud Sync:</span>
                        <span className={limits.canSync ? 'text-green-600' : 'text-red-600'}>
                          {limits.canSync ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data Saving:</span>
                        <span className={limits.canSave ? 'text-green-600' : 'text-red-600'}>
                          {limits.canSave ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin actions */}
              <div className="border-t border-border pt-6">
                <h4 className="font-medium text-foreground mb-4">Admin Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <PremiumUpgradeButton user={user} onUpgrade={onUpgrade} />

                  <button className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-lg hover:bg-muted/80 transition-colors">
                    View Activity Log
                  </button>

                  <button className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-lg hover:bg-muted/80 transition-colors">
                    Reset Password
                  </button>

                  <button className="px-3 py-1 bg-destructive text-destructive-foreground text-xs rounded-lg hover:bg-destructive/90 transition-colors">
                    Suspend Account
                  </button>
                </div>
              </div>

              {/* Recent activity placeholder */}
              <div className="border-t border-border pt-6">
                <h4 className="font-medium text-foreground mb-4">Recent Activity</h4>
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <div className="text-muted-foreground text-sm">
                    Activity tracking coming soon...
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/20">
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
