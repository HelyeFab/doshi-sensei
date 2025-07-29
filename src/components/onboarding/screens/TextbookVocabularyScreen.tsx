'use client';

import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';

export interface TextbookVocabularyScreenProps {
  onNext: () => void;
}

export function TextbookVocabularyScreen({ onNext }: TextbookVocabularyScreenProps) {
  const strings = useStrings();
  const tutorial = strings?.tutorial;

  if (!tutorial || !tutorial.textbookVocabularyTutorial) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 h-full">
      {/* Main Content */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {tutorial.textbookVocabularyTutorial.title}
        </h2>
        
        <p className="text-lg text-foreground/80">
          {tutorial.textbookVocabularyTutorial.description}
        </p>

        <p className="text-sm text-primary font-semibold">
          {tutorial.textbookVocabularyTutorial.stats}
        </p>

        {/* Features */}
        <div className="bg-gradient-to-br from-background to-background/80 border border-primary/20 rounded-lg p-4 space-y-3 text-left max-w-md mx-auto shadow-lg">
          <div className="text-sm text-foreground/90">
            {tutorial.textbookVocabularyTutorial.features.genki}
          </div>
          <div className="text-sm text-foreground/90">
            {tutorial.textbookVocabularyTutorial.features.minna}
          </div>
          <div className="text-sm text-foreground/90">
            {tutorial.textbookVocabularyTutorial.features.srs}
          </div>
          <div className="text-sm text-foreground/90">
            {tutorial.textbookVocabularyTutorial.features.progress}
          </div>
        </div>

        <p className="text-base text-primary font-medium px-4">
          {tutorial.textbookVocabularyTutorial.highlight}
        </p>
      </div>

      {/* CTA */}
      <TutorialButton onClick={onNext} variant="primary">
        {tutorial.textbookVocabularyTutorial.continueButton}
      </TutorialButton>
    </div>
  );
}