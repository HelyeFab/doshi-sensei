'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { JLPTLevel, JLPT_LEVELS } from '@/types/kanji';
import { X } from 'lucide-react';

interface GenerateKanjiMoodboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (moodboardData: any) => void;
}

export default function GenerateKanjiMoodboardModal({
  isOpen,
  onClose,
  onGenerated
}: GenerateKanjiMoodboardModalProps) {
  const { user } = useAuth();
  const { error: showError, info: showInfo } = useAdminNotifications();
  
  const [theme, setTheme] = useState('');
  const [jlptLevel, setJlptLevel] = useState<JLPTLevel>('N5');
  const [kanjiCount, setKanjiCount] = useState(15);
  const [customTags, setCustomTags] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStory, setGenerateStory] = useState(true); // Default to true

  const handleGenerate = async () => {
    if (!theme.trim()) {
      showError('Error', 'Please enter a theme');
      return;
    }

    if (!user) return;

    setIsGenerating(true);

    try {

      const response = await fetch('/api/admin/generate-kanji-moodboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          theme,
          jlptLevel,
          kanjiCount,
          tags: customTags ? customTags.split(',').map(t => t.trim()).filter(Boolean) : []
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate moodboard';
        try {
          const error = await response.json();

          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response isn't JSON, use status text

          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const moodboardData = await response.json();

      if (!moodboardData.kanjiList || !Array.isArray(moodboardData.kanjiList)) {
        throw new Error('Invalid response format: missing kanjiList');
      }
      
      showInfo('Success', `Generated ${moodboardData.kanjiList.length} kanji for "${theme}"`);

      // Pass the moodboard data to the parent
      onGenerated(moodboardData);
      
      // If generateStory is enabled, trigger story generation
      if (generateStory) {
        showInfo('Generating Story', 'Creating a story from your mood board...');
        
        // Transform the moodboard data to match the expected format
        const transformedMoodBoard = {
          id: `moodboard-${Date.now()}`,
          title: moodboardData.category || theme,
          description: moodboardData.description || `Kanji related to ${theme}`,
          emoji: moodboardData.emoji || '📚',
          themeColor: moodboardData.themeColor || '#F6C667',
          tags: customTags ? customTags.split(',').map(t => t.trim()).filter(Boolean) : [],
          kanjiItems: moodboardData.kanjiList || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        try {
          const storyResponse = await fetch('/api/admin/generate-moodboard-story', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({
              moodBoard: transformedMoodBoard
            })
          });

          if (!storyResponse.ok) {
            const error = await storyResponse.json();
            throw new Error(error.error || 'Failed to generate story');
          }

          const storyResult = await storyResponse.json();
          showInfo('Story Created!', `Successfully created story "${storyResult.story.title}" from your mood board`);
          
          // Open story in new tab
          if (storyResult.story && storyResult.story.slug) {
            window.open(`/stories/${storyResult.story.slug}`, '_blank');
          }
        } catch (error) {
          console.error('Error generating story:', error);
          showError('Story Generation Failed', error instanceof Error ? error.message : 'Failed to generate story from mood board');
        }
      }
      
      onClose();
      
      // Reset form
      setTheme('');
      setCustomTags('');
      setKanjiCount(15);
      setGenerateStory(true);
      
    } catch (error) {
      console.error('Error generating moodboard:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to generate moodboard');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate Kanji Moodboard with AI</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Theme Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Theme <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., family members, colors, emotions, nature..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter any theme - be creative! Examples: family members (formal/informal), cooking verbs, weather phenomena
            </p>
          </div>

          {/* JLPT Level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              JLPT Level
            </label>
            <select
              value={jlptLevel}
              onChange={(e) => setJlptLevel(e.target.value as JLPTLevel)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              disabled={isGenerating}
            >
              {JLPT_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              AI will include kanji from this level and below
            </p>
          </div>

          {/* Kanji Count */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Kanji
            </label>
            <input
              type="range"
              min="10"
              max="20"
              value={kanjiCount}
              onChange={(e) => setKanjiCount(Number(e.target.value))}
              className="w-full"
              disabled={isGenerating}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span className="font-medium text-foreground">{kanjiCount}</span>
              <span>20</span>
            </div>
          </div>

          {/* Custom Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tags (Optional)
            </label>
            <input
              type="text"
              value={customTags}
              onChange={(e) => setCustomTags(e.target.value)}
              placeholder="e.g., formal, informal, common, business"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated tags to help categorize the kanji
            </p>
          </div>

          {/* Generate Story Checkbox */}
          <div className="flex items-center gap-3 p-3 bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 rounded-lg">
            <input
              type="checkbox"
              id="generateStory"
              checked={generateStory}
              onChange={(e) => setGenerateStory(e.target.checked)}
              className="w-4 h-4 rounded border-border"
              disabled={isGenerating}
            />
            <label htmlFor="generateStory" className="flex-1 cursor-pointer">
              <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                Automatically create a story
              </span>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Generate a 3-page educational story using all the kanji from this mood board
              </p>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-100 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              How it works
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• AI will generate relevant kanji based on your theme</li>
              <li>• For concepts like family, it includes formal/informal variations</li>
              <li>• Each kanji includes readings, meanings, and stroke count</li>
              <li>• You can edit the generated moodboard after creation</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !theme.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Generating...
                </span>
              ) : (
                'Generate Moodboard'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}