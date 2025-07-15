'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { getAllProgress } from '@/utils/moodBoardProgress';
import { MoodBoardsProgress } from '@/types/moodBoard';
import { useAccessWithModals } from '@/hooks/useAccessWithModals';
import { useFeature } from '@/hooks/useFeature';

export default function ReadingRoutesPage() {
  const router = useRouter();
  const { moodBoards, loading } = useMoodBoards();
  const [progress, setProgress] = useState<MoodBoardsProgress>({});
  const { checkAndTrack, AccessModals } = useAccessWithModals();
  const { feature, access, remaining } = useFeature('reading_routes');

  useEffect(() => {
    const loadProgress = () => {
      try {
        const allProgress = getAllProgress();
        setProgress(allProgress);
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    };

    loadProgress();
  }, []);

  const handleBoardSelect = async (boardId: string) => {
    // Check access using the entitlement system with modals
    const canPlay = await checkAndTrack('reading_routes');

    if (canPlay) {
      router.push(`/games/reading-routes/${boardId}`);
    }
    // If no access, modal is shown automatically by checkAndTrack
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pb-20">
          <PageHeader title="Reading Routes" showBackButton={true} />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-muted-foreground">Loading mood boards...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeBoards = moodBoards.filter(board => board.isActive !== false);

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
          <PageHeader title="Reading Routes" showBackButton={true} />

          {/* Hero Section */}
          <div className="mb-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-6xl mb-4">🛤️</div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Master Kanji Readings
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Select a mood board to practice kanji readings through our interactive path-selection game.
                Learn when to use on'yomi vs kun'yomi readings in different contexts.
              </p>
              {remaining !== null && remaining !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {remaining > 0 ? `${remaining} plays remaining today` : 'No plays remaining today'}
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">How to Play</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">See Context</h4>
                      <p className="text-sm text-muted-foreground">
                        A kanji appears in a word or sentence
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Choose Path</h4>
                      <p className="text-sm text-muted-foreground">
                        Select the correct reading from multiple paths
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
                      <h4 className="font-medium text-foreground">Learn Rules</h4>
                      <p className="text-sm text-muted-foreground">
                        Understand when to use each reading type
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Track Progress</h4>
                      <p className="text-sm text-muted-foreground">
                        Master all readings for each kanji
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mood Board Selection */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Select a Mood Board
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBoards.map((board) => {
                const boardProgress = progress[board.id];
                const progressPercent = boardProgress?.progressPercentage || 0;

                return (
                  <button
                    key={board.id}
                    onClick={() => handleBoardSelect(board.id)}
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
                            {board.kanji.length} kanji • {board.jlpt}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {board.description}
                      </p>

                      {/* Progress */}
                      {progressPercent > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
