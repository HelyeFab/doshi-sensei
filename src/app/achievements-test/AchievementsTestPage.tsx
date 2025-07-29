'use client';

import { useAchievements } from '@/hooks/useAchievements';
import { UserStats } from '@/lib/achievements/types';

export default function AchievementsTestPage() {
  const {
    achievements,
    userStats,
    unlockedAchievements,
    isLoading,
    updateProgress,
    getAchievementProgress,
    isAchievementUnlocked,
    getUnlockedCount,
    getTotalCount,
    getCompletionPercentage
  } = useAchievements();

  const handleStatUpdate = async (statType: keyof UserStats, increment: number = 1) => {
    const newlyUnlocked = await updateProgress(statType, increment);
    if (newlyUnlocked.length > 0) {
      console.log('🎉 New achievements unlocked:', newlyUnlocked);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Achievement System Test</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Achievement System Test</h1>

      {/* Stats Overview */}
      <div className="bg-card rounded-lg p-4 border mb-6">
        <h2 className="text-lg font-semibold mb-4">Progress Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{getUnlockedCount()}</div>
            <div className="text-sm text-muted-foreground">Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{getTotalCount()}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{getCompletionPercentage()}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userStats?.totalXP || 0}</div>
            <div className="text-sm text-muted-foreground">Total XP</div>
          </div>
        </div>
      </div>

      {/* Current Stats */}
      <div className="bg-card rounded-lg p-4 border mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Stats</h2>
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="font-medium">Current Streak</div>
              <div className="text-2xl text-primary">{userStats.currentStreak}</div>
            </div>
            <div>
              <div className="font-medium">Drills Completed</div>
              <div className="text-2xl text-primary">{userStats.drillsCompleted}</div>
            </div>
            <div>
              <div className="font-medium">Words Saved</div>
              <div className="text-2xl text-primary">{userStats.wordsSaved}</div>
            </div>
            <div>
              <div className="font-medium">Stories Completed</div>
              <div className="text-2xl text-primary">{userStats.storiesCompleted}</div>
            </div>
            <div>
              <div className="font-medium">Games Played</div>
              <div className="text-2xl text-primary">{userStats.gamesPlayed}</div>
            </div>
            <div>
              <div className="font-medium">Sentences Read</div>
              <div className="text-2xl text-primary">{userStats.sentencesRead}</div>
            </div>
            <div>
              <div className="font-medium">Articles Read</div>
              <div className="text-2xl text-primary">{userStats.articlesRead}</div>
            </div>
            <div>
              <div className="font-medium">Longest Streak</div>
              <div className="text-2xl text-primary">{userStats.longestStreak}</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="bg-card rounded-lg p-4 border mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => handleStatUpdate('currentStreak')}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            +1 Streak
          </button>
          <button
            onClick={() => handleStatUpdate('drillsCompleted')}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            +1 Drill
          </button>
          <button
            onClick={() => handleStatUpdate('wordsSaved')}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            +1 Word
          </button>
          <button
            onClick={() => handleStatUpdate('storiesCompleted')}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            +1 Story
          </button>
          <button
            onClick={() => handleStatUpdate('gamesPlayed')}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            +1 Game
          </button>
          <button
            onClick={() => handleStatUpdate('sentencesRead')}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            +1 Sentence
          </button>
          <button
            onClick={() => handleStatUpdate('articlesRead')}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            +1 Article
          </button>
          <button
            onClick={() => handleStatUpdate('wordsSaved', 10)}
            className="px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          >
            +10 Words
          </button>
        </div>
      </div>

      {/* Achievements List */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-4">All Achievements</h2>
        <div className="space-y-2">
          {achievements.map((achievement) => {
            const progress = getAchievementProgress(achievement.id);
            const unlocked = isAchievementUnlocked(achievement.id);
            
            return (
              <div
                key={achievement.id}
                className={`flex items-center justify-between p-3 rounded border ${
                  unlocked ? 'bg-primary/10 border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div>
                    <div className="font-medium">{achievement.title}</div>
                    <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Category: {achievement.category} | Rarity: {achievement.rarity}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${unlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                    {progress.current} / {progress.target}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(progress.percentage)}%
                  </div>
                  {unlocked && (
                    <div className="text-xs text-primary font-medium">
                      ✓ UNLOCKED
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}