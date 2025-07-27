'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Story } from '@/types/story';
import { storyManager } from '@/utils/storyManager';
import { storyOfflineManager } from '@/utils/storyOfflineManager';
import StoryReader from '@/components/story/StoryReader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

export default function StoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium, userType } = useSubscription2();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [canRead, setCanRead] = useState(true);
  const params = useParams();
  const slug = typeof params?.slug === 'string'
    ? params.slug
    : Array.isArray(params?.slug)
      ? params.slug[0]
      : undefined;

  useEffect(() => {
    loadStory();
  }, [slug, authLoading]);

  const loadStory = async () => {
    // Wait for auth to be ready
    if (authLoading) {
      return;
    }

    try {
      setLoading(true);

      if (!slug) {
        router.push('/stories');
        return;
      }

      // Check if user can read stories using new system
      const canAccess = await checkAndTrack('story_reading');
      setCanRead(canAccess);

      if (!canAccess) {
        // The access system will show the appropriate modal
        router.push('/stories');
        return;
      }

      // Try to load from cache first if offline
      let loadedStory: Story | null = null;

      if (!navigator.onLine) {
        // Try loading from cache when offline
        const cachedStories = await storyOfflineManager.getAllCachedStories();
        loadedStory = cachedStories.find(s => s.slug === slug) || null;
      }

      // If not found in cache or online, load from Firebase
      if (!loadedStory) {
        loadedStory = await storyManager.getStoryBySlug(slug);
      }

      if (!loadedStory) {
        router.push('/stories');
        return;
      }

      setStory(loadedStory);
      // Usage tracking is handled automatically by checkAndTrack
    } catch (error) {
      console.error('Error loading story:', error);
      router.push('/stories');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/stories');
  };

  const handleExit = () => {
    router.push('/stories');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading story...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!story || !canRead) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title={story.title} />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs className="mt-4 mb-6" />
      </div>
      <div className="py-8">
        <StoryReader
          story={story}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      </div>
    </div>
  );
}
