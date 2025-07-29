'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';

export interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  const strings = useStrings();
  const tutorial = strings?.tutorial;

  if (!tutorial || !tutorial.welcome) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Hero Section */}
      <div className="relative mb-4">
        <div className="text-6xl md:text-7xl mb-4 animate-bounce">🗾</div>
        <div className="absolute -top-2 -right-2 text-3xl animate-spin-slow">✨</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          {tutorial.welcome.title}
        </h1>
        <p className="text-xl text-foreground/80 leading-relaxed">
          {tutorial.welcome.description}
        </p>
        <p className="text-xl font-semibold text-primary">
          {tutorial.welcome.emphasis}
        </p>
      </div>

      {/* Features List */}
      <div className="space-y-3 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-foreground">
          {tutorial.welcome.features.header}
        </h3>
        <div className="bg-gradient-to-br from-background to-background/80 border border-primary/20 rounded-lg p-4 space-y-2 text-left max-w-md mx-auto shadow-lg">
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.conjugations}</div>
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.vocabulary}</div>
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.textbookVocab}</div>
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.games}</div>
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.reading}</div>
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.kanji}</div>
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.tracking}</div>
          <div className="text-sm text-foreground/90">{tutorial.welcome.features.youtubeShadowing}</div>
        </div>
      </div>

      {/* CTA Button */}
      <TutorialButton 
        onClick={onNext} 
        variant="primary"
        size="medium"
        className="px-6 py-3 text-base font-semibold"
      >
        {tutorial.welcome.startButton}
      </TutorialButton>

      {/* Footer */}
      <p className="text-xs text-foreground/60 italic">
        {tutorial.welcome.footer}
      </p>
    </div>
  );
}