'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BlogEditor } from '@/components/admin/BlogEditor';
import { saveBlogPost } from '@/services/blogService';
import { Timestamp } from 'firebase/firestore';

export default function NewBlogPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (postData: any) => {
    try {
      setSaving(true);
      
      // Convert date strings to Timestamps
      const post = {
        ...postData,
        publishDate: postData.publishDate 
          ? Timestamp.fromDate(new Date(postData.publishDate))
          : Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const id = await saveBlogPost(post);
      
      // Show success message and redirect
      const statusMessage = postData.status === 'draft' 
        ? 'Post created as draft'
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
      // Show error message via sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('blogSuccessMessage', 'Failed to create post. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Create Blog Post">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Create New Blog Post</h2>
          <p className="text-muted-foreground mt-1">
            Write engaging content to boost SEO and help users learn Japanese
          </p>
        </div>

        <BlogEditor 
          onSave={handleSave}
          saving={saving}
          onCancel={() => router.push('/admin/blog')}
        />
      </div>
    </AdminLayout>
  );
}