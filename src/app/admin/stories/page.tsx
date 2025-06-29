'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Story } from '@/types/story';
import { storyManager } from '@/utils/storyManager';
import Link from 'next/link';

export default function AdminStoriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

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
      const allStories = await storyManager.getAllStories(100);
      setStories(allStories);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Stories</h1>
          <p className="text-muted-foreground mt-1">Manage interactive Japanese stories</p>
        </div>
        <Link
          href="/admin/stories/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Create New Story
        </Link>
      </div>

      {/* Stories List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-card rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No stories created yet.</p>
          <Link
            href="/admin/stories/new"
            className="text-primary hover:text-primary/90 underline"
          >
            Create your first story
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">JLPT</th>
                  <th className="text-left p-4 font-medium">Theme</th>
                  <th className="text-left p-4 font-medium">Pages</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Views</th>
                  <th className="text-left p-4 font-medium">Completed</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <tr key={story.id} className="border-b border-border hover:bg-muted/50">
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        story.status === 'published' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {story.status}
                      </span>
                    </td>
                    <td className="p-4">{story.viewCount || 0}</td>
                    <td className="p-4">{story.completionCount || 0}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/stories/edit/${story.id}`}
                          className="text-primary hover:text-primary/90"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/stories/${story.slug}`}
                          className="text-primary hover:text-primary/90"
                          target="_blank"
                        >
                          View
                        </Link>
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
  );
}