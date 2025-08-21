'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BlogEditor } from '@/components/admin/BlogEditor';
import { getBlogPostById, saveBlogPost, BlogPost } from '@/services/blogService';
import { Timestamp } from 'firebase/firestore';

export default function EditBlogPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const fetchedPost = await getBlogPostById(params.id);
      if (fetchedPost) {
        setPost(fetchedPost);
      } else {
        // Post not found, redirect with error message
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('blogSuccessMessage', 'Post not found');
        }
        router.push('/admin/blog');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      // Failed to load, redirect with error message
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('blogSuccessMessage', 'Failed to load post');
      }
      router.push('/admin/blog');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (postData: any) => {
    try {
      setSaving(true);
      
      // Convert date strings to Timestamps
      const updatedPost = {
        ...postData,
        publishDate: postData.publishDate 
          ? Timestamp.fromDate(new Date(postData.publishDate))
          : Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdAt: post?.createdAt || Timestamp.now(),
      };

      await saveBlogPost(updatedPost, params.id);
      
      // Show success message and redirect
      const statusMessage = postData.status === 'draft' 
        ? 'Post saved as draft'
        : postData.status === 'published'
        ? 'Post published successfully'
        : 'Post scheduled for publishing';
      
      // Store success message for display on blog list page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('blogSuccessMessage', statusMessage);
      }
      
      router.push('/admin/blog');
    } catch (error) {
      console.error('Error saving post:', error);
      // Show inline error message instead of alert
      const errorMessage = 'Failed to save post. Please try again.';
      // We could add an error state here if needed
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Blog Post">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <AdminLayout title="Edit Blog Post">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Edit Blog Post</h2>
          <p className="text-muted-foreground mt-1">
            Update your blog post content and settings
          </p>
        </div>

        <BlogEditor 
          post={post}
          onSave={handleSave}
          saving={saving}
          onCancel={() => router.push('/admin/blog')}
        />
      </div>
    </AdminLayout>
  );
}