'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

interface SubscriptionEvent {
  id: string;
  type: 'subscription_started' | 'subscription_updated' | 'subscription_canceled' | 'payment_succeeded' | 'payment_failed';
  status: string;
  plan: string;
  timestamp: Date;
  amount?: number;
  currency?: string;
  invoiceId?: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  paymentMethod?: {
    type: string;
    brand?: string;
    last4?: string;
  };
  attemptCount?: number;
  nextPaymentAttempt?: string;
  details?: any;
}

export default function SubscriptionHistory() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const historyRef = collection(db, 'users', user.uid, 'subscription_history');
        const q = query(historyRef, orderBy('timestamp', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        
        const history: SubscriptionEvent[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            type: data.type,
            status: data.status,
            plan: data.plan,
            timestamp: data.timestamp?.toDate() || new Date(),
            amount: data.amount,
            currency: data.currency,
            invoiceId: data.invoiceId,
            invoicePdf: data.invoicePdf,
            hostedInvoiceUrl: data.hostedInvoiceUrl,
            paymentMethod: data.paymentMethod,
            attemptCount: data.attemptCount,
            nextPaymentAttempt: data.nextPaymentAttempt,
            details: data.details
          });
        });
        
        setEvents(history);
      } catch (error) {
        console.error('Error loading subscription history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  const getEventIcon = (type: SubscriptionEvent['type']) => {
    switch (type) {
      case 'subscription_started':
        return '🎉';
      case 'subscription_updated':
        return '🔄';
      case 'subscription_canceled':
        return '🚫';
      case 'payment_succeeded':
        return '✅';
      case 'payment_failed':
        return '⚠️';
      default:
        return '📄';
    }
  };

  const getEventMessage = (event: SubscriptionEvent) => {
    switch (event.type) {
      case 'subscription_started':
        return `Started ${event.plan} subscription`;
      case 'subscription_updated':
        return `Updated to ${event.plan} plan`;
      case 'subscription_canceled':
        return 'Subscription canceled';
      case 'payment_succeeded':
        return 'Payment successful';
      case 'payment_failed':
        return 'Payment failed';
      default:
        return 'Subscription event';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const getEventColor = (type: SubscriptionEvent['type']) => {
    switch (type) {
      case 'subscription_started':
        return 'text-green-600 dark:text-green-400';
      case 'subscription_updated':
        return 'text-blue-600 dark:text-blue-400';
      case 'subscription_canceled':
        return 'text-gray-600 dark:text-gray-400';
      case 'payment_succeeded':
        return 'text-green-600 dark:text-green-400';
      case 'payment_failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Subscription History</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Subscription History</h3>
        <p className="text-muted-foreground text-center py-8">No subscription history yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Subscription History</h3>
      
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-1">{getEventIcon(event.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <p className={`font-medium ${getEventColor(event.type)}`}>
                    {getEventMessage(event)}
                  </p>
                  {event.amount && event.currency && (
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(event.amount, event.currency)}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mt-1">
                  {format(event.timestamp, 'MMM d, yyyy h:mm a')}
                </p>
                
                {/* Payment Method Info */}
                {event.paymentMethod && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {event.paymentMethod.brand && (
                      <span className="capitalize">{event.paymentMethod.brand}</span>
                    )}
                    {event.paymentMethod.last4 && (
                      <span> ending in {event.paymentMethod.last4}</span>
                    )}
                  </p>
                )}
                
                {/* Invoice Download Button */}
                {event.invoicePdf && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href={event.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Invoice
                    </a>
                    {event.hostedInvoiceUrl && (
                      <a
                        href={event.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground rounded-md transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Online
                      </a>
                    )}
                  </div>
                )}
                
                {/* Failed Payment Info */}
                {event.type === 'payment_failed' && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                    <p className="text-xs text-destructive">
                      {event.attemptCount && `Attempt ${event.attemptCount} failed. `}
                      {event.nextPaymentAttempt && (
                        <>Next retry: {format(new Date(event.nextPaymentAttempt), 'MMM d, yyyy')}</>
                      )}
                    </p>
                  </div>
                )}
                
                {/* Additional Details */}
                {event.type === 'subscription_started' && event.details?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Renews: {format(new Date(event.details.currentPeriodEnd), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {events.length >= 10 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Showing last 10 events
        </p>
      )}
    </div>
  );
}