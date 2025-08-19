'use client';

import { useState, useEffect } from 'react';
import { kanjiMasteryStorage } from '@/services/kanji-mastery/indexdb-storage';
import { kanjiSpacedRepetition } from '@/services/kanji-mastery/spaced-repetition-service';

interface Stats {
  totalKanji: number;
  dueKanji: number;
  masteredKanji: number;
  totalReviews: number;
  averageMastery: number;
  currentStreak: number;
  longestStreak: number;
  retentionRate: number;
}

export default function KanjiProgressSummary() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Initialize storage
      await kanjiMasteryStorage.init();
      
      // Get basic stats
      const basicStats = await kanjiSpacedRepetition.getStats();
      const sessions = await kanjiMasteryStorage.getStudySessions(undefined, 30);
      
      // Calculate streak
      let currentStreak = 0;
      let longestStreak = 0;
      const dates = new Set<string>();
      
      sessions.forEach(s => {
        const date = new Date(s.startTime).toDateString();
        dates.add(date);
      });
      
      const sortedDates = Array.from(dates).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );
      
      // Check if today or yesterday has activity for current streak
      const todayStr = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      if (sortedDates.length > 0 && (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr)) {
        currentStreak = 1;
        let checkDate = new Date(sortedDates[0]);
        
        for (let i = 1; i < sortedDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (sortedDates[i] === checkDate.toDateString()) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      
      // Calculate longest streak
      let tempStreak = 0;
      for (let i = 0; i < sortedDates.length; i++) {
        tempStreak = 1;
        let checkDate = new Date(sortedDates[i]);
        
        for (let j = i + 1; j < sortedDates.length; j++) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (sortedDates[j] === checkDate.toDateString()) {
            tempStreak++;
          } else {
            break;
          }
        }
        
        longestStreak = Math.max(longestStreak, tempStreak);
      }
      
      // Calculate retention rate from recent sessions
      let totalRetention = 0;
      let sessionCount = 0;
      sessions.slice(0, 10).forEach(session => {
        if (session.kanjiStudied > 0) {
          const rate = (session.kanjiCorrect / session.kanjiStudied) * 100;
          totalRetention += rate;
          sessionCount++;
        }
      });
      
      const retentionRate = sessionCount > 0 ? Math.round(totalRetention / sessionCount) : 0;
      
      setStats({
        totalKanji: basicStats.totalKanji,
        dueKanji: basicStats.dueKanji,
        masteredKanji: basicStats.masteredKanji,
        totalReviews: sessions.length, // Changed to show number of study sessions
        averageMastery: basicStats.averageMastery,
        currentStreak,
        longestStreak,
        retentionRate
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        totalKanji: 0,
        dueKanji: 0,
        masteredKanji: 0,
        totalReviews: 0,
        averageMastery: 0,
        currentStreak: 0,
        longestStreak: 0,
        retentionRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Your Progress
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center p-4 bg-muted rounded-lg animate-pulse">
              <div className="h-8 w-16 bg-muted-foreground/20 rounded mx-auto mb-2"></div>
              <div className="h-4 w-20 bg-muted-foreground/20 rounded mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Your Progress
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {stats?.totalKanji || 0}
          </div>
          <div className="text-sm text-muted-foreground">Kanji Studied</div>
        </div>
        
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {stats?.currentStreak || 0}
          </div>
          <div className="text-sm text-muted-foreground">Day Streak</div>
        </div>
        
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {stats?.retentionRate || 0}%
          </div>
          <div className="text-sm text-muted-foreground">Retention Rate</div>
        </div>
        
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className={`text-2xl font-bold ${
            (stats?.dueKanji || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'
          }`}>
            {stats?.dueKanji || 0}
          </div>
          <div className="text-sm text-muted-foreground">Reviews Due</div>
        </div>
      </div>

      {/* Additional Stats */}
      {stats && stats.totalKanji > 0 && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-foreground">
              {stats.masteredKanji}
            </div>
            <div className="text-xs text-muted-foreground">Mastered</div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              {stats.totalReviews}
            </div>
            <div className="text-xs text-muted-foreground">Study Sessions</div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              {stats.longestStreak}
            </div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>
        </div>
      )}
    </div>
  );
}