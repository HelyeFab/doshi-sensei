'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';

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
    <div className="flex flex-col items-center text-center space-y-6 p-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="text-6xl mb-4 animate-bounce">🗾</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-spin-slow">✨</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-md">
        <h1 className="text-3xl font-bold text-foreground">
          {tutorial.welcome.title}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {tutorial.welcome.description}
          <span className="font-semibold text-primary"> {tutorial.welcome.emphasis} </span>
        </p>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary font-medium mb-2">
            {tutorial.welcome.features.header}
          </p>
          <p className="text-sm text-primary font-medium">
            {tutorial.welcome.features.conjugations}<br/>
            {tutorial.welcome.features.vocabulary}<br/>
            {tutorial.welcome.features.games}<br/>
            {tutorial.welcome.features.reading}<br/>
            {tutorial.welcome.features.kanji}<br/>
            {tutorial.welcome.features.tracking}
          </p>
        </div>
      </div>

      {/* CTA */}
      <TutorialButton
        onClick={onNext}
        variant="primary"
        size="large"
        className="animate-pulse"
      >
        {tutorial.welcome.startButton}
      </TutorialButton>

      <p className="text-xs text-muted-foreground">
        {tutorial.welcome.footer}
      </p>
    </div>
  );
}
