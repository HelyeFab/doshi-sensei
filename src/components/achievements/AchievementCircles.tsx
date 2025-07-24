'use client';

import { motion } from 'framer-motion';

interface AchievementCircle {
  id: string;
  icon: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
  rarity: string;
  color: string;
  rewardValue?: number;
}

interface AchievementCirclesProps {
  achievements: AchievementCircle[];
  className?: string;
}

export function AchievementCircles({ achievements, className = '' }: AchievementCirclesProps) {
  const getProgressPercentage = (progress: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((progress / max) * 100, 100);
  };

  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-400 to-orange-500';
      case 'epic':
        return 'from-purple-400 to-purple-600';
      case 'rare':
        return 'from-blue-400 to-blue-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className={`grid grid-cols-3 gap-4 sm:gap-6 ${className}`}>
      {achievements.map((achievement, index) => {
        const percentage = getProgressPercentage(achievement.progress, achievement.maxProgress);
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="flex flex-col items-center text-center space-y-2"
          >
            {/* Circular Progress */}
            <div className="relative">
              {/* Inner circle background */}
              <div className="absolute inset-2 bg-background rounded-full" />
              
              {/* Glow effect for unlocked achievements */}
              {achievement.isUnlocked && (
                <div className="absolute inset-0 w-24 h-24 sm:w-28 sm:h-28 bg-primary/10 rounded-full blur-lg" />
              )}
              
              {/* SVG Container */}
              <svg className="w-24 h-24 sm:w-28 sm:h-28 transform -rotate-90">
                {/* Background circle - light gray track */}
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className={achievement.isUnlocked ? "text-primary" : "text-primary/80"}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 + 0.3 }}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {achievement.isUnlocked ? (
                  <>
                    {/* Unlocked state with icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.5, type: 'spring', stiffness: 200 }}
                      className="text-2xl sm:text-3xl mb-1"
                    >
                      {achievement.icon}
                    </motion.div>
                    {achievement.rewardValue && (
                      <div className="text-xs sm:text-sm font-semibold text-primary">
                        +{achievement.rewardValue} XP
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Progress state */}
                    <div className="text-xl sm:text-2xl font-bold text-foreground">
                      {percentage.toFixed(0)}%
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {achievement.progress}/{achievement.maxProgress}
                    </div>
                  </>
                )}
              </div>

              {/* Completion checkmark for unlocked achievements */}
              {achievement.isUnlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.7, type: 'spring', stiffness: 200 }}
                  className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-primary rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </div>

            {/* Title and description */}
            <div className="space-y-1 max-w-[120px] sm:max-w-[140px]">
              <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2">
                {achievement.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                {achievement.description}
              </p>
              <div className={`text-[10px] sm:text-xs font-medium ${achievement.isUnlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                {achievement.rarity}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}