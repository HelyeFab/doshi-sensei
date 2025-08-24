'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/hooks/useToast';

export function CacheManagement() {
  const { cacheSize, getCacheSize, clearCache, isOfflineReady } = usePWA();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Refresh cache size on mount
  useEffect(() => {
    getCacheSize();
  }, [getCacheSize]);

  const handleClearCache = async () => {
    setIsClearing(true);
    setShowConfirm(false);
    
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage except critical auth data
      const authData = localStorage.getItem('auth-storage');
      const settingsData = localStorage.getItem('doshi-sensei-settings');
      localStorage.clear();
      if (authData) localStorage.setItem('auth-storage', authData);
      if (settingsData) localStorage.setItem('doshi-sensei-settings', settingsData);
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if exists
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.() || [];
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          })
        );
      }
      
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }
      
      toast.success('Cache cleared successfully! The page will reload.');
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const formatCacheSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${Math.round(sizeInMB * 1024)} KB`;
    }
    return `${sizeInMB.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Cache Status */}
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Cache Status</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isOfflineReady 
              ? 'Content cached for offline use' 
              : 'No offline content cached'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {formatCacheSize(cacheSize)}
          </p>
          <p className="text-xs text-muted-foreground">Used</p>
        </div>
      </div>

      {/* Cache Info */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">What is cached?</strong><br />
          • Learning content (vocabulary, kanji, textbooks)<br />
          • App resources for offline access<br />
          • Your recent study progress<br />
          • UI assets and fonts
        </p>
      </div>

      {/* Clear Cache Button */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isClearing}
          className="w-full px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Clear All Cache</p>
              <p className="text-xs text-muted-foreground mt-1">
                Free up space and reset offline content
              </p>
            </div>
            <svg 
              className="w-5 h-5 text-muted-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </div>
        </button>
      ) : (
        <div className="p-4 rounded-lg border-2 border-warning bg-warning/10">
          <p className="text-sm font-medium text-foreground mb-2">
            ⚠️ Are you sure?
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            This will clear all cached content, service workers, and offline data. 
            Your account and settings will be preserved. The page will reload after clearing.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  Clearing...
                </span>
              ) : (
                'Yes, Clear Everything'
              )}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isClearing}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Clearing the cache will not affect your account, 
          subscription, or personal settings. It only removes temporarily stored data 
          to free up space and resolve potential issues.
        </p>
      </div>
    </div>
  );
}