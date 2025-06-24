'use client';

import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MoodBoardEditor } from '@/components/admin/mood-boards/MoodBoardEditor';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { useState, useEffect } from 'react';
import { MoodBoard } from '@/types/moodBoard';

export default function EditMoodBoardPage() {
  const params = useParams();
  const router = useRouter();
  const { moodBoards, updateMoodBoard, loading } = useMoodBoards();
  const { success, error: showError } = useAdminNotifications();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBoard, setCurrentBoard] = useState<MoodBoard | null>(null);

  const boardId = params.id as string;

  useEffect(() => {
    const board = moodBoards.find(b => b.id === boardId);
    if (board) {
      setCurrentBoard(board);
    } else if (!loading && moodBoards.length > 0) {
      // Board not found after loading
      setError('Mood board not found');
    }
  }, [boardId, moodBoards, loading]);

  const handleSave = async (moodBoardData: any) => {
    try {
      setIsUpdating(true);
      setError(null);
      
      await updateMoodBoard(boardId, {
        title: moodBoardData.title,
        emoji: moodBoardData.emoji,
        jlpt: moodBoardData.jlpt,
        background: moodBoardData.background,
        description: moodBoardData.description,
        kanji: moodBoardData.kanji || [],
        isActive: moodBoardData.isActive ?? true,
        sortOrder: moodBoardData.sortOrder ?? 0,
      });
      
      success('Mood Board Updated', `"${moodBoardData.title}" has been updated successfully`);
      router.push('/admin/mood-boards');
    } catch (err) {
      console.error('Error updating mood board:', err);
      showError('Failed to Update Mood Board', err instanceof Error ? err.message : 'An unexpected error occurred');
      setError(err instanceof Error ? err.message : 'Failed to update mood board');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/mood-boards');
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Mood Board">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading mood board...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !currentBoard) {
    return (
      <AdminLayout title="Edit Mood Board">
        <div className="rounded-lg bg-destructive/10 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            {error}
          </h2>
          <button
            onClick={() => router.push('/admin/mood-boards')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Mood Boards
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Mood Board">
      <div className="space-y-6">
        {/* Page header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Edit Mood Board
          </h2>
          <p className="text-muted-foreground">
            Update the mood board details and kanji characters
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error updating mood board</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {currentBoard && (
          <MoodBoardEditor
            initialData={currentBoard}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isUpdating}
          />
        )}
      </div>
    </AdminLayout>
  );
}