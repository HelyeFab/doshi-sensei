'use client';

import { useEffect } from 'react';
import { Achievement, UnlockedAchievement } from '@/lib/achievements/types';
import { useToast } from '@/hooks/useToast';

interface AchievementToastManagerProps {
  children: React.ReactNode;
}

/**
 * AchievementToastManager listens for achievement unlock events and displays
 * toast notifications using the app's unified toast system.
 * This maintains the achievement logic while using the app's consistent UI.
 */
export function AchievementToastManager({ children }: AchievementToastManagerProps) {
  const { showToast } = useToast();

  useEffect(() => {
    const handleAchievementUnlocked = (event: CustomEvent) => {
      const { achievement, unlockedAchievement } = event.detail as {
        achievement: Achievement;
        unlockedAchievement: UnlockedAchievement;
      };
      
      // Format the achievement message for the toast
      const title = `🏆 ${achievement.title} Unlocked!`;
      let message = achievement.description;
      
      // Add reward information to the message
      if (achievement.rewardType) {
        switch (achievement.rewardType) {
          case 'xp':
            message += ` (+${achievement.rewardValue} XP)`;
            break;
          case 'title':
            message += ` (Title: "${achievement.rewardValue}")`;
            break;
          case 'badge':
            message += ' (Badge Unlocked)';
            break;
          case 'cosmetic':
            message += ' (Cosmetic Unlocked)';
            break;
        }
      }

      // Show success toast with achievement details
      showToast({
        type: 'success',
        title,
        message,
        duration: 5000 // Show for 5 seconds for achievements
      });

      // Play a sound effect if available (optional enhancement)
      if (typeof window !== 'undefined' && 'Audio' in window) {
        try {
          const audio = new Audio('/sounds/achievement.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {
            // Silently fail if audio cannot be played
          });
        } catch (e) {
          // Audio not available or failed to load
        }
      }
    };

    // Listen for achievement unlock events
    window.addEventListener('achievementUnlocked', handleAchievementUnlocked as EventListener);
    
    return () => {
      window.removeEventListener('achievementUnlocked', handleAchievementUnlocked as EventListener);
    };
  }, [showToast]);

  return <>{children}</>;
}

/**
 * Helper function to manually trigger an achievement toast
 * (useful for testing or manual achievement unlocks)
 */
export function showAchievementToast(achievement: Achievement, unlockedAchievement: UnlockedAchievement) {
  const event = new CustomEvent('achievementUnlocked', {
    detail: { achievement, unlockedAchievement }
  });
  window.dispatchEvent(event);
}