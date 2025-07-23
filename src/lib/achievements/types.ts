// Achievement System Types

export type AchievementCategory = 'streaks' | 'drills' | 'words' | 'reading' | 'stories' | 'games' | 'hidden';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RewardType = 'title' | 'badge' | 'xp' | 'cosmetic';
export type UserType = 'guest' | 'free' | 'premium';

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  drillsCompleted: number;
  wordsSaved: number;
  sentencesRead: number;
  storiesCompleted: number;
  gamesPlayed: number;
  articlesRead: number;
  flashcardSessions: number;
  totalXP: number;
  lastStudyDate: string; // ISO date string
  totalStudyTime: number; // minutes
  listsCreated: number;
  kanjiStudied: number;
}

export interface AchievementLevel {
  level: number;
  title: string;
  description: string;
  icon: string;
  targetValue: number;
  rewardType: RewardType;
  rewardValue: string | number;
  rarity: AchievementRarity;
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  color: string;
  rarity: AchievementRarity;
  rewardType: RewardType;
  rewardValue: string | number;
  requiredUserType?: UserType;
  isActive: boolean;
  isCustom: boolean; // true for admin-created achievements
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  
  // Multi-level achievement support
  isMultiLevel?: boolean;
  levels?: AchievementLevel[];
  currentLevel?: number; // For tracking user progress
  
  // Condition fields for simple conditions
  conditionType: 'simple' | 'complex' | 'hidden';
  conditionField?: keyof UserStats;
  conditionOperator?: '>=' | '>' | '==' | '<' | '<=';
  conditionValue?: number;
  
  // Hidden achievement properties
  isHidden?: boolean;
  unlockHint?: string;
  
  // For complex conditions (future use)
  conditionFunction?: string; // Serialized function
}

export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  unlockedAt: string; // ISO date string
  progress: number; // For multi-level achievements (future)
  notificationShown: boolean;
}

export interface AchievementProgress {
  id: string;
  achievementId: string;
  currentValue: number;
  targetValue: number;
  lastUpdated: string; // ISO date string
}

// Reward asset types
export interface TitleReward {
  id: string;
  displayName: string;
  color: string;
  icon: string;
  rarity: AchievementRarity;
}

export interface BadgeReward {
  id: string;
  displayName: string;
  imageUrl: string;
  rarity: AchievementRarity;
}

export interface CosmeticReward {
  id: string;
  displayName: string;
  type: 'avatar_frame' | 'background' | 'theme';
  imageUrl: string;
  rarity: AchievementRarity;
}

// Dynamic achievement file structure
export interface DynamicAchievementsData {
  version: string;
  lastUpdated: string;
  updatedBy: string;
  achievements: Achievement[];
}

export interface RewardAssetsData {
  titles: TitleReward[];
  badges: BadgeReward[];
  cosmetics: CosmeticReward[];
}

// Analytics events for achievements
export interface AchievementAnalyticsEvent {
  type: 'achievement_unlocked' | 'achievement_progress' | 'stat_updated';
  achievementId?: string;
  category?: AchievementCategory;
  rarity?: AchievementRarity;
  statType?: keyof UserStats;
  progress?: number;
  target?: number;
  timestamp: string;
}