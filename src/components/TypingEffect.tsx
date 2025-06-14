'use client';

import { useState, useEffect } from 'react';

interface WelcomeMessage {
  kanji: string;
  furigana: string;
  romaji: string;
}

const welcomeMessages: WelcomeMessage[] = [
  {
    kanji: 'いらっしゃいませ',
    furigana: 'いらっしゃいませ',
    romaji: 'irasshaimase'
  },
  {
    kanji: 'ようこそ',
    furigana: 'ようこそ',
    romaji: 'yokoso'
  },
  {
    kanji: 'はじめまして',
    furigana: 'はじめまして',
    romaji: 'hajimemashite'
  },
  {
    kanji: 'こんにちは',
    furigana: 'こんにちは',
    romaji: 'konnichiwa'
  },
  {
    kanji: 'お疲れ様です',
    furigana: 'おつかれさまです',
    romaji: 'otsukaresama desu'
  }
];

export default function TypingEffect() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedKanji, setDisplayedKanji] = useState('');
  const [displayedFurigana, setDisplayedFurigana] = useState('');
  const [showFurigana, setShowFurigana] = useState(false);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const currentMessage = welcomeMessages[currentMessageIndex];
    let kanjiIndex = 0;
    let furiganaIndex = 0;

    // Reset states
    setDisplayedKanji('');
    setDisplayedFurigana('');
    setShowFurigana(false);
    setIsTyping(true);

    // Type kanji first
    const typeKanji = () => {
      if (kanjiIndex < currentMessage.kanji.length) {
        setDisplayedKanji(currentMessage.kanji.slice(0, kanjiIndex + 1));
        kanjiIndex++;
        setTimeout(typeKanji, 200);
      } else {
        // After kanji is complete, show furigana typing
        setTimeout(() => {
          setShowFurigana(true);
          typeFurigana();
        }, 600);
      }
    };

    // Type furigana
    const typeFurigana = () => {
      if (furiganaIndex < currentMessage.furigana.length) {
        setDisplayedFurigana(currentMessage.furigana.slice(0, furiganaIndex + 1));
        furiganaIndex++;
        setTimeout(typeFurigana, 150);
      } else {
        setIsTyping(false);
        // Wait before starting next message
        setTimeout(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % welcomeMessages.length);
        }, 3000);
      }
    };

    typeKanji();
  }, [currentMessageIndex]);

  return (
    <div className="text-center py-6">
      <div className="min-h-[80px] flex flex-col justify-center">
        <div className="text-2xl japanese-text font-medium text-foreground mb-2">
          {displayedKanji}
          {isTyping && !showFurigana && (
            <span className="animate-pulse text-primary">|</span>
          )}
        </div>
        {showFurigana && (
          <div className="text-sm japanese-text text-muted-foreground">
            {displayedFurigana}
            {isTyping && (
              <span className="animate-pulse text-primary">|</span>
            )}
          </div>
        )}
        {!isTyping && (
          <div className="text-xs text-muted-foreground mt-1 italic">
            ({welcomeMessages[currentMessageIndex].romaji})
          </div>
        )}
      </div>
    </div>
  );
}
