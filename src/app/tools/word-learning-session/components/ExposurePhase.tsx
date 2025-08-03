'use client';

import { useState, useEffect } from 'react';
import { WordItem } from '../types';
import { playAudio } from '../utils/audio';

interface ExposurePhaseProps {
  word: WordItem;
  onComplete: () => void;
  onStruggle: () => void;
}

export default function ExposurePhase({ word, onComplete, onStruggle }: ExposurePhaseProps) {
  const [showReading, setShowReading] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isMarkedDifficult, setIsMarkedDifficult] = useState(false);

  useEffect(() => {
    // Reset state for new word
    setShowReading(false);
    setHasPlayedAudio(false);
    setIsMarkedDifficult(false);
    
    // Auto-play audio on load
    if (word.audio) {
      playWordAudio();
    }
  }, [word.id]);

  const playWordAudio = async () => {
    if (word.audio) {
      try {
        await playAudio(word.audio);
        setHasPlayedAudio(true);
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    } else if (word.kana) {
      // Use TTS as fallback
      try {
        const audio = new Audio(`/api/tts?text=${encodeURIComponent(word.kana)}&lang=ja`);
        await audio.play();
        setHasPlayedAudio(true);
      } catch (error) {
        console.error('Failed to play TTS:', error);
      }
    }
  };

  const handleMarkDifficult = () => {
    setIsMarkedDifficult(true);
    onStruggle();
  };

  const handleNext = () => {
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto">
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
            <p className="text-sm text-gray-600 mb-1">Example:</p>
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
      <div className="flex gap-3">
        <button
          onClick={handleMarkDifficult}
          className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
            isMarkedDifficult
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
          disabled={isMarkedDifficult}
        >
          {isMarkedDifficult ? '⭐ Marked for review' : '⭐ Mark as difficult'}
        </button>
        
        <button
          onClick={handleNext}
          className="flex-1 py-3 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}