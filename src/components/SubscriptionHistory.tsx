'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

interface SubscriptionEvent {
  id: string;
  type: 'subscription_started' | 'subscription_updated' | 'subscription_canceled' | 'payment_failed';
  status: string;
  plan: string;
  timestamp: Date;
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
      case 'payment_failed':
        return `Payment failed (${event.details?.currency?.toUpperCase() || 'USD'} ${event.details?.amountDue || '0'})`;
      default:
        return 'Subscription event';
    }
  };

  const getEventColor = (type: SubscriptionEvent['type']) => {
    switch (type) {
      case 'subscription_started':
        return 'text-green-600 dark:text-green-400';
      case 'subscription_updated':
        return 'text-blue-600 dark:text-blue-400';
      case 'subscription_canceled':
        return 'text-gray-600 dark:text-gray-400';
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
      
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
            <span className="text-2xl">{getEventIcon(event.type)}</span>
            <div className="flex-1">
              <p className={`font-medium ${getEventColor(event.type)}`}>
                {getEventMessage(event)}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(event.timestamp, 'MMM d, yyyy h:mm a')}
              </p>
              {event.type === 'subscription_started' && event.details?.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renews: {format(new Date(event.details.currentPeriodEnd), 'MMM d, yyyy')}
                </p>
              )}
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