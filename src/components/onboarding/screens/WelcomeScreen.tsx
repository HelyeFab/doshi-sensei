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
    <div className="flex flex-col items-center text-center space-y-3 md:space-y-6 p-8">
      {/* Hero Section */}
      <div className="relative mt-4">
        <div className="text-4xl md:text-6xl mb-4 animate-bounce">🗾</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-spin-slow">✨</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white">
          {tutorial.welcome.title}
        </h1>
        <p className="text-lg text-white/90 leading-relaxed">
          {tutorial.welcome.description}
          <span className="font-semibold text-white"> {tutorial.welcome.emphasis} </span>
        </p>
        <div className="bg-white/10 border border-white/20 rounded-lg p-4 max-w-xl md:max-w-md mx-auto">
          <p className="text-sm text-white font-medium mb-2">
            {tutorial.welcome.features.header}
          </p>
          <div className="text-sm text-white/90 font-medium space-y-1">
            <div>{tutorial.welcome.features.conjugations}</div>
            <div>{tutorial.welcome.features.vocabulary}</div>
            <div>{tutorial.welcome.features.textbookVocab}</div>
            <div>{tutorial.welcome.features.kanji}</div>
            <div className="flex items-start gap-1">
              <Image 
                src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
                alt="Pokéball" 
                width={16} 
                height={16}
                className="mt-0.5 flex-shrink-0"
              />
              <span>{tutorial.welcome.features.games.replace('🎮 ', '')}</span>
            </div>
            <div>{tutorial.welcome.features.reading}</div>
            <div className="flex items-start gap-1">
              <Image 
                src="/flat-icons/ui/youtube.svg" 
                alt="YouTube" 
                width={16} 
                height={16}
                className="mt-0.5 flex-shrink-0"
              />
              <span>{tutorial.welcome.features.youtubeShadowing.replace('🎬 ', '')}</span>
            </div>
          </div>
        </div>
      </div>


      <p className="text-xs text-white/60">
        {tutorial.welcome.footer}
      </p>

    </div>
  );
}
