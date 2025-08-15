'use client';

import React, { useState } from 'react';
import { useStats } from '@/hooks/useStats';
import { statsTracker } from '@/lib/stats/statsTracker';
import { useRouter } from 'next/navigation';

export function StatsDebugPanel() {
  const { stats, loading, error } = useStats();
  const router = useRouter();
  const [showDebug, setShowDebug] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('STATS_DEBUG') === 'true';
    }
    return false;
  });

  const exportDebugData = async () => {
    try {
      // Gather all debug data
      const debugData = {
        timestamp: new Date().toISOString(),
        environment: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          localStorage: {
            STATS_DEBUG: localStorage.getItem('STATS_DEBUG'),
            STATS_VERBOSE: localStorage.getItem('STATS_VERBOSE'),
          }
        },
        stats: stats,
        error: error,
        loading: loading,
        activities: await statsTracker.getRecentActivities?.() || [],
        version: '2.0'
      };

      // Create download
      const blob = new Blob([JSON.stringify(debugData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doshi-sensei-stats-debug-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Failed to export debug data:', err);
      alert('Failed to export debug data. Check console for details.');
    }
  };

  const toggleDebugMode = () => {
    const newValue = !showDebug;
    setShowDebug(newValue);
    localStorage.setItem('STATS_DEBUG', newValue.toString());
    if (newValue) {

    } else {

    }
  };

  const clearStats = async () => {
    if (confirm('Are you sure you want to clear all stats? This cannot be undone.')) {
      await statsTracker.resetStats();
      window.location.reload();
    }
  };

  if (!showDebug) {
    return (
      <button
        onClick={toggleDebugMode}
        className="fixed bottom-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg hover:bg-yellow-400 transition-colors flex items-center gap-2"
        title="Enable debug mode"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-black rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          🐛 Debug ({stats.totalActivities})
        </h3>
        <button
          onClick={toggleDebugMode}
          className="text-black hover:text-gray-700"
          title="Close debug panel"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        {error && (
          <div className="bg-red-100 text-red-800 p-2 rounded">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-semibold">Streak:</span> {stats.currentStreak}
          </div>
          <div>
            <span className="font-semibold">Total Days:</span> {stats.totalDaysActive}
          </div>
          <div>
            <span className="font-semibold">Drills:</span> {stats.drillsCompleted}
          </div>
          <div>
            <span className="font-semibold">Stories:</span> {stats.storiesRead}
          </div>
          <div>
            <span className="font-semibold">Accuracy:</span> {stats.overallAccuracy}%
          </div>
          <div>
            <span className="font-semibold">Version:</span> {stats.version || 'N/A'}
          </div>
        </div>

        <div className="pt-2 border-t border-yellow-600 space-y-2">
          <button
            onClick={exportDebugData}
            className="w-full bg-black text-yellow-500 px-3 py-1 rounded hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            📥 Export Debug Data
          </button>
          
          <button
            onClick={() => router.push('/admin')}
            className="w-full bg-yellow-600 text-black px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
          >
            🔧 Admin Panel
          </button>

          <button
            onClick={clearStats}
            className="w-full bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
          >
            🗑️ Clear Stats
          </button>
        </div>
      </div>
    </div>
  );
}