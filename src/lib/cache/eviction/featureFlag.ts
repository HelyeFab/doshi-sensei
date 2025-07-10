import { useState, useEffect } from 'react';
import { firestore } from '@/firebase/config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface EvictionFeatureFlag {
  enabled: boolean;
  rolloutPercent: number;
  emergencyDisabled?: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

class EvictionFeatureFlagManager {
  private static instance: EvictionFeatureFlagManager;
  private flagData: EvictionFeatureFlag = {
    enabled: false,
    rolloutPercent: 0,
  };
  private listeners: Set<(flag: EvictionFeatureFlag) => void> = new Set();
  private unsubscribe: (() => void) | null = null;
  private userHash: number | null = null;

  private constructor() {}

  static getInstance(): EvictionFeatureFlagManager {
    if (!EvictionFeatureFlagManager.instance) {
      EvictionFeatureFlagManager.instance = new EvictionFeatureFlagManager();
    }
    return EvictionFeatureFlagManager.instance;
  }

  /**
   * Initialize feature flag monitoring
   */
  async initialize(userId?: string): Promise<void> {
    // Calculate stable user hash if userId provided
    if (userId) {
      this.userHash = this.hashUserId(userId);
    }

    // Load initial flag data
    try {
      const flagDoc = await getDoc(doc(firestore, 'featureFlags', 'lru_eviction_system'));
      if (flagDoc.exists()) {
        this.flagData = flagDoc.data() as EvictionFeatureFlag;
      }
    } catch (error) {
      console.error('Failed to load eviction feature flag:', error);
    }

    // Subscribe to real-time updates
    this.unsubscribe = onSnapshot(
      doc(firestore, 'featureFlags', 'lru_eviction_system'),
      (snapshot) => {
        if (snapshot.exists()) {
          this.flagData = snapshot.data() as EvictionFeatureFlag;
          this.notifyListeners();
        }
      },
      (error) => {
        console.error('Feature flag subscription error:', error);
      }
    );
  }

  /**
   * Check if eviction is enabled for the current user
   */
  isEvictionEnabled(userId?: string): boolean {
    // Emergency disable overrides everything
    if (this.flagData.emergencyDisabled) {
      return false;
    }

    // Check if feature is enabled at all
    if (!this.flagData.enabled) {
      return false;
    }

    // For development, always enable if explicitly set
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_FORCE_EVICTION === 'true') {
      return true;
    }

    // Calculate user hash if not already done
    if (userId && !this.userHash) {
      this.userHash = this.hashUserId(userId);
    }

    // If no user hash, use random rollout
    const hash = this.userHash ?? Math.floor(Math.random() * 100);

    // Check if user is in rollout percentage
    return hash < this.flagData.rolloutPercent;
  }

  /**
   * Get current feature flag data
   */
  getFeatureFlag(): EvictionFeatureFlag {
    return { ...this.flagData };
  }

  /**
   * Subscribe to feature flag changes
   */
  subscribe(callback: (flag: EvictionFeatureFlag) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }

  /**
   * Hash user ID to stable number 0-99
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Notify all listeners of flag changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.flagData);
      } catch (error) {
        console.error('Feature flag listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const evictionFeatureFlag = EvictionFeatureFlagManager.getInstance();

// Hook for React components
export function useEvictionFeatureFlag() {
  const [flag, setFlag] = useState<EvictionFeatureFlag>(() => 
    evictionFeatureFlag.getFeatureFlag()
  );
  const [isEnabled, setIsEnabled] = useState(false);
  const { user } = useAuth(); // Assuming you have useAuth hook

  useEffect(() => {
    // Initialize with user ID if available
    if (user?.uid) {
      evictionFeatureFlag.initialize(user.uid);
      setIsEnabled(evictionFeatureFlag.isEvictionEnabled(user.uid));
    }

    // Subscribe to changes
    const unsubscribe = evictionFeatureFlag.subscribe((newFlag) => {
      setFlag(newFlag);
      setIsEnabled(evictionFeatureFlag.isEvictionEnabled(user?.uid));
    });

    return unsubscribe;
  }, [user?.uid]);

  return { flag, isEnabled };
}