'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { Story } from '@/types/story';
import { JLPTLevel, JLPT_LEVELS } from '@/types/kanji';
import { storyManager } from '@/utils/storyManager';
import { storyOfflineManager } from '@/utils/storyOfflineManager';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import Link from 'next/link';

export default function StoriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userType, isFeatureAvailable, showLoginPrompt, showUpgradePrompt } = useSubscription();
  const { canReadStory, getLimit, isPremium } = useEntitlements();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | 'all'>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [storiesReadToday, setStoriesReadToday] = useState(0);
  const [storyLimit, setStoryLimit] = useState(0);
  const [cachedStoryIds, setCachedStoryIds] = useState<Set<string>>(new Set());
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);

  useEffect(() => {
    loadStories();
    checkReadStatus();
    loadCachedStories();
  }, [selectedLevel, selectedTheme, showOfflineOnly]);

  const loadStories = async () => {
    try {
      setLoading(true);
      let loadedStories: Story[] = [];
      
      if (showOfflineOnly) {
        // Show only cached stories
        loadedStories = await storyOfflineManager.getAllCachedStories();
        if (selectedLevel !== 'all') {
          loadedStories = loadedStories.filter(s => s.jlptLevel === selectedLevel);
        }
        if (selectedTheme !== 'all') {
          loadedStories = loadedStories.filter(s => s.theme === selectedTheme);
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

  const checkReadStatus = () => {
    const storyCheck = canReadStory();
    setStoriesReadToday(storyCheck.used || 0);
    setStoryLimit(storyCheck.limit || 0);
  };

  const loadCachedStories = async () => {
    try {
      const cached = await storyOfflineManager.getAllCachedStories();
      const cachedIds = new Set(cached.map(s => s.id));
      setCachedStoryIds(cachedIds);
    } catch (error) {
      console.error('Error loading cached stories:', error);
    }
  };

  const handleStoryClick = async (story: Story) => {
    // Check if user can read more stories today using entitlements
    const storyCheck = canReadStory();
    if (!storyCheck.allowed) {
      if (!user) {
        showLoginPrompt(
          `You've reached your daily story limit (${storyCheck.used}/${storyCheck.limit})! Sign up to read more stories and save your progress.`,
          'stories'
        );
      } else {
        showUpgradePrompt(
          `You've read your daily story limit (${storyCheck.used}/${storyCheck.limit})! Upgrade to Premium for unlimited stories.`,
          'stories'
        );
      }
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
    <div className="min-h-screen bg-background">
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        
        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
        
        {/* Virtual Companion Button positioned within this section */}
      </div>

      <div className="container mx-auto px-4 pb-20">
        <PageHeader 
          title="AI Stories" 
          subtitle="Interactive Japanese stories for every level"
          helpKey="stories"
        />

        <div className="py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">JLPT Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as JLPTLevel | 'all')}
              className="px-4 py-2 border border-border rounded-lg bg-background"
            >
              <option value="all">All Levels</option>
              {JLPT_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background"
            >
              <option value="all">All Themes</option>
              {getThemes().map((theme) => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={() => setShowOfflineOnly(!showOfflineOnly)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showOfflineOnly 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
              }`}
            >
              {showOfflineOnly ? '📵 Offline' : '🌐 All Stories'}
            </button>
            
            {!isPremium && storyLimit > 0 && (
              <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg">
                {storiesReadToday < storyLimit 
                  ? `${storyLimit - storiesReadToday} ${storyLimit - storiesReadToday === 1 ? 'story' : 'stories'} remaining today`
                  : 'Daily limit reached'
                }
              </div>
            )}
          </div>
        </div>

        {/* Stories Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl text-muted-foreground">No stories found for the selected filters.</p>
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
            <p className="text-muted-foreground mb-4">
              Upgrade to Premium for unlimited access to all stories, progress tracking, and more!
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              View Plans
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}