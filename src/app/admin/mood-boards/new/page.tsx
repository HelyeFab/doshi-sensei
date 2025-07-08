'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MoodBoardEditor } from '@/components/admin/mood-boards/MoodBoardEditor';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { useState } from 'react';
import { strings } from '@/config/strings';

function NewMoodBoardContent() {
  const router = useRouter();
  const { createMoodBoard } = useMoodBoards();
  const [isCreating, setIsCreating] = useState(false);

  // Use a try-catch to handle the notification hook more defensively
  let notifications: any = { success: () => { }, error: () => { } };
  try {
    notifications = useAdminNotifications();
  } catch (e) {
    // If notifications aren't available, we'll use console logging as fallback
    console.warn('Notifications not available:', e);
  }

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

      if (notifications.success) {
        notifications.success(strings.admin.moodBoards.moodBoardCreated, `"${moodBoardData.title}" has been created successfully`);
      }
      router.push('/admin/mood-boards');
    } catch (err) {
      console.error('Error creating mood board:', err);
      if (notifications.error) {
        notifications.error(strings.admin.moodBoards.failedToCreate, err instanceof Error ? err.message : strings.admin.moodBoards.unexpectedError);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/mood-boards');
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {strings.admin.moodBoards.createBoard}
        </h2>
        <p className="text-muted-foreground">
          {strings.admin.moodBoards.createBoardDescription}
        </p>
      </div>

      <MoodBoardEditor
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isCreating}
      />
    </div>
  );
}

export default function NewMoodBoardPage() {
  return (
    <AdminLayout title={strings.admin.moodBoards.createBoard}>
      <NewMoodBoardContent />
    </AdminLayout>
  );
}
