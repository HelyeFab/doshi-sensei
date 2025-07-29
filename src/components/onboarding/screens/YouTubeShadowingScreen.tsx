'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';
import Image from 'next/image';

export interface YouTubeShadowingScreenProps {
  onNext: () => void;
}

export function YouTubeShadowingScreen({ onNext }: YouTubeShadowingScreenProps) {
  const strings = useStrings();
  const tutorial = strings?.tutorial;

  if (!tutorial || !tutorial.youtubeShadowingTutorial) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 h-full">
      {/* Hero Section */}
      <div className="relative">
        <Image 
          src="/flat-icons/ui/youtube.svg" 
          alt="YouTube" 
          width={64} 
          height={64}
          className="mx-auto"
        />
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground">
          {tutorial.youtubeShadowingTutorial.title}
        </h2>
        
        <p className="text-lg text-primary-foreground/90">
          {tutorial.youtubeShadowingTutorial.description}
        </p>

        {/* Features */}
        <div className="bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-lg p-4 space-y-3 text-left max-w-md mx-auto shadow-lg">
          <div className="text-sm text-primary-foreground">
            {tutorial.youtubeShadowingTutorial.features.extract}
          </div>
          <div className="text-sm text-primary-foreground">
            {tutorial.youtubeShadowingTutorial.features.transcript}
          </div>
          <div className="text-sm text-primary-foreground">
            {tutorial.youtubeShadowingTutorial.features.shadow}
          </div>
          <div className="text-sm text-primary-foreground">
            {tutorial.youtubeShadowingTutorial.features.furigana}
          </div>
        </div>

        <p className="text-sm text-primary font-medium">
          {tutorial.youtubeShadowingTutorial.example}
        </p>
      </div>

      {/* CTA */}
      <TutorialButton onClick={onNext} variant="primary">
        {tutorial.youtubeShadowingTutorial.continueButton}
      </TutorialButton>
    </div>
  );
}