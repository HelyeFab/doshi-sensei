'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Story } from '@/types/story';
import { storyManager } from '@/utils/storyManager';
import Link from 'next/link';
import { useStrings } from '@/contexts/LanguageContext';
import { useNotification } from '@/contexts/NotificationContext';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { TrashIcon } from '@heroicons/react/24/outline'; // If you use heroicons or similar, otherwise use inline SVG
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminStoriesPage() {
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showNotification } = useNotification ? useNotification() : { showNotification: () => {} };
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    loading: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    isDestructive: true,
    onConfirm: async () => {},
  });

  // Check admin access
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  // Load stories
  useEffect(() => {
    if (isAdmin) {
      loadStories();
    }
  }, [isAdmin]);

  const loadStories = async () => {
    try {
      setLoading(true);
      // Get all stories (including drafts for admin)
      const allStories = await storyManager.getAllStoriesAdmin(100);
      setStories(allStories);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectAll || selected.length === stories.length) {
      setSelected([]);
      setSelectAll(false);
    } else {
      setSelected(stories.map(s => s.id));
      setSelectAll(true);
    }
  };

  const openConfirmDialog = (config: Partial<typeof confirmDialog>) => {
    setConfirmDialog(prev => ({
      ...prev,
      ...config,
      isOpen: true,
      loading: false,
    }));
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDialog.onConfirm) return;
    setConfirmDialog(prev => ({ ...prev, loading: true }));
    try {
      await confirmDialog.onConfirm();
      showNotification && showNotification({ type: 'success', message: strings.admin.deletedSuccess });
    } catch (error) {
      showNotification && showNotification({ type: 'error', message: strings.admin.deleteFailed });
    } finally {
      setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  if (adminLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">{strings.loading.general}</div>;
  }

  return (
    <AdminLayout title={strings.admin.aiStories}>
      <div className="space-y-6">
        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText || 'Confirm'}
          cancelText={confirmDialog.cancelText || 'Cancel'}
          isDestructive={confirmDialog.isDestructive}
          loading={confirmDialog.loading}
          onConfirm={async () => {
            setConfirmDialog(prev => ({ ...prev, loading: true }));
            await confirmDialog.onConfirm();
            setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
          }}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }))}
        />
        
        {/* Header */}
        <div className="space-y-2">"
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/admin/stories/generate"
                className="text-sm px-3 py-1.5 md:text-base md:px-4 md:py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-2"
              >
                <span>✨</span>
                {strings.admin.aiStoryGeneration.generateWithAI}
              </Link>
              <Link
                href="/admin/stories/new"
                className="text-sm px-3 py-1.5 md:text-base md:px-4 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                {strings.admin.createNewStory}
              </Link>
              <button
                className="text-sm px-3 py-1.5 md:text-base md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={() => openConfirmDialog({
                  title: strings.admin.deleteAllTitle || 'Delete All Stories',
                  message: strings.admin.confirmDeleteAll || 'Delete ALL stories? This cannot be undone!',
                  confirmText: strings.admin.deleteAll || 'Delete All',
                  cancelText: (strings.admin && strings.admin.cancel) || 'Cancel',
                  isDestructive: true,
                  onConfirm: async () => {
                    for (const id of stories.map(s => s.id)) {
                      await storyManager.deleteStory(id);
                    }
                    setStories([]);
                    setSelected([]);
                    showNotification && showNotification({ type: 'success', message: strings.admin.deletedSuccess });
                  },
                })}
                disabled={stories.length === 0 || loading}
              >
                {strings.admin.deleteAll || 'Delete All'}
              </button>
              <button
                className="text-sm px-3 py-1.5 md:text-base md:px-4 md:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                onClick={() => openConfirmDialog({
                  title: strings.admin.deleteSelectedTitle || 'Delete Selected Stories',
                  message: strings.admin.confirmDeleteSelected || 'Delete selected stories?',
                  confirmText: strings.admin.deleteSelected || 'Delete Selected',
                  cancelText: (strings.admin && strings.admin.cancel) || 'Cancel',
                  isDestructive: true,
                  onConfirm: async () => {
                    for (const id of selected) {
                      await storyManager.deleteStory(id);
                    }
                    setStories(prev => prev.filter(story => !selected.includes(story.id)));
                    setSelected([]);
                    showNotification && showNotification({ type: 'success', message: strings.admin.deletedSuccess });
                  },
                })}
                disabled={selected.length === 0 || loading}
              >
                {strings.admin.deleteSelected || 'Delete Selected'}
              </button>
            </div>
          </div>

          {/* Stories List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stories.length === 0 ? (
            <div className="bg-card rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-4">{strings.admin.noStoriesCreatedYet}</p>
              <Link
                href="/admin/stories/new"
                className="text-primary hover:text-primary/90 underline"
              >
                {strings.admin.createYourFirstStory}
              </Link>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-4">
                        <input
                          type="checkbox"
                          checked={selected.length === stories.length && stories.length > 0}
                          onChange={handleSelectAll}
                          aria-label="Select all stories"
                        />
                      </th>
                      <th className="text-left p-4 font-medium">{strings.admin.title}</th>
                      <th className="text-left p-4 font-medium">{strings.admin.jlpt}</th>
                      <th className="text-left p-4 font-medium">{strings.admin.theme}</th>
                      <th className="text-left p-4 font-medium">{strings.admin.pages}</th>
                      <th className="text-left p-4 font-medium">{strings.admin.status}</th>
                      <th className="text-left p-4 font-medium">{strings.admin.views}</th>
                      <th className="text-left p-4 font-medium">{strings.admin.completed}</th>
                      <th className="text-left p-4 font-medium">{strings.admin.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories.map((story) => (
                      <tr key={story.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selected.includes(story.id)}
                            onChange={() => handleSelect(story.id)}
                            aria-label={`Select story ${story.title}`}
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{story.title}</p>
                            <p className="text-sm text-muted-foreground">{story.slug}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {story.jlptLevel}
                          </span>
                        </td>
                        <td className="p-4">{story.theme}</td>
                        <td className="p-4">{story.pages.length}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${story.status === 'published'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                            {story.status}
                          </span>
                        </td>
                        <td className="p-4">{story.viewCount || 0}</td>
                        <td className="p-4">{story.completionCount || 0}</td>
                        <td className="p-4">
                          <div className="flex gap-2 items-center">
                            <Link
                              href={`/admin/stories/edit/${story.id}`}
                              className="text-primary hover:text-primary/90"
                            >
                              {strings.admin.edit}
                            </Link>
                            <Link
                              href={`/stories/${story.slug}`}
                              className="text-primary hover:text-primary/90"
                              target="_blank"
                            >
                              {strings.admin.view}
                            </Link>
                            <button
                              className="hover:bg-red-50 text-red-600 rounded-full p-2 transition-colors ml-2"
                              title={strings.admin.delete || 'Delete'}
                              onClick={() => openConfirmDialog({
                                title: strings.admin.deleteSingleTitle || 'Delete Story',
                                message: `${strings.admin.confirmDeleteSingle || 'Delete this story?'}\n${story.title}`,
                                confirmText: strings.admin.delete || 'Delete',
                                cancelText: (strings.admin && strings.admin.cancel) || 'Cancel',
                                isDestructive: true,
                                onConfirm: async () => {
                                  await storyManager.deleteStory(story.id);
                                  setStories(prev => prev.filter(s => s.id !== story.id));
                                  setSelected(prev => prev.filter(id => id !== story.id));
                                  showNotification && showNotification({ type: 'success', message: strings.admin.deletedSuccess });
                                },
                              })}
                              disabled={loading}
                            >
                              {/* Trash can icon (Heroicons outline) */}
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" opacity="0" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V19a2 2 0 002 2h8a2 2 0 002-2V7.5M4 7.5h16M9.5 11v6M14.5 11v6M10 7.5V5.75A1.75 1.75 0 0111.75 4h.5A1.75 1.75 0 0114 5.75V7.5" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>
    </AdminLayout>
  );
}
