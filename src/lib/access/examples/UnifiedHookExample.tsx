/**
 * Example Usage of the Unified useFeature Hook
 * 
 * This file demonstrates various usage patterns for the new unified hook.
 * Use these examples as reference when migrating components.
 */

'use client';

import React from 'react';
import { useFeature } from '@/hooks/useFeature';

/**
 * Example 1: Basic Silent Check
 * Just check if user can access, no UI feedback
 */
export function SilentCheckExample() {
  const { canUse, remaining } = useFeature('vocabulary_search', {
    silent: true
  });
  
  if (!canUse) {
    return <div className="text-muted">This feature is not available to you</div>;
  }
  
  return (
    <div className="p-4 bg-card rounded-lg">
      <h3 className="font-semibold">Vocabulary Search</h3>
      <p className="text-sm text-muted">
        {remaining === -1 ? 'Unlimited searches' : `${remaining} searches remaining`}
      </p>
    </div>
  );
}

/**
 * Example 2: With Toast Notifications
 * Show toast messages for access denials
 */
export function ToastExample() {
  const { checkAndTrack, remaining, isLoading } = useFeature('drill_practice', {
    showToast: true,
    trackUsage: true
  });
  
  const handleStartDrill = async () => {
    if (await checkAndTrack()) {
      console.log('Starting drill...');
      // Proceed with the drill
    }
    // No else needed - toast will show automatically
  };
  
  return (
    <button
      onClick={handleStartDrill}
      disabled={isLoading}
      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
    >
      Start Drill {remaining && remaining > 0 && `(${remaining} left)`}
    </button>
  );
}

/**
 * Example 3: With Modal Popups
 * Show login/upgrade modals for premium features
 */
export function ModalExample() {
  const { 
    checkAndTrack, 
    remaining, 
    userType,
    AccessModals 
  } = useFeature('ai_stories', {
    showModal: true,
    showToast: true,
    trackUsage: true
  });
  
  const handleGenerateStory = async () => {
    if (await checkAndTrack()) {
      console.log('Generating AI story...');
      // Proceed with story generation
    }
  };
  
  return (
    <>
      {/* Render modals - they'll only show when needed */}
      {AccessModals && <AccessModals />}
      
      <div className="p-4 bg-card rounded-lg">
        <h3 className="font-semibold">AI Story Generator</h3>
        <p className="text-sm text-muted mb-4">
          {userType === 'guest' && 'Sign in to use AI stories'}
          {userType === 'free' && `${remaining || 0} stories left today`}
          {(userType === 'monthly' || userType === 'yearly') && 'Unlimited stories'}
        </p>
        <button
          onClick={handleGenerateStory}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
        >
          Generate Story
        </button>
      </div>
    </>
  );
}

/**
 * Example 4: Custom Handlers
 * Use custom logic for access denials
 */
export function CustomHandlerExample() {
  const { checkAndTrack, remaining } = useFeature('youtube_shadowing', {
    onLimitReached: (remaining, limit) => {
      // Custom upgrade flow
      console.log(`Custom: You've used ${limit - remaining} of ${limit} videos`);
      // Could open a custom modal, redirect, etc.
    },
    onLoginRequired: () => {
      // Custom login flow
      window.location.href = '/account?redirect=/tools/youtube-shadowing';
    },
    onSubscriptionRequired: () => {
      // Custom upgrade flow
      window.location.href = '/pricing?feature=youtube-shadowing';
    },
    trackUsage: true
  });
  
  const handleStartShadowing = async () => {
    if (await checkAndTrack()) {
      console.log('Starting YouTube shadowing...');
    }
  };
  
  return (
    <button
      onClick={handleStartShadowing}
      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
    >
      Start Shadowing Practice
    </button>
  );
}

/**
 * Example 5: Realtime Updates
 * Component updates when subscription changes
 */
export function RealtimeExample() {
  const { 
    canUse, 
    remaining, 
    userType,
    limit,
    resetAt 
  } = useFeature('news_reader', {
    realtimeUpdates: true,
    showToast: true
  });
  
  return (
    <div className="p-4 bg-card rounded-lg space-y-2">
      <h3 className="font-semibold">News Reader Status</h3>
      <div className="text-sm space-y-1">
        <p>User Type: <span className="font-medium">{userType}</span></p>
        <p>Access: <span className="font-medium">{canUse ? '✅ Allowed' : '❌ Denied'}</span></p>
        {limit !== null && limit !== -1 && (
          <>
            <p>Daily Limit: <span className="font-medium">{limit}</span></p>
            <p>Remaining: <span className="font-medium">{remaining || 0}</span></p>
            {resetAt && (
              <p>Resets at: <span className="font-medium">{resetAt.toLocaleTimeString()}</span></p>
            )}
          </>
        )}
        {limit === -1 && (
          <p className="text-green-600 font-medium">✨ Unlimited Access</p>
        )}
      </div>
    </div>
  );
}

/**
 * Example 6: Check Without Tracking
 * Just check access without incrementing usage
 */
export function CheckOnlyExample() {
  const { check, canUse, track } = useFeature('kanji_quest', {
    checkOnly: true,
    showToast: true
  });
  
  const handlePlayGame = async () => {
    // First just check
    if (await check()) {
      console.log('User has access, starting game...');
      
      // Track usage only after game completes
      setTimeout(async () => {
        await track();
        console.log('Game completed, usage tracked');
      }, 5000);
    }
  };
  
  return (
    <button
      onClick={handlePlayGame}
      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
    >
      Play Kanji Quest
    </button>
  );
}

/**
 * Main Example Page
 * Shows all the different patterns
 */
export default function UnifiedHookExamples() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Unified useFeature Hook Examples</h1>
          <p className="text-muted">
            These examples demonstrate different usage patterns for the new unified hook.
          </p>
        </div>
        
        <div className="grid gap-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Silent Check</h2>
            <SilentCheckExample />
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">2. With Toast Notifications</h2>
            <ToastExample />
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">3. With Modal Popups</h2>
            <ModalExample />
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">4. Custom Handlers</h2>
            <CustomHandlerExample />
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">5. Realtime Updates</h2>
            <RealtimeExample />
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">6. Check Without Tracking</h2>
            <CheckOnlyExample />
          </section>
        </div>
      </div>
    </div>
  );
}