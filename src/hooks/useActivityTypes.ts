import { useState, useEffect, useCallback } from 'react';
import { activityTypesManager, ActivityTypeConfig, ActivityTypesData } from '@/utils/activityTypes';

interface UseActivityTypesReturn {
  activityTypes: ActivityTypeConfig[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addType: (type: Omit<ActivityTypeConfig, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateType: (typeId: string, updates: Partial<ActivityTypeConfig>) => Promise<void>;
  toggleType: (typeId: string) => Promise<void>;
  deleteType: (typeId: string) => Promise<void>;
  getTypeByKey: (typeKey: string) => ActivityTypeConfig | undefined;
  enabledTypes: ActivityTypeConfig[];
}

export function useActivityTypes(): UseActivityTypesReturn {
  const [data, setData] = useState<ActivityTypesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const typesData = await activityTypesManager.getActivityTypes();
      setData(typesData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load activity types'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    activityTypesManager.clearCache();
    await loadData();
  }, [loadData]);

  const addType = useCallback(async (type: Omit<ActivityTypeConfig, 'createdAt' | 'updatedAt'>) => {
    try {
      await activityTypesManager.addActivityType(type);
      await refresh();
    } catch (err) {
      throw err;
    }
  }, [refresh]);

  const updateType = useCallback(async (typeId: string, updates: Partial<ActivityTypeConfig>) => {
    try {
      await activityTypesManager.updateActivityType(typeId, updates);
      await refresh();
    } catch (err) {
      throw err;
    }
  }, [refresh]);

  const toggleType = useCallback(async (typeId: string) => {
    try {
      await activityTypesManager.toggleActivityType(typeId);
      await refresh();
    } catch (err) {
      throw err;
    }
  }, [refresh]);

  const deleteType = useCallback(async (typeId: string) => {
    try {
      await activityTypesManager.deleteActivityType(typeId);
      await refresh();
    } catch (err) {
      throw err;
    }
  }, [refresh]);

  const getTypeByKey = useCallback((typeKey: string) => {
    return data?.types.find(t => t.type === typeKey);
  }, [data]);

  const enabledTypes = data?.types.filter(t => t.enabled).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) || [];

  return {
    activityTypes: data?.types || [],
    loading,
    error,
    refresh,
    addType,
    updateType,
    toggleType,
    deleteType,
    getTypeByKey,
    enabledTypes
  };
}