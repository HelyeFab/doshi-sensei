'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Trophy, Star, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import StrokeOrderGame from './components/StrokeOrderGame';
import { useAccessWithModals } from '@/hooks/useAccessWithModals';
import { useFeature } from '@/hooks/useFeature';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { MoodBoard as MoodBoardType } from '@/types/moodBoard';

const PRACTICE_SETS = [
  {
    id: 'jlpt-n5',
    name: 'JLPT N5',
    description: 'Basic kanji for beginners',
    kanji: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '日', '月', '火', '水', '木', '金', '土'],
  },
  {
    id: 'jlpt-n4',
    name: 'JLPT N4',
    description: 'Elementary level kanji',
    kanji: ['山', '川', '田', '人', '口', '車', '門', '間', '話', '言', '読', '聞', '書', '見', '行', '来'],
  },
  {
    id: 'common-radicals',
    name: 'Common Radicals',
    description: 'Essential kanji components',
    kanji: ['人', '手', '心', '日', '月', '木', '水', '火', '土', '金', '言', '糸', '肉', '貝', '車', '門'],
  },
  {
    id: 'numbers',
    name: 'Numbers',
    description: 'Learn to write numbers',
    kanji: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '円', '年', '月'],
  },
];

interface StrokeOrderProgress {
  highScores: { [setId: string]: number };
  kanjiMastery: { [kanji: string]: { attempts: number; successes: number; bestTime: number } };
  totalGamesPlayed: number;
  totalKanjiPracticed: number;
  lastPlayed: number;
}

export default function StrokeOrderPracticePage() {
  const router = useRouter();
  const [selectedSet, setSelectedSet] = useState<any>(null);
  const [showGame, setShowGame] = useState(false);
  const [progress, setProgress] = useState<StrokeOrderProgress | null>(null);
  const { checkAndTrack, AccessModals } = useAccessWithModals();
  const { feature, access, remaining } = useFeature('stroke_order_practice');
  const { moodBoards, loading: boardsLoading } = useMoodBoards();
  const [filteredBoards, setFilteredBoards] = useState<MoodBoardType[]>([]);
  
  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    // Filter active boards with kanji
    if (moodBoards && moodBoards.length > 0) {
      const activeBoardsWithKanji = moodBoards.filter(board => {
        // Check if board has kanji items
        const hasKanji = board.kanji && board.kanji.length > 0;
        
        // Default to active if status is not set
        const isActive = board.isActive !== false;
        
        return hasKanji && isActive;
      });
      
      setFilteredBoards(activeBoardsWithKanji);
    }
  }, [moodBoards]);

  const loadProgress = async () => {
    try {
      const savedProgressStr = localStorage.getItem('strokeOrderProgress');
      if (savedProgressStr) {
        const savedProgress = JSON.parse(savedProgressStr) as StrokeOrderProgress;
        setProgress(savedProgress);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const handleSelectSet = async (setId: string) => {
    const canAccess = await checkAndTrack('stroke_order_practice');
    if (canAccess) {
      setSelectedSet(setId);
      setShowGame(true);
    }
  };

  const handleSelectMoodBoard = async (boardId: string) => {
    const canAccess = await checkAndTrack('stroke_order_practice');
    if (canAccess) {
      const board = filteredBoards.find(b => b.id === boardId);
      if (board) {
        let kanjiItems: string[] = [];
        
        // Handle both old 'kanji' array and new 'items' array structure
        if (board.items && board.items.length > 0) {
          kanjiItems = board.items
            .filter(item => item.type === 'kanji')
            .map(item => item.content);
        } else if (board.kanji && board.kanji.length > 0) {
          // Extract the character from KanjiItem objects
          console.log('Board kanji:', board.kanji);
          kanjiItems = board.kanji.map(k => {
            if (typeof k === 'string') return k;
            const char = k.char || k.character || k.kanji || '';
            console.log('Extracted char:', char, 'from:', k);
            return char;
          }).filter(k => k !== '');
        }
        
        console.log('Final kanjiItems:', kanjiItems);
        
        const moodBoardSet = {
          id: `mood-${boardId}`,
          name: board.title,
          description: board.description || 'Mood board collection',
          kanji: kanjiItems,
          color: 'bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20',
        };
        
        setSelectedSet(moodBoardSet);
        setShowGame(true);
      }
    }
  };

  const handleBackToSets = () => {
    setShowGame(false);
    setSelectedSet(null);
  };

  const selectedPracticeSet = typeof selectedSet === 'string' 
    ? PRACTICE_SETS.find(set => set.id === selectedSet)
    : selectedSet;

  if (showGame && selectedPracticeSet) {
    return (
      <StrokeOrderGame
        practiceSet={selectedPracticeSet}
        onBack={handleBackToSets}
      />
    );
  }

  return (
    <>
      <AccessModals />

      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Page Header */}
          <PageHeader
            title="Stroke Order Practice"
            showBackButton={true}
            onBack={() => router.push('/games')}
          />

          {/* Hero Section */}
          <div className="mb-12">
            <div className="text-center max-w-3xl mx-auto">
              <div className="relative inline-block mb-6">
                <div className="text-7xl animate-pulse">✍️</div>
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl rounded-full opacity-60"></div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                Master Kanji Stroke Order
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl mx-auto">
                Learn to write kanji correctly by practicing stroke order.
                Click strokes in the right sequence to build muscle memory.
              </p>
              {remaining !== null && remaining !== undefined && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                  <span className="text-sm font-medium text-foreground">
                    {remaining > 0 ? (
                      <>
                        <span className="text-primary font-bold">{remaining}</span> practices remaining today
                      </>
                    ) : (
                      <span className="text-destructive">No practices remaining today</span>
                    )}
                  </span>
                </div>
              )}

              {progress && progress.totalGamesPlayed > 0 && (
                <div className="flex gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">
                      {progress.totalGamesPlayed} games played
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {progress.totalKanjiPracticed} kanji practiced
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-2xl p-8 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-center text-foreground mb-8">How to Play</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-lg">See the Kanji</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        A kanji appears with stroke guides
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-lg">Click Strokes</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click strokes in the correct order
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-lg">Get Feedback</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Green means correct, red means try again
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-lg">Earn Points</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Score points for speed and accuracy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Practice Sets */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              Practice Sets
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {PRACTICE_SETS.map((set) => {
                const setColor = {
                  'jlpt-n5': 'from-green-400 to-green-600',
                  'jlpt-n4': 'from-blue-400 to-blue-600',
                  'common-radicals': 'from-purple-400 to-purple-600',
                  'numbers': 'from-yellow-400 to-yellow-600'
                }[set.id] || 'from-gray-400 to-gray-600';

                return (
                  <button
                    key={set.id}
                    className="group relative overflow-hidden rounded-2xl bg-card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => handleSelectSet(set.id)}
                  >
                    {/* Background with subtle gradient */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-br ${setColor} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    <div className="relative p-6">
                      {/* Title and Description */}
                      <div className="text-left mb-4">
                        <h4 className="text-xl font-bold text-foreground mb-1">{set.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {set.description}
                        </p>
                      </div>

                      {/* Kanji count and high score */}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <Brain className="h-4 w-4" />
                          <span className="font-medium">{set.kanji.length} kanji</span>
                        </div>
                        {progress && progress.highScores[set.id] && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <div className="flex items-center gap-1.5">
                              <Zap className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">High: {progress.highScores[set.id].toLocaleString()}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Kanji preview */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {set.kanji.slice(0, 8).map((kanji, idx) => (
                          <span
                            key={idx}
                            className="text-2xl font-bold text-foreground/80 group-hover:text-foreground transition-colors"
                          >
                            {kanji}
                          </span>
                        ))}
                        {set.kanji.length > 8 && (
                          <span className="text-sm text-muted-foreground font-medium ml-1">
                            +{set.kanji.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover border effect */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-primary/30 transition-colors duration-300" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Boards Section */}
          {!boardsLoading && filteredBoards.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
                Select a Mood Board
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBoards.map((board) => {
                  const progressPercent = 0; // TODO: Add progress tracking for mood boards if needed
                  
                  // Handle both old and new data structures
                  let kanjiCount = 0;
                  
                  if (board.items && board.items.length > 0) {
                    kanjiCount = board.items.filter(item => item.type === 'kanji').length;
                  } else if (board.kanji && board.kanji.length > 0) {
                    kanjiCount = board.kanji.length;
                  }

                  return (
                    <button
                      key={board.id}
                      onClick={() => handleSelectMoodBoard(board.id)}
                      className="group relative overflow-hidden rounded-2xl bg-card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                      {/* Background with subtle gradient */}
                      <div 
                        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
                        style={{ 
                          background: `linear-gradient(135deg, ${board.background}, transparent)` 
                        }}
                      />

                      <div className="relative p-6">
                        {/* Emoji and Title */}
                        <div className="text-center mb-4">
                          <div className="text-5xl mb-3">{board.emoji}</div>
                          <h4 className="text-xl font-bold text-foreground mb-1">{board.title}</h4>
                          <p className="text-sm text-muted-foreground font-medium">
                            {kanjiCount} kanji • {board.jlpt}
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2 min-h-[2.5rem]">
                          {board.description}
                        </p>

                        {/* High Score or Start Practice Button */}
                        {progress && progress.highScores[`mood-${board.id}`] ? (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <span className="flex items-center gap-1 font-medium">
                                <Zap className="h-3 w-3 text-yellow-500" />
                                High Score
                              </span>
                              <span className="font-bold">{progress.highScores[`mood-${board.id}`].toLocaleString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium group-hover:bg-primary/20 transition-colors">
                              <span>Start Practice</span>
                              <span className="text-lg">→</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hover border effect */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-primary/30 transition-colors duration-300" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
