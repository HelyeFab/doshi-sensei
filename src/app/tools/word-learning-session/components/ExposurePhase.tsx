'use client';

import { useState, useEffect } from 'react';
import { WordItem } from '../types';
import { learnedWordsStorage } from '../services/learnedWordsStorage';
import { useAuth } from '@/contexts/AuthContext';
import { TTSManager } from '@/utils/tts';

interface ExposurePhaseProps {
  word: WordItem;
  lessonId: string;
  onComplete: () => void;
  onStruggle: () => void;
  isLearned?: boolean;
  currentIndex?: number;
  totalWords?: number;
}

export default function ExposurePhase({ word, lessonId, onComplete, onStruggle, isLearned = false, currentIndex = 0, totalWords = 0 }: ExposurePhaseProps) {
  const { user } = useAuth();
  const [showReading, setShowReading] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isMarkedDifficult, setIsMarkedDifficult] = useState(false);
  const [isMarkedLearned, setIsMarkedLearned] = useState(isLearned);

  // Initialize TTS on mount
  useEffect(() => {
    TTSManager.initialize();
  }, []);

  useEffect(() => {
    // Reset state for new word
    setShowReading(false);
    setHasPlayedAudio(false);
    setIsMarkedDifficult(false);
    setIsMarkedLearned(isLearned);
    
    // Auto-play audio on load
    if (word.audio) {
      playWordAudio();
    }
  }, [word.id, isLearned]);

  const playWordAudio = async () => {
    try {
      // Use the proper TTS system
      // For vocabulary words, use Google TTS (short audio)
      await TTSManager.speak(
        word.kana || word.kanji || '', 
        {
          voice: 'female',
          provider: 'google',
          context: 'vocabulary'
        }
      );
      setHasPlayedAudio(true);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const handleMarkDifficult = () => {
    setIsMarkedDifficult(true);
    onStruggle();
  };

  const handleMarkLearned = async () => {
    const userId = user?.uid || 'guest';
    if (isMarkedLearned) {
      // Unmark as learned
      await learnedWordsStorage.unmarkWordAsLearned(userId, word.id, lessonId);
      setIsMarkedLearned(false);
    } else {
      // Mark as learned
      await learnedWordsStorage.markWordAsLearned(userId, word.id, lessonId);
      setIsMarkedLearned(true);
    }
  };

  const handleNext = () => {
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      {totalWords > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Learning Progress</span>
            <span className="text-muted-foreground">{currentIndex + 1} / {totalWords}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Audio Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={playWordAudio}
          className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors shadow-lg"
          aria-label="Play audio"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </div>

      {/* Word Card */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
        <div className="text-center mb-4">
          {word.kanji && (
            <h2 className="text-3xl font-bold text-foreground mb-2">{word.kanji}</h2>
          )}
          <p className="text-xl text-foreground/80 mb-1">
            {showReading ? word.kana : (
              <button
                onClick={() => setShowReading(true)}
                className="text-primary hover:text-primary/80 underline"
              >
                Show reading
              </button>
            )}
          </p>
          <p className="text-lg text-muted-foreground">{word.meaning}</p>
          {word.partOfSpeech && (
            <p className="text-sm text-muted-foreground mt-1">({word.partOfSpeech})</p>
          )}
        </div>

        {/* Example Sentence */}
        {word.example && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Example:</p>
              <button
                onClick={async () => {
                  try {
                    // Use ElevenLabs for sentences
                    await TTSManager.speak(
                      word.example.japanese,
                      {
                        voice: 'female',
                        provider: 'elevenlabs',
                        context: 'vocabulary'
                      }
                    );
                  } catch (error) {
                    console.error('Failed to play example audio:', error);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Play example audio"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            </div>
            <p className="text-lg text-foreground mb-1">{word.example.japanese}</p>
            {word.example.reading && (
              <p className="text-sm text-muted-foreground mb-1">{word.example.reading}</p>
            )}
            <p className="text-sm text-foreground/80">{word.example.english}</p>
          </div>
        )}

        {/* Visual Aid (if available) */}
        {word.image && (
          <div className="mt-4">
            <img 
              src={word.image} 
              alt={word.meaning}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Action Prompts */}
      <div className="bg-primary/10 rounded-lg p-4 mb-4">
        <p className="text-sm text-foreground font-medium mb-2">Try these:</p>
        <ul className="text-sm text-foreground/80 space-y-1">
          <li>• Say the word aloud</li>
          <li>• Shadow the example sentence</li>
          <li>• Visualize using this word in context</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={handleMarkDifficult}
          className={`py-3 px-4 rounded-lg transition-colors ${
            isMarkedDifficult
              ? 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/30'
              : 'bg-card text-foreground border border-border hover:bg-muted'
          }`}
          disabled={isMarkedDifficult}
        >
          {isMarkedDifficult ? '⭐ Marked difficult' : '⭐ Mark difficult'}
        </button>
        
        <button
          onClick={handleMarkLearned}
          className={`py-3 px-4 rounded-lg transition-colors ${
            isMarkedLearned
              ? 'bg-green-500/10 text-green-700 border border-green-500/30'
              : 'bg-card text-foreground border border-border hover:bg-muted'
          }`}
        >
          {isMarkedLearned ? '✅ Learned' : '○ Mark as learned'}
        </button>
      </div>
      
      <button
        onClick={handleNext}
        className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Next →
      </button>
    </div>
  );
}