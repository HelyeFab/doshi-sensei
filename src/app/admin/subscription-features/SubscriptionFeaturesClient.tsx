'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ADMIN_EMAIL } from '@/types/admin';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { useNotification } from '@/contexts/NotificationContext';
import { Spinner } from '@/components/Spinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Switch } from '@/components/Switch';

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
  updatedAt?: Date;
  updatedBy?: string;
}

type PlanType = 'free' | 'monthly' | 'yearly';

const DEFAULT_FEATURES = {
  free: [
    { id: 'free-1', text: '3 drill questions per day', order: 1, enabled: true },
    { id: 'free-2', text: 'Unlimited vocabulary searches', order: 2, enabled: true },
    { id: 'free-3', text: 'Basic mood boards access', order: 3, enabled: true },
    { id: 'free-4', text: 'Community support', order: 4, enabled: true }
  ],
  monthly: [
    { id: 'monthly-1', text: 'Unlimited Anki card imports & SRS', order: 1, enabled: true, category: 'Learning' },
    { id: 'monthly-2', text: 'YouTube video shadowing practice', order: 2, enabled: true, category: 'Learning' },
    { id: 'monthly-3', text: 'All textbook lessons (Genki & Minna)', order: 3, enabled: true, category: 'Learning' },
    { id: 'monthly-4', text: 'Unlimited games & drills', order: 4, enabled: true, category: 'Practice' },
    { id: 'monthly-5', text: 'AI context explanations', order: 5, enabled: true, category: 'AI Features' },
    { id: 'monthly-6', text: 'Cloud sync across devices', order: 6, enabled: true, category: 'Storage' },
    { id: 'monthly-7', text: 'Advanced analytics & progress', order: 7, enabled: true, category: 'Analytics' },
    { id: 'monthly-8', text: 'Priority support', order: 8, enabled: true, category: 'Support' },
    { id: 'monthly-9', text: 'Offline mode', order: 9, enabled: true, category: 'Storage' }
  ],
  yearly: [
    { id: 'yearly-1', text: 'Unlimited Anki card imports & SRS', order: 1, enabled: true, category: 'Learning' },
    { id: 'yearly-2', text: 'YouTube video shadowing practice', order: 2, enabled: true, category: 'Learning' },
    { id: 'yearly-3', text: 'All textbook lessons (Genki & Minna)', order: 3, enabled: true, category: 'Learning' },
    { id: 'yearly-4', text: 'Unlimited games & drills', order: 4, enabled: true, category: 'Practice' },
    { id: 'yearly-5', text: 'AI context explanations', order: 5, enabled: true, category: 'AI Features' },
    { id: 'yearly-6', text: 'Cloud sync across devices', order: 6, enabled: true, category: 'Storage' },
    { id: 'yearly-7', text: 'Advanced analytics & progress', order: 7, enabled: true, category: 'Analytics' },
    { id: 'yearly-8', text: 'Priority support', order: 8, enabled: true, category: 'Support' },
    { id: 'yearly-9', text: 'Save 17% vs monthly', order: 9, enabled: true, category: 'Savings' }
  ]
};

export default function SubscriptionFeaturesClient() {
  const { user } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const [plans, setPlans] = useState<Record<PlanType, SubscriptionPlanFeatures>>({
    free: { id: 'free', name: 'Free', features: DEFAULT_FEATURES.free },
    monthly: { id: 'monthly', name: 'Monthly Premium', features: DEFAULT_FEATURES.monthly },
    yearly: { id: 'yearly', name: 'Yearly Premium', features: DEFAULT_FEATURES.yearly }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [draggedFeature, setDraggedFeature] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/');
    }
  }, [user, router]);

  // Load features from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'subscriptionFeatures'),
      (snapshot) => {
        const loadedPlans: Record<PlanType, SubscriptionPlanFeatures> = {
          free: { id: 'free', name: 'Free', features: DEFAULT_FEATURES.free },
          monthly: { id: 'monthly', name: 'Monthly Premium', features: DEFAULT_FEATURES.monthly },
          yearly: { id: 'yearly', name: 'Yearly Premium', features: DEFAULT_FEATURES.yearly }
        };

        snapshot.forEach((doc) => {
          const data = doc.data();
          const planType = doc.id as PlanType;
          if (planType in loadedPlans) {
            loadedPlans[planType] = {
              id: planType,
              name: data.name || loadedPlans[planType].name,
              features: data.features || loadedPlans[planType].features,
              updatedAt: data.updatedAt?.toDate(),
              updatedBy: data.updatedBy
            };
          }
        });

        setPlans(loadedPlans);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading features:', error);
        showNotification({
          title: 'Error',
          message: 'Failed to load subscription features',
          type: 'error'
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showNotification]);

  const savePlanFeatures = async (planType: PlanType) => {
    setSaving(true);
    try {
      const planData = {
        name: plans[planType].name,
        features: plans[planType].features,
        updatedAt: new Date(),
        updatedBy: user?.email
      };

      await setDoc(doc(db, 'subscriptionFeatures', planType), planData);
      
      showNotification({
        title: 'Success',
        message: `${plans[planType].name} features updated successfully`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving features:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to save features',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const addFeature = (planType: PlanType) => {
    if (!newFeatureText.trim()) return;

    const newFeature: SubscriptionFeature = {
      id: `${planType}-${Date.now()}`,
      text: newFeatureText.trim(),
      order: plans[planType].features.length + 1,
      enabled: true
    };

    setPlans(prev => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        features: [...prev[planType].features, newFeature]
      }
    }));

    setNewFeatureText('');
  };

  const updateFeature = (planType: PlanType, featureId: string, updates: Partial<SubscriptionFeature>) => {
    setPlans(prev => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        features: prev[planType].features.map(f =>
          f.id === featureId ? { ...f, ...updates } : f
        )
      }
    }));
  };

  const deleteFeature = (planType: PlanType, featureId: string) => {
    setPlans(prev => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        features: prev[planType].features
          .filter(f => f.id !== featureId)
          .map((f, index) => ({ ...f, order: index + 1 }))
      }
    }));
    setShowDeleteConfirm(null);
  };

  const moveFeature = (planType: PlanType, fromIndex: number, toIndex: number) => {
    const features = [...plans[planType].features];
    const [movedFeature] = features.splice(fromIndex, 1);
    features.splice(toIndex, 0, movedFeature);
    
    // Update order numbers
    const reorderedFeatures = features.map((f, index) => ({ ...f, order: index + 1 }));
    
    setPlans(prev => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        features: reorderedFeatures
      }
    }));
  };

  const handleDragStart = (e: React.DragEvent, featureId: string) => {
    setDraggedFeature(featureId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFeatureId: string, planType: PlanType) => {
    e.preventDefault();
    if (!draggedFeature) return;

    const features = plans[planType].features;
    const fromIndex = features.findIndex(f => f.id === draggedFeature);
    const toIndex = features.findIndex(f => f.id === targetFeatureId);

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      moveFeature(planType, fromIndex, toIndex);
    }

    setDraggedFeature(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscription Features Management</h1>
          <p className="text-muted-foreground">
            Edit and manage features for each subscription plan. Changes are reflected immediately for all users.
          </p>
        </div>

        {/* Plan Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-border">
          {(['free', 'monthly', 'yearly'] as PlanType[]).map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlan(plan)}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedPlan === plan
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {plans[plan].name}
            </button>
          ))}
        </div>

        {/* Features List */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {plans[selectedPlan].name} Features
            </h2>
            <button
              onClick={() => savePlanFeatures(selectedPlan)}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Add New Feature */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newFeatureText}
              onChange={(e) => setNewFeatureText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addFeature(selectedPlan);
                }
              }}
              placeholder="Add new feature..."
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => addFeature(selectedPlan)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Feature
            </button>
          </div>

          {/* Features List */}
          <div className="space-y-2">
            {plans[selectedPlan].features
              .sort((a, b) => a.order - b.order)
              .map((feature) => (
                <div
                  key={feature.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, feature.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, feature.id, selectedPlan)}
                  className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-move hover:bg-muted transition-colors ${
                    !feature.enabled ? 'opacity-50' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>

                  {/* Order Number */}
                  <span className="text-sm text-muted-foreground font-medium w-8">
                    {feature.order}.
                  </span>

                  {/* Feature Text */}
                  {editingFeature === feature.id ? (
                    <input
                      type="text"
                      value={feature.text}
                      onChange={(e) => updateFeature(selectedPlan, feature.id, { text: e.target.value })}
                      onBlur={() => setEditingFeature(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingFeature(null);
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="flex-1 cursor-text"
                      onClick={() => setEditingFeature(feature.id)}
                    >
                      <span className="text-foreground">{feature.text}</span>
                      {feature.category && (
                        <span className="ml-2 text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                          {feature.category}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Enable/Disable Toggle */}
                  <Switch
                    checked={feature.enabled}
                    onChange={(enabled) => updateFeature(selectedPlan, feature.id, { enabled })}
                    size="sm"
                  />

                  {/* Delete Button */}
                  <button
                    onClick={() => setShowDeleteConfirm(feature.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>

          {/* Last Updated Info */}
          {plans[selectedPlan].updatedAt && (
            <div className="mt-4 text-sm text-muted-foreground">
              Last updated: {plans[selectedPlan].updatedAt.toLocaleString()} by {plans[selectedPlan].updatedBy}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        title="Delete Feature"
        message="Are you sure you want to delete this feature? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (showDeleteConfirm) {
            deleteFeature(selectedPlan, showDeleteConfirm);
          }
        }}
        onCancel={() => setShowDeleteConfirm(null)}
        isDestructive
      />
    </div>
  );
}