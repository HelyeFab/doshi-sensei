'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStrings } from '@/contexts/LanguageContext';
import { useAchievements } from '@/hooks/useAchievements';
import { Achievement } from '@/lib/achievements/types';
import { AchievementCircles } from './AchievementCircles';
import { useAuth } from '@/contexts/AuthContext';

interface DisplayAchievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  progress: string | number;
  maxProgress: number;
  isUnlocked: boolean;
  rarity: string;
  color: string;
}

export default function UserAchievements() {
  const strings = useStrings();
  const { user, loading: authLoading } = useAuth();
  const {
    achievements,
    userStats,
    isLoading,
    getAchievementProgress,
    isAchievementUnlocked,
    updateDailyStreak
  } = useAchievements();

  const [displayAchievements, setDisplayAchievements] = useState<DisplayAchievement[]>([]);

  // Update daily streak on component mount only if authenticated
  useEffect(() => {
    if (user) {
      updateDailyStreak();
    }
  }, [user, updateDailyStreak]);

  // Process achievements for display
  useEffect(() => {
    // Only show achievements for authenticated users
    if (!user || !achievements.length || !userStats) {
      setDisplayAchievements([]);
      return;
    }

    // Get a selection of achievements to display (prioritize current progress)
    const achievementsToShow = achievements
      .filter(achievement => achievement.isActive)
      .sort((a, b) => {
        // Prioritize unlocked achievements, then by progress
        const aUnlocked = isAchievementUnlocked(a.id);
        const bUnlocked = isAchievementUnlocked(b.id);
        
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        
        // If both unlocked or both not unlocked, sort by progress
        const aProgress = getAchievementProgress(a.id);
        const bProgress = getAchievementProgress(b.id);
        
        return bProgress.percentage - aProgress.percentage;
      })
      .slice(0, 3) // Show top 3
      .map(achievement => {
        const progress = getAchievementProgress(achievement.id);
        const unlocked = isAchievementUnlocked(achievement.id);
        
        return {
          id: achievement.id,
          icon: achievement.icon,
          title: achievement.title,
          description: achievement.description,
          progress: progress.current,
          maxProgress: progress.target,
          isUnlocked: unlocked,
          rarity: achievement.rarity,
          color: achievement.color
        };
      });

    setDisplayAchievements(achievementsToShow);
  }, [user, achievements, userStats, getAchievementProgress, isAchievementUnlocked]);

  // Show loading state for authenticated users
  if (authLoading) {
    return (
      <section className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Your Journey</h2>
          <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-muted animate-pulse rounded-full"></div>
                <div className="space-y-1 max-w-[120px] sm:max-w-[140px]">
                  <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
                  <div className="w-3/4 h-3 bg-muted animate-pulse rounded mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show guest/teaser view for non-authenticated users
  if (!user) {
    return (
      <section className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Your Journey</h2>
          <a href="/login" 
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group">
            Sign In
            <svg 
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Track Your Progress</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to unlock achievements and track your Japanese learning journey!
            </p>
            <a href="/login" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm">
              Get Started
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    );
  }

  // Show loading state for authenticated users fetching data
  if (isLoading) {
    return (
      <section className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Your Journey</h2>
          <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-muted animate-pulse rounded-full"></div>
                <div className="space-y-1 max-w-[120px] sm:max-w-[140px]">
                  <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
                  <div className="w-3/4 h-3 bg-muted animate-pulse rounded mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground">Your Journey</h2>
        <Link href="/achievements" 
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group">
          View All
          <svg 
            className="w-4 h-4 transition-transform group-hover:translate-x-0.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Achievement Circles Dashboard */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6">
        {displayAchievements.length > 0 ? (
          <>
            <AchievementCircles
              achievements={displayAchievements.map(achievement => ({
                ...achievement,
                rewardValue: achievement.isUnlocked ? 100 : undefined
              }))}
            />

            {/* Motivation Message */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                Keep going! You're making great progress 🌟
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-sm text-muted-foreground">
              Start your learning journey to unlock achievements!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}