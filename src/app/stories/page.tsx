'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { StandardPageHeader } from '@/components/StandardPageHeader';
import { Story } from '@/types/story';
import { JLPTLevel, JLPT_LEVELS } from '@/types/kanji';
import { storyManager } from '@/utils/storyManager';
import { storyOfflineManager } from '@/utils/storyOfflineManager';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import Link from 'next/link';
import { useStrings } from '@/contexts/LanguageContext';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

export default function StoriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining, isLoading: featureLoading } = useFeature('story_reading');
  const { isPremium, userType } = useSubscription2();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | 'all'>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [cachedStoryIds, setCachedStoryIds] = useState<Set<string>>(new Set());
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);
  const strings = useStrings();

  useEffect(() => {
    loadStories();
    // Only load cached stories on client side
    if (typeof window !== 'undefined') {
      loadCachedStories();
    }
  }, [selectedLevel, selectedTheme, showOfflineOnly]);

  const loadStories = async () => {
    try {
      setLoading(true);
      let loadedStories: Story[] = [];

      if (showOfflineOnly) {
        // Show only cached stories - only on client side
        if (typeof window !== 'undefined') {
          loadedStories = await storyOfflineManager.getAllCachedStories();
          if (selectedLevel !== 'all') {
            loadedStories = loadedStories.filter(s => s.jlptLevel === selectedLevel);
          }
          if (selectedTheme !== 'all') {
            loadedStories = loadedStories.filter(s => s.theme === selectedTheme);
          }
        }
      } else {
        // Load from Firebase
        if (selectedLevel === 'all' && selectedTheme === 'all') {
          loadedStories = await storyManager.getAllStories();
        } else if (selectedLevel !== 'all') {
          loadedStories = await storyManager.getStoriesByLevel(selectedLevel);
          if (selectedTheme !== 'all') {
            loadedStories = loadedStories.filter(s => s.theme === selectedTheme);
          }
        } else if (selectedTheme !== 'all') {
          loadedStories = await storyManager.getStoriesByTheme(selectedTheme);
        }
      }

      setStories(loadedStories);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadCachedStories = async () => {
    try {
      // Only run on client side
      if (typeof window === 'undefined') return;

      const cached = await storyOfflineManager.getAllCachedStories();
      const cachedIds = new Set(cached.map(s => s.id));
      setCachedStoryIds(cachedIds);
    } catch (error) {
      console.error('Error loading cached stories:', error);
    }
  };

  const handleStoryClick = async (story: Story) => {
    // Check if user can read more stories using new system
    const canAccess = await checkAndTrack('story_reading');
    if (!canAccess) {
      // The access system will show the appropriate modal
      return;
    }

    router.push(`/stories/${story.slug}`);
  };

  const getThemes = () => {
    const themes = new Set<string>();
    stories.forEach(story => themes.add(story.theme));
    return Array.from(themes);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StandardPageHeader title="Stories" backHref="/" />
      
      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground text-center mt-2">
          {strings.stories.description}
        </p>

        <div className="max-w-6xl mx-auto">
          {/* Description */}
          <div className="mb-8">
            {!isPremium && access && access.limit && access.limit > 0 && !featureLoading && (
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="text-primary">
                  📖 {remaining && remaining > 0
                    ? `${remaining} ${remaining === 1 ? 'story' : 'stories'} remaining today`
                    : 'Daily limit reached'
                  }
                </span>
              </div>
            )}
          </div>
          {/* Filter Bar */}
          <div className="bg-card rounded-lg p-6 border border-border mb-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* JLPT Levels */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-foreground mb-3">
                  📚 JLPT Level
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedLevel('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedLevel === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                  >
                    All Levels
                  </button>
                  {JLPT_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedLevel === level
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Themes */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-foreground mb-3">
                  🏷️ Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTheme('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTheme === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                  >
                    All Themes
                  </button>
                  {getThemes().map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setSelectedTheme(theme)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTheme === theme
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-end gap-3">
                <button
                  onClick={() => setShowOfflineOnly(!showOfflineOnly)}
                  className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${showOfflineOnly
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                    }`}
                >
                  {showOfflineOnly ? '📵' : '🌐'}
                  {showOfflineOnly ? 'Offline' : 'All Stories'}
                </button>
              </div>
            </div>
          </div>

          {/* Stories Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                {strings.stories.emptyState.title}
              </h3>
              <p className="text-muted-foreground mb-6">
                {strings.stories.emptyState.description}
              </p>
              <button
                onClick={() => router.push('/stories/create')}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {strings.stories.emptyState.createButton}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                  onClick={() => handleStoryClick(story)}
                >
                  <div className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary transition-colors h-full flex flex-col">
                    {/* Cover Image */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
                      {story.coverImageUrl ? (
                        <img
                          src={story.coverImageUrl}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-6xl">📖</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        {cachedStoryIds.has(story.id) && (
                          <span className="px-2 py-1 bg-green-600/90 text-white text-xs rounded flex items-center gap-1">
                            <span>💾</span> Offline
                          </span>
                        )}
                        {story.theme === 'Mood Board Story' && (
                          <span className="px-2 py-1 bg-purple-600/90 text-white text-xs rounded flex items-center gap-1">
                            <span>🎨</span> Mood Board
                          </span>
                        )}
                        <span className="px-2 py-1 bg-black/50 text-white text-xs rounded">
                          {story.jlptLevel}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-grow flex flex-col">
                      <h3 className="font-bold text-lg mb-1">{story.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2 japanese-text">
                        <span dangerouslySetInnerHTML={{ __html: story.titleJa }} />
                      </p>
                      <p className="text-sm text-muted-foreground mb-4 flex-grow">
                        {story.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span>📄</span>
                          {story.pages.length} pages
                        </span>
                        <span className="flex items-center gap-1">
                          <span>❓</span>
                          {story.quiz.length} questions
                        </span>
                        <span className="px-2 py-1 bg-secondary rounded">
                          {story.theme}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Premium Upsell */}
          {!isPremium && stories.length > 0 && (
            <div className="mt-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold mb-2">Want unlimited stories?</h3>
              <p className="text-center text-muted-foreground mb-4">
                {strings.subscriptions.upgradeForUnlimited}
              </p>
              <button
                onClick={() => router.push('/account')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {strings.subscriptions.viewPlans}
              </button>
            </div>
          )}
        </div>
      </MobileAwareContainer>
    </div>
  );
}
