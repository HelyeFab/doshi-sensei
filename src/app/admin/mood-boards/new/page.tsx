'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MoodBoardEditor } from '@/components/admin/mood-boards/MoodBoardEditor';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { useState } from 'react';

export default function NewMoodBoardPage() {
  const router = useRouter();
  const { createMoodBoard } = useMoodBoards();
  const { success, error: showError } = useAdminNotifications();
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async (moodBoardData: any) => {
    try {
      setIsCreating(true);
      
      await createMoodBoard({
        title: moodBoardData.title,
        emoji: moodBoardData.emoji,
        jlpt: moodBoardData.jlpt,
        background: moodBoardData.background,
        description: moodBoardData.description,
        kanji: moodBoardData.kanji || [],
        isActive: moodBoardData.isActive ?? true,
        sortOrder: moodBoardData.sortOrder ?? 0,
      });
      
      success('Mood Board Created', `"${moodBoardData.title}" has been created successfully`);
      router.push('/admin/mood-boards');
    } catch (err) {
      console.error('Error creating mood board:', err);
      showError('Failed to Create Mood Board', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/mood-boards');
  };

  return (
    <AdminLayout title="Create New Mood Board">
      <div className="space-y-6">
        {/* Page header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Create New Mood Board
          </h2>
          <p className="text-muted-foreground">
            Create a new mood board with kanji characters for learners
          </p>
        </div>

        <MoodBoardEditor
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isCreating}
        />
      </div>
    </AdminLayout>
  );
}