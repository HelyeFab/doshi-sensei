/**
 * useFeatureMatrix Hook
 * Fetches feature matrix data for admin dashboard
 */

import { useState, useEffect } from 'react';
import { Feature } from '@/lib/features/types';
import { UserType } from '@/lib/entitlements/types';

interface FeatureAccess {
  allowed: boolean;
  limit: number;
}

interface FeatureMatrixRow {
  feature: Feature;
  access: Record<UserType, FeatureAccess>;
}

interface FeatureMatrixStats {
  totalFeatures: number;
  activeFeatures: number;
  plannedFeatures: number;
  guestAccessible: number;
  freeAccessible: number;
  premiumExclusive: number;
}

interface FeatureMatrixData {
  matrix: FeatureMatrixRow[];
  stats: FeatureMatrixStats;
  userTypes: UserType[];
  lastUpdated: string;
}

interface UseFeatureMatrixReturn {
  data: FeatureMatrixData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useFeatureMatrix(): UseFeatureMatrixReturn {
  const [data, setData] = useState<FeatureMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchMatrix = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/feature-matrix');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch matrix: ${response.statusText}`);
      }
      
      const matrixData = await response.json();
      setData(matrixData);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching feature matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMatrix();
  }, []);
  
  return {
    data,
    isLoading,
    error,
    refresh: fetchMatrix
  };
}