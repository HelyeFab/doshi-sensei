'use client';

import { useState } from 'react';
import { Achievement } from '@/lib/achievements/types';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

interface AchievementListProps {
  achievements: Achievement[];
  onEdit: (achievement: Achievement) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export default function AchievementList({
  achievements,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive
}: AchievementListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'rarity' | 'created'>('title');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    achievement: Achievement | null;
  }>({ isOpen: false, achievement: null });

  // Filter and sort achievements
  const filteredAchievements = achievements
    .filter(achievement => {
      // Filter by category/status
      if (filter === 'custom' && !achievement.isCustom) return false;
      if (filter === 'default' && achievement.isCustom) return false;
      if (filter === 'active' && !achievement.isActive) return false;
      if (filter === 'inactive' && achievement.isActive) return false;
      if (filter !== 'all' && filter !== 'custom' && filter !== 'default' && filter !== 'active' && filter !== 'inactive') {
        if (achievement.category !== filter) return false;
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          achievement.title.toLowerCase().includes(searchLower) ||
          achievement.description.toLowerCase().includes(searchLower) ||
          achievement.category.toLowerCase().includes(searchLower)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'rarity':
          const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
          return rarityOrder[a.rarity] - rarityOrder[b.rarity];
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-muted text-muted-foreground';
      case 'rare': return 'bg-primary/10 text-primary';
      case 'epic': return 'bg-secondary/10 text-secondary-foreground';
      case 'legendary': return 'bg-accent/10 text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streaks': return '🔥';
      case 'drills': return '📝';
      case 'words': return '📚';
      case 'reading': return '📖';
      case 'stories': return '📜';
      case 'games': return '🎮';
      case 'hidden': return '🎭';
      default: return '🏆';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-3">
        <div className="w-full">
          <input
            type="text"
            placeholder="Search achievements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm sm:text-base border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-3 py-2 text-sm sm:text-base border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="custom">Custom</option>
            <option value="default">Default</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="streaks">Streaks</option>
            <option value="drills">Drills</option>
            <option value="words">Words</option>
            <option value="reading">Reading</option>
            <option value="stories">Stories</option>
            <option value="games">Games</option>
            <option value="hidden">Hidden</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 px-3 py-2 text-sm sm:text-base border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="title">Sort by Title</option>
            <option value="category">Sort by Category</option>
            <option value="rarity">Sort by Rarity</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAchievements.length} of {achievements.length} achievements
      </div>

      {/* Achievement List */}
      <div className="space-y-2">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`border rounded-lg p-4 transition-all ${
              achievement.isActive 
                ? 'border-border bg-card' 
                : 'border-muted bg-muted/50 opacity-75'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-2 sm:gap-3 flex-1">
                {/* Icon and Status */}
                <div className="flex flex-col items-center gap-1">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl bg-primary/10"
                  >
                    {achievement.icon}
                  </div>
                  {!achievement.isActive && (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">
                      {achievement.title}
                    </h3>
                    <span className="text-sm">{getCategoryIcon(achievement.category)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRarityColor(achievement.rarity)}`}>
                      {achievement.rarity}
                    </span>
                    {achievement.isCustom && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Custom
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                    {achievement.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                    <span>Category: {achievement.category}</span>
                    {achievement.conditionType === 'simple' && (
                      <span className="hidden sm:inline">
                        Condition: {achievement.conditionField} {achievement.conditionOperator} {achievement.conditionValue}
                      </span>
                    )}
                    <span>
                      Reward: {achievement.rewardType === 'xp' ? `${achievement.rewardValue} XP` : achievement.rewardValue}
                    </span>
                    {achievement.requiredUserType && (
                      <span className="hidden sm:inline">Required: {achievement.requiredUserType}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  onClick={() => onToggleActive(achievement.id, !achievement.isActive)}
                  className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                    achievement.isActive
                      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  title={achievement.isActive ? 'Deactivate' : 'Activate'}
                >
                  {achievement.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  onClick={() => onEdit(achievement)}
                  className="px-2 sm:px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Edit
                </button>

                <button
                  onClick={() => onDuplicate(achievement.id)}
                  className="px-2 sm:px-3 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  Duplicate
                </button>

                {achievement.isCustom && (
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, achievement })}
                    className="px-2 sm:px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium hover:bg-destructive/90 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No achievements found
          </h3>
          <p className="text-muted-foreground">
            {search ? 'Try adjusting your search terms' : 'Try changing your filter settings'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Achievement"
        message={`Are you sure you want to delete "${deleteConfirm.achievement?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={false}
        onConfirm={() => {
          if (deleteConfirm.achievement) {
            onDelete(deleteConfirm.achievement.id);
            setDeleteConfirm({ isOpen: false, achievement: null });
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, achievement: null })}
      />
    </div>
  );
}