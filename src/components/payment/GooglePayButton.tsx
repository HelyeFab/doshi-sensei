'use client';

import { useEffect, useState } from 'react';
import { GooglePayConfig, getProviderPrice } from '@/config/payment-providers';

interface GooglePayButtonProps {
  config: GooglePayConfig;
  plan: 'monthly' | 'yearly';
  userId: string;
  userEmail: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function GooglePayButton({
  config,
  plan,
  userId,
  userEmail,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}: GooglePayButtonProps) {
  const [paymentsClient, setPaymentsClient] = useState<any>(null);
  const [isReadyToPay, setIsReadyToPay] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const price = getProviderPrice('googlepay', plan);
  const priceInCents = Math.round(price * 100);

  // Load Google Pay SDK
  useEffect(() => {
    if (window.google?.payments?.api?.PaymentsClient) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://pay.google.com/gp/p/js/pay.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Pay SDK');
      onError(new Error('Failed to load Google Pay SDK'));
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize Google Pay client
  useEffect(() => {
    if (!scriptLoaded || !window.google?.payments?.api?.PaymentsClient || disabled) {
      return;
    }

    const client = new window.google.payments.api.PaymentsClient({
      environment: config.environment,
      merchantInfo: {
        merchantId: config.merchantId,
        merchantName: config.merchantName,
      },
      paymentDataCallbacks: {
        onPaymentAuthorized: (paymentData: any) => {
          // Process the payment through our backend
          return processPayment(paymentData);
        },
      },
    });

    setPaymentsClient(client);

    // Check if Google Pay is available
    const isReadyToPayRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [getCardPaymentMethod()],
    };

    client.isReadyToPay(isReadyToPayRequest)
      .then((response: any) => {
        if (response.result) {
          setIsReadyToPay(true);
        } else {

        }
      })
      .catch((err: any) => {
        console.error('Error checking Google Pay availability:', err);
      });
  }, [scriptLoaded, config, disabled]);

  const getCardPaymentMethod = () => {
    return {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
        billingAddressRequired: true,
        billingAddressParameters: {
          format: 'FULL',
        },
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: config.gateway,
          gatewayMerchantId: config.gatewayMerchantId,
        },
      },
    };
  };

  const getTransactionInfo = () => {
    return {
      displayItems: [
        {
          label: `Doshi Sensei ${plan === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`,
          type: 'SUBSCRIPTION',
          price: price.toFixed(2),
        },
      ],
      currencyCode: 'GBP',
      totalPriceStatus: 'FINAL',
      totalPrice: price.toFixed(2),
      totalPriceLabel: 'Total',
    };
  };

  const processPayment = async (paymentData: any) => {
    try {
      // Send payment data to our backend
      const response = await fetch('/api/googlepay/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentData: paymentData,
          userId: userId,
          userEmail: userEmail,
          plan: plan,
          amount: priceInCents,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment processing failed');
      }

      const result = await response.json();
      
      onSuccess(result);
      
      return {
        transactionState: 'SUCCESS',
      };
    } catch (error) {
      console.error('Error processing Google Pay payment:', error);
      onError(error);
      
      return {
        transactionState: 'ERROR',
        error: {
          reason: 'PAYMENT_FAILED',
          message: 'Payment could not be processed',
        },
      };
    }
  };

  const handleGooglePayClick = () => {
    if (!paymentsClient || !isReadyToPay || disabled) {
      return;
    }

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [getCardPaymentMethod()],
      transactionInfo: getTransactionInfo(),
      merchantInfo: {
        merchantId: config.merchantId,
        merchantName: config.merchantName,
      },
      callbackIntents: ['PAYMENT_AUTHORIZATION'],
    };

    paymentsClient.loadPaymentData(paymentDataRequest)
      .catch((err: any) => {
        if (err.statusCode === 'CANCELED') {

          if (onCancel) {
            onCancel();
          }
        } else {
          console.error('Google Pay error:', err);
          onError(err);
        }
      });
  };

  if (disabled || !isReadyToPay) {
    return (
      <div className="opacity-50 cursor-not-allowed">
        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
          {!isReadyToPay ? 'Google Pay not available' : 'Google Pay unavailable'}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleGooglePayClick}
      className="google-pay-button w-full bg-white border border-gray-300 rounded-lg p-3 flex items-center justify-center hover:bg-gray-50 transition-colors"
      aria-label="Pay with Google Pay"
    >
      <svg
        width="41"
        height="17"
        viewBox="0 0 41 17"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
      >
        <g>
          <path
            d="M19.526 2.635v4.083h2.518c.6 0 1.096-.202 1.488-.605.403-.402.605-.882.605-1.437 0-.544-.202-1.018-.605-1.422-.392-.413-.888-.62-1.488-.62h-2.518zm0 5.52v4.736h-1.504V1.198h3.99c1.013 0 1.873.337 2.582 1.012.72.675 1.08 1.497 1.08 2.466 0 .991-.36 1.819-1.08 2.482-.697.665-1.569.996-2.583.996h-2.485v.001z"
            fill="#5F6368"
          />
          <path
            d="M27.194 10.442c0 .392.166.718.499.98.332.26.722.391 1.168.391.633 0 1.125-.13 1.479-.393.354-.263.532-.65.532-1.162v-.349a2.306 2.306 0 0 0-.76-.415 3.616 3.616 0 0 0-.91-.132c-.588 0-1.039.132-1.351.393-.312.262-.468.598-.468 1.008 0 .387.155.705.466.954z"
            fill="#5F6368"
          />
        </g>
      </svg>
      <span className="text-gray-700 font-medium">Pay with Google Pay</span>
    </button>
  );
}