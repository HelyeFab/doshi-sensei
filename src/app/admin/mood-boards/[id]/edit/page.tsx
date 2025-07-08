'use client';

import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MoodBoardEditor } from '@/components/admin/mood-boards/MoodBoardEditor';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { useState, useEffect } from 'react';
import { MoodBoard } from '@/types/moodBoard';
import { strings } from '@/config/strings';

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
      setError(strings.admin.moodBoards.boardNotFound);
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

      success(strings.admin.moodBoards.moodBoardUpdated, `"${moodBoardData.title}" has been updated successfully`);
      router.push('/admin/mood-boards');
    } catch (err) {
      console.error('Error updating mood board:', err);
      showError(strings.admin.moodBoards.failedToUpdate, err instanceof Error ? err.message : strings.admin.moodBoards.unexpectedError);
      setError(err instanceof Error ? err.message : strings.admin.moodBoards.failedToUpdateBoard);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/mood-boards');
  };

  if (loading) {
    return (
      <AdminLayout title={strings.admin.moodBoards.editBoard}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{strings.admin.moodBoards.loadingBoard}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !currentBoard) {
    return (
      <AdminLayout title={strings.admin.moodBoards.editBoard}>
        <div className="rounded-lg bg-destructive/10 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            {error}
          </h2>
          <button
            onClick={() => router.push('/admin/mood-boards')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {strings.admin.moodBoards.backToMoodBoards}
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={strings.admin.moodBoards.editBoard}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            {strings.admin.moodBoards.editBoard}
          </h2>
          <p className="text-muted-foreground">
            {strings.admin.moodBoards.editBoardDescription}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">{strings.admin.moodBoards.errorUpdating}</p>
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
