'use client';

import { motion } from 'framer-motion';
import { Achievement, AchievementLevel } from '@/lib/achievements/types';
import { MilestoneProgress } from './ProgressIndicator';

interface MultiLevelAchievementCardProps {
  achievement: Achievement;
  currentLevel: number;
  nextLevel: number | null;
  currentProgress: number;
  nextTarget: number | null;
  percentage: number;
  totalLevels: number;
  onClick?: () => void;
  className?: string;
  animated?: boolean;
}

export function MultiLevelAchievementCard({
  achievement,
  currentLevel,
  nextLevel,
  currentProgress,
  nextTarget,
  percentage,
  totalLevels,
  onClick,
  className = '',
  animated = true
}: MultiLevelAchievementCardProps) {
  if (!achievement.levels) return null;

  const currentLevelData = achievement.levels.find(l => l.level === currentLevel);
  const nextLevelData = achievement.levels.find(l => l.level === nextLevel);
  const isMaxLevel = currentLevel === totalLevels;

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return { border: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-800' };
      case 'rare':
        return { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-800' };
      case 'epic':
        return { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-800' };
      case 'legendary':
        return { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-800' };
      default:
        return { border: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-800' };
    }
  };

  const currentRarity = currentLevelData?.rarity || achievement.rarity;
  const rarityStyles = getRarityStyles(currentRarity);

  // Create milestones for progress display
  const milestones = achievement.levels.map(level => ({
    value: level.targetValue,
    label: `Level ${level.level}`,
    icon: level.icon
  }));

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      whileHover={animated ? { scale: 1.02 } : undefined}
      className={`
        bg-card rounded-lg border p-6 transition-all cursor-pointer
        ${currentLevel > 0 ? `border-primary/20 shadow-sm` : 'border-border hover:border-border/80'}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{achievement.icon}</span>
            <h3 className="text-lg font-semibold text-foreground">
              {achievement.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {achievement.description}
          </p>
        </div>

        {/* Level Badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${rarityStyles.bg} ${rarityStyles.text}`}>
          Level {currentLevel}/{totalLevels}
        </div>
      </div>

      {/* Current Level Info */}
      {currentLevelData && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{currentLevelData.icon}</span>
            <span className="font-medium text-foreground">{currentLevelData.title}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {currentLevelData.description}
          </p>
          <div className="text-xs text-primary">
            {currentLevelData.rewardType === 'xp' && `+${currentLevelData.rewardValue} XP`}
            {currentLevelData.rewardType === 'title' && `Title: "${currentLevelData.rewardValue}"`}
            {currentLevelData.rewardType === 'badge' && 'Badge Unlocked'}
            {currentLevelData.rewardType === 'cosmetic' && 'Cosmetic Unlocked'}
          </div>
        </div>
      )}

      {/* Progress to Next Level */}
      {!isMaxLevel && nextLevelData && nextTarget && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Next: {nextLevelData.title}
            </span>
            <span className="text-sm text-muted-foreground">
              {currentProgress} / {nextTarget}
            </span>
          </div>
          
          <div className="w-full bg-muted rounded-full h-2 mb-2">
            <motion.div
              className="h-full rounded-full bg-primary transition-all duration-500"
              initial={animated ? { width: '0%' } : { width: `${percentage}%` }}
              animate={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{nextLevelData.icon}</span>
            <span>{nextLevelData.description}</span>
          </div>
        </div>
      )}

      {/* Max Level Achieved */}
      {isMaxLevel && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-800">
            <span className="text-lg">🏆</span>
            <span className="font-medium">Maximum Level Achieved!</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            You've mastered this achievement completely.
          </p>
        </div>
      )}

      {/* Milestone Progress */}
      <div className="mb-4">
        <MilestoneProgress
          milestones={milestones}
          current={currentProgress}
          color={achievement.color}
        />
      </div>

      {/* Level Rewards Preview */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Level Rewards</h4>
        <div className="grid grid-cols-2 gap-2">
          {achievement.levels.slice(0, 4).map((level) => {
            const isUnlocked = level.level <= currentLevel;
            return (
              <div
                key={level.level}
                className={`p-2 rounded text-xs ${
                  isUnlocked 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span>{level.icon}</span>
                  <span className="font-medium">L{level.level}</span>
                  {isUnlocked && <span>✓</span>}
                </div>
                <div className="truncate">
                  {level.rewardType === 'xp' && `${level.rewardValue} XP`}
                  {level.rewardType === 'title' && level.rewardValue}
                  {level.rewardType === 'badge' && 'Badge'}
                  {level.rewardType === 'cosmetic' && 'Cosmetic'}
                </div>
              </div>
            );
          })}
          {achievement.levels.length > 4 && (
            <div className="p-2 rounded text-xs bg-muted text-muted-foreground flex items-center justify-center">
              +{achievement.levels.length - 4} more
            </div>
          )}
        </div>
      </div>

      {/* Sparkle Animation for Active Progress */}
      {!isMaxLevel && percentage > 0 && animated && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: Math.random() * 200 - 100,
                y: Math.random() * 200 - 100
              }}
              transition={{ 
                duration: 3,
                delay: i * 0.5,
                repeat: Infinity,
                repeatDelay: 2
              }}
              className="absolute top-1/2 left-1/2 text-primary text-xs"
            >
              ⭐
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface MultiLevelAchievementGridProps {
  achievements: Array<{
    achievement: Achievement;
    progress: {
      currentLevel: number;
      nextLevel: number | null;
      currentProgress: number;
      nextTarget: number | null;
      percentage: number;
      totalLevels: number;
    };
  }>;
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
  animated?: boolean;
}

export function MultiLevelAchievementGrid({
  achievements,
  onAchievementClick,
  className = '',
  animated = true
}: MultiLevelAchievementGridProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {achievements.map(({ achievement, progress }, index) => (
        <motion.div
          key={achievement.id}
          initial={animated ? { opacity: 0, y: 20 } : undefined}
          animate={animated ? { opacity: 1, y: 0 } : undefined}
          transition={animated ? { delay: index * 0.1 } : undefined}
        >
          <MultiLevelAchievementCard
            achievement={achievement}
            currentLevel={progress.currentLevel}
            nextLevel={progress.nextLevel}
            currentProgress={progress.currentProgress}
            nextTarget={progress.nextTarget}
            percentage={progress.percentage}
            totalLevels={progress.totalLevels}
            onClick={() => onAchievementClick?.(achievement)}
            animated={animated}
          />
        </motion.div>
      ))}
    </div>
  );
}