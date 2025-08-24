import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface SubscriptionFeature {
  id: string;
  text: string;
  order: number;
  enabled: boolean;
  category?: string;
}

interface SubscriptionPlanFeatures {
  id: string;
  name: string;
  features: SubscriptionFeature[];
}

type PlanType = 'free' | 'monthly' | 'yearly';

// Default features as fallback
const DEFAULT_FEATURES: Record<PlanType, SubscriptionFeature[]> = {
  free: [
    { id: 'free-1', text: '3 drill questions per day', order: 1, enabled: true },
    { id: 'free-2', text: 'Unlimited vocabulary searches', order: 2, enabled: true },
    { id: 'free-3', text: 'Basic mood boards access', order: 3, enabled: true },
    { id: 'free-4', text: 'Community support', order: 4, enabled: true }
  ],
  monthly: [
    { id: 'monthly-1', text: 'Unlimited Anki card imports & SRS', order: 1, enabled: true },
    { id: 'monthly-2', text: 'YouTube video shadowing practice', order: 2, enabled: true },
    { id: 'monthly-3', text: 'All textbook lessons (Genki & Minna)', order: 3, enabled: true },
    { id: 'monthly-4', text: 'Unlimited games & drills', order: 4, enabled: true },
    { id: 'monthly-5', text: 'AI context explanations', order: 5, enabled: true },
    { id: 'monthly-6', text: 'Cloud sync across devices', order: 6, enabled: true },
    { id: 'monthly-7', text: 'Advanced analytics & progress', order: 7, enabled: true },
    { id: 'monthly-8', text: 'Priority support', order: 8, enabled: true },
    { id: 'monthly-9', text: 'Offline mode', order: 9, enabled: true }
  ],
  yearly: [
    { id: 'yearly-1', text: 'Unlimited Anki card imports & SRS', order: 1, enabled: true },
    { id: 'yearly-2', text: 'YouTube video shadowing practice', order: 2, enabled: true },
    { id: 'yearly-3', text: 'All textbook lessons (Genki & Minna)', order: 3, enabled: true },
    { id: 'yearly-4', text: 'Unlimited games & drills', order: 4, enabled: true },
    { id: 'yearly-5', text: 'AI context explanations', order: 5, enabled: true },
    { id: 'yearly-6', text: 'Cloud sync across devices', order: 6, enabled: true },
    { id: 'yearly-7', text: 'Advanced analytics & progress', order: 7, enabled: true },
    { id: 'yearly-8', text: 'Priority support', order: 8, enabled: true },
    { id: 'yearly-9', text: 'Save 17% vs monthly', order: 9, enabled: true }
  ]
};

export function useSubscriptionFeatures() {
  const [features, setFeatures] = useState<Record<PlanType, SubscriptionFeature[]>>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up real-time listener for subscription features
    const unsubscribe = onSnapshot(
      collection(db, 'subscriptionFeatures'),
      (snapshot) => {
        const loadedFeatures: Record<PlanType, SubscriptionFeature[]> = { ...DEFAULT_FEATURES };
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const planType = doc.id as PlanType;
          
          if (planType in loadedFeatures && data.features) {
            // Filter only enabled features and sort by order
            loadedFeatures[planType] = data.features
              .filter((f: SubscriptionFeature) => f.enabled)
              .sort((a: SubscriptionFeature, b: SubscriptionFeature) => a.order - b.order);
          }
        });
        
        setFeatures(loadedFeatures);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error loading subscription features:', err);
        setError('Failed to load subscription features');
        setLoading(false);
        // Keep default features on error
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    features,
    loading,
    error,
    getFeatures: (plan: PlanType) => features[plan] || DEFAULT_FEATURES[plan]
  };
}