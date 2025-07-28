'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
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

export default function StoriesClient() {
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
            loadedStories = loadedStories.filter(story => 
              story.metadata.jlptLevel === selectedLevel
            );
          }
          if (selectedTheme !== 'all') {
            loadedStories = loadedStories.filter(story => 
              story.metadata.themes.includes(selectedTheme)
            );
          }
        }
      } else {
        loadedStories = await storyManager.getStories({
          level: selectedLevel === 'all' ? undefined : selectedLevel,
          theme: selectedTheme === 'all' ? undefined : selectedTheme
        });
      }
      
      setStories(loadedStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCachedStories = async () => {
    const cachedIds = await storyOfflineManager.getCachedStoryIds();
    setCachedStoryIds(new Set(cachedIds));
  };

  const handleReadStory = async (story: Story) => {
    // Check access
    const result = await checkAndTrack('story_reading');
    if (!result.hasAccess) {
      // Show upgrade modal or redirect to login
      alert(strings.stories?.upgradePrompt || 'Please upgrade to read more stories');
      return;
    }

    router.push(`/stories/${story.slug}`);
  };

  const handleCacheStory = async (story: Story, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (cachedStoryIds.has(story.slug)) {
      // Remove from cache
      await storyOfflineManager.removeFromCache(story.slug);
      setCachedStoryIds(prev => {
        const next = new Set(prev);
        next.delete(story.slug);
        return next;
      });
    } else {
      // Add to cache
      await storyOfflineManager.cacheStory(story);
      setCachedStoryIds(prev => new Set([...prev, story.slug]));
    }
  };

  const getThemes = () => {
    const themes = new Set<string>();
    stories.forEach(story => {
      story.metadata.themes.forEach(theme => themes.add(theme));
    });
    return Array.from(themes).sort();
  };

  const filteredStories = stories;

  const isAdmin = user?.email && ['emacdonald.ai@gmail.com', 'emacdonald86@gmail.com'].includes(user.email);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SmartPageHeader
        title={strings.stories?.title || "Japanese Stories"}
        icon="book-open"
        rightContent={
          isAdmin && (
            <Link
              href="/admin/stories"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              {strings.stories?.manageStories || "Manage Stories"}
            </Link>
          )
        }
      />

      <MobileAwareContainer className="pb-20">
        {/* Access Info */}
        {!featureLoading && access && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {userType === 'guest' && (
                <>
                  {strings.stories?.guestLimit || "Guest users can read"} {remaining || 0} {strings.stories?.storiesLeft || "stories today"}. 
                  <Link href="/login" className="ml-1 underline">
                    {strings.stories?.loginForMore || "Login for more"}
                  </Link>
                </>
              )}
              {userType === 'free' && (
                <>
                  {strings.stories?.freeLimit || "Free users can read"} {remaining || 0} {strings.stories?.storiesLeft || "stories today"}. 
                  <Link href="/account" className="ml-1 underline">
                    {strings.stories?.upgradeForUnlimited || "Upgrade for unlimited"}
                  </Link>
                </>
              )}
              {userType === 'premium' && (
                strings.stories?.premiumUnlimited || "You have unlimited access to all stories"
              )}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Offline Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOfflineOnly}
                onChange={(e) => setShowOfflineOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {strings.stories?.showOfflineOnly || "Show offline stories only"} ({cachedStoryIds.size})
              </span>
            </label>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {strings.stories?.jlptLevel || "JLPT Level"}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedLevel('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedLevel === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {strings.stories?.allLevels || "All Levels"}
              </button>
              {JLPT_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedLevel === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Filter */}
          {getThemes().length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {strings.stories?.theme || "Theme"}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTheme('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedTheme === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {strings.stories?.allThemes || "All Themes"}
                </button>
                {getThemes().map(theme => (
                  <button
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedTheme === theme
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stories Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStories.map((story, index) => (
              <motion.div
                key={story.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => handleReadStory(story)}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {story.title}
                      </h3>
                      <button
                        onClick={(e) => handleCacheStory(story, e)}
                        className={`p-2 rounded-lg transition-colors ${
                          cachedStoryIds.has(story.slug)
                            ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                        title={cachedStoryIds.has(story.slug) ? 'Remove from offline' : 'Save for offline'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d={cachedStoryIds.has(story.slug) 
                                  ? "M5 13l4 4L19 7"
                                  : "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"} />
                        </svg>
                      </button>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {story.summary}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {story.metadata.jlptLevel}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {story.metadata.length} {strings.stories?.characters || "characters"}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {story.metadata.readingTime} {strings.stories?.minRead || "min read"}
                      </span>
                    </div>
                    
                    {story.metadata.themes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {story.metadata.themes.map(theme => (
                          <span key={theme} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredStories.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">
              {showOfflineOnly 
                ? strings.stories?.noOfflineStories || "No offline stories available"
                : strings.stories?.noStoriesFound || "No stories found for the selected filters"}
            </p>
          </div>
        )}
      </MobileAwareContainer>
    </div>
  );
}