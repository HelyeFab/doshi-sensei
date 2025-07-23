'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement, UnlockedAchievement } from '@/lib/achievements/types';

interface AchievementToastProps {
  achievement: Achievement;
  unlockedAchievement: UnlockedAchievement;
  onClose: () => void;
}

export function AchievementToast({ achievement, unlockedAchievement, onClose }: AchievementToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-300 bg-gray-50 text-gray-800';
      case 'rare':
        return 'border-blue-300 bg-blue-50 text-blue-800';
      case 'epic':
        return 'border-purple-300 bg-purple-50 text-purple-800';
      case 'legendary':
        return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-800';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed bottom-4 right-4 z-50 max-w-sm w-full"
    >
      <div className={`rounded-lg border-2 p-4 shadow-lg backdrop-blur-sm ${getRarityStyles(achievement.rarity)}`}>
        <div className="flex items-start space-x-3">
          {/* Achievement Icon */}
          <div 
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${achievement.color}30` }}
          >
            <span className="text-2xl">{achievement.icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-bold">🏆 Achievement Unlocked!</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <h4 className="font-semibold text-foreground mb-1">{achievement.title}</h4>
            <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
            
            {/* Reward */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary">
                {getRewardText()}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRarityStyles(achievement.rarity)}`}>
                {achievement.rarity}
              </span>
            </div>
          </div>
        </div>

        {/* Celebration Animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 0 }}
              animate={{ 
                opacity: 0, 
                scale: 1,
                x: Math.random() * 200 - 100,
                y: Math.random() * 200 - 100
              }}
              transition={{ 
                duration: 2,
                delay: i * 0.1,
                ease: "easeOut"
              }}
              className="absolute top-1/2 left-1/2 text-yellow-400"
              style={{ fontSize: '12px' }}
            >
              ✨
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface AchievementToastManagerProps {
  children: React.ReactNode;
}

export function AchievementToastManager({ children }: AchievementToastManagerProps) {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    achievement: Achievement;
    unlockedAchievement: UnlockedAchievement;
  }>>([]);

  useEffect(() => {
    const handleAchievementUnlocked = (event: CustomEvent) => {
      const { achievement, unlockedAchievement } = event.detail;
      
      setToasts(prev => [...prev, {
        id: `${achievement.id}-${Date.now()}`,
        achievement,
        unlockedAchievement
      }]);
    };

    window.addEventListener('achievementUnlocked', handleAchievementUnlocked as EventListener);
    
    return () => {
      window.removeEventListener('achievementUnlocked', handleAchievementUnlocked as EventListener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {toasts.map((toast) => (
          <AchievementToast
            key={toast.id}
            achievement={toast.achievement}
            unlockedAchievement={toast.unlockedAchievement}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </>
  );
}