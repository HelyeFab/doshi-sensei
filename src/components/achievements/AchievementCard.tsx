'use client';

import { motion } from 'framer-motion';
import { Achievement } from '@/lib/achievements/types';
import { ProgressIndicator } from './ProgressIndicator';

interface AchievementCardProps {
  achievement: Achievement;
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  isUnlocked: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  animated?: boolean;
}

export function AchievementCard({
  achievement,
  progress,
  isUnlocked,
  onClick,
  className = '',
  size = 'md',
  showProgress = true,
  animated = true
}: AchievementCardProps) {
  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          text: 'text-gray-800',
          glow: 'shadow-gray-200'
        };
      case 'rare':
        return {
          border: 'border-blue-300',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          glow: 'shadow-blue-200'
        };
      case 'epic':
        return {
          border: 'border-purple-300',
          bg: 'bg-purple-50',
          text: 'text-purple-800',
          glow: 'shadow-purple-200'
        };
      case 'legendary':
        return {
          border: 'border-yellow-300',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          glow: 'shadow-yellow-200'
        };
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          text: 'text-gray-800',
          glow: 'shadow-gray-200'
        };
    }
  };

  const getRewardText = () => {
    switch (achievement.rewardType) {
      case 'xp':
        return `+${achievement.rewardValue} XP`;
      case 'title':
        return `Title: "${achievement.rewardValue}"`;
      case 'badge':
        return 'Badge Unlocked';
      case 'cosmetic':
        return 'Cosmetic Unlocked';
      default:
        return '';
    }
  };

  const sizeConfig = {
    sm: {
      container: 'p-3',
      icon: 'w-12 h-12 text-xl',
      title: 'text-sm',
      description: 'text-xs',
      progress: 'sm' as const
    },
    md: {
      container: 'p-4',
      icon: 'w-16 h-16 text-2xl',
      title: 'text-base',
      description: 'text-sm',
      progress: 'md' as const
    },
    lg: {
      container: 'p-6',
      icon: 'w-20 h-20 text-3xl',
      title: 'text-lg',
      description: 'text-base',
      progress: 'lg' as const
    }
  };

  const config = sizeConfig[size];
  const rarityStyles = getRarityStyles(achievement.rarity);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      whileHover={animated ? { scale: 1.02 } : undefined}
      className={`
        bg-card rounded-lg border transition-all cursor-pointer
        ${isUnlocked 
          ? `border-primary/20 shadow-sm ${rarityStyles.glow}` 
          : 'border-border hover:border-border/80'
        }
        ${config.container}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Achievement Icon and Progress */}
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div 
            className={`${config.icon} rounded-full flex items-center justify-center relative`}
            style={{
              backgroundColor: isUnlocked 
                ? `${achievement.color}20` 
                : 'var(--muted)'
            }}
          >
            <span 
              className={`${isUnlocked ? 'opacity-100' : 'opacity-50'}`}
            >
              {achievement.icon}
            </span>
          </div>

          {/* Progress Ring Overlay */}
          {showProgress && (
            <div className="absolute inset-0">
              <ProgressIndicator
                current={progress.current}
                target={progress.target}
                color={achievement.color}
                size={config.progress}
                showNumbers={false}
                animated={animated}
              />
            </div>
          )}

          {/* Completion Badge */}
          {isUnlocked && (
            <motion.div
              initial={animated ? { scale: 0 } : undefined}
              animate={animated ? { scale: 1 } : undefined}
              transition={animated ? { delay: 0.3, type: "spring" } : undefined}
              className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </motion.div>
          )}
        </div>
      </div>

      {/* Achievement Info */}
      <div className="text-center">
        <h3 className={`font-semibold text-foreground mb-1 ${config.title}`}>
          {achievement.title}
        </h3>
        <p className={`text-muted-foreground mb-2 ${config.description}`}>
          {achievement.description}
        </p>
        
        {/* Progress Numbers */}
        {showProgress && (
          <div className="text-xs text-muted-foreground mb-2">
            {progress.current} / {progress.target}
          </div>
        )}

        {/* Rarity Badge */}
        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${rarityStyles.bg} ${rarityStyles.text}`}>
          {achievement.rarity}
        </div>

        {/* Reward Info */}
        {isUnlocked && (
          <motion.div
            initial={animated ? { opacity: 0 } : undefined}
            animate={animated ? { opacity: 1 } : undefined}
            transition={animated ? { delay: 0.5 } : undefined}
            className="text-xs text-primary font-medium"
          >
            {getRewardText()}
          </motion.div>
        )}
      </div>

      {/* Sparkle Animation for Unlocked Achievements */}
      {isUnlocked && animated && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: Math.random() * 100 - 50,
                y: Math.random() * 100 - 50
              }}
              transition={{ 
                duration: 2,
                delay: i * 0.2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="absolute top-1/2 left-1/2 text-yellow-400 text-xs"
            >
              ✨
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface AchievementGridProps {
  achievements: Array<{
    achievement: Achievement;
    progress: { current: number; target: number; percentage: number };
    isUnlocked: boolean;
  }>;
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function AchievementGrid({
  achievements,
  onAchievementClick,
  className = '',
  size = 'md',
  animated = true
}: AchievementGridProps) {
  const gridConfig = {
    sm: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3',
    md: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
    lg: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
  };

  return (
    <div className={`grid ${gridConfig[size]} ${className}`}>
      {achievements.map(({ achievement, progress, isUnlocked }, index) => (
        <motion.div
          key={achievement.id}
          initial={animated ? { opacity: 0, y: 20 } : undefined}
          animate={animated ? { opacity: 1, y: 0 } : undefined}
          transition={animated ? { delay: index * 0.1 } : undefined}
        >
          <AchievementCard
            achievement={achievement}
            progress={progress}
            isUnlocked={isUnlocked}
            onClick={() => onAchievementClick?.(achievement)}
            size={size}
            animated={animated}
          />
        </motion.div>
      ))}
    </div>
  );
}