'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';

export interface TextbookVocabularyScreenProps {
  onNext: () => void;
}

export function TextbookVocabularyScreen({ onNext }: TextbookVocabularyScreenProps) {
  const strings = useStrings();

  return (
    <div className="flex flex-col items-center text-center space-y-6 p-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="text-6xl mb-4">📚</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-spin-slow">🌸</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-md">
        <h2 className="text-3xl font-bold text-white">
          Textbook Vocabulary
        </h2>
        <p className="text-lg text-white/90 leading-relaxed">
          Master vocabulary from popular Japanese textbooks with 
          <span className="font-semibold text-white"> advanced spaced repetition</span> and 
          interactive flashcards.
        </p>
        
        {/* Stats */}
        <div className="bg-white/10 border border-white/20 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">9,635</p>
              <p className="text-xs text-white/70">Vocabulary Cards</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">2</p>
              <p className="text-xs text-white/70">Textbook Series</p>
            </div>
          </div>
        </div>
        
        {/* Feature highlights */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-left">
            <span className="text-xl">📖</span>
            <div>
              <p className="font-medium text-sm text-white">Genki & Minna no Nihongo</p>
              <p className="text-xs text-white/70">Complete vocabulary from both popular series</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 text-left">
            <span className="text-xl">🧠</span>
            <div>
              <p className="font-medium text-sm text-white">FSRS Algorithm</p>
              <p className="text-xs text-white/70">State-of-the-art spaced repetition for optimal learning</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 text-left">
            <span className="text-xl">🎯</span>
            <div>
              <p className="font-medium text-sm text-white">Theme-Based Learning</p>
              <p className="text-xs text-white/70">Study by themes like food, travel, or business</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}