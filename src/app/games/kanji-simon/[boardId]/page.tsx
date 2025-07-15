'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { MoodBoard as MoodBoardType } from '@/types/moodBoard';
import { useFeature } from '@/hooks/useFeature';
import KanjiSimonGameWrapper from '@/components/games/KanjiSimon/KanjiSimonGameWrapper';

export default function KanjiSimonGamePage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId as string;
  const { moodBoards, loading: boardsLoading } = useMoodBoards();
  const { feature, access, remaining } = useFeature('kanji_simon');

  const [board, setBoard] = useState<MoodBoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    const loadBoard = async () => {
      // Access is already checked on the selection page
      setAccessChecked(true);

      // Load board data
      if (!boardsLoading && boardId) {
        const boardData = moodBoards.find(b => b.id === boardId);

        if (boardData && boardData.isActive !== false) {
          setBoard(boardData);
        } else {
          // Board not found
          router.push('/games/kanji-simon');
        }

        setLoading(false);
      }
    };

    loadBoard();
  }, [boardId, boardsLoading, moodBoards, router]);

  const handleBack = () => {
    router.push('/games/kanji-simon');
  };

  const handleComplete = () => {
    // Game completed, navigate back to selection
    router.push('/games/kanji-simon');
  };

  // Loading state
  if (loading || boardsLoading || !accessChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  // Board not found
  if (!board) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Board Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The mood board you're looking for doesn't exist.
          </p>
          <button
            onClick={() => router.push('/games/kanji-simon')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Board Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
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
            title={`Kanji Simon: ${board.title}`}
            showBackButton={true}
            onBack={handleBack}
          />

          <KanjiSimonGameWrapper
            board={board}
            onComplete={handleComplete}
            remainingPlays={remaining}
          />
        </main>
      </div>
    </>
  );
}
