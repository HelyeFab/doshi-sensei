'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MoodBoardEditor } from '@/components/admin/mood-boards/MoodBoardEditor';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';

function NewMoodBoardContent() {
  const strings = useStrings();
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
  const strings = useStrings();
  const router = useRouter();

  return (
    <AdminLayout title={strings.admin.moodBoards.createBoard} hideHeader={true}>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Back Button */}
      <div className="px-4 sm:px-6 pt-4 mb-6">
        <button
          onClick={() => router.push('/admin/mood-boards')}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center justify-center"
          aria-label="Back to mood boards"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <NewMoodBoardContent />
    </AdminLayout>
  );
}
