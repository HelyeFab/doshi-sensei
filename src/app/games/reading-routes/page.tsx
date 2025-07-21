'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { getAllProgress } from '@/utils/moodBoardProgress';
import { MoodBoardsProgress } from '@/types/moodBoard';
import { useAccessWithModals } from '@/hooks/useAccessWithModals';
import { useFeature } from '@/hooks/useFeature';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

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
          <PageHeader title="Reading Routes" showBackButton={true} backHref="/games" />
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
      <MobileAwareContainer className="container mx-auto px-4 py-8 min-h-screen">
        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Page Header */}
          <PageHeader title="Reading Routes" showBackButton={true} backHref="/games" />

          {/* Hero Section */}
          <div className="mb-12">
            <div className="text-center max-w-3xl mx-auto">
              <div className="relative inline-block mb-6">
                <div className="text-7xl animate-pulse">🛤️</div>
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl rounded-full opacity-60"></div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                Master Kanji Readings
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl mx-auto">
                Navigate through interactive reading challenges to master when to use <span className="font-semibold text-pink-600">on'yomi</span> vs <span className="font-semibold text-blue-600">kun'yomi</span> readings in different contexts.
              </p>
              {remaining !== null && remaining !== undefined && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <span className="text-sm font-medium text-foreground">
                    {remaining > 0 ? (
                      <>
                        <span className="text-primary font-bold">{remaining}</span> plays remaining today
                      </>
                    ) : (
                      <span className="text-destructive">No plays remaining today</span>
                    )}
                  </span>
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
                      <h4 className="font-semibold text-foreground text-lg">See Context</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        A kanji appears in a word or sentence
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-lg">Choose Path</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select the correct reading from multiple paths
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
                      <h4 className="font-semibold text-foreground text-lg">Learn Rules</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Understand when to use each reading type
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-lg">Track Progress</h4>
                      <p className="text-sm text-muted-foreground mt-1">
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
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
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
                          {board.kanji.length} kanji • {board.jlpt}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2 min-h-[2.5rem]">
                        {board.description}
                      </p>

                      {/* Progress or Start Button */}
                      {progressPercent > 0 ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span className="font-medium">Progress</span>
                            <span className="font-bold">{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
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
        </main>
      </MobileAwareContainer>
    </>
  );
}
