# 🏆 Achievements System Implementation Plan

## Overview

Implementation strategy for the Doshi Sensei achievements system, integrating with the existing three-pillar architecture and providing comprehensive gamification features.

## 1. Integration with Three-Pillar Architecture

### Feature Registry Addition

```typescript
// /src/lib/features/registry.ts
'achievements_system': {
  id: 'achievements_system',
  name: 'Achievements & Badges',
  description: 'Gamification system with titles, badges, and progress tracking',
  category: 'system',
  icon: '🏆',
  limitType: 'none', // No limits on viewing achievements
  requiresAuth: true, // Must be logged in to track progress
  requiresSubscription: false, // Available to all users
  status: 'active'
}
```

### Entitlements Integration

- **Free users**: Basic achievements, limited cosmetic rewards
- **Premium users**: All achievements, exclusive titles, advanced stats

## 2. Storage Architecture

### IndexedDB Extension

```typescript
// Add to existing DoshiSenseiDB
DoshiSenseiDB
├── achievements         // User's unlocked achievements
├── achievementProgress  // Current progress toward goals
└── userStats           // Aggregated statistics

// Types
interface UserStats {
  currentStreak: number;
  longestStreak: number;
  drillsCompleted: number;
  wordsSaved: number;
  sentencesRead: number;
  storiesCompleted: number;
  gamesPlayed: number;
  lastStudyDate: string;
  totalXP: number;
}

interface Achievement {
  id: string;
  category: 'streaks' | 'drills' | 'words' | 'reading' | 'stories' | 'hidden';
  condition: (stats: UserStats) => boolean;
  title: string;
  description: string;
  rewardType: 'title' | 'badge' | 'xp' | 'cosmetic';
  rewardValue: string | number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requiredUserType?: 'free' | 'premium';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress: number; // For multi-level achievements
}
```

### Firebase Integration

```typescript
// Firebase collections (premium users get cloud sync)
/users/{uid}/
├── achievements/        // Unlocked achievements
├── stats/              // User statistics
├── achievementSettings/ // Display preferences
└── achievementProgress/ // Current progress

// Admin-managed achievements
/admin/
└── achievements/        // Dynamic achievement definitions
```

## 3. Core Implementation Files

### Achievement Manager

```typescript
// /src/lib/achievements/manager.ts
export class AchievementManager {
  static async updateStats(statType: keyof UserStats, increment: number = 1) {
    // Update local stats
    // Check for newly unlocked achievements
    // Trigger notifications
    // Sync to Firebase if premium
  }

  static async checkAchievements(
    stats: UserStats
  ): Promise<UnlockedAchievement[]> {
    // Compare stats against all achievement conditions
    // Return newly unlocked achievements
  }

  static async unlockAchievement(achievementId: string) {
    // Store unlock in IndexedDB/Firebase
    // Trigger celebration animation
    // Update user profile if title/cosmetic
  }

  static async loadDynamicAchievements(): Promise<Achievement[]> {
    // Load achievements from admin-managed file/Firebase
    // Merge with default achievements
    // Cache for performance
  }
}
```

### Achievement Registry

```typescript
// /src/lib/achievements/registry.ts
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "streak_7",
    category: "streaks",
    condition: (stats) => stats.currentStreak >= 7,
    title: "Streak Master",
    description: "Study for 7 consecutive days",
    rewardType: "title",
    rewardValue: "Streak Master",
    rarity: "common",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "drill_devotee_100",
    category: "drills",
    condition: (stats) => stats.drillsCompleted >= 100,
    title: "Drill Devotee",
    description: "Complete 100 drill sessions",
    rewardType: "badge",
    rewardValue: "drill_master_badge",
    rarity: "rare",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "premium_explorer",
    category: "hidden",
    condition: (stats) => stats.storiesCompleted >= 50,
    title: "Story Sage",
    description: "Read 50 AI-generated stories",
    rewardType: "cosmetic",
    rewardValue: "golden_avatar_frame",
    rarity: "epic",
    requiredUserType: "premium",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
```

## 4. React Hooks Integration

### Main Achievement Hook

```typescript
// /src/hooks/useAchievements.ts
export function useAchievements() {
  const { userType } = useSubscription2();
  const { track } = useAnalytics();

  const updateProgress = async (statType: keyof UserStats, increment = 1) => {
    const newAchievements = await AchievementManager.updateStats(
      statType,
      increment
    );

    // Track analytics
    track("stat_updated", { statType, increment });

    // Show notifications for new achievements
    newAchievements.forEach((achievement) => {
      showAchievementToast(achievement);
      track("achievement_unlocked", {
        achievementId: achievement.achievementId,
      });
    });
  };

  const getUserStats = async (): Promise<UserStats> => {
    return EnhancedStorageManager.getUserStats();
  };

  const getUnlockedAchievements = async (): Promise<UnlockedAchievement[]> => {
    return EnhancedStorageManager.getUnlockedAchievements();
  };

  const getAvailableAchievements = async (): Promise<Achievement[]> => {
    const allAchievements = await AchievementManager.loadDynamicAchievements();
    return allAchievements.filter(
      (a) =>
        a.isActive && (!a.requiredUserType || a.requiredUserType === userType)
    );
  };

  return {
    updateProgress,
    getUserStats,
    getUnlockedAchievements,
    getAvailableAchievements,
  };
}
```

## 5. Integration Points

### Existing Feature Integration

```typescript
// In drill completion
const { updateProgress } = useAchievements();

const onDrillComplete = async () => {
  // Existing drill logic...

  // Update achievement progress
  await updateProgress("drillsCompleted");
};

// In word saving
const onWordSave = async () => {
  // Existing save logic...

  await updateProgress("wordsSaved");
};

// In story completion
const onStoryComplete = async () => {
  // Existing story logic...

  await updateProgress("storiesCompleted");
};
```

### Daily Streak Logic

```typescript
// /src/lib/achievements/streakManager.ts
export class StreakManager {
  static async updateDailyStreak() {
    const stats = await EnhancedStorageManager.getUserStats();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (stats.lastStudyDate === yesterday) {
      // Continue streak
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else if (stats.lastStudyDate !== today) {
      // Reset streak
      stats.currentStreak = 1;
    }

    stats.lastStudyDate = today;
    await EnhancedStorageManager.saveUserStats(stats);

    // Check for streak achievements
    await AchievementManager.checkAchievements(stats);
  }
}
```

## 6. UI Components

### Achievement Page

```typescript
// /src/app/achievements/page.tsx
export default function AchievementsPage() {
  const { getAvailableAchievements, getUnlockedAchievements, getUserStats } =
    useAchievements();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<
    UnlockedAchievement[]
  >([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [availableAchievements, unlocked, userStats] = await Promise.all([
        getAvailableAchievements(),
        getUnlockedAchievements(),
        getUserStats(),
      ]);

      setAchievements(availableAchievements);
      setUnlockedAchievements(unlocked);
      setStats(userStats);
    };

    loadData();
  }, []);

  return (
    <div className="achievements-grid">
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          isUnlocked={unlockedAchievements.some(
            (u) => u.achievementId === achievement.id
          )}
          progress={calculateProgress(achievement, stats)}
        />
      ))}
    </div>
  );
}
```

### Achievement Toast Component

```typescript
// /src/components/achievements/AchievementToast.tsx
export function AchievementToast({
  achievement,
}: {
  achievement: Achievement;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="achievement-toast"
    >
      <div className="flex items-center space-x-3">
        <div className="achievement-icon">🏆</div>
        <div>
          <h3>Achievement Unlocked!</h3>
          <p>{achievement.title}</p>
          <p className="text-sm text-gray-600">{achievement.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
```

## 7. Analytics Integration

### Achievement Analytics

```typescript
// Track achievement-related events
const achievementEvents = {
  achievement_unlocked: { achievementId, category, rarity },
  achievement_progress: { achievementId, progress, target },
  achievements_page_viewed: { totalUnlocked, totalAvailable },
  title_equipped: { titleId, previousTitle },
  badge_viewed: { badgeId, category },
};
```

## 8. Admin Dashboard Integration

### Achievement Analytics Page

```typescript
// /src/app/admin/achievements/page.tsx
// Show:
// - Most unlocked achievements
// - Rarest achievements
// - User engagement metrics
// - Achievement unlock trends
```

## 9. Storage Manager Extensions

```typescript
// /src/utils/storage.ts - Add to EnhancedStorageManager
class EnhancedStorageManager {
  // ... existing methods

  static async saveUserStats(stats: UserStats): Promise<void> {
    if (this.dbAvailable) {
      await UserStatsManager.save(stats);
    } else {
      localStorage.setItem("doshi_user_stats", JSON.stringify(stats));
    }

    // Sync to Firebase if premium
    if (await this.isPremiumUser()) {
      await this.syncStatsToFirebase(stats);
    }
  }

  static async getUnlockedAchievements(): Promise<UnlockedAchievement[]> {
    if (this.dbAvailable) {
      return AchievementsManager.getUnlocked();
    } else {
      const stored = localStorage.getItem("doshi_achievements");
      return stored ? JSON.parse(stored) : [];
    }
  }
}
```

## 10. Implementation Phases

### Phase 1: Core System

1. Set up storage structures
2. Create achievement registry with dynamic loading
3. Implement basic stat tracking
4. Build achievement checking logic

### Phase 2: Admin Management System

1. Admin interface for achievement CRUD
2. File-based achievement storage (similar to snake path)
3. Real-time preview and testing
4. Validation and error handling

### Phase 3: UI & UX

1. Achievement page with grid layout
2. Toast notifications
3. Progress indicators
4. Profile title display

### Phase 4: Advanced Features

1. Multi-level achievements
2. Hidden/easter egg achievements
3. Cosmetic rewards system
4. Admin dashboard analytics

### Phase 5: Gamification Enhancement

1. XP system integration
2. Leaderboards (opt-in)
3. Weekly challenges
4. Social sharing

## 11. File Structure

```
src/
├── lib/
│   └── achievements/
│       ├── manager.ts           # Core achievement logic
│       ├── registry.ts          # Default achievements
│       ├── streakManager.ts     # Streak handling
│       ├── conditionEvaluator.ts # Dynamic condition parsing
│       └── types.ts             # TypeScript definitions
├── hooks/
│   ├── useAchievements.ts       # Main achievement hook
│   └── useAchievementAdmin.ts   # Admin management hook
├── components/
│   └── achievements/
│       ├── AchievementCard.tsx
│       ├── AchievementToast.tsx
│       ├── ProgressBar.tsx
│       └── admin/
│           ├── AchievementEditor.tsx
│           ├── AchievementPreview.tsx
│           └── ConditionBuilder.tsx
├── app/
│   ├── achievements/
│   │   └── page.tsx             # User achievements page
│   └── admin/
│       └── achievements/
│           ├── page.tsx         # Admin management
│           ├── editor/
│           │   └── page.tsx     # Achievement editor
│           └── analytics/
│               └── page.tsx     # Achievement analytics
└── utils/
    └── achievementConditions.ts # Condition parsing utilities
```

## 12. Testing Strategy

### Unit Tests

- Achievement condition evaluation
- Stat tracking accuracy
- Storage operations
- Dynamic loading

### Integration Tests

- End-to-end achievement unlocking
- Admin interface functionality
- Cross-device sync (premium)
- Performance with large datasets

### User Testing

- Achievement discovery
- Motivation effectiveness
- UI/UX feedback
- Admin workflow validation

This implementation plan provides a comprehensive roadmap for building the achievements system while maintaining consistency with the existing Doshi Sensei architecture and patterns.
