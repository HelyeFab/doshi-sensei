'use client';


'use client';

import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MoodBoardEditor } from '@/components/admin/mood-boards/MoodBoardEditor';
import { useState, useEffect } from 'react';
import { MoodBoard } from '@/types/moodBoard';
import { useStrings } from '@/contexts/LanguageContext';
import { clearCacheAndReload } from '@/utils/clearAdminCache';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Convert Firebase mood board to MoodBoard type
function convertFirebaseMoodBoard(id: string, data: any): MoodBoard {
  return {
    id,
    title: data.title || 'Untitled',
    emoji: data.emoji || '🎨',
    jlpt: data.jlpt || 'N5',
    background: data.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: data.description || '',
    kanji: data.kanji || [],
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
    createdBy: data.createdBy || 'admin',
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder || 0,
  };
}

export default function EditMoodBoardClient() {
  const strings = useStrings();
  const params = useParams();
  const router = useRouter();
  const [currentBoard, setCurrentBoard] = useState<MoodBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const boardId = params.id as string;

  // Fetch board data directly from Firebase to bypass cache
  useEffect(() => {
    const fetchBoardData = async () => {
      if (!boardId || !db) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch directly from Firebase
        const boardRef = doc(db, 'moodBoards', boardId);
        const boardSnap = await getDoc(boardRef);
        
        if (boardSnap.exists()) {
          const boardData = convertFirebaseMoodBoard(boardSnap.id, boardSnap.data());
          setCurrentBoard(boardData);
        } else {
          setError(strings.admin.moodBoards.boardNotFound || 'Board not found');
        }
      } catch (err) {
        console.error('Error fetching board:', err);
        setError(strings.admin.moodBoards.failedToLoadBoard || 'Failed to load board');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoardData();
  }, [boardId]);

  const handleSave = async (moodBoardData: any) => {
    if (!db) return;
    
    try {
      setIsUpdating(true);
      setError(null);

      // Update directly in Firebase
      const boardRef = doc(db, 'moodBoards', boardId);
      await updateDoc(boardRef, {
        title: moodBoardData.title,
        emoji: moodBoardData.emoji,
        jlpt: moodBoardData.jlpt,
        background: moodBoardData.background,
        description: moodBoardData.description,
        kanji: moodBoardData.kanji || [],
        isActive: moodBoardData.isActive ?? true,
        sortOrder: moodBoardData.sortOrder ?? 0,
        updatedAt: serverTimestamp(),
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/admin/mood-boards');
      }, 1500);
    } catch (err) {
      console.error('Error updating mood board:', err);
      setError(err instanceof Error ? err.message : strings.admin.moodBoards.failedToUpdateBoard || 'Failed to update board');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/mood-boards');
  };

  if (isLoading) {
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
          <div className="mt-6 space-x-4">
            <button
              onClick={() => router.push('/admin/mood-boards')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {strings.admin.moodBoards.backToMoodBoards}
            </button>
            <button
              onClick={clearCacheAndReload}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Clear Cache & Retry
            </button>
          </div>
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

        {/* Success message */}
        {showSuccess && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-800 dark:text-green-200 font-medium">
                Mood board updated successfully! Redirecting...
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && currentBoard && (
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
        
        {/* Cache notice */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-muted-foreground mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                If you're experiencing issues with outdated data, try clearing your browser cache.
              </p>
              <button
                onClick={clearCacheAndReload}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear cache and reload
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Import Firebase functions we need
import { updateDoc, serverTimestamp } from 'firebase/firestore';