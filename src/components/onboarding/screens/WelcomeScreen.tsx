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
    <div className="flex flex-col items-center justify-center text-center space-y-6 h-full">
      {/* Hero Section */}
      <div className="relative">
        <div className="text-6xl md:text-7xl mb-4 animate-bounce">🗾</div>
        <div className="absolute -top-2 -right-2 text-3xl animate-spin-slow">✨</div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          {tutorial.welcome.title}
        </h1>
        <p className="text-xl text-white/90 leading-relaxed">
          {tutorial.welcome.description}
          <span className="font-semibold text-white"> {tutorial.welcome.emphasis} </span>
        </p>
      </div>

      {/* CTA */}
      <TutorialButton onClick={onNext} variant="primary">
        Discover What's Inside
      </TutorialButton>
    </div>
  );
}
