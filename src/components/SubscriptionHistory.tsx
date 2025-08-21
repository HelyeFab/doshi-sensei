'use client';

import { useStrings } from '@/contexts/LanguageContext';

export default function SubscriptionHistory() {
  const strings = useStrings();

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Payment History</h3>
      <div className="text-center py-8">
        <p className="text-muted-foreground">No payment history available</p>
      </div>
    </div>
  );
}