'use client';

import { useEffect, useState } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { Achievement } from '@/lib/achievements/types';

interface ProfileTitleProps {
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfileTitle({ className = '', showIcon = true, size = 'md' }: ProfileTitleProps) {
  const { achievements, unlockedAchievements, isLoading } = useAchievements();
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [availableTitles, setAvailableTitles] = useState<Achievement[]>([]);

  // Load available titles and selected title
  useEffect(() => {
    if (!achievements.length || !unlockedAchievements.length) return;

    // Get all unlocked title achievements
    const titleAchievements = achievements.filter(achievement => 
      achievement.rewardType === 'title' && 
      unlockedAchievements.some(unlocked => unlocked.achievementId === achievement.id)
    );

    setAvailableTitles(titleAchievements);

    // Load selected title from localStorage
    const savedTitle = localStorage.getItem('doshi_selected_title');
    if (savedTitle && titleAchievements.some(t => t.id === savedTitle)) {
      setSelectedTitle(savedTitle);
    } else if (titleAchievements.length > 0) {
      // Default to the first unlocked title
      setSelectedTitle(titleAchievements[0].id);
    }
  }, [achievements, unlockedAchievements]);

  // Save selected title to localStorage
  const selectTitle = (titleId: string | null) => {
    setSelectedTitle(titleId);
    if (titleId) {
      localStorage.setItem('doshi_selected_title', titleId);
    } else {
      localStorage.removeItem('doshi_selected_title');
    }
  };

  // Get the current title achievement
  const currentTitleAchievement = selectedTitle 
    ? achievements.find(a => a.id === selectedTitle)
    : null;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  if (isLoading || !currentTitleAchievement) {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {showIcon && (
        <span className="text-yellow-500">👑</span>
      )}
      <span 
        className={`font-medium rounded-full border ${sizeClasses[size]}`}
        style={{
          backgroundColor: `${currentTitleAchievement.color}20`,
          borderColor: `${currentTitleAchievement.color}40`,
          color: currentTitleAchievement.color
        }}
      >
        {currentTitleAchievement.rewardValue}
      </span>
    </div>
  );
}

interface TitleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TitleSelector({ isOpen, onClose }: TitleSelectorProps) {
  const { achievements, unlockedAchievements } = useAchievements();
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [availableTitles, setAvailableTitles] = useState<Achievement[]>([]);

  // Load available titles and selected title
  useEffect(() => {
    if (!achievements.length || !unlockedAchievements.length) return;

    const titleAchievements = achievements.filter(achievement => 
      achievement.rewardType === 'title' && 
      unlockedAchievements.some(unlocked => unlocked.achievementId === achievement.id)
    );

    setAvailableTitles(titleAchievements);

    const savedTitle = localStorage.getItem('doshi_selected_title');
    setSelectedTitle(savedTitle);
  }, [achievements, unlockedAchievements]);

  const selectTitle = (titleId: string | null) => {
    setSelectedTitle(titleId);
    if (titleId) {
      localStorage.setItem('doshi_selected_title', titleId);
    } else {
      localStorage.removeItem('doshi_selected_title');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-card rounded-lg border border-border p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Select Title</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {/* No Title Option */}
          <button
            onClick={() => selectTitle(null)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedTitle === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-border/80 text-foreground'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">🚫</span>
              <span>No Title</span>
            </div>
          </button>

          {/* Available Titles */}
          {availableTitles.map((achievement) => (
            <button
              key={achievement.id}
              onClick={() => selectTitle(achievement.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedTitle === achievement.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{achievement.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="font-medium px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: `${achievement.color}20`,
                        color: achievement.color
                      }}
                    >
                      {achievement.rewardValue}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      achievement.rarity === 'common' ? 'bg-gray-100 text-gray-800' :
                      achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                      achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {achievement.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {availableTitles.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👑</div>
            <p className="text-muted-foreground">
              Unlock title achievements to customize your profile!
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}