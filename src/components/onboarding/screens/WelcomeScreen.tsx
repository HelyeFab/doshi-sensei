'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';
import Image from 'next/image';

export interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  const strings = useStrings();
  const tutorial = strings.tutorial;

  if (!tutorial || !tutorial.welcome) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Hero Section */}
      <div className="relative mb-6">
        <div className="text-5xl md:text-7xl animate-bounce">🗾</div>
        <div className="absolute -top-2 -right-2 text-2xl md:text-3xl animate-spin-slow">✨</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold text-white">
          {tutorial.welcome.title}
        </h1>
        <p className="text-lg md:text-xl text-white/90 leading-relaxed px-2">
          {tutorial.welcome.description}
          <span className="font-semibold text-white"> {tutorial.welcome.emphasis} </span>
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8">
        <TutorialButton onClick={onNext} variant="primary">
          Discover What's Inside
        </TutorialButton>
      </div>
    </div>
  );
}
