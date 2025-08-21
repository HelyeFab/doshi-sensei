'use client';

import { motion } from 'framer-motion';
import { Achievement } from '@/lib/achievements/types';

interface HiddenAchievementCardProps {
  achievement?: Achievement;
  isUnlocked: boolean;
  hint?: string;
  onClick?: () => void;
  className?: string;
  animated?: boolean;
}

export function HiddenAchievementCard({
  achievement,
  isUnlocked,
  hint,
  onClick,
  className = '',
  animated = true
}: HiddenAchievementCardProps) {
  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return { border: 'border-border', bg: 'bg-muted', text: 'text-foreground' };
      case 'rare':
        return { border: 'border-primary', bg: 'bg-primary/10', text: 'text-primary' };
      case 'epic':
        return { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-700' };
      case 'legendary':
        return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-700' };
      default:
        return { border: 'border-border', bg: 'bg-muted', text: 'text-foreground' };
    }
  };

  const rarityStyles = achievement ? getRarityStyles(achievement.rarity) : getRarityStyles('common');

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      whileHover={animated ? { scale: 1.02 } : undefined}
      className={`
        bg-card rounded-lg border p-4 transition-all cursor-pointer relative overflow-hidden
        ${isUnlocked 
          ? `border-primary/20 shadow-sm` 
          : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
        }
        ${className}
      `}
      onClick={onClick}
    >
      {/* Mystery Overlay for Locked Achievements */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-muted/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">❓</div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Hidden Achievement
            </div>
            {hint && (
              <div className="text-xs text-muted-foreground italic">
                "{hint}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Achievement Content (shown when unlocked) */}
      {isUnlocked && achievement && (
        <>
          {/* Achievement Icon */}
          <div className="flex justify-center mb-3">
            <div 
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${achievement.color}20` }}
            >
              <span className="text-2xl">{achievement.icon}</span>
              
              {/* Completion Badge */}
              <motion.div
                initial={animated ? { scale: 0 } : undefined}
                animate={animated ? { scale: 1 } : undefined}
                transition={animated ? { delay: 0.3, type: "spring" } : undefined}
                className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
              >
                <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            </div>
          </div>

          {/* Achievement Info */}
          <div className="text-center">
            <h3 className="font-semibold text-foreground mb-1">
              {achievement.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {achievement.description}
            </p>

            {/* Hidden Badge */}
            <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-700 mb-2">
              Hidden • {achievement.rarity}
            </div>

            {/* Reward Info */}
            <div className="text-xs text-primary font-medium">
              {achievement.rewardType === 'xp' && `+${achievement.rewardValue} XP`}
              {achievement.rewardType === 'title' && `Title: "${achievement.rewardValue}"`}
              {achievement.rewardType === 'badge' && 'Badge Unlocked'}
              {achievement.rewardType === 'cosmetic' && 'Cosmetic Unlocked'}
            </div>
          </div>

          {/* Sparkle Animation for Unlocked Hidden Achievements */}
          {animated && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(4)].map((_, i) => (
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
                    delay: i * 0.3,
                    repeat: Infinity,
                    repeatDelay: 4
                  }}
                  className="absolute top-1/2 left-1/2 text-purple-400 text-xs"
                >
                  ✨
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Locked Achievement Content */}
      {!isUnlocked && (
        <div className="text-center opacity-30">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <span className="text-2xl">❓</span>
          </div>
          <h3 className="font-semibold text-muted-foreground mb-1">
            ???
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Complete secret conditions to unlock
          </p>
          <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            Hidden
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface HiddenAchievementsGridProps {
  hiddenAchievements: Array<{
    achievement?: Achievement;
    isUnlocked: boolean;
    hint?: string;
  }>;
  onAchievementClick?: (achievement: Achievement | undefined) => void;
  className?: string;
  animated?: boolean;
}

export function HiddenAchievementsGrid({
  hiddenAchievements,
  onAchievementClick,
  className = '',
  animated = true
}: HiddenAchievementsGridProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {hiddenAchievements.map((item, index) => (
        <motion.div
          key={item.achievement?.id || `hidden-${index}`}
          initial={animated ? { opacity: 0, y: 20 } : undefined}
          animate={animated ? { opacity: 1, y: 0 } : undefined}
          transition={animated ? { delay: index * 0.1 } : undefined}
        >
          <HiddenAchievementCard
            achievement={item.achievement}
            isUnlocked={item.isUnlocked}
            hint={item.hint}
            onClick={() => onAchievementClick?.(item.achievement)}
            animated={animated}
          />
        </motion.div>
      ))}
    </div>
  );
}

interface HiddenAchievementsSectionProps {
  unlockedHidden: Achievement[];
  totalHiddenCount: number;
  className?: string;
}

export function HiddenAchievementsSection({
  unlockedHidden,
  totalHiddenCount,
  className = ''
}: HiddenAchievementsSectionProps) {
  // Create array with unlocked achievements and placeholder locked ones
  const hiddenAchievements = [];
  
  // Add unlocked achievements
  unlockedHidden.forEach(achievement => {
    hiddenAchievements.push({
      achievement,
      isUnlocked: true
    });
  });

  // Add placeholder locked achievements
  const lockedCount = Math.max(0, totalHiddenCount - unlockedHidden.length);
  for (let i = 0; i < lockedCount; i++) {
    hiddenAchievements.push({
      achievement: undefined,
      isUnlocked: false,
      hint: 'Keep exploring to discover this secret...'
    });
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-foreground">Hidden Achievements</h2>
          <span className="text-sm text-muted-foreground">
            {unlockedHidden.length} / {totalHiddenCount} discovered
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Secret achievements with special unlock conditions. Can you discover them all?
        </p>
      </div>

      <HiddenAchievementsGrid
        hiddenAchievements={hiddenAchievements}
        onAchievementClick={(achievement) => {
          if (achievement) {

          }
        }}
        animated={true}
      />

      {unlockedHidden.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🕵️</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No Hidden Achievements Yet
          </h3>
          <p className="text-muted-foreground">
            Keep learning and exploring to discover secret achievements!
          </p>
        </div>
      )}
    </div>
  );
}