'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Story } from '@/types/story';
import { storyManager } from '@/utils/storyManager';
import { storyOfflineManager } from '@/utils/storyOfflineManager';
import StoryReader from '@/components/story/StoryReader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface StoryPageProps {
  params: {
    slug: string;
  };
}

export default function StoryPage({ params }: StoryPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { userType, showLoginPrompt, showUpgradePrompt } = useSubscription();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [canRead, setCanRead] = useState(true);
  const nextParams = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : (Array.isArray(params?.slug) ? params.slug[0] : nextParams?.slug);

  const isPremium = userType === 'monthly' || userType === 'yearly';

  useEffect(() => {
    loadStory();
  }, [slug]);

  const loadStory = async () => {
    try {
      setLoading(true);

      // Check if user can read stories today
      const canReadToday = await storyManager.canReadStory(user?.uid || null, isPremium);
      setCanRead(canReadToday);

      if (!canReadToday) {
        if (!user) {
          showLoginPrompt(
            'You\'ve reached your daily story limit! Sign up to read more stories and save your progress.',
            'stories'
          );
        } else {
          showUpgradePrompt(
            'You\'ve read your daily story! Upgrade to Premium for unlimited stories.',
            'stories'
          );
        }
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
        loadedStory = await storyManager.getStory(slug);
      }

      if (!loadedStory) {
        router.push('/stories');
        return;
      }

      setStory(loadedStory);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story || !canRead) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <StoryReader
        story={story}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    </div>
  );
}
