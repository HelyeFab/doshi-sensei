'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import MoodBoard from '@/components/kanji-moods/MoodBoard';
import { MoodBoard as MoodBoardType } from '@/types/moodBoard';
import { Analytics } from '@/utils/analytics';
import { useAuth } from '@/contexts/AuthContext';

export default function MoodBoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId as string;
  const { user } = useAuth();
  const { moodBoards, loading: boardsLoading } = useMoodBoards();

  const [board, setBoard] = useState<MoodBoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!boardsLoading) {
      const loadBoard = () => {
        try {
          if (!boardId) {
            setNotFound(true);
            setLoading(false);
            return;
          }

          // Find the board in Firebase data
          const boardData = moodBoards.find(b => b.id === boardId);
          
          if (boardData && boardData.isActive !== false) {
            setBoard(boardData);
            
            // Track mood board view analytics
            Analytics.trackMoodBoardView(user?.uid, {
              moodBoardId: boardId,
              boardTitle: boardData.title,
              jlptLevel: boardData.jlpt,
              kanjiCount: boardData.kanji?.length || 0,
              viewedAt: new Date().toISOString(),
            });
          } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error loading mood board:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

      loadBoard();
    }
  }, [boardId, boardsLoading, moodBoards, user?.uid]);

  const handleBack = () => {
    router.push('/kanji-moods');
  };

  // Loading state
  if (loading || boardsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading mood board...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound || !board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Mood Board Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The mood board you're looking for doesn't exist or has been moved.
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Mood Boards
          </button>
        </div>
      </div>
    );
  }

  // Render the mood board
  return <MoodBoard board={board} onBack={handleBack} />;
}
