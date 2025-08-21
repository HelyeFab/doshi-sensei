'use client';

import { useState } from 'react';
import { useFeature } from '@/hooks/useFeature';
import { MoodBoard } from '@/types/moodBoard';
import ReadingRoutesGame from '@/components/games/ReadingRoutes/ReadingRoutesGame';

// Mock mood board data for demonstration
const mockMoodBoard: MoodBoard = {
  id: 'demo-board',
  title: 'Demo Kanji Board',
  emoji: '🛣️',
  jlpt: 'N5',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  description: 'Practice kanji readings with this demo board',
  kanji: [
    {
      char: '水',
      meaning: 'Water',
      readings: {
        on: ['スイ'],
        kun: ['みず']
      },
      examples: ['水曜日', '水泳', '水'],
      difficulty: 1
    },
    {
      char: '火',
      meaning: 'Fire',
      readings: {
        on: ['カ'],
        kun: ['ひ']
      },
      examples: ['火曜日', '火事', '火'],
      difficulty: 1
    },
    {
      char: '木',
      meaning: 'Tree, Wood',
      readings: {
        on: ['モク', 'ボク'],
        kun: ['き']
      },
      examples: ['木曜日', '木材', '木'],
      difficulty: 1
    },
    {
      char: '金',
      meaning: 'Gold, Money',
      readings: {
        on: ['キン'],
        kun: ['かね']
      },
      examples: ['金曜日', '金額', '金'],
      difficulty: 1
    },
    {
      char: '土',
      meaning: 'Earth, Soil',
      readings: {
        on: ['ド'],
        kun: ['つち']
      },
      examples: ['土曜日', '土地', '土'],
      difficulty: 1
    }
  ],
  createdAt: new Date(),
  isActive: true
};

export default function ReadingRoutesPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const { checkAndTrack, remaining, canUse, isLoading } = useFeature('reading_routes', {
    showToast: true,
    trackUsage: true
  });

  const handleStartGame = async () => {
    if (await checkAndTrack()) {
      setGameStarted(true);
    }
  };

  const handleGameComplete = () => {
    setGameStarted(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading Reading Routes...</p>
        </div>
      </div>
    );
  }

  if (gameStarted) {
    return (
      <ReadingRoutesGame
        board={mockMoodBoard}
        onComplete={handleGameComplete}
        remainingPlays={remaining}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          🛣️ Reading Routes
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Navigate through kanji readings in context! Choose the correct reading path for each kanji based on how it&apos;s used.
        </p>
      </div>

      {/* Game Preview */}
      <div className="bg-card border-2 border-border rounded-3xl p-8 mb-8 shadow-xl">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-4">How to Play</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                <span>Read the context (word or sentence) containing a highlighted kanji</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                <span>Choose the correct reading from the four options around the kanji</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                <span>Learn whether to use on&apos;yomi or kun&apos;yomi based on context</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</span>
                <span>Complete all questions to finish the route!</span>
              </li>
            </ul>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border-2 border-border">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold mb-2">水曜日</div>
                <div className="text-sm text-muted-foreground">Wednesday</div>
              </div>
              
              <div className="relative h-48 flex items-center justify-center">
                {/* Center kanji */}
                <div className="relative z-10 w-20 h-20 bg-card border-2 border-border rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold">水</span>
                </div>
                
                {/* Option examples */}
                <div className="absolute top-2 left-2 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm">
                  スイ
                </div>
                <div className="absolute top-2 right-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">
                  みず
                </div>
                <div className="absolute bottom-2 left-2 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm">
                  シン
                </div>
                <div className="absolute bottom-2 right-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">
                  かわ
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage info */}
      {remaining !== null && (
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            {remaining === -1 
              ? "Unlimited plays available" 
              : `${remaining} plays remaining today`}
          </p>
        </div>
      )}

      {/* Start button */}
      <div className="text-center">
        <button
          onClick={handleStartGame}
          disabled={!canUse || isLoading}
          className="px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {!canUse ? 'Access Required' : 'Start Reading Routes'}
        </button>
      </div>
    </div>
  );
}