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
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const currentMessage = welcomeMessages[currentMessageIndex];
    let textIndex = 0;

    // Reset states
    setDisplayedText('');
    setIsTyping(true);

    // Type the Japanese text
    const typeText = () => {
      if (textIndex < currentMessage.kanji.length) {
        setDisplayedText(currentMessage.kanji.slice(0, textIndex + 1));
        textIndex++;
        setTimeout(typeText, 200);
      } else {
        setIsTyping(false);
        // Wait before starting next message
        setTimeout(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % welcomeMessages.length);
        }, 3000);
      }
    };

    typeText();
  }, [currentMessageIndex]);

  return (
    <div className="text-center py-6">
      <div className="min-h-[80px] flex flex-col justify-center">
        <div className="text-2xl japanese-text font-medium text-foreground">
          {displayedText}
          {isTyping && (
            <span className="animate-pulse text-primary">|</span>
          )}
        </div>
      </div>
    </div>
  );
}
