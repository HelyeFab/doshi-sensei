'use client';

import React, { useMemo, useState } from 'react';
import { useStats } from '@/hooks/useStats';
import { useSettings } from '@/contexts/SettingsContext';
import { colorPalettes } from '@/utils/themes';
import { useComponentName } from '@/components/DevHelper';
import SlideUpModal from '@/components/SlideUpModal';
import PokedexContent from '@/components/games/PokedexContent';
import { useAuth } from '@/contexts/AuthContext';

interface StatItem {
  id: string;
  icon: string | React.ReactNode;
  label: string;
  value: string | number;
  loading: boolean;
}

interface StatDisplayProps {
  stat: StatItem;
  index: number;
}

function StatDisplay({ stat, index, onClick }: StatDisplayProps & { onClick?: () => void }) {
  const isPokemon = stat.id === 'pokemon';
  
  return (
    <div 
      className={`relative flex flex-col items-center text-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg group ${
        isPokemon ? 'cursor-pointer' : ''
      }`}
      onClick={isPokemon ? onClick : undefined}
    >
      {/* Icon */}
      <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-white/20 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all duration-500 ease-in-out ${
        isPokemon ? 'group-hover:scale-110 group-hover:bg-white/25' : 'group-hover:scale-105'
      }`}>
        {typeof stat.icon === 'string' ? (
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">{stat.icon}</span>
        ) : (
          React.cloneElement(stat.icon as React.ReactElement, {
            className: "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 object-contain"
          })
        )}
      </div>
      
      {/* Value and Label */}
      <div className="flex flex-col items-center">
        <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white">
          {stat.loading ? '...' : stat.value}
        </div>
        <div className="text-[10px] sm:text-xs md:text-sm text-white/80">
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
  const { user } = useAuth();
  const [showPokedexModal, setShowPokedexModal] = useState(false);

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
    
    // Check if user was active yesterday but not today (streak at risk)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const wasActiveYesterday = stats.lastActiveDate === yesterday;
    const hasActivityToday = todayActivity && todayActivity.summary.totalActivities > 0;
    const streakAtRisk = wasActiveYesterday && !hasActivityToday && stats.currentStreak > 0;

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
        icon: streakAtRisk ? '⚠️' : '🔥',
        label: streakAtRisk ? 'At Risk!' : 'Streak',
        value: stats.currentStreak,
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
        id: 'alltime',
        icon: '🏆',
        label: 'All Time',
        value: allTimeTotal.activities,
        loading
      }
    ];

    return items;
  }, [stats, activities, loading]);

  return (
    <>
      <div
        className={`group relative bg-primary backdrop-blur-md rounded-2xl p-2 sm:p-4 md:p-4 transition-all duration-500 ease-in-out hover:scale-[1.01] hover:shadow-lg overflow-hidden ${className}`}
        {...componentProps}
      >
      
      {/* Hover glass effect - similar to feature cards */}
      <div className="absolute inset-0 rounded-2xl bg-white/15 dark:bg-white/8 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out pointer-events-none" />
      
      {/* Content layer - above the background */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 w-full max-w-md">
          {statsItems.map((stat, index) => (
            <StatDisplay 
              key={stat.id} 
              stat={stat} 
              index={index} 
              onClick={stat.id === 'pokemon' ? () => setShowPokedexModal(true) : undefined}
            />
          ))}
        </div>
      </div>
      </div>

      {/* Pokedex Modal */}
      <SlideUpModal
        isOpen={showPokedexModal}
        onClose={() => setShowPokedexModal(false)}
        height="90%"
        showHandle={false}
        showCloseButton={false}
      >
        <PokedexContent userId={user?.uid} onClose={() => setShowPokedexModal(false)} />
      </SlideUpModal>
    </>
  );
}

// Utility function to pastelized HSL
function pastelizeHSL(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (!match) return hsl;
  const [_, h] = match;
  return `hsl(${h}, 60%, 85%)`;
}