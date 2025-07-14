'use client';

import { useState } from 'react';
import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '@/contexts/AdminContext';

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

export default function StatsMigration() {
  const { isAdmin } = useAdmin();
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<MigrationStats>({
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  });
  const [logs, setLogs] = useState<string[]>([]);

  if (!isAdmin) {
    return null;
  }

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const migrateUserStats = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog('🚀 Starting stats migration from v2.0 to v2.1...');

    try {
      // Get all user stats
      const statsSnapshot = await getDocs(collection(db, 'userStats'));
      const total = statsSnapshot.size;
      
      setStats({ total, migrated: 0, skipped: 0, errors: 0 });
      addLog(`📊 Found ${total} user stats to process`);

      for (const docSnapshot of statsSnapshot.docs) {
        const userId = docSnapshot.id;
        const userStats = docSnapshot.data();

        try {
          // Skip if already migrated
          if (userStats.version === '2.1') {
            addLog(`⏭️ Skipping ${userId} - already v2.1`);
            setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
            continue;
          }

          addLog(`📝 Migrating ${userId}...`);

          // Initialize new fields
          const updates: any = {
            version: '2.1',
            lastUpdated: serverTimestamp(),
            
            // Initialize empty sets if not present
            learnedKanjiSet: userStats.learnedKanjiSet || [],
            learnedWordsSet: userStats.learnedWordsSet || [],
            caughtPokemonSet: userStats.caughtPokemonSet || [],
            
            // Initialize activity-specific stats
            drillStats: userStats.drillStats || { totalQuestions: 0, totalCorrect: 0 },
            kanjiStats: userStats.kanjiStats || { totalQuestions: 0, totalCorrect: 0 },
            gameStats: userStats.gameStats || { totalQuestions: 0, totalCorrect: 0 }
          };

          // Ensure accuracy fields exist
          if (userStats.drillAccuracy === undefined) updates.drillAccuracy = 0;
          if (userStats.kanjiAccuracy === undefined) updates.kanjiAccuracy = 0;
          if (userStats.gameAccuracy === undefined) updates.gameAccuracy = 0;

          // Extract unique items from daily activities if needed
          if (userStats.totalKanjiLearned > 0 || userStats.totalWordsLearned > 0) {
            addLog(`  🔍 Analyzing activities for ${userId}...`);
            
            const activitiesSnapshot = await getDocs(
              collection(db, 'userStats', userId, 'dailyActivities')
            );

            const uniqueKanji = new Set<string>();
            const uniqueWords = new Set<string>();
            const uniquePokemon = new Set<string>();

            let drillQ = 0, drillC = 0;
            let kanjiQ = 0, kanjiC = 0;
            let gameQ = 0, gameC = 0;

            for (const activityDoc of activitiesSnapshot.docs) {
              const dailyData = activityDoc.data();
              if (dailyData.activities) {
                for (const activity of dailyData.activities) {
                  // Extract unique items
                  if (activity.type === 'kanji' && activity.details?.itemId) {
                    uniqueKanji.add(activity.details.itemId);
                  }
                  if (activity.type === 'vocab' && activity.details?.itemId) {
                    uniqueWords.add(activity.details.itemId);
                  }
                  if (activity.type === 'game' && activity.details?.gameType === 'pokemon' && activity.details?.itemId) {
                    uniquePokemon.add(activity.details.itemId);
                  }

                  // Aggregate accuracy data
                  if (activity.details?.correct !== undefined && activity.details?.total !== undefined) {
                    switch (activity.type) {
                      case 'drill':
                        drillQ += activity.details.total;
                        drillC += activity.details.correct;
                        break;
                      case 'kanji':
                        kanjiQ += activity.details.total;
                        kanjiC += activity.details.correct;
                        break;
                      case 'game':
                        gameQ += activity.details.total;
                        gameC += activity.details.correct;
                        break;
                    }
                  }
                }
              }
            }

            // Update with extracted data
            updates.learnedKanjiSet = Array.from(uniqueKanji);
            updates.learnedWordsSet = Array.from(uniqueWords);
            updates.caughtPokemonSet = Array.from(uniquePokemon);
            
            updates.totalKanjiLearned = updates.learnedKanjiSet.length;
            updates.totalWordsLearned = updates.learnedWordsSet.length;
            updates.pokemonCaught = updates.caughtPokemonSet.length;

            updates.drillStats = { totalQuestions: drillQ, totalCorrect: drillC };
            updates.kanjiStats = { totalQuestions: kanjiQ, totalCorrect: kanjiC };
            updates.gameStats = { totalQuestions: gameQ, totalCorrect: gameC };

            if (drillQ > 0) updates.drillAccuracy = Math.round((drillC / drillQ) * 100);
            if (kanjiQ > 0) updates.kanjiAccuracy = Math.round((kanjiC / kanjiQ) * 100);
            if (gameQ > 0) updates.gameAccuracy = Math.round((gameC / gameQ) * 100);

            addLog(`  ✅ Found ${updates.learnedKanjiSet.length} kanji, ${updates.learnedWordsSet.length} words`);
          }

          // Apply updates
          await updateDoc(doc(db, 'userStats', userId), updates);
          addLog(`✅ Migrated ${userId} successfully`);
          setStats(prev => ({ ...prev, migrated: prev.migrated + 1 }));

        } catch (error) {
          addLog(`❌ Error migrating ${userId}: ${error}`);
          setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        }
      }

      addLog('🎉 Migration completed!');
      
    } catch (error) {
      addLog(`💥 Fatal error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Stats Migration Tool</h2>
      <p className="text-muted-foreground mb-4">
        Migrate user stats from v2.0 to v2.1. This adds uniqueness tracking and activity-specific accuracy.
      </p>

      <div className="mb-4 grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.migrated}</div>
          <div className="text-sm text-muted-foreground">Migrated</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
          <div className="text-sm text-muted-foreground">Skipped</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          <div className="text-sm text-muted-foreground">Errors</div>
        </div>
      </div>

      <button
        onClick={migrateUserStats}
        disabled={isRunning}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? 'Migration in Progress...' : 'Start Migration'}
      </button>

      {logs.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Migration Logs</h3>
          <div className="bg-muted p-4 rounded max-h-96 overflow-y-auto font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}