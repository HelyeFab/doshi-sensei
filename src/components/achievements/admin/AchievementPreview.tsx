'use client';

import { Achievement } from '@/lib/achievements/types';

interface AchievementPreviewProps {
  achievement: Achievement | null;
}

export default function AchievementPreview({ achievement }: AchievementPreviewProps) {
  if (!achievement) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">🏆</div>
          <p>Select an achievement to preview</p>
        </div>
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-800';
      case 'rare': return 'text-blue-800';
      case 'epic': return 'text-purple-800';
      case 'legendary': return 'text-yellow-800';
      default: return 'text-gray-800';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Achievement Preview</h3>
      
      {/* Achievement Card Preview */}
      <div className={`border-2 rounded-lg p-6 mb-6 ${getRarityColor(achievement.rarity)}`}>
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${achievement.color}30` }}
          >
            {achievement.icon}
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-foreground">{achievement.title}</h4>
            <p className="text-muted-foreground">{achievement.description}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRarityTextColor(achievement.rarity)}`}>
            {achievement.rarity.toUpperCase()}
          </div>
        </div>

        {/* Progress Bar Preview */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>0 / {achievement.conditionValue || 1}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: achievement.color,
                width: '0%'
              }}
            />
          </div>
        </div>

        {/* Reward Info */}
        <div className="text-sm text-muted-foreground">
          <strong>Reward:</strong> {' '}
          {achievement.rewardType === 'xp' && `${achievement.rewardValue} XP`}
          {achievement.rewardType === 'title' && `Title: "${achievement.rewardValue}"`}
          {achievement.rewardType === 'badge' && 'Badge Unlocked'}
          {achievement.rewardType === 'cosmetic' && 'Cosmetic Unlocked'}
        </div>
      </div>

      {/* Achievement Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
            <div className="flex items-center gap-2">
              <span>
                {achievement.category === 'streaks' ? '🔥' :
                 achievement.category === 'drills' ? '📝' :
                 achievement.category === 'words' ? '📚' :
                 achievement.category === 'reading' ? '📖' :
                 achievement.category === 'stories' ? '📜' :
                 achievement.category === 'games' ? '🎮' :
                 achievement.category === 'hidden' ? '🎭' : '🏆'}
              </span>
              <span className="capitalize">{achievement.category}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${achievement.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{achievement.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        {achievement.conditionType === 'simple' && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Unlock Condition</label>
            <div className="bg-muted/50 p-3 rounded">
              <code className="text-sm">
                {achievement.conditionField} {achievement.conditionOperator} {achievement.conditionValue}
              </code>
              <div className="text-xs text-muted-foreground mt-1">
                User's {achievement.conditionField?.replace(/([A-Z])/g, ' $1').toLowerCase()} must be{' '}
                {achievement.conditionOperator === '>=' ? 'at least' :
                 achievement.conditionOperator === '>' ? 'greater than' :
                 achievement.conditionOperator === '==' ? 'exactly' :
                 achievement.conditionOperator === '<' ? 'less than' :
                 achievement.conditionOperator === '<=' ? 'at most' : ''}{' '}
                {achievement.conditionValue}
              </div>
            </div>
          </div>
        )}

        {achievement.requiredUserType && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">User Requirement</label>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <span className="text-blue-800 font-medium">
                {achievement.requiredUserType === 'premium' ? 'Premium Users Only' : 
                 achievement.requiredUserType === 'free' ? 'Free Users Only' : 'All Users'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <strong>Created:</strong> {new Date(achievement.createdAt).toLocaleDateString()}
          </div>
          <div>
            <strong>Updated:</strong> {new Date(achievement.updatedAt).toLocaleDateString()}
          </div>
        </div>

        {achievement.isCustom && (
          <div className="bg-green-50 border border-green-200 p-3 rounded">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✨</span>
              <span className="text-green-800 font-medium">Custom Achievement</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              This is a custom achievement that can be edited and deleted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}