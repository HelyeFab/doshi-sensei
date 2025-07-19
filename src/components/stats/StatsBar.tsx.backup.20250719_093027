'use client';

import React from 'react';
import { useStats } from '@/hooks/useStats';
import { useSettings } from '@/contexts/SettingsContext';
import { colorPalettes } from '@/utils/themes';
import { useComponentName } from '@/components/DevHelper';

interface StatBadgeProps {
  icon: string | React.ReactNode;
  label: string;
  value: string | number;
  loading: boolean;
}

function StatBadge({ icon, label, value, loading }: StatBadgeProps) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5 sm:gap-1">
      <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
        {typeof icon === 'string' ? (
          <span className="text-sm sm:text-base md:text-base">{icon}</span>
        ) : (
          icon
        )}
      </div>
      <div className="flex flex-col items-center">
        <div className="text-xs sm:text-sm md:text-sm font-bold text-gray-900 leading-tight">
          {loading ? '...' : value}
        </div>
        <div className="text-[10px] sm:text-xs text-gray-700">{label}</div>
      </div>
    </div>
  );
}

interface StatsBarProps {
  className?: string;
}

export function StatsBar({ className = '' }: StatsBarProps) {
  const { stats, loading } = useStats();
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

  // Calculate average accuracy
  const avgAccuracy = stats.totalQuestionsAnswered > 0
    ? Math.round((stats.totalCorrectAnswers / stats.totalQuestionsAnswered) * 100)
    : 0;

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="px-2 sm:px-3 md:px-4 py-2">
        <div
          className={`backdrop-blur-md rounded-lg p-2 sm:p-3 md:p-4 transition-all duration-300 ${className}`}
          style={{
            border: '2px solid white',
            boxShadow: 'inset 0 0 0 1px rgb(129, 140, 248), 0 4px 12px rgba(0,0,0,0.1)',
            background: `linear-gradient(90deg, ${gradientColors.primary} 0%, ${gradientColors.accent} 60%, ${gradientColors.secondary} 100%)`,
          }}
          {...componentProps}
        >
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
        {/* Streak */}
        <StatBadge
          icon="🔥"
          label="Streak"
          value={`${stats.currentStreak} days`}
          loading={loading}
        />


        {/* Drills */}
        <StatBadge
          icon="⚡"
          label="Drills"
          value={stats.drillsCompleted}
          loading={loading}
        />

        {/* Kanji Sessions */}
        <StatBadge
          icon="漢"
          label="Sessions"
          value={stats.kanjiStudySessions}
          loading={loading}
        />

        {/* Kanji Learned */}
        <StatBadge
          icon="📚"
          label="Learned"
          value={stats.totalKanjiLearned}
          loading={loading}
        />

        {/* Pokemon */}
        <StatBadge
          icon={
            <img
              src="/pokeball.png"
              alt="Pokéball"
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 object-contain"
            />
          }
          label="Pokémon"
          value={stats.pokemonCaught}
          loading={loading}
        />


        {/* Stories */}
        <StatBadge
          icon={
            <img 
              src="/flat-icons/root-icons/story.svg" 
              alt="Stories" 
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 object-contain"
            />
          }
          label="Stories"
          value={stats.storiesRead}
          loading={loading}
        />


        {/* Overall Accuracy */}
        <StatBadge
          icon="📊"
          label="Accuracy"
          value={`${avgAccuracy}%`}
          loading={loading}
        />

        
        {/* Active Days (new stat) */}
        <StatBadge
          icon="📅"
          label="Active Days"
          value={stats.totalDaysActive}
          loading={loading}
        />
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