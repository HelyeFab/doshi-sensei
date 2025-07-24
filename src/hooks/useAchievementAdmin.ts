'use client';

import { useState, useEffect, useCallback } from 'react';
import { Achievement, UserStats, DynamicAchievementsData } from '@/lib/achievements/types';
import { DEFAULT_ACHIEVEMENTS } from '@/lib/achievements/registry';

export function useAchievementAdmin() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load achievements from API
  const loadAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/achievements');
      const data: DynamicAchievementsData = await response.json();
      
      // Merge default and dynamic achievements
      const merged = mergeAchievements(DEFAULT_ACHIEVEMENTS, data.achievements || []);
      setAchievements(merged);
      setLastSaved(data.lastUpdated);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError('Failed to load achievements');
      // Fallback to default achievements
      setAchievements(DEFAULT_ACHIEVEMENTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save achievements to API
  const saveAchievements = useCallback(async (updatedAchievements: Achievement[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Separate custom achievements from default ones
      const customAchievements = updatedAchievements.filter(a => a.isCustom);
      
      const payload: DynamicAchievementsData = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'admin', // TODO: Get from auth context
        achievements: customAchievements
      };

      const response = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setAchievements(updatedAchievements);
        setLastSaved(payload.lastUpdated);
        
        // Clear achievement cache
        await fetch('/api/admin/achievements/refresh-cache', { method: 'POST' });
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error('Error saving achievements:', err);
      setError('Failed to save achievements');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new achievement
  const createAchievement = useCallback((template?: Partial<Achievement>): Achievement => {
    const now = new Date().toISOString();
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      category: 'words',
      title: 'New Achievement',
      description: 'Achievement description',
      icon: '🏆',
      color: '#3b82f6',
      rarity: 'common',
      rewardType: 'xp',
      rewardValue: 50,
      isActive: true,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
      conditionType: 'simple',
      conditionField: 'wordsSaved',
      conditionOperator: '>=',
      conditionValue: 1,
      ...template
    };
  }, []);

  // Add new achievement
  const addAchievement = useCallback((template?: Partial<Achievement>) => {
    const newAchievement = createAchievement(template);
    setAchievements(prev => [...prev, newAchievement]);
    return newAchievement;
  }, [createAchievement]);

  // Update achievement
  const updateAchievement = useCallback((id: string, updates: Partial<Achievement>) => {
    setAchievements(prev => prev.map(achievement => 
      achievement.id === id 
        ? { ...achievement, ...updates, updatedAt: new Date().toISOString() }
        : achievement
    ));
  }, []);

  // Delete achievement
  const deleteAchievement = useCallback((id: string) => {
    setAchievements(prev => prev.filter(achievement => achievement.id !== id));
  }, []);

  // Duplicate achievement
  const duplicateAchievement = useCallback((id: string) => {
    const original = achievements.find(a => a.id === id);
    if (!original) return null;

    const duplicate = createAchievement({
      ...original,
      title: `${original.title} (Copy)`,
      id: undefined // Will be generated
    });

    setAchievements(prev => [...prev, duplicate]);
    return duplicate;
  }, [achievements, createAchievement]);

  // Validate achievement
  const validateAchievement = useCallback((achievement: Achievement) => {
    const errors: Record<string, string> = {};

    // Basic validation
    if (!achievement.title?.trim()) {
      errors.title = 'Title is required';
    }

    if (!achievement.description?.trim()) {
      errors.description = 'Description is required';
    }

    if (!achievement.icon?.trim()) {
      errors.icon = 'Icon is required';
    }

    // Condition validation for simple achievements
    if (achievement.conditionType === 'simple') {
      if (!achievement.conditionField) {
        errors.conditionField = 'Condition field is required';
      }

      if (!achievement.conditionOperator) {
        errors.conditionOperator = 'Condition operator is required';
      }

      if (achievement.conditionValue === undefined || achievement.conditionValue <= 0) {
        errors.conditionValue = 'Condition value must be greater than 0';
      }
    }

    // Reward validation
    if (achievement.rewardType === 'xp') {
      if (!achievement.rewardValue || (achievement.rewardValue as number) <= 0) {
        errors.rewardValue = 'XP reward must be greater than 0';
      }
    } else if (!achievement.rewardValue) {
      errors.rewardValue = 'Reward value is required';
    }

    // Check for duplicate IDs (excluding self)
    const duplicateId = achievements.find(a => a.id === achievement.id && a !== achievement);
    if (duplicateId) {
      errors.id = 'Achievement ID already exists';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [achievements]);

  // Test achievement condition
  const testAchievement = useCallback((achievement: Achievement, testStats: UserStats) => {
    if (achievement.conditionType !== 'simple') {
      return { canUnlock: false, reason: 'Complex conditions not supported in test' };
    }

    const { conditionField, conditionOperator, conditionValue } = achievement;
    
    if (!conditionField || !conditionOperator || conditionValue === undefined) {
      return { canUnlock: false, reason: 'Invalid condition configuration' };
    }

    const currentValue = testStats[conditionField];
    let canUnlock = false;

    switch (conditionOperator) {
      case '>=':
        canUnlock = currentValue >= conditionValue;
        break;
      case '>':
        canUnlock = currentValue > conditionValue;
        break;
      case '==':
        canUnlock = currentValue === conditionValue;
        break;
      case '<':
        canUnlock = currentValue < conditionValue;
        break;
      case '<=':
        canUnlock = currentValue <= conditionValue;
        break;
    }

    return {
      canUnlock,
      reason: canUnlock 
        ? 'Achievement would unlock' 
        : `Current: ${currentValue}, Required: ${conditionOperator} ${conditionValue}`
    };
  }, []);

  // Get achievement statistics
  const getAchievementStats = useCallback(() => {
    const total = achievements.length;
    const custom = achievements.filter(a => a.isCustom).length;
    const active = achievements.filter(a => a.isActive).length;
    const byCategory = achievements.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byRarity = achievements.reduce((acc, a) => {
      acc[a.rarity] = (acc[a.rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      custom,
      active,
      inactive: total - active,
      byCategory,
      byRarity
    };
  }, [achievements]);

  // Export achievements as JSON
  const exportAchievements = useCallback(() => {
    const customAchievements = achievements.filter(a => a.isCustom);
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      achievements: customAchievements
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `achievements-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [achievements]);

  // Load data on mount
  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  return {
    // Data
    achievements,
    isLoading,
    error,
    lastSaved,

    // Actions
    loadAchievements,
    saveAchievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    duplicateAchievement,

    // Utilities
    validateAchievement,
    testAchievement,
    getAchievementStats,
    exportAchievements,

    // Helpers
    createAchievement
  };
}

// Helper function to merge default and dynamic achievements
function mergeAchievements(defaultAchievements: Achievement[], dynamicAchievements: Achievement[]): Achievement[] {
  const merged = [...defaultAchievements];
  
  // Add or replace with dynamic achievements
  dynamicAchievements.forEach(dynamicAchievement => {
    const existingIndex = merged.findIndex(a => a.id === dynamicAchievement.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = dynamicAchievement;
    } else {
      merged.push(dynamicAchievement);
    }
  });

  return merged;
}