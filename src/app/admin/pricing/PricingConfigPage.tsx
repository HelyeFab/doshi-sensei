'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';

interface PricingConfig {
  monthly: {
    amount: number;
    currency: string;
    stripePriceId: string;
  };
  yearly: {
    amount: number;
    currency: string;
    stripePriceId: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export default function PricingConfigPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showNotification } = useNotification();
  
  const [pricing, setPricing] = useState<PricingConfig>({
    monthly: { amount: 3.99, currency: 'usd', stripePriceId: '' },
    yearly: { amount: 39.99, currency: 'usd', stripePriceId: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  useEffect(() => {
    if (user && isAdmin) {
      loadPricing();
    }
  }, [user, isAdmin]);

  const loadPricing = async () => {
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) return;

      const response = await fetch('/api/admin/pricing-config', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.pricing) {
          setPricing(data.pricing);
        }
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
      showNotification('Error loading pricing configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const savePricing = async () => {
    try {
      setSaving(true);
      const idToken = await user?.getIdToken();
      if (!idToken) return;

      const response = await fetch('/api/admin/pricing-config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pricing)
      });

      if (response.ok) {
        showNotification('Pricing updated successfully!', 'success');
        await loadPricing(); // Reload to get updated timestamp
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to update pricing', 'error');
      }
    } catch (error) {
      console.error('Error saving pricing:', error);
      showNotification('Error saving pricing configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <AdminLayout title="Pricing Configuration">
        <div className="flex items-center justify-center h-64">
          <div className="text-4xl animate-spin">⏳</div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="Pricing Configuration">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Subscription Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Monthly Plan</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.monthly.amount}
                  onChange={(e) => setPricing({
                    ...pricing,
                    monthly: { ...pricing.monthly, amount: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Stripe Price ID</label>
                <input
                  type="text"
                  value={pricing.monthly.stripePriceId}
                  onChange={(e) => setPricing({
                    ...pricing,
                    monthly: { ...pricing.monthly, stripePriceId: e.target.value }
                  })}
                  placeholder="price_1Rak..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from your Stripe dashboard
                </p>
              </div>
            </div>

            {/* Yearly Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Yearly Plan</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.yearly.amount}
                  onChange={(e) => setPricing({
                    ...pricing,
                    yearly: { ...pricing.yearly, amount: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Stripe Price ID</label>
                <input
                  type="text"
                  value={pricing.yearly.stripePriceId}
                  onChange={(e) => setPricing({
                    ...pricing,
                    yearly: { ...pricing.yearly, stripePriceId: e.target.value }
                  })}
                  placeholder="price_1Rak..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from your Stripe dashboard
                </p>
              </div>
            </div>
          </div>

          {/* Calculated Values */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Calculated Values</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Monthly MRR per user:</span>
                <span className="ml-2 font-medium">${pricing.monthly.amount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Yearly MRR per user:</span>
                <span className="ml-2 font-medium">${(pricing.yearly.amount / 12).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Yearly discount:</span>
                <span className="ml-2 font-medium">
                  {((1 - (pricing.yearly.amount / (pricing.monthly.amount * 12))) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Last Updated Info */}
          {pricing.updatedAt && (
            <div className="mt-4 text-sm text-muted-foreground">
              Last updated: {new Date(pricing.updatedAt).toLocaleString()}
              {pricing.updatedBy && ` by ${pricing.updatedBy}`}
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={savePricing}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Pricing'}
            </button>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">⚠️ Important Notes</h4>
          <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>Changing prices here only affects how revenue is calculated in the dashboard</li>
            <li>To change actual subscription prices, you must create new price IDs in Stripe</li>
            <li>Existing subscribers will continue paying their original price</li>
            <li>New subscribers will use the prices configured in your checkout process</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}