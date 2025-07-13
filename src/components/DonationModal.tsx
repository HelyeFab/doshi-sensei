'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useStrings } from '@/contexts/LanguageContext';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DONATION_AMOUNTS = [
  { label: '$3', value: 300, popular: false },
  { label: '$5', value: 500, popular: true },
  { label: '$10', value: 1000, popular: false },
  { label: '$25', value: 2500, popular: false },
];

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const { user } = useAuth();
  const strings = useStrings();
  const [selectedAmount, setSelectedAmount] = useState(500); // Default $5
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const finalAmount = isCustom ? Math.round(parseFloat(customAmount || '0') * 100) : selectedAmount;

  const handleStripeClick = async () => {
    if (finalAmount < 100) {
      setErrorMessage(strings.subscriptions.minimumDonation);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-donation-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          userEmail: user?.email,
          userName: user?.displayName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        console.error('Donation session creation failed:', data.error);
        setErrorMessage(strings.subscriptions.donationFailed);
      }
    } catch (error) {
      console.error('Error creating donation session:', error);
      setErrorMessage(strings.subscriptions.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPalClick = async () => {
    if (finalAmount < 100) {
      setErrorMessage(strings.subscriptions.minimumDonation);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-paypal-donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          userEmail: user?.email,
          userName: user?.displayName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        console.error('PayPal order creation failed:', data.error);
        setErrorMessage(strings.subscriptions.paypalFailed);
      }
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      setErrorMessage(strings.subscriptions.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setIsCustom(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 text-center">
          <div className="text-4xl mb-3">☕</div>
          <h2 className="text-xl font-semibold mb-1">{strings.subscriptions.supportDeveloper}</h2>
          <p className="text-primary-foreground/80 text-sm">
            {strings.subscriptions.supportDescription}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Amount Selection */}
          <div className="space-y-3">
            <p className="text-center text-muted-foreground text-sm">
              {strings.subscriptions.chooseDonationAmount}
            </p>

            {/* Preset Amounts */}
            <div className="grid grid-cols-2 gap-2">
              {DONATION_AMOUNTS.map((amount) => (
                <button
                  key={amount.value}
                  onClick={() => handleAmountSelect(amount.value)}
                  className={`relative p-3 rounded-lg border transition-all ${selectedAmount === amount.value && !isCustom
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-foreground'
                    }`}
                >
                  {amount.popular && (
                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                      {strings.subscriptions.popular}
                    </div>
                  )}
                  <div className="font-medium">{amount.label}</div>
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder={strings.subscriptions.customAmount}
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  min="1"
                  step="0.01"
                  className={`flex-1 px-3 py-2 border rounded-lg bg-background text-foreground ${isCustom ? 'border-primary' : 'border-border'
                    } focus:outline-none focus:border-primary`}
                />
                <span className="text-muted-foreground text-sm">USD</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-center text-muted-foreground text-sm">
              {strings.subscriptions.securePaymentViaStripe}
            </p>

            {/* Stripe Button */}
            <button
              onClick={handleStripeClick}
              disabled={isLoading || finalAmount < 100}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-xl p-4 flex items-center justify-center space-x-3 transition-colors group"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="font-medium">Processing...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-indigo-600 font-bold text-sm">S</span>
                  </div>
                  <span className="font-medium">
                    {strings.subscriptions.donateViaStripe.replace('{amount}', (finalAmount / 100).toFixed(2))}
                  </span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6L16 12l-6 6" />
                  </svg>
                </>
              )}
            </button>

            {/* PayPal Button - Temporarily Hidden */}
            {false && (
              <button
                onClick={handlePayPalClick}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl p-4 flex items-center justify-center space-x-3 transition-colors group"
              >
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">P</span>
                </div>
                <span className="font-medium">
                  {strings.subscriptions.donateViaPayPal.replace('{amount}', (finalAmount / 100).toFixed(2))}
                </span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6L16 12l-6 6" />
                </svg>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 rounded-xl p-3 transition-colors disabled:opacity-50"
            >
              {strings.subscriptions.maybeLater}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-muted-foreground">
            {strings.subscriptions.yourSupportHelps}
          </p>
        </div>
      </div>

      {/* Error Message Modal */}
      {errorMessage && (
        <ConfirmationDialog
          isOpen={!!errorMessage}
          title="Error"
          message={errorMessage}
          confirmText="OK"
          cancelText=""
          isDestructive={false}
          onConfirm={() => setErrorMessage(null)}
          onCancel={() => setErrorMessage(null)}
          loading={false}
        />
      )}
    </div>
  );
}
