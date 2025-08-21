'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { deleteBlogPost, getAllBlogPosts } from '@/services/blogService';
import { MdxEditor } from '@/components/admin/MdxEditor';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

interface CombinedBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  publishDate: Date | string;
  source: 'mdx' | 'firestore';
  readingTime?: string;
  views?: number;
  cover?: string;
  isEditable: boolean;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<CombinedBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMdx, setEditingMdx] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    postId: string;
    postTitle: string;
    postSource: string;
    postSlug?: string;
  }>({ isOpen: false, postId: '', postTitle: '', postSource: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    
    // Check for success message from edit/create pages
    const storedMessage = sessionStorage.getItem('blogSuccessMessage');
    if (storedMessage) {
      setSuccessMessage(storedMessage);
      sessionStorage.removeItem('blogSuccessMessage');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Fetch MDX posts from API (server-side file reading)
      let mdxPosts: any[] = [];
      try {
        const response = await fetch('/api/admin/blog');
        const data = await response.json();
        mdxPosts = data.posts || [];
      } catch (error) {
        console.error('Error fetching MDX posts:', error);
      }
      
      // Fetch Firestore posts (uses current user's auth)
      let firestorePosts: any[] = [];
      try {
        firestorePosts = await getAllBlogPosts(true);
      } catch (error) {
        console.log('No Firestore posts yet or error fetching:', error);
      }
      
      // Format Firestore posts
      const formattedFirestorePosts = firestorePosts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        author: post.author,
        tags: post.tags,
        status: post.status,
        publishDate: post.publishDate instanceof Timestamp 
          ? post.publishDate.toDate().toISOString()
          : post.publishDate,
        source: 'firestore' as const,
        readingTime: post.readingTime,
        views: post.views || 0,
        cover: post.cover,
        isEditable: true,
      }));
      
      // Combine both sources
      const combinedPosts: CombinedBlogPost[] = [...mdxPosts, ...formattedFirestorePosts];
      
      // Sort by date
      combinedPosts.sort((a, b) => 
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      setPosts(combinedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.postId) return;
    
    setIsDeleting(true);
    try {
      if (deleteModal.postSource === 'mdx' && deleteModal.postSlug) {
        // Delete MDX file via API
        const response = await fetch(`/api/admin/blog/mdx?slug=${deleteModal.postSlug}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setSuccessMessage('MDX file deleted successfully');
          await fetchPosts();
        } else {
          throw new Error('Failed to delete MDX file');
        }
      } else {
        // Delete Firestore post
        await deleteBlogPost(deleteModal.postId);
        setSuccessMessage('Blog post deleted successfully');
        await fetchPosts();
      }
      
      // Close modal
      setDeleteModal({ isOpen: false, postId: '', postTitle: '', postSource: '' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting post:', error);
      setSuccessMessage('Error deleting post. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (id: string, title: string, source: string, slug?: string) => {
    setDeleteModal({
      isOpen: true,
      postId: id,
      postTitle: title,
      postSource: source,
      postSlug: slug
    });
  };

  const handleEditMdx = (slug: string) => {
    setEditingMdx(slug);
  };

  const handleMdxSaved = () => {
    fetchPosts();
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const styles = {
      mdx: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      firestore: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[source as keyof typeof styles]}`}>
        {source.toUpperCase()}
      </span>
    );
  };

  return (
    <AdminLayout title="Blog Management">
      {/* MDX Editor Modal */}
      {editingMdx && (
        <MdxEditor
          slug={editingMdx}
          onClose={() => setEditingMdx(null)}
          onSave={handleMdxSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post?"
        itemName={deleteModal.postTitle}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, postId: '', postTitle: '', postSource: '' })}
        isDeleting={isDeleting}
      />

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {successMessage}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Blog Posts</h2>
            <p className="text-muted-foreground mt-1">
              Manage your blog posts from both MDX files and database
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
            <button
              onClick={() => router.push('/admin/blog/new')}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create New Post
            </button>
            <Link
              href="/blog"
              target="_blank"
              className="w-full sm:w-auto px-4 py-2 bg-card text-foreground border border-border rounded-lg hover:bg-muted transition-colors text-center"
            >
              View Blog →
            </Link>
          </div>
        </div>

        {/* Notice about MDX files */}
        <div className="bg-muted border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Posts from two sources:
              </p>
              <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                <li><strong>MDX files</strong>: Located in /content/posts/ - Edit directly in your code editor</li>
                <li><strong>Database</strong>: Created via admin - Edit using the admin interface</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No blog posts yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Create your first blog post or drop an MDX file in /content/posts/
            </p>
            <button
              onClick={() => router.push('/admin/blog/new')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <>
            {/* Mobile view - Cards */}
            <div className="block lg:hidden space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-card rounded-lg border border-border p-4">
                  <div className="space-y-3">
                    {/* Title and slug */}
                    <div>
                      <h3 className="font-medium text-foreground line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{post.slug}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2">
                      {getSourceBadge(post.source)}
                      {getStatusBadge(post.status)}
                    </div>

                    {/* Meta info */}
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>By {post.author}</p>
                      <p>{formatDate(post.publishDate)}</p>
                      <p>{post.views || 0} views</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="px-3 py-1.5 text-sm bg-card border border-border rounded hover:bg-muted transition-colors"
                      >
                        View
                      </Link>
                      {post.source === 'mdx' ? (
                        <>
                          <button
                            onClick={() => handleEditMdx(post.slug)}
                            className="px-3 py-1.5 text-sm bg-purple-500/10 text-purple-600 rounded hover:bg-purple-500/20 transition-colors"
                          >
                            Edit MDX
                          </button>
                          <button
                            onClick={() => openDeleteModal(post.id, post.title, post.source, post.slug)}
                            className="px-3 py-1.5 text-sm bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                            className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(post.id, post.title, post.source)}
                            className="px-3 py-1.5 text-sm bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop view - Table */}
            <div className="hidden lg:block bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Source</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Author</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Publish Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Views</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{post.title}</p>
                            <p className="text-sm text-muted-foreground">{post.slug}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getSourceBadge(post.source)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(post.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {post.author}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(post.publishDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {post.views || 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              className="px-3 py-1 text-sm bg-card border border-border rounded hover:bg-muted transition-colors"
                            >
                              View
                            </Link>
                            {post.source === 'mdx' ? (
                              <>
                                <button
                                  onClick={() => handleEditMdx(post.slug)}
                                  className="px-3 py-1 text-sm bg-purple-500/10 text-purple-600 rounded hover:bg-purple-500/20 transition-colors"
                                >
                                  Edit MDX
                                </button>
                                <button
                                  onClick={() => openDeleteModal(post.id, post.title, post.source, post.slug)}
                                  className="px-3 py-1 text-sm bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                                  className="px-3 py-1 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => openDeleteModal(post.id, post.title, post.source)}
                                  className="px-3 py-1 text-sm bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* MDX File Instructions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Managing MDX Files
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>To edit MDX posts:</strong> Open the file directly in your code editor at 
              <code className="bg-muted px-2 py-1 rounded mx-1">/content/posts/</code>
            </p>
            <p>
              <strong>To delete MDX posts:</strong> Delete the .mdx file from the folder
            </p>
            <p>
              <strong>To add new MDX posts:</strong> Create a new .mdx file with frontmatter
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-primary hover:text-primary/80">
                View MDX format example
              </summary>
              <pre className="mt-3 bg-muted rounded p-3 overflow-x-auto text-xs">
{`---
title: "Your Post Title"
slug: "url-friendly-slug"
date: "YYYY-MM-DD"
tags: ["tag1", "tag2"]
excerpt: "Brief description"
status: "published"
author: "Your Name"
---

Your content here...`}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}