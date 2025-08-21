'use client';

import { useState, useEffect } from 'react';

const loadingPhrases = [
  { emoji: "⏳", text: "Conjugating verbs..." },
  { emoji: "🔍", text: "Searching through 180,000+ words..." },
  { emoji: "📚", text: "Did you know? 見る (miru) is an ichidan verb!" },
  { emoji: "✨", text: "Fun fact: Japanese has over 500 irregular verbs!" },
  { emoji: "🎌", text: "Loading your vocabulary..." },
  { emoji: "📖", text: "Tip: Godan verbs end in -u, -ku, -gu, -su, -tsu, -nu, -bu, -mu, or -ru" },
  { emoji: "🌸", text: "Did you know? 食べる (taberu) means 'to eat'" },
  { emoji: "🎯", text: "Fun fact: です (desu) is actually a copula, not a verb!" },
  { emoji: "🗾", text: "Japanese has 3 main verb groups!" },
  { emoji: "💡", text: "Tip: い-adjectives conjugate like verbs!" },
  { emoji: "🔤", text: "Did you know? する (suru) is the most common irregular verb" },
  { emoji: "📝", text: "Grammar tip: て-form connects actions!" },
  { emoji: "🎓", text: "Fun fact: Potential form adds られる to ichidan verbs" },
  { emoji: "🌊", text: "Loading conjugations..." },
  { emoji: "🍜", text: "Did you know? 飲む (nomu) becomes 飲まない in negative!" },
];

interface ConjugationLoadingAnimationProps {
  isSearching?: boolean;
}

export function ConjugationLoadingAnimation({ isSearching = false }: ConjugationLoadingAnimationProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState('opacity-100');

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeClass('opacity-0');
      
      setTimeout(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
        setFadeClass('opacity-100');
      }, 200);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const currentPhrase = loadingPhrases[currentPhraseIndex];

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Animated Emoji */}
      <div className="relative">
        <div className="text-6xl animate-pulse">
          {currentPhrase.emoji}
        </div>
        {isSearching && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Rotating Text */}
      <div className={`text-center transition-opacity duration-200 ${fadeClass}`}>
        <p className="text-lg text-foreground font-medium">
          {currentPhrase.text}
        </p>
      </div>

      {/* Progress Bar */}
      {isSearching && (
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-shimmer" />
        </div>
      )}
    </div>
  );
}

// Add this to your global CSS or tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(200%); }
// }