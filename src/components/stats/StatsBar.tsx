'use client';

import React, { useMemo } from 'react';
import { useStats } from '@/hooks/useStats';
import { useSettings } from '@/contexts/SettingsContext';
import { colorPalettes } from '@/utils/themes';
import { useComponentName } from '@/components/DevHelper';
import { formatDistanceToNow } from 'date-fns';

interface StatItem {
  id: string;
  icon: string | React.ReactNode;
  label: string;
  value: string | number;
  hoverText?: string;
  loading: boolean;
}

interface StatDisplayProps {
  stat: StatItem;
  index: number;
}

function StatDisplay({ stat, index }: StatDisplayProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  return (
    <div 
      className="relative flex flex-col items-center text-center gap-1 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
    >
      {/* Tooltip */}
      {showTooltip && stat.hoverText && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {stat.hoverText}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
      
      {/* Icon */}
      <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
        {typeof stat.icon === 'string' ? (
          <span className="text-base">{stat.icon}</span>
        ) : (
          stat.icon
        )}
      </div>
      
      {/* Value and Label */}
      <div className="flex flex-col items-center">
        <div className="text-sm font-bold text-gray-900">
          {stat.loading ? '...' : stat.value}
        </div>
        <div className="text-xs text-gray-700">
          {stat.label}
        </div>
      </div>
    </div>
  );
}

export function StatsBar({ className = '' }: { className?: string }) {
  const { stats, loading, activities } = useStats();
  const { settings } = useSettings();
  const componentProps = useComponentName('StatsBar');

  // Calculate gradient colors
  const colorScheme = settings.colorScheme || 'default';
  const palette = colorPalettes[colorScheme]?.colors || colorPalettes['default'].colors;
  
  // Pastelized gradient
  const gradientColors = {
    primary: pastelizeHSL(palette.primary),
    accent: pastelizeHSL(palette.accent),
    secondary: pastelizeHSL(palette.secondary)
  };

  // Calculate stats based on the proposed system
  const statsItems = useMemo(() => {
    if (!stats || !activities) {
      return [];
    }

    // Get today's date string
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = activities.today;

    // Calculate this week (last 7 days)
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

    // Calculate this month (last 30 days)
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

    // Calculate all time totals
    const allTimeTotal = {
      activities: stats.totalActivities,
      daysActive: stats.totalDaysActive,
    };

    const items: StatItem[] = [
      {
        id: 'streak',
        icon: '🔥',
        label: 'Streak',
        value: stats.currentStreak,
        hoverText: `Longest: ${stats.longestStreak} days`,
        loading
      },
      {
        id: 'pokemon',
        icon: (
          <img
            src="/pokeball.png"
            alt="Pokéball"
            className="w-5 h-5 object-contain"
          />
        ),
        label: 'Pokémon',
        value: stats.pokemonCaught,
        loading
      },
      {
        id: 'today',
        icon: '📊',
        label: 'Today',
        value: todayActivity ? 
          `${todayActivity.summary.flashcardsReviewed}/${todayActivity.summary.articlesRead}/${todayActivity.summary.storiesRead}/${todayActivity.summary.gamesPlayed}` : 
          '0/0/0/0',
        hoverText: todayActivity ? 
          `Flashcards: ${todayActivity.summary.flashcardsReviewed}, Articles: ${todayActivity.summary.articlesRead}, Stories: ${todayActivity.summary.storiesRead}, Games: ${todayActivity.summary.gamesPlayed}` :
          'No activity today',
        loading
      },
      {
        id: 'week',
        icon: '📅',
        label: 'This Week',
        value: weekTotal.flashcardSessions + weekTotal.newsArticles + weekTotal.stories + weekTotal.games,
        hoverText: `Flashcards: ${weekTotal.flashcardSessions}, Articles: ${weekTotal.newsArticles}, Stories: ${weekTotal.stories}, Games: ${weekTotal.games}`,
        loading
      },
      {
        id: 'month',
        icon: '📆',
        label: 'This Month',
        value: monthTotal.flashcardSessions + monthTotal.newsArticles + monthTotal.stories + monthTotal.games,
        hoverText: `Flashcards: ${monthTotal.flashcardSessions}, Articles: ${monthTotal.newsArticles}, Stories: ${monthTotal.stories}, Games: ${monthTotal.games}`,
        loading
      },
      {
        id: 'alltime',
        icon: '🏆',
        label: 'All Time',
        value: allTimeTotal.activities,
        hoverText: `Active for ${allTimeTotal.daysActive} days`,
        loading
      }
    ];

    return items;
  }, [stats, activities, loading]);

  return (
    <div className="w-full max-w-3xl mx-auto overflow-hidden">
      <div className="px-2 py-1">
        <div
          className={`backdrop-blur-md rounded-lg p-2 transition-all duration-300 ${className}`}
          style={{
            border: '2px solid white',
            boxShadow: 'inset 0 0 0 1px rgb(129, 140, 248), 0 4px 12px rgba(0,0,0,0.1)',
            background: `linear-gradient(90deg, ${gradientColors.primary} 0%, ${gradientColors.accent} 60%, ${gradientColors.secondary} 100%)`,
          }}
          {...componentProps}
        >
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1 max-w-2xl lg:max-w-3xl mx-auto">
            {statsItems.map((stat, index) => (
              <StatDisplay key={stat.id} stat={stat} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function to pastelized HSL
function pastelizeHSL(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (!match) return hsl;
  const [_, h] = match;
  return `hsl(${h}, 60%, 85%)`;
}