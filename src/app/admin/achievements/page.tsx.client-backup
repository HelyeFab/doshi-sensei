'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAchievementAdmin } from '@/hooks/useAchievementAdmin';
import { Achievement } from '@/lib/achievements/types';
import AchievementEditor from '@/components/achievements/admin/AchievementEditor';
import AchievementList from '@/components/achievements/admin/AchievementList';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

export default function AdminAchievementsPage() {
  const {
    achievements,
    isLoading,
    error,
    lastSaved,
    saveAchievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    duplicateAchievement,
    validateAchievement,
    testAchievement,
    getAchievementStats,
    exportAchievements
  } = useAchievementAdmin();

  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<{
    isOpen: boolean;
    hasChanges: boolean;
  }>({ isOpen: false, hasChanges: false });

  const stats = getAchievementStats();

  const handleSave = async (achievement: Achievement) => {
    setIsSaving(true);
    try {
      if (isCreating) {
        // Add new achievement
        const updatedAchievements = [...achievements, achievement];
        await saveAchievements(updatedAchievements);
      } else {
        // Update existing achievement
        updateAchievement(achievement.id, achievement);
        await saveAchievements(achievements);
      }
      
      setEditingAchievement(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving achievement:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setIsCreating(false);
  };

  const handleCreate = () => {
    const newAchievement = addAchievement();
    setEditingAchievement(newAchievement);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    try {
      deleteAchievement(id);
      await saveAchievements(achievements);
    } catch (error) {
      console.error('Error deleting achievement:', error);
    }
  };

  const handleDuplicate = (id: string) => {
    const duplicate = duplicateAchievement(id);
    if (duplicate) {
      setEditingAchievement(duplicate);
      setIsCreating(true);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      updateAchievement(id, { isActive });
      await saveAchievements(achievements);
    } catch (error) {
      console.error('Error toggling achievement status:', error);
    }
  };

  const handleCancel = () => {
    // For now, just cancel directly. In the future, we could check for unsaved changes
    if (isCreating) {
      // Remove the newly created achievement if canceling
      deleteAchievement(editingAchievement?.id || '');
    }
    setEditingAchievement(null);
    setIsCreating(false);
  };

  const handleCancelWithConfirm = () => {
    // In the future, we could detect unsaved changes and show confirmation
    // For now, just cancel directly
    handleCancel();
  };

  if (isLoading) {
    return (
      <AdminLayout title="Achievement Management">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-4 bg-muted rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Achievement Management">
      <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create and manage achievements for your users
          </p>
          {lastSaved && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Last saved: {new Date(lastSaved).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/admin/achievements/analytics"
            className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            📊 Analytics
          </a>
          <button
            onClick={exportAchievements}
            className="px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm sm:text-base"
          >
            Export JSON
          </button>
          <button
            onClick={handleCreate}
            className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            Create Achievement
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-destructive">⚠️</span>
            <span className="text-destructive font-medium">Error</span>
          </div>
          <p className="text-destructive/90 mt-1">{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-primary">{stats.active}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Active</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-primary">{stats.custom}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Custom</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Inactive</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-primary">{stats.byRarity.epic || 0}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Epic</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-primary">{stats.byRarity.legendary || 0}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Legendary</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card border border-border rounded-lg p-3 sm:p-4 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">By Category</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-4">
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <div key={category} className="text-center">
              <div className="text-lg sm:text-xl mb-1">
                {category === 'streaks' ? '🔥' :
                 category === 'drills' ? '📝' :
                 category === 'words' ? '📚' :
                 category === 'reading' ? '📖' :
                 category === 'stories' ? '📜' :
                 category === 'games' ? '🎮' :
                 category === 'hidden' ? '🎭' : '🏆'}
              </div>
              <div className="font-semibold text-sm sm:text-base">{count}</div>
              <div className="text-xs text-muted-foreground capitalize">{category}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor or List */}
      {editingAchievement ? (
        <div className="mb-8">
          <AchievementEditor
            achievement={editingAchievement}
            onSave={handleSave}
            onCancel={handleCancel}
            onValidate={validateAchievement}
            onTest={testAchievement}
          />
          {isSaving && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6 mx-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary"></div>
                  <span className="text-sm sm:text-base">Saving achievement...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <AchievementList
          achievements={achievements}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onToggleActive={handleToggleActive}
        />
      )}
      </div>
    </AdminLayout>
  );
}