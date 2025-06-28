'use client';

import { useState, useEffect } from 'react';
import { KanaCharacter, kanaData } from '@/data/kanaData';
import TTSManager from '@/utils/tts';

interface KanaStudyModalProps {
  isOpen: boolean;
  onClose: (completed: boolean) => void;
  selectedKanaIds: string[];
  studyType: 'hiragana' | 'katakana' | 'both';
}

interface StudyItem {
  kana: KanaCharacter;
  character: string;
  isHiragana: boolean;
}

export default function KanaStudyModal({ isOpen, onClose, selectedKanaIds, studyType }: KanaStudyModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyItems, setStudyItems] = useState<StudyItem[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  // Initialize study items based on selected kana and study type
  useEffect(() => {
    if (isOpen) {
      const items: StudyItem[] = [];
      
      selectedKanaIds.forEach(id => {
        const kana = kanaData.find(k => k.id === id);
        if (kana) {
          if (studyType === 'hiragana' || studyType === 'both') {
            items.push({
              kana,
              character: kana.hiragana,
              isHiragana: true
            });
          }
          if (studyType === 'katakana' || studyType === 'both') {
            items.push({
              kana,
              character: kana.katakana,
              isHiragana: false
            });
          }
        }
      });

      // Shuffle items
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      setStudyItems(shuffled);
      setCurrentIndex(0);
      setShowAnswer(false);
      setCorrectCount(0);
    }
  }, [isOpen, selectedKanaIds, studyType]);

  if (!isOpen || studyItems.length === 0) return null;

  const currentItem = studyItems[currentIndex];
  const progress = ((currentIndex + 1) / studyItems.length) * 100;

  const handleSpeak = async () => {
    try {
      setPlayingAudio(true);
      // Use Google TTS for single kana characters
      await TTSManager.speak(currentItem.character, {
        voice: 'female',
        provider: 'google'
      });
    } catch (error) {
      console.error('Error speaking kana:', error);
    } finally {
      setPlayingAudio(false);
    }
  };

  const handleNext = (wasCorrect: boolean) => {
    if (wasCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    if (currentIndex < studyItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Study session complete
      const studyTime = Math.round((Date.now() - sessionStartTime) / 1000);
      onClose(true);
    }
  };

  const handleClose = () => {
    onClose(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-card-foreground">
              Kana Study Session
            </h2>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{currentIndex + 1} / {studyItems.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </div>

        {/* Study Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            {/* Character Display */}
            <div className="text-8xl japanese-text font-medium text-foreground mb-4">
              {currentItem.character}
            </div>

            {/* Character Type Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              currentItem.isHiragana 
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' 
                : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
            }`}>
              {currentItem.isHiragana ? 'ひらがな' : 'カタカナ'}
            </div>
          </div>

          {/* Audio Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleSpeak}
              disabled={playingAudio}
              className="p-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
            >
              {playingAudio ? (
                <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </button>
          </div>

          {/* Answer Section */}
          {!showAnswer ? (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">What is the romaji for this character?</p>
              <button
                onClick={() => setShowAnswer(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Show Answer
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="text-2xl font-medium text-foreground mb-2">
                  {currentItem.kana.romaji}
                </div>
                {currentItem.kana.pronunciation && (
                  <div className="text-sm text-muted-foreground">
                    Note: {currentItem.kana.pronunciation}
                  </div>
                )}
              </div>

              <p className="text-muted-foreground mb-4">Did you get it right?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleNext(false)}
                  className="px-4 py-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={() => handleNext(true)}
                  className="px-4 py-2 bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Score Display */}
        <div className="px-8 pb-4">
          <div className="text-center text-sm text-muted-foreground">
            Score: {correctCount} / {currentIndex + (showAnswer ? 1 : 0)}
          </div>
        </div>
      </div>
    </div>
  );
}