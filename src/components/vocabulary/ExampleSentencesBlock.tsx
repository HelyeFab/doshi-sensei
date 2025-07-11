'use client';

import { useState } from 'react';
import { ExampleSentence, JapaneseWord } from '@/types';
import { TTSButton } from '@/components/ui/TTSButton';
import { useAuth } from '@/contexts/AuthContext';

interface ExampleSentencesBlockProps {
  word: string;
  examples: ExampleSentence[];
  maxVisible?: number;
  onSaveExample?: (example: ExampleSentence) => void;
}

export function ExampleSentencesBlock({ word, examples, maxVisible = 3, onSaveExample }: ExampleSentencesBlockProps) {
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();
  
  if (!examples || examples.length === 0) {
    return null;
  }

  const visibleExamples = showAll ? examples : examples.slice(0, maxVisible);
  const hasMore = examples.length > maxVisible;

  const handleSaveClick = (example: ExampleSentence) => {
    if (!user) {
      alert('Please sign in to save sentences');
      return;
    }

    if (onSaveExample) {
      onSaveExample(example);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        Example Sentences
      </h4>
      
      <div className="space-y-3">
        {visibleExamples.map((example) => (
          <div
            key={example.id}
            className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground flex-1">
                    {highlightWord(example.japanese, word)}
                  </p>
                  <TTSButton 
                    text={example.japanese}
                    size="sm"
                    options={{
                      provider: 'elevenlabs',
                      voice: 'male',
                      speed: 1.0
                    }}
                  />
                </div>
                {example.english && (
                  <p className="text-sm text-muted-foreground">
                    {example.english}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => handleSaveClick(example)}
                className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
                title="Save sentence"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {showAll ? (
            <>
              Show less
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              Show {examples.length - maxVisible} more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Helper function to highlight the searched word in the sentence
function highlightWord(sentence: string, word: string): React.ReactNode {
  if (!word) return sentence;
  
  const parts = sentence.split(new RegExp(`(${word})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === word.toLowerCase() ? (
          <span key={index} className="text-primary font-semibold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}