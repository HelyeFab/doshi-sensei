'use client';

import { useState } from 'react';
import { AchievementManager } from '@/lib/achievements/manager';
import EnhancedStorageManager from '@/utils/storage';
import { useAuth } from '@/contexts/AuthContext';

export function AchievementDebugPanel() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  const loadDebugInfo = async () => {
    const stats = await AchievementManager.getUserStats();
    const unlocked = await AchievementManager.getUnlockedAchievements();
    const info = {
      userId: user?.uid || 'Not logged in',
      userEmail: user?.email || 'N/A',
      stats,
      unlockedCount: unlocked.length,
      unlockedAchievements: unlocked.map(u => ({
        id: u.achievementId,
        unlockedAt: u.unlockedAt
      }))
    };
    setDebugInfo(info);
    await AchievementManager.debugAchievementState();
  };

  const clearAllAchievements = async () => {
    if (!confirm('This will clear ALL achievement data. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    try {
      // Clear from IndexedDB
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        const { AchievementsManager, UserStatsManager } = await import('@/utils/indexedDB');
        
        // Clear unlocked achievements
        const unlocked = await AchievementsManager.getUnlockedAchievements();
        for (const achievement of unlocked) {
          // Delete each achievement individually
          await new Promise((resolve, reject) => {
            const request = indexedDB.open('DoshiSenseiDB');
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction(['unlockedAchievements'], 'readwrite');
              const store = transaction.objectStore('unlockedAchievements');
              const deleteReq = store.delete(achievement.id);
              deleteReq.onsuccess = () => resolve(true);
              deleteReq.onerror = () => reject(deleteReq.error);
            };
          });
        }
      }

      // Clear from localStorage as fallback
      localStorage.removeItem('doshi_unlocked_achievements');
      localStorage.removeItem('doshi_user_stats');
      localStorage.removeItem('doshi_achievement_progress');

      // Reset stats to default
      const defaultStats = await AchievementManager.getUserStats();
      const resetStats = {
        currentStreak: 0,
        longestStreak: 0,
        drillsCompleted: 0,
        wordsSaved: 0,
        sentencesRead: 0,
        storiesCompleted: 0,
        gamesPlayed: 0,
        articlesRead: 0,
        flashcardSessions: 0,
        totalXP: 0,
        lastStudyDate: '',
        totalStudyTime: 0,
        listsCreated: 0,
        kanjiStudied: 0
      };
      await AchievementManager.saveUserStats(resetStats);

      alert('Achievement data cleared! Please refresh the page.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing achievements:', error);
      alert('Error clearing achievements. Check console for details.');
    } finally {
      setIsClearing(false);
    }
  };

  const clearTimeBasedAchievements = async () => {
    if (!confirm('This will clear time-based achievements (Early Bird, Night Owl). Continue?')) {
      return;
    }

    try {
      const unlocked = await AchievementManager.getUnlockedAchievements();
      const timeBasedIds = ['early_bird', 'night_owl', 'weekend_warrior'];
      
      // Filter out time-based achievements
      const remaining = unlocked.filter(u => !timeBasedIds.includes(u.achievementId));
      
      // Clear all and re-save remaining
      localStorage.removeItem('doshi_unlocked_achievements');
      
      for (const achievement of remaining) {
        await EnhancedStorageManager.saveUnlockedAchievement(achievement);
      }

      alert('Time-based achievements cleared! Please refresh the page.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing time-based achievements:', error);
      alert('Error clearing time-based achievements. Check console for details.');
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-yellow-800 mb-3">
        🛠️ Achievement Debug Panel
      </h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={loadDebugInfo}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Load Debug Info
        </button>
        
        <button
          onClick={clearTimeBasedAchievements}
          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Clear Time-Based Only
        </button>
        
        <button
          onClick={clearAllAchievements}
          disabled={isClearing}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {isClearing ? 'Clearing...' : 'Clear ALL Achievements'}
        </button>
      </div>

      {debugInfo && (
        <div className="bg-white rounded p-3 text-sm">
          <h4 className="font-semibold mb-2">Current State:</h4>
          <pre className="overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <p className="text-xs text-yellow-700 mt-2">
        ⚠️ This panel is for debugging only. Check console for detailed logs.
      </p>
    </div>
  );
}