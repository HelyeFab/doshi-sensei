'use client';

import { useState, useEffect } from 'react';
import { strings } from '@/config/strings';
import Image from 'next/image';
import TypingEffect from './TypingEffect';
import StatsManager, { UserStats } from '../utils/stats';

export default function MobileHome() {
  const [stats, setStats] = useState<UserStats>({
    drillsCompleted: 0,
    accuracy: 0,
    currentStreak: 0,
    totalDaysUsed: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    longestStreak: 0,
    lastActiveDate: '',
    firstUseDate: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const userStats = await StatsManager.getUserStats();
      setStats(userStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-24">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-3">
            <span className="text-xl font-bold text-primary-foreground japanese-text">動</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground app-name">
            {strings.appName}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground japanese-text mb-4">
          動詞 先生
        </p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {strings.home.subtitle}
        </p>
      </div>

      {/* Main Image */}
      <div className="relative w-full max-w-sm mx-auto mb-6">
        <Image
          src="/doshi.png"
          alt="Doshi Sensei"
          width={400}
          height={400}
          className="w-full h-auto rounded-lg shadow-lg"
          priority
        />
      </div>

      {/* Stats Widget - Mobile (Progress Bars) */}
      <div className="w-full max-w-sm mx-auto mb-3 px-4">
        <div className="space-y-3">
          <MobileProgressStat
            value={loading ? 0 : stats.totalDaysUsed}
            label="Days Used"
            allStats={stats}
            loading={loading}
          />
          <MobileProgressStat
            value={loading ? 0 : stats.drillsCompleted}
            label="Drills"
            allStats={stats}
            loading={loading}
          />
          <MobileProgressStat
            value={loading ? 0 : stats.accuracy}
            label="Accuracy"
            allStats={stats}
            loading={loading}
            isPercentage={true}
          />
          <MobileProgressStat
            value={loading ? 0 : stats.currentStreak}
            label="Streak"
            allStats={stats}
            loading={loading}
          />
        </div>
      </div>

      {/* Typing Effect */}
      <TypingEffect />
    </div>
  );
}

interface MobileProgressStatProps {
  value: number;
  label: string;
  allStats: UserStats;
  loading: boolean;
  isPercentage?: boolean;
}

function MobileProgressStat({ value, label, allStats, loading, isPercentage = false }: MobileProgressStatProps) {
  // Calculate proportional width based on all stats
  const getProgressWidth = () => {
    if (loading || value === 0) return 0;

    if (isPercentage) {
      // For accuracy, use the percentage directly (0-100)
      return Math.min(value, 100);
    }

    // For other stats, find the maximum value to create proportional scaling
    const maxValue = Math.max(
      allStats.totalDaysUsed,
      allStats.drillsCompleted,
      allStats.currentStreak,
      1 // Minimum of 1 to avoid division by zero
    );

    // Return percentage (0-100) based on proportion to max
    return (value / maxValue) * 100;
  };

  const progressWidth = getProgressWidth();

  // Get two-tone colors based on the type of stat
  const getColors = () => {
    if (label.includes('Days')) return {
      background: 'bg-blue-100',
      progress: 'bg-blue-500',
      backgroundDark: 'dark:bg-blue-900/30',
      progressDark: 'dark:bg-blue-400'
    };
    if (label.includes('Drills')) return {
      background: 'bg-green-100',
      progress: 'bg-green-500',
      backgroundDark: 'dark:bg-green-900/30',
      progressDark: 'dark:bg-green-400'
    };
    if (label.includes('Accuracy')) return {
      background: 'bg-purple-100',
      progress: 'bg-purple-500',
      backgroundDark: 'dark:bg-purple-900/30',
      progressDark: 'dark:bg-purple-400'
    };
    if (label.includes('Streak')) return {
      background: 'bg-orange-100',
      progress: 'bg-orange-500',
      backgroundDark: 'dark:bg-orange-900/30',
      progressDark: 'dark:bg-orange-400'
    };
    return {
      background: 'bg-primary/10',
      progress: 'bg-primary',
      backgroundDark: 'dark:bg-primary/20',
      progressDark: 'dark:bg-primary'
    };
  };

  const colors = getColors();
  const displayValue = isPercentage ? `${value}%` : value.toString();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">
          {loading ? '...' : displayValue}
        </span>
      </div>
      <div className={`w-full rounded-full h-2 ${colors.background} ${colors.backgroundDark}`}>
        <div
          className={`h-2 rounded-full transition-all duration-700 ease-out ${colors.progress} ${colors.progressDark}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  );
}
