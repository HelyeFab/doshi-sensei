'use client';

import { useEffect, useState } from 'react';

export default function PWARecovery() {
  const [showRecovery, setShowRecovery] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // Check if app might be stuck
    const checkStuckState = () => {
      const stuckTime = localStorage.getItem('pwa_stuck_time');
      if (stuckTime) {
        const timeSinceStuck = Date.now() - parseInt(stuckTime);
        // Show recovery after 10 seconds of being stuck
        if (timeSinceStuck > 10000) {
          setShowRecovery(true);
        }
      }
    };

    // Check immediately and periodically
    checkStuckState();
    const interval = setInterval(checkStuckState, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleRecovery = async () => {
    setRecovering(true);
    
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Cleared all caches for recovery');
      }

      // Clear localStorage except critical data
      const authData = localStorage.getItem('auth-storage');
      const settingsData = localStorage.getItem('doshi-sensei-settings');
      localStorage.clear();
      if (authData) localStorage.setItem('auth-storage', authData);
      if (settingsData) localStorage.setItem('doshi-sensei-settings', settingsData);

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('Unregistered all service workers');
      }

      // Force reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Recovery error:', error);
      // Force reload anyway
      window.location.reload();
    }
  };

  if (!showRecovery) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10001] p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          App Recovery Mode
        </h2>
        <p className="text-gray-600 mb-6">
          It looks like the app is having trouble loading. Would you like to clear the cache and restart?
        </p>
        <div className="space-y-3">
          <button
            onClick={handleRecovery}
            disabled={recovering}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {recovering ? 'Recovering...' : 'Clear Cache & Restart'}
          </button>
          <button
            onClick={() => window.location.reload()}
            disabled={recovering}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
          >
            Just Reload
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          This will clear all cached data but preserve your login
        </p>
      </div>
    </div>
  );
}