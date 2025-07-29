'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';

export interface YouTubeShadowingScreenProps {
  onNext: () => void;
}

export function YouTubeShadowingScreen({ onNext }: YouTubeShadowingScreenProps) {
  const strings = useStrings();

  return (
    <div className="flex flex-col items-center text-center">
      {/* Hero Section */}
      <div className="relative mb-8">
        <div className="text-6xl mb-4">🎬</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-pulse">🎤</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-md">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          YouTube Shadowing
        </h2>
        <p className="text-base md:text-lg text-white/90 leading-relaxed">
          Practice Japanese with real YouTube videos! 
          <span className="font-semibold text-white">Extract transcripts and shadow native speakers.</span>
        </p>
        
        {/* Feature highlights */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-left bg-white/10 p-3 rounded-lg">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="font-medium text-sm text-white">Line-by-Line Practice</p>
              <p className="text-xs text-white/70">Repeat after native speakers with synchronized playback</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 text-left bg-white/10 p-3 rounded-lg">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-sm text-white">Popular Videos</p>
              <p className="text-xs text-white/70">Access community's favorite videos with cached transcripts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}