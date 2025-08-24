'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { InvoiceData } from '@/components/invoice/InvoiceTemplate';

// Dynamic import to avoid SSR issues with PDF generation
const InvoiceDownloadButton = dynamic(
  () => import('@/components/InvoiceDownloadButton'),
  { ssr: false }
);

interface SubscriptionEvent {
  id: string;
  type: 'subscription_started' | 'subscription_updated' | 'subscription_canceled' | 'subscription_scheduled_cancellation' | 'payment_succeeded' | 'payment_failed';
  status: string;
  plan: string;
  timestamp: Date;
  amount?: number;
  currency?: string;
  invoiceId?: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  paymentMethod?: string | {
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
          console.log('Subscription event from Firestore:', {
            id: doc.id,
            type: data.type,
            amount: data.amount,
            currency: data.currency,
            hasInvoicePdf: !!data.invoicePdf,
            hasHostedUrl: !!data.hostedInvoiceUrl,
            details: data.details,
            currentPeriodEnd: data.currentPeriodEnd,
            cancelAtPeriodEnd: data.cancelAtPeriodEnd
          });
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
        
        // Filter out "free plan" events if they're at the start of history
        // These are created when a user first signs up and aren't meaningful
        const filteredHistory = history.filter((event, index) => {
          // Keep all non-free-plan events
          if (event.plan !== 'free') return true;
          
          // If this is a cancellation event (user canceled their subscription), keep it
          if (event.type === 'subscription_canceled') return true;
          
          // If there are other non-free events, keep free plan events (they represent downgrades)
          const hasNonFreeEvents = history.some(e => e.plan !== 'free');
          if (hasNonFreeEvents && index > 0) return true;
          
          // Otherwise, filter out the free plan event (it's just initial signup noise)
          return false;
        });
        
        setEvents(filteredHistory);
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
      case 'subscription_scheduled_cancellation':
        return '⏰';
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
        if (event.details?.message) {
          return event.details.message;
        }
        return `Canceled ${event.plan} subscription`;
      case 'subscription_scheduled_cancellation':
        // Calculate the end date based on plan type and start date
        if (event.details?.currentPeriodEnd) {
          const endDate = new Date(event.details.currentPeriodEnd);
          return `Subscription will end on ${format(endDate, 'MMMM d, yyyy')}`;
        }
        // Fallback: estimate based on plan type
        const endDate = new Date(event.timestamp);
        if (event.plan === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
        return `Subscription will end on ${format(endDate, 'MMMM d, yyyy')}`;
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

  const createInvoiceData = (event: SubscriptionEvent): InvoiceData | null => {
    if (!event.amount || !event.currency) return null;
    
    const planName = event.plan === 'monthly' ? 'Monthly' : event.plan === 'yearly' ? 'Yearly' : 'Premium';
    
    return {
      invoiceNumber: event.invoiceId || event.id,
      invoiceDate: event.timestamp.toISOString(),
      customerName: user?.displayName || 'Valued Customer',
      customerEmail: user?.email || '',
      items: [{
        description: `Doshi Sensei ${planName} Subscription`,
        quantity: 1,
        price: event.amount / 100,
        amount: event.amount / 100,
      }],
      subtotal: event.amount / 100,
      total: event.amount / 100,
      currency: event.currency,
      paymentStatus: 'paid',
      paymentMethod: typeof event.paymentMethod === 'string' 
        ? event.paymentMethod 
        : event.paymentMethod?.brand 
          ? `${event.paymentMethod.brand?.toUpperCase()} •••• ${event.paymentMethod.last4}`
          : undefined,
      notes: 'Thank you for subscribing to Doshi Sensei! Your subscription helps us continue improving and adding new features to help you master Japanese.',
    };
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
                    {typeof event.paymentMethod === 'string' ? (
                      <span>Payment method: {event.paymentMethod}</span>
                    ) : (
                      <>
                        {event.paymentMethod.brand && (
                          <span className="capitalize">{event.paymentMethod.brand}</span>
                        )}
                        {event.paymentMethod.last4 && (
                          <span> ending in {event.paymentMethod.last4}</span>
                        )}
                      </>
                    )}
                  </p>
                )}
                
                {/* Invoice Download Buttons */}
                {(event.type === 'payment_succeeded' || event.type === 'subscription_updated' || event.invoicePdf || event.hostedInvoiceUrl) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* Custom Doshi Sensei Invoice */}
                    {(event.type === 'payment_succeeded' || event.type === 'subscription_updated' || event.type === 'subscription_started') && event.amount && event.currency && (
                      (() => {
                        const invoiceData = createInvoiceData(event);
                        return invoiceData ? (
                          <InvoiceDownloadButton invoiceData={invoiceData} />
                        ) : null;
                      })()
                    )}
                    
                    {/* Original Stripe Invoice if available */}
                    {event.hostedInvoiceUrl && (
                      <a
                        href={event.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground rounded-md transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Stripe Invoice</span>
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