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
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Learning Progress</span>
            <span>{currentIndex + 1} / {totalWords}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Audio Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={playWordAudio}
          className="w-20 h-20 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-lg"
          aria-label="Play audio"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </div>

      {/* Word Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-4">
        <div className="text-center mb-4">
          {word.kanji && (
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{word.kanji}</h2>
          )}
          <p className="text-xl text-gray-700 mb-1">
            {showReading ? word.kana : (
              <button
                onClick={() => setShowReading(true)}
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Show reading
              </button>
            )}
          </p>
          <p className="text-lg text-gray-600">{word.meaning}</p>
          {word.partOfSpeech && (
            <p className="text-sm text-gray-500 mt-1">({word.partOfSpeech})</p>
          )}
        </div>

        {/* Example Sentence */}
        {word.example && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-600">Example:</p>
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
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Play example audio"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            </div>
            <p className="text-lg text-gray-900 mb-1">{word.example.japanese}</p>
            {word.example.reading && (
              <p className="text-sm text-gray-600 mb-1">{word.example.reading}</p>
            )}
            <p className="text-sm text-gray-700">{word.example.english}</p>
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
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-900 mb-2">Try these:</p>
        <ul className="text-sm text-blue-800 space-y-1">
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
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
          disabled={isMarkedDifficult}
        >
          {isMarkedDifficult ? '⭐ Marked difficult' : '⭐ Mark difficult'}
        </button>
        
        <button
          onClick={handleMarkLearned}
          className={`py-3 px-4 rounded-lg transition-colors ${
            isMarkedLearned
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isMarkedLearned ? '✅ Learned' : '○ Mark as learned'}
        </button>
      </div>
      
      <button
        onClick={handleNext}
        className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
      >
        Next →
      </button>
    </div>
  );
}