'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { statsTracker } from '@/lib/stats/statsTracker';
import { AchievementManager } from '@/lib/achievements/manager';

export function ForceRefreshButton() {
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  
  const handleForceRefresh = async () => {
    if (!user) {
      setMessage('Please log in first');
      return;
    }
    
    setIsRefreshing(true);
    setMessage('Syncing data from cloud...');
    
    try {
      // Re-initialize stats tracker to force cloud load
      await statsTracker.initialize(user, subscription);
      
      // Force sync from cloud
      await statsTracker.forceSync();
      
      // Re-initialize achievement manager
      await AchievementManager.initialize();
      
      setMessage('✅ Data refreshed from cloud! Please refresh the page.');
      
      // Refresh the page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Force refresh error:', error);
      setMessage('❌ Error refreshing data. Check console.');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg border border-border">
      <button
        onClick={handleForceRefresh}
        disabled={isRefreshing}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isRefreshing ? 'Refreshing...' : 'Force Refresh from Cloud'}
      </button>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}