'use client';

import { useState } from 'react';
import { getEnabledProviders, PaymentProviderConfig } from '@/config/payment-providers';
import PayPalButton from './PayPalButton';
import GooglePayButton from './GooglePayButton';
import { loadStripe } from '@stripe/stripe-js';

interface PaymentMethodSelectorProps {
  plan: 'monthly' | 'yearly';
  userId: string;
  userEmail: string;
  onSuccess: (result: any) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
}

export default function PaymentMethodSelector({
  plan,
  userId,
  userEmail,
  onSuccess,
  onError,
  onCancel,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const providers = getEnabledProviders().filter(p => p.supportsSubscriptions);

  const handleStripeCheckout = async () => {
    setIsProcessing(true);
    
    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan === 'monthly' 
            ? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
            : process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
          userId: userId,
          userEmail: userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      onError(error);
      setIsProcessing(false);
    }
  };

  const renderPaymentButton = (provider: PaymentProviderConfig) => {
    switch (provider.id) {
      case 'stripe':
        return (
          <button
            onClick={handleStripeCheckout}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white rounded-lg p-4 flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <span className="mr-2">💳</span>
                Pay with Card
              </>
            )}
          </button>
        );
      
      case 'paypal':
        return (
          <PayPalButton
            config={provider as any}
            plan={plan}
            userId={userId}
            userEmail={userEmail}
            onSuccess={onSuccess}
            onError={onError}
            onCancel={onCancel}
            disabled={isProcessing}
          />
        );
      
      case 'googlepay':
        return (
          <GooglePayButton
            config={provider as any}
            plan={plan}
            userId={userId}
            userEmail={userEmail}
            onSuccess={onSuccess}
            onError={onError}
            onCancel={onCancel}
            disabled={isProcessing}
          />
        );
      
      default:
        return null;
    }
  };

  if (providers.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        No payment methods available
      </div>
    );
  }

  // If only one provider, show it directly
  if (providers.length === 1) {
    return (
      <div className="payment-method-selector">
        {renderPaymentButton(providers[0])}
      </div>
    );
  }

  // Multiple providers - show selection UI
  return (
    <div className="payment-method-selector space-y-4">
      <div className="text-sm text-gray-600 text-center mb-2">
        Choose your payment method
      </div>
      
      {!selectedMethod ? (
        <div className="grid gap-3">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedMethod(provider.id)}
              className="w-full border-2 border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{provider.icon}</span>
                <span className="font-medium">{provider.name}</span>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedMethod(null)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Choose different method
          </button>
          
          {renderPaymentButton(providers.find(p => p.id === selectedMethod)!)}
        </div>
      )}
      
      <div className="text-xs text-gray-500 text-center mt-4">
        <div className="flex items-center justify-center">
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Secure payment processing
        </div>
        <div className="mt-1">
          Cancel anytime from your account page
        </div>
      </div>
    </div>
  );
}