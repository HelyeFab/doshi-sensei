'use client';

import { useState, useEffect } from 'react';
import { Achievement, UserStats } from '@/lib/achievements/types';

interface AchievementEditorProps {
  achievement?: Achievement;
  onSave: (achievement: Achievement) => void;
  onCancel: () => void;
  onValidate?: (achievement: Achievement) => { isValid: boolean; errors: Record<string, string> };
  onTest?: (achievement: Achievement, testStats: UserStats) => { canUnlock: boolean; reason: string };
}

const STAT_FIELDS: Array<{ value: keyof UserStats; label: string }> = [
  { value: 'currentStreak', label: 'Current Streak' },
  { value: 'longestStreak', label: 'Longest Streak' },
  { value: 'drillsCompleted', label: 'Drills Completed' },
  { value: 'wordsSaved', label: 'Words Saved' },
  { value: 'sentencesRead', label: 'Sentences Read' },
  { value: 'storiesCompleted', label: 'Stories Completed' },
  { value: 'gamesPlayed', label: 'Games Played' },
  { value: 'articlesRead', label: 'Articles Read' },
  { value: 'flashcardSessions', label: 'Flashcard Sessions' },
  { value: 'totalXP', label: 'Total XP' },
  { value: 'totalStudyTime', label: 'Total Study Time (minutes)' },
  { value: 'listsCreated', label: 'Lists Created' },
  { value: 'kanjiStudied', label: 'Kanji Studied' }
];

const OPERATORS = [
  { value: '>=', label: 'Greater than or equal to (≥)' },
  { value: '>', label: 'Greater than (>)' },
  { value: '==', label: 'Equal to (=)' },
  { value: '<', label: 'Less than (<)' },
  { value: '<=', label: 'Less than or equal to (≤)' }
];

const CATEGORIES = [
  { value: 'streaks', label: 'Streaks', icon: '🔥' },
  { value: 'drills', label: 'Drills', icon: '📝' },
  { value: 'words', label: 'Words', icon: '📚' },
  { value: 'reading', label: 'Reading', icon: '📖' },
  { value: 'stories', label: 'Stories', icon: '📜' },
  { value: 'games', label: 'Games', icon: '🎮' },
  { value: 'hidden', label: 'Hidden', icon: '🎭' }
];

const RARITIES = [
  { value: 'common', label: 'Common', color: '#6b7280' },
  { value: 'rare', label: 'Rare', color: '#3b82f6' },
  { value: 'epic', label: 'Epic', color: '#8b5cf6' },
  { value: 'legendary', label: 'Legendary', color: '#f59e0b' }
];

const REWARD_TYPES = [
  { value: 'xp', label: 'XP Points' },
  { value: 'title', label: 'Title' },
  { value: 'badge', label: 'Badge' },
  { value: 'cosmetic', label: 'Cosmetic' }
];

const USER_TYPES = [
  { value: '', label: 'All Users' },
  { value: 'free', label: 'Free Users Only' },
  { value: 'premium', label: 'Premium Users Only' }
];

const COMMON_ICONS = [
  '🏆', '🎯', '⭐', '🌟', '💎', '👑', '🔥', '⚡', '🚀', '💪',
  '📚', '📖', '📝', '📜', '🎮', '🎪', '🎨', '🎭', '🎵', '🎸',
  '🌱', '🌸', '🌺', '🍀', '🐛', '🦉', '🐦', '🦋', '🐝', '🐢'
];

export default function AchievementEditor({
  achievement,
  onSave,
  onCancel,
  onValidate,
  onTest
}: AchievementEditorProps) {
  const [formData, setFormData] = useState<Achievement>(() => {
    if (achievement) return { ...achievement };
    
    // Default new achievement
    const now = new Date().toISOString();
    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'words',
      title: '',
      description: '',
      icon: '🏆',
      color: '#3b82f6',
      rarity: 'common',
      rewardType: 'xp',
      rewardValue: 50,
      isActive: true,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
      conditionType: 'simple',
      conditionField: 'wordsSaved',
      conditionOperator: '>=',
      conditionValue: 1
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testStats, setTestStats] = useState<UserStats>({
    currentStreak: 0,
    longestStreak: 0,
    drillsCompleted: 0,
    wordsSaved: 0,
    sentencesRead: 0,
    storiesCompleted: 0,
    gamesPlayed: 0,
    articlesRead: 0,
    flashcardSessions: 0,
    totalXP: 0,
    lastStudyDate: '',
    totalStudyTime: 0,
    listsCreated: 0,
    kanjiStudied: 0
  });
  const [testResult, setTestResult] = useState<{ canUnlock: boolean; reason: string } | null>(null);

  // Validate on form data change
  useEffect(() => {
    if (onValidate) {
      const validation = onValidate(formData);
      setErrors(validation.errors);
    }
  }, [formData, onValidate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onValidate) {
      const validation = onValidate(formData);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }
    }

    onSave({
      ...formData,
      updatedAt: new Date().toISOString()
    });
  };

  const handleTest = () => {
    if (onTest) {
      const result = onTest(formData, testStats);
      setTestResult(result);
    }
  };

  const generateConditionText = () => {
    if (formData.conditionType !== 'simple') return 'Complex condition';
    
    const field = STAT_FIELDS.find(f => f.value === formData.conditionField);
    const operator = OPERATORS.find(o => o.value === formData.conditionOperator);
    
    return `When user's ${field?.label || 'stat'} is ${operator?.label.toLowerCase() || 'compared'} ${formData.conditionValue}`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {achievement ? 'Edit Achievement' : 'Create New Achievement'}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="achievement-form"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save Achievement
          </button>
        </div>
      </div>

      <form id="achievement-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Achievement title"
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Achievement description"
                rows={3}
              />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rarity</label>
                <select
                  value={formData.rarity}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {RARITIES.map(rarity => (
                    <option key={rarity.value} value={rarity.value}>
                      {rarity.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Appearance</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Icon *</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="🏆"
                />
                <div className="text-2xl">{formData.icon}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {COMMON_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className="p-1 hover:bg-muted rounded text-lg"
                  >
                    {icon}
                  </button>
                ))}
              </div>
              {errors.icon && <p className="text-sm text-red-500 mt-1">{errors.icon}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 border border-input rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Required User Type</label>
              <select
                value={formData.requiredUserType || ''}
                onChange={(e) => setFormData({ ...formData, requiredUserType: e.target.value as any || undefined })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {USER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active (visible to users)
              </label>
            </div>
          </div>
        </div>

        {/* Unlock Condition */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Unlock Condition</h3>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Stat Field</label>
                <select
                  value={formData.conditionField || ''}
                  onChange={(e) => setFormData({ ...formData, conditionField: e.target.value as keyof UserStats })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STAT_FIELDS.map(field => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
                {errors.conditionField && <p className="text-sm text-red-500 mt-1">{errors.conditionField}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Operator</label>
                <select
                  value={formData.conditionOperator || ''}
                  onChange={(e) => setFormData({ ...formData, conditionOperator: e.target.value as any })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {errors.conditionOperator && <p className="text-sm text-red-500 mt-1">{errors.conditionOperator}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Value</label>
                <input
                  type="number"
                  value={formData.conditionValue || ''}
                  onChange={(e) => setFormData({ ...formData, conditionValue: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                  placeholder="1"
                />
                {errors.conditionValue && <p className="text-sm text-red-500 mt-1">{errors.conditionValue}</p>}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Preview:</strong> {generateConditionText()}
            </div>
          </div>
        </div>

        {/* Reward */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Reward</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reward Type</label>
              <select
                value={formData.rewardType}
                onChange={(e) => setFormData({ ...formData, rewardType: e.target.value as any })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {REWARD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reward Value</label>
              {formData.rewardType === 'xp' ? (
                <input
                  type="number"
                  value={formData.rewardValue as number || ''}
                  onChange={(e) => setFormData({ ...formData, rewardValue: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                  placeholder="50"
                />
              ) : (
                <input
                  type="text"
                  value={formData.rewardValue as string || ''}
                  onChange={(e) => setFormData({ ...formData, rewardValue: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={
                    formData.rewardType === 'title' ? 'Title Name' :
                    formData.rewardType === 'badge' ? 'badge_id' :
                    'cosmetic_id'
                  }
                />
              )}
              {errors.rewardValue && <p className="text-sm text-red-500 mt-1">{errors.rewardValue}</p>}
            </div>
          </div>
        </div>

        {/* Test Section */}
        {onTest && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Achievement</h3>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {STAT_FIELDS.map(field => (
                  <div key={field.value}>
                    <label className="block text-xs font-medium mb-1">{field.label}</label>
                    <input
                      type="number"
                      value={testStats[field.value]}
                      onChange={(e) => setTestStats({
                        ...testStats,
                        [field.value]: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      min="0"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleTest}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Test Condition
                </button>

                {testResult && (
                  <div className={`text-sm font-medium ${
                    testResult.canUnlock ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {testResult.canUnlock ? '✅' : '❌'} {testResult.reason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}