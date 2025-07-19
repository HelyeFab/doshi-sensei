'use client';

import React, { useState } from 'react';
import { useStats } from '@/hooks/useStats';
import { format } from 'date-fns';

export function DetailedStats() {
  const { stats, activities, loading } = useStats();
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-20 bg-muted rounded"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }

  const todayActivity = activities.today;
  const weekTotal = activities.week.reduce((acc, day) => ({
    flashcardSessions: acc.flashcardSessions + day.summary.flashcardsReviewed,
    newsArticles: acc.newsArticles + day.summary.articlesRead,
    stories: acc.stories + day.summary.storiesRead,
    games: acc.games + day.summary.gamesPlayed,
  }), {
    flashcardSessions: 0,
    newsArticles: 0,
    stories: 0,
    games: 0,
  });

  const monthTotal = activities.month.reduce((acc, day) => ({
    flashcardSessions: acc.flashcardSessions + day.summary.flashcardsReviewed,
    newsArticles: acc.newsArticles + day.summary.articlesRead,
    stories: acc.stories + day.summary.storiesRead,
    games: acc.games + day.summary.gamesPlayed,
  }), {
    flashcardSessions: 0,
    newsArticles: 0,
    stories: 0,
    games: 0,
  });

  return (
    <div
      className="bg-card rounded-lg p-6"
      style={{
        border: '2px solid white',
        boxShadow: 'inset 0 0 0 1px var(--primary), 0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
      >
        <h3 className="text-lg font-semibold">Learning Statistics</h3>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-background rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🔥</span>
            <span className="text-2xl font-bold">{stats.currentStreak}</span>
          </div>
          <p className="text-sm text-muted-foreground">Current Streak</p>
          <p className="text-xs text-muted-foreground mt-1">Longest: {stats.longestStreak} days</p>
        </div>
        
        <div className="bg-background rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <img src="/pokeball.png" alt="Pokéball" className="w-8 h-8" />
            <span className="text-2xl font-bold">{stats.pokemonCaught}</span>
          </div>
          <p className="text-sm text-muted-foreground">Pokémon Caught</p>
          <p className="text-xs text-muted-foreground mt-1">In KanjiQuest</p>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="mb-6">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <img src="/flat-icons/stats-bar/today.svg" alt="Today" className="w-5 h-5" />
          Today ({format(new Date(), 'dd/MM/yyyy')})
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Flashcards</span>
            <span className="font-medium">{todayActivity?.summary.flashcardsReviewed || 0}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Articles</span>
            <span className="font-medium">{todayActivity?.summary.articlesRead || 0}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Stories</span>
            <span className="font-medium">{todayActivity?.summary.storiesRead || 0}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Games</span>
            <span className="font-medium">{todayActivity?.summary.gamesPlayed || 0}</span>
          </div>
        </div>
      </div>

      {/* This Week */}
      <div className="mb-6">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <img src="/flat-icons/stats-bar/7-days.svg" alt="This Week" className="w-5 h-5" />
          This Week (Last 7 Days)
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Flashcards</span>
            <span className="font-medium">{weekTotal.flashcardSessions}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Articles</span>
            <span className="font-medium">{weekTotal.newsArticles}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Stories</span>
            <span className="font-medium">{weekTotal.stories}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Games</span>
            <span className="font-medium">{weekTotal.games}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Total Activities</span>
            <span className="text-lg font-bold text-primary">
              {weekTotal.flashcardSessions + weekTotal.newsArticles + weekTotal.stories + weekTotal.games}
            </span>
          </div>
        </div>
      </div>

      {/* This Month */}
      <div className="mb-6">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <img src="/flat-icons/stats-bar/30-days.svg" alt="This Month" className="w-5 h-5" />
          This Month (Last 30 Days)
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Flashcards</span>
            <span className="font-medium">{monthTotal.flashcardSessions}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Articles</span>
            <span className="font-medium">{monthTotal.newsArticles}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Stories</span>
            <span className="font-medium">{monthTotal.stories}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Games</span>
            <span className="font-medium">{monthTotal.games}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Total Activities</span>
            <span className="text-lg font-bold text-primary">
              {monthTotal.flashcardSessions + monthTotal.newsArticles + monthTotal.stories + monthTotal.games}
            </span>
          </div>
        </div>
      </div>

      {/* All Time Stats */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <span className="text-xl">🏆</span>
          All Time Statistics
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Total Activities</span>
            <span className="font-medium">{stats.totalActivities}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Days Active</span>
            <span className="font-medium">{stats.totalDaysActive}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Drills Completed</span>
            <span className="font-medium">{stats.drillsCompleted}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Stories Read</span>
            <span className="font-medium">{stats.storiesRead}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Articles Read</span>
            <span className="font-medium">{stats.articlesRead}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-background rounded">
            <span className="text-muted-foreground">Games Played</span>
            <span className="font-medium">{stats.gamesPlayed}</span>
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="mt-4 pt-4 border-t border-border">
          <h5 className="text-sm font-medium mb-2">Performance</h5>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Accuracy</span>
              <span className="font-medium">{stats.overallAccuracy}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Questions</span>
              <span className="font-medium">{stats.totalQuestionsAnswered}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Member Since</span>
              <span className="font-medium">
                {stats.firstActiveDate ? format(new Date(stats.firstActiveDate), 'dd/MM/yyyy') : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}