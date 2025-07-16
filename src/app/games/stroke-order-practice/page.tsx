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
    color: 'bg-green-500/10 border-green-500/20',
  },
  {
    id: 'jlpt-n4',
    name: 'JLPT N4',
    description: 'Elementary level kanji',
    kanji: ['山', '川', '田', '人', '口', '車', '門', '間', '話', '言', '読', '聞', '書', '見', '行', '来'],
    color: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'common-radicals',
    name: 'Common Radicals',
    description: 'Essential kanji components',
    kanji: ['人', '手', '心', '日', '月', '木', '水', '火', '土', '金', '言', '糸', '肉', '貝', '車', '門'],
    color: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'numbers',
    name: 'Numbers',
    description: 'Learn to write numbers',
    kanji: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '円', '年', '月'],
    color: 'bg-yellow-500/10 border-yellow-500/20',
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
          <div className="mb-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-6xl mb-4">✍️</div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Master Kanji Stroke Order
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Learn to write kanji correctly by practicing stroke order.
                Click strokes in the right sequence to build muscle memory.
              </p>
              {remaining !== null && remaining !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {remaining > 0 ? `${remaining} practices remaining today` : 'No practices remaining today'}
                </p>
              )}

              {progress && progress.totalGamesPlayed > 0 && (
                <div className="flex gap-4 justify-center mt-4">
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

          {/* Practice Sets */}
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {PRACTICE_SETS.map((set) => (
              <button
                key={set.id}
                className={`text-left transition-all hover:scale-[1.02] hover:shadow-lg rounded-lg overflow-hidden ${set.color}`}
                onClick={() => handleSelectSet(set.id)}
              >
                <Card className="h-full border-0">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{set.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {set.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Brain className="h-4 w-4" />
                      <span>{set.kanji.length} kanji</span>
                      {progress && progress.highScores[set.id] && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span>High: {progress.highScores[set.id].toLocaleString()}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {set.kanji.slice(0, 8).map((kanji, idx) => (
                        <span
                          key={idx}
                          className="text-lg font-bold opacity-60"
                        >
                          {kanji}
                        </span>
                      ))}
                      {set.kanji.length > 8 && (
                        <span className="text-sm opacity-40">
                          +{set.kanji.length - 8} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {/* Mood Boards Section */}
          {!boardsLoading && filteredBoards.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-6">
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
                      className="group relative overflow-hidden rounded-lg border-2 border-border bg-card hover:border-primary transition-all duration-200 hover:shadow-lg"
                    >
                      {/* Background gradient */}
                      <div
                        className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                        style={{ background: board.background }}
                      />

                      <div className="relative p-6">
                        {/* Emoji and Title */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="text-4xl">{board.emoji}</div>
                          <div className="text-left flex-1">
                            <h4 className="text-lg font-semibold text-foreground">{board.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {kanjiCount} kanji • {board.jlpt}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {board.description}
                        </p>

                        {/* High Score if exists */}
                        {progress && progress.highScores[`mood-${board.id}`] && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-yellow-500" />
                                High Score
                              </span>
                              <span className="font-semibold">{progress.highScores[`mood-${board.id}`].toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">How to Play</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">See the Kanji</h4>
                      <p className="text-sm text-muted-foreground">
                        A kanji appears with stroke guides
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Click Strokes</h4>
                      <p className="text-sm text-muted-foreground">
                        Click strokes in the correct order
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Get Feedback</h4>
                      <p className="text-sm text-muted-foreground">
                        Green means correct, red means try again
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Earn Points</h4>
                      <p className="text-sm text-muted-foreground">
                        Score points for speed and accuracy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
