'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';
import Image from 'next/image';

export interface OverviewScreenProps {
  onNext: () => void;
}

export function OverviewScreen({ onNext }: OverviewScreenProps) {
  const strings = useStrings();
  const tutorial = strings?.tutorial;

  if (!tutorial || !tutorial.welcome) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 h-full">
      {/* Hero Section */}
      <div className="relative mt-4">
        <div className="text-4xl md:text-5xl mb-4">🌟</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {tutorial.overview?.title || 'Your Japanese Journey Includes:'}
        </h2>
        
        <div className="bg-gradient-to-br from-background to-background/80 border border-primary/20 rounded-lg p-4 md:p-6 max-w-xl md:max-w-md mx-auto shadow-lg">
          <div className="text-sm text-foreground/90 font-medium space-y-2">
            <div className="text-center">{tutorial.welcome.features.conjugations}</div>
            <div className="text-center">{tutorial.welcome.features.vocabulary}</div>
            <div className="text-center">{tutorial.welcome.features.textbookVocab}</div>
            <div className="text-center">{tutorial.welcome.features.kanji}</div>
            <div className="flex items-center justify-center gap-1">
              <Image 
                src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
                alt="Pokéball" 
                width={16} 
                height={16}
                className="flex-shrink-0"
              />
              <span className="text-center max-w-[300px]">
                {tutorial.welcome.features.games.replace('🎮 ', '')}
              </span>
            </div>
            <div className="text-center">{tutorial.welcome.features.reading}</div>
            <div className="flex items-center justify-center gap-1">
              <Image 
                src="/flat-icons/ui/youtube.svg" 
                alt="YouTube" 
                width={16} 
                height={16}
                className="flex-shrink-0"
              />
              <span className="text-center">{tutorial.welcome.features.youtubeShadowing.replace('🎬 ', '')}</span>
            </div>
            <div className="text-center">{tutorial.welcome.features.tracking}</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <TutorialButton onClick={onNext} variant="primary">
        {tutorial.overview?.startButton || "Let's Get Started!"}
      </TutorialButton>
    </div>
  );
}