'use client';

import React, { useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { statsTracker } from '@/lib/stats/statsTracker';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RecoveryLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export function StatsRecovery() {
  const { profile } = useUserProfile();
  const [isRecovering, setIsRecovering] = useState(false);
  const [logs, setLogs] = useState<RecoveryLog[]>([]);

  const addLog = (message: string, type: RecoveryLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      message,
      type
    }]);
  };

  const recoverStats = async () => {
    if (!profile) {
      addLog('No user profile found', 'error');
      return;
    }

    setIsRecovering(true);
    setLogs([]);
    
    try {
      addLog('Starting stats recovery process...', 'info');
      
      // 1. Analyze existing data sources
      addLog('Analyzing Firestore collections...', 'info');
      
      // Check userStats collection
      const statsRef = collection(db, 'userStats');
      const statsQuery = query(statsRef, where('userId', '==', profile.uid));
      const statsSnapshot = await getDocs(statsQuery);
      
      if (!statsSnapshot.empty) {
        addLog(`Found ${statsSnapshot.size} stats documents`, 'success');
      } else {
        addLog('No existing stats documents found', 'warning');
      }

      // 2. Check for drill sessions
      addLog('Checking for drill sessions...', 'info');
      const sessionsRef = collection(db, 'users', profile.uid, 'drillSessions');
      const sessionsQuery = query(sessionsRef, orderBy('timestamp', 'desc'), limit(100));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      if (!sessionsSnapshot.empty) {
        addLog(`Found ${sessionsSnapshot.size} drill sessions`, 'success');
        
        // Process sessions to rebuild stats
        let totalDrills = 0;
        let totalQuestions = 0;
        let totalCorrect = 0;
        const dailyActivity = new Map<string, number>();
        
        sessionsSnapshot.forEach(doc => {
          const data = doc.data();
          totalDrills++;
          totalQuestions += data.questionsAnswered || 0;
          totalCorrect += data.correctAnswers || 0;
          
          // Track daily activity
          const date = new Date(data.timestamp?.toDate() || data.timestamp).toISOString().split('T')[0];
          dailyActivity.set(date, (dailyActivity.get(date) || 0) + 1);
        });
        
        addLog(`Processed: ${totalDrills} drills, ${totalQuestions} questions, ${totalCorrect} correct`, 'info');
        
        // Calculate streak from daily activity
        const sortedDates = Array.from(dailyActivity.keys()).sort();
        let currentStreak = 0;
        const today = new Date().toISOString().split('T')[0];
        let checkDate = today;
        
        while (dailyActivity.has(checkDate)) {
          currentStreak++;
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          checkDate = prevDate.toISOString().split('T')[0];
        }
        
        addLog(`Calculated streak: ${currentStreak} days`, 'success');
      } else {
        addLog('No drill sessions found', 'warning');
      }

      // 3. Check for story progress
      addLog('Checking story progress...', 'info');
      const storyProgressRef = collection(db, 'storyProgress');
      const storyQuery = query(storyProgressRef, where('userId', '==', profile.uid));
      const storySnapshot = await getDocs(storyQuery);
      
      if (!storySnapshot.empty) {
        const completedStories = storySnapshot.docs.filter(doc => 
          doc.data().completed === true
        ).length;
        addLog(`Found ${completedStories} completed stories`, 'success');
      }

      // 4. Check for article history
      addLog('Checking article history...', 'info');
      const articlesRef = collection(db, 'users', profile.uid, 'articleHistory');
      const articlesSnapshot = await getDocs(articlesRef);
      
      if (!articlesSnapshot.empty) {
        addLog(`Found ${articlesSnapshot.size} articles read`, 'success');
      }

      // 5. Check for kanji study
      addLog('Checking kanji study data...', 'info');
      const kanjiRef = collection(db, 'users', profile.uid, 'kanjiProgress');
      const kanjiSnapshot = await getDocs(kanjiRef);
      
      if (!kanjiSnapshot.empty) {
        addLog(`Found ${kanjiSnapshot.size} kanji studied`, 'success');
      }

      // 6. Force stats recalculation
      addLog('Forcing stats recalculation...', 'info');
      await statsTracker.initialize(profile, true);
      
      // 7. Trigger validation
      const stats = statsTracker.getStats();
      addLog('Current stats after recovery:', 'info');
      addLog(`- Current Streak: ${stats.currentStreak} days`, 'info');
      addLog(`- Total Days Active: ${stats.totalDaysActive} days`, 'info');
      addLog(`- Drills Completed: ${stats.drillsCompleted}`, 'info');
      addLog(`- Stories Read: ${stats.storiesRead}`, 'info');
      addLog(`- Articles Read: ${stats.articlesRead}`, 'info');
      addLog(`- Kanji Sessions: ${stats.kanjiStudySessions}`, 'info');
      
      addLog('Stats recovery completed!', 'success');
      
    } catch (error) {
      console.error('Stats recovery error:', error);
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  const resetAndRebuild = async () => {
    if (!confirm('This will reset all stats and rebuild from activity history. Continue?')) {
      return;
    }

    setIsRecovering(true);
    setLogs([]);
    
    try {
      addLog('Resetting stats...', 'warning');
      await statsTracker.resetStats();
      
      addLog('Stats reset complete. Now rebuilding...', 'info');
      await recoverStats();
      
    } catch (error) {
      console.error('Reset error:', error);
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Stats Recovery Tool
      </h2>
      
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>⚠️ Admin Only:</strong> This tool analyzes your activity history
          and rebuilds your stats. Use this if your streak or other stats appear incorrect.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <button
          onClick={recoverStats}
          disabled={isRecovering || !profile}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRecovering ? 'Recovering...' : 'Recover Stats'}
        </button>

        <button
          onClick={resetAndRebuild}
          disabled={isRecovering || !profile}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-4"
        >
          {isRecovering ? 'Processing...' : 'Reset & Rebuild'}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Recovery Log</h3>
          <div className="space-y-1 font-mono text-sm">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`
                  ${log.type === 'error' ? 'text-red-600 dark:text-red-400' : ''}
                  ${log.type === 'success' ? 'text-green-600 dark:text-green-400' : ''}
                  ${log.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : ''}
                  ${log.type === 'info' ? 'text-gray-700 dark:text-gray-300' : ''}
                `}
              >
                <span className="text-gray-500 dark:text-gray-500">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}