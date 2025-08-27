'use client';

import { useState, useEffect } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementManager } from '@/lib/achievements/manager';
import { useAuth } from '@/contexts/AuthContext';

export default function AchievementDebugPage() {
  const { user } = useAuth();
  const { userStats, unlockedAchievements, refreshData } = useAchievements();
  const [exportData, setExportData] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const handleExport = async () => {
    const data = {
      userStats,
      unlockedAchievements,
      timestamp: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    setExportData(json);
    
    // Also copy to clipboard
    try {
      await navigator.clipboard.writeText(json);
      setImportStatus('Exported and copied to clipboard!');
    } catch (err) {
      setImportStatus('Exported (manual copy required)');
    }
  };

  const handleImport = async () => {
    try {
      const data = JSON.parse(exportData);
      
      if (data.userStats) {
        await AchievementManager.saveUserStats(data.userStats);
      }
      
      if (data.unlockedAchievements) {
        // Clear existing and import new
        const EnhancedStorageManager = (await import('@/utils/storage')).default;
        await EnhancedStorageManager.clearUnlockedAchievements();
        
        for (const achievement of data.unlockedAchievements) {
          await EnhancedStorageManager.saveUnlockedAchievement(achievement);
        }
      }
      
      setImportStatus('Import successful! Refreshing...');
      await refreshData();
      window.location.reload();
    } catch (err) {
      setImportStatus(`Import failed: ${err.message}`);
    }
  };

  const handleForceSync = async () => {
    if (!user) {
      setImportStatus('Must be logged in to sync');
      return;
    }
    
    try {
      setImportStatus('Force syncing with cloud...');
      await AchievementManager.initialize();
      await refreshData();
      setImportStatus('Sync complete!');
    } catch (err) {
      setImportStatus(`Sync failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Achievement Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Stats</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(userStats, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Export/Import Data</h2>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export Current Data
            </button>
            
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={!exportData}
            >
              Import Data
            </button>
            
            {user && (
              <button
                onClick={handleForceSync}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Force Cloud Sync
              </button>
            )}
          </div>
          
          {importStatus && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
              {importStatus}
            </div>
          )}
          
          <textarea
            value={exportData}
            onChange={(e) => setExportData(e.target.value)}
            className="w-full h-64 p-4 border rounded font-mono text-sm"
            placeholder="Paste data here to import, or it will appear here after export"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Unlocked Achievements</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(unlockedAchievements, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}