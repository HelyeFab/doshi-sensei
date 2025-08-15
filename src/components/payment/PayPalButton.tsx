'use client';

import { useEffect, useRef, useState } from 'react';
import { PayPalConfig } from '@/config/payment-providers';

interface PayPalButtonProps {
  config: PayPalConfig;
  plan: 'monthly' | 'yearly';
  userId: string;
  userEmail: string;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButton({
  config,
  plan,
  userId,
  userEmail,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}: PayPalButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load PayPal SDK
  useEffect(() => {
    if (window.paypal) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    const planId = plan === 'monthly' ? config.monthlyPlanId : config.yearlyPlanId;
    
    script.src = `https://www.paypal.com/sdk/js?client-id=${config.clientId}&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load PayPal SDK');
      onError(new Error('Failed to load PayPal SDK'));
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [config.clientId]);

  // Initialize PayPal button
  useEffect(() => {
    if (!scriptLoaded || !window.paypal || !paypalRef.current || disabled) {
      return;
    }

    const planId = plan === 'monthly' ? config.monthlyPlanId : config.yearlyPlanId;
    
    setIsLoading(true);

    // Clear any existing buttons
    paypalRef.current.innerHTML = '';

    try {
      window.paypal.Buttons({
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            plan_id: planId,
            subscriber: {
              email_address: userEmail,
            },
            custom_id: userId, // Store Firebase user ID for webhook processing
          });
        },
        onApprove: async function(data: any, actions: any) {
          // The subscription is approved by PayPal
          // Send the subscription ID to our backend for processing
          try {
            const response = await fetch('/api/paypal/subscription-created', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscriptionId: data.subscriptionID,
                userId: userId,
                plan: plan,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to process subscription');
            }

            const result = await response.json();
            onSuccess(result);
          } catch (error) {
            console.error('Error processing PayPal subscription:', error);
            onError(error);
          }
        },
        onError: function(err: any) {
          console.error('PayPal error:', err);
          onError(err);
        },
        onCancel: function(data: any) {

          if (onCancel) {
            onCancel();
          }
        },
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
        },
      }).render(paypalRef.current);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error rendering PayPal button:', error);
      onError(error);
      setIsLoading(false);
    }
  }, [scriptLoaded, plan, userId, userEmail, disabled, config.monthlyPlanId, config.yearlyPlanId]);

  if (disabled) {
    return (
      <div className="opacity-50 cursor-not-allowed">
        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
          PayPal unavailable
        </div>
      </div>
    );
  }

  return (
    <div className="paypal-button-container">
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
          <span className="ml-2 text-gray-600">Loading PayPal...</span>
        </div>
      )}
      <div ref={paypalRef} className={isLoading ? 'hidden' : ''} />
    </div>
  );
}