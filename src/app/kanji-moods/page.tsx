'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllMoodBoards } from '@/utils/moodBoardData';
import { getAllProgress } from '@/utils/moodBoardProgress';
import { PageHeader } from '@/components/PageHeader';
import MoodBoardCard from '@/components/kanji-moods/MoodBoardCard';
import { MoodBoard, MoodBoardsProgress } from '@/types/moodBoard';

export default function KanjiMoodsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [progress, setProgress] = useState<MoodBoardsProgress>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load mood boards and progress
    const loadData = () => {
      try {
        const allBoards = getAllMoodBoards();
        const allProgress = getAllProgress();

        setBoards(allBoards);
        setProgress(allProgress);
      } catch (error) {
        console.error('Error loading mood boards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleBoardClick = (boardId: string) => {
    router.push(`/kanji-moods/${boardId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 min-h-screen">
        <PageHeader title="Kanji Mood Boards" showBackButton={true} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-muted-foreground">Loading mood boards...</p>
          </div>
        </div>
      </div>
    );
  }

  const completedBoards = boards.filter(board =>
    progress[board.id]?.progressPercentage === 100
  ).length;

  return (
    <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
      <PageHeader title="Kanji Mood Boards" showBackButton={true} />

      {/* Hero Section */}
      <div className="mb-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Learn Kanji by Theme
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Discover kanji organized by meaningful themes and contexts.
            Each mood board contains related kanji that tell a story together,
            making them easier to remember and understand.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{boards.length}</div>
              <div className="text-sm text-muted-foreground">Total Boards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedBoards}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {boards.reduce((sum, board) => sum + board.kanji.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Kanji</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(progress).reduce((sum, p) => sum + p.learnedKanji.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Learned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Boards Grid */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-6">
          Available Mood Boards
        </h3>

        {boards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <MoodBoardCard
                key={board.id}
                board={board}
                progress={progress[board.id]}
                onClick={handleBoardClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No mood boards available
            </h3>
            <p className="text-muted-foreground">
              Mood boards are being prepared. Check back soon!
            </p>
          </div>
        )}
      </div>

      {/* Getting Started Guide */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span>🚀</span>
            How to Use Mood Boards
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Choose a Theme</h4>
                  <p className="text-sm text-muted-foreground">
                    Pick a mood board that interests you - Nature, Daily Life, or Numbers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Study Each Kanji</h4>
                  <p className="text-sm text-muted-foreground">
                    Tap kanji cards to see readings and examples. Find connections between them.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Mark as Learned</h4>
                  <p className="text-sm text-muted-foreground">
                    Click the circle button when you've mastered a kanji
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Complete the Board</h4>
                  <p className="text-sm text-muted-foreground">
                    Learn all 5 kanji to complete the theme and unlock achievements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
