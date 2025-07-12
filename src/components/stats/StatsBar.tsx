'use client';

import React from 'react';
import { useStats } from '@/hooks/useStats';
import { useSettings } from '@/contexts/SettingsContext';
import { colorPalettes } from '@/utils/themes';

interface StatBadgeProps {
  icon: string | React.ReactNode;
  label: string;
  value: string | number;
  loading: boolean;
}

function StatBadge({ icon, label, value, loading }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-white shadow-sm flex items-center justify-center">
        {typeof icon === 'string' ? (
          <span className="text-base md:text-sm text-gray-800">{icon}</span>
        ) : (
          icon
        )}
      </div>
      <div>
        <div className="text-base md:text-sm font-semibold text-gray-900">
          {loading ? '...' : value}
        </div>
        <div className="text-sm md:text-xs text-gray-700">{label}</div>
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
    <div
      className={`backdrop-blur-md rounded-lg p-4 md:p-5 transition-all duration-300 ${className}`}
      style={{
        border: '2px solid white',
        boxShadow: 'inset 0 0 0 1px rgb(129, 140, 248), 0 4px 12px rgba(0,0,0,0.1)',
        background: `linear-gradient(90deg, ${gradientColors.primary} 0%, ${gradientColors.accent} 60%, ${gradientColors.secondary} 100%)`,
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:items-center md:justify-between gap-4 md:gap-4">
        {/* Streak */}
        <StatBadge
          icon="🔥"
          label="Streak"
          value={`${stats.currentStreak} days`}
          loading={loading}
        />

        <div className="hidden md:block h-8 w-px bg-gray-400/30" />

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
              className="w-full h-full object-contain"
            />
          }
          label="Pokémon"
          value={stats.pokemonCaught}
          loading={loading}
        />

        <div className="hidden md:block h-8 w-px bg-gray-400/30" />

        {/* Stories */}
        <StatBadge
          icon={
            <img 
              src="/flat-icons/root-icons/story.svg" 
              alt="Stories" 
              width={20}
              height={20}
              className="w-5 h-5 md:w-4 md:h-4 object-contain"
            />
          }
          label="Stories"
          value={stats.storiesRead}
          loading={loading}
        />

        <div className="hidden md:block h-8 w-px bg-gray-400/30" />

        {/* Overall Accuracy */}
        <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
          <div className="relative w-10 h-10">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="gray"
                strokeWidth="3"
                fill="none"
                opacity="0.2"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="gray"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${loading ? 0 : (avgAccuracy / 100) * 100} 100`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-gray-800">
                {loading ? '...' : `${avgAccuracy}%`}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-700">Accuracy</div>
          </div>
        </div>

        {/* Active Days (new stat) */}
        <div className="hidden md:flex items-center gap-2">
          <div className="h-8 w-px bg-gray-400/30 mr-2" />
          <StatBadge
            icon="📅"
            label="Active Days"
            value={stats.totalDaysActive}
            loading={loading}
          />
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