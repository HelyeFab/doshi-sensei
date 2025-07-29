'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { ResourceFormData, RESOURCE_CATEGORIES } from '@/types/resources';
import { createResourcePost, generateSlug, extractExcerpt, calculateReadingTime } from '@/utils/resources';
import { marked } from 'marked';
import QuickResourceCreator from '@/components/admin/QuickResourceCreator';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useStrings } from '@/contexts/LanguageContext';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function NewResourcePage() {
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<ResourceFormData>({
    title: '',
    subtitle: '',
    slug: '',
    content: '',
    excerpt: '',
    imageUrl: '',
    imageAlt: '',
    status: 'draft',
    scheduledFor: '',
    tags: [],
    category: '',
    isPremium: false,
    seoTitle: '',
    seoDescription: '',
    featured: false
  });

  const [tagInput, setTagInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !formData.slug) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.title) }));
    }
  }, [formData.title]);

  // Auto-generate excerpt from content
  useEffect(() => {
    if (formData.content && !formData.excerpt) {
      setFormData(prev => ({ ...prev, excerpt: extractExcerpt(formData.content) }));
    }
  }, [formData.content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    try {
      setLoading(true);

      // Friendly validation messages
      if (!formData.title.trim()) {
        setErrorMessage(strings.forms.validation.required);
        return;
      }

      if (!formData.content.trim()) {
        setErrorMessage(strings.forms.validation.required);
        return;
      }

      const resourceId = await createResourcePost(formData, user.uid);
      router.push('/admin/resources');
    } catch (error: any) {
      console.error('Error creating resource:', error);

      // Provide more helpful error messages
      let errorMessage = 'Failed to create resource. ';

      if (error.message?.includes('slug already exists')) {
        errorMessage = '🔗 This URL slug is already in use.\n\nPlease choose a different slug or modify the title.';
      } else if (error.message?.includes('permission')) {
        errorMessage = '🔒 You don\'t have permission to create resources.\n\nPlease ensure you\'re logged in as an admin.';
      } else if (error.message?.includes('network')) {
        errorMessage = '🌐 Network error occurred.\n\nPlease check your internet connection and try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ResourceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleQuickResourceCreated = (quickResourceData: Partial<ResourceFormData>) => {
    // Auto-populate form with quick resource data
    setFormData(prev => ({
      ...prev,
      ...quickResourceData,
      // Ensure we keep the default author as 'doshisensei'
      // and merge tags properly
      tags: [...(prev.tags || []), ...(quickResourceData.tags || [])].filter((tag, index, arr) => arr.indexOf(tag) === index)
    }));

    // Scroll to the form
    setTimeout(() => {
      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    console.log('File selected:', file);
    console.log('User:', user);

    if (!file) {
      console.log('No file selected');
      return;
    }

    if (!user) {
      setErrorMessage('You must be logged in to upload images');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      console.log('Starting image upload...');

      // Get user token for authorization
      const token = await user.getIdToken();

      // Create form data
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      // Upload through our API route to avoid CORS issues
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update form with the uploaded image URL
      handleInputChange('imageUrl', data.url);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Show success message if using fallback
      if (data.message) {
        console.log(data.message);
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);

      // More detailed error messages
      let errorMessage = 'Failed to upload image. ';

      if (error.code === 'storage/unauthorized') {
        errorMessage = 'You don\'t have permission to upload images. Please check your Firebase Storage rules.';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please contact support.';
      } else if (error.code === 'storage/unauthenticated') {
        errorMessage = 'You must be logged in to upload images.';
      } else if (error.message?.includes('Firebase Storage is not initialized')) {
        errorMessage = 'Storage service is not available. Please refresh the page and try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      setErrorMessage(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const insertImageToContent = () => {
    if (!formData.imageUrl) return;

    const imageMarkdown = `![${formData.imageAlt || 'Image'}](${formData.imageUrl})`;
    setFormData(prev => ({
      ...prev,
      content: prev.content + '\n\n' + imageMarkdown
    }));
  };

  const insertCodeBlock = () => {
    const codeBlock = '\n```\n// Your code here\n```\n';
    setFormData(prev => ({
      ...prev,
      content: prev.content + codeBlock
    }));
  };

  const insertTable = () => {
    const table = '\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n';
    setFormData(prev => ({
      ...prev,
      content: prev.content + table
    }));
  };

  if (adminLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const readingTime = calculateReadingTime(formData.content);

  return (
    <AdminLayout title="Create New Resource">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Description and Action Buttons */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Write and publish a new blog post or resource</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={() => router.push('/admin/resources')}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90"
            >
              Cancel
            </button>
          </div>
        </div>

      {/* Quick Resource Creator */}
      <QuickResourceCreator onResourceCreated={handleQuickResourceCreated} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required Fields Notice */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-foreground">
            <strong>ℹ️ Quick tip:</strong> Only fields marked with <span className="text-destructive">*</span> are required.
            You can start with just a title and content, then add other details later!
          </p>
        </div>

        {/* Basic Information */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">Basic Information</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                required
                id="title"
                name="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder={strings.forms.placeholders.title}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Optional subtitle"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">URL Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="url-friendly-slug"
              />
              <p className="text-xs text-muted-foreground mt-1">URL: /resources/{formData.slug}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="">Select category</option>
                {RESOURCE_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => handleInputChange('excerpt', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="Brief description for cards and SEO (auto-generated from content if empty)"
            />
          </div>
        </div>

        {/* Content Editor */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Content {readingTime > 0 && `(~${readingTime} min read)`}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={insertCodeBlock}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/90"
              >
                Code Block
              </button>
              <button
                type="button"
                onClick={insertTable}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/90"
              >
                Table
              </button>
              <button
                type="button"
                onClick={insertImageToContent}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/90"
                disabled={!formData.imageUrl}
              >
                Insert Image
              </button>
            </div>
          </div>

          {showPreview ? (
            <div className="border border-border rounded-lg p-4 bg-background min-h-[400px] prose prose-sm max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: marked(formData.content) as string }} />
            </div>
          ) : (
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
              placeholder={strings.forms.placeholders.content}
            />
          )}
        </div>

        {/* Image */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">Featured Image</h2>

          {/* Upload Button */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={uploadingImage}
            />
            <label
              htmlFor="image-upload"
              className={`inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              onClick={(e) => {
                if (uploadingImage) {
                  e.preventDefault();
                }
              }}
            >
              {uploadingImage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload from Computer
                </>
              )}
            </label>
            <p className="text-xs text-muted-foreground mt-1">Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or use URL</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="https://example.com/image.jpg"
                disabled={uploadingImage}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image Alt Text</label>
              <input
                type="text"
                value={formData.imageAlt}
                onChange={(e) => handleInputChange('imageAlt', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Descriptive alt text"
              />
            </div>
          </div>

          {formData.imageUrl && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <img
                src={formData.imageUrl}
                alt={formData.imageAlt || 'Preview'}
                className="max-w-xs rounded-lg border border-border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">Tags</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="Add a tag and press Enter"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
            >
              Add
            </button>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-primary/60 hover:text-primary"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Publishing Options */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">Publishing Options</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {formData.status === 'scheduled' && (
              <div>
                <label className="block text-sm font-medium mb-2">Scheduled For</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => handleInputChange('featured', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Featured post</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPremium}
                onChange={(e) => handleInputChange('isPremium', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Premium content</span>
            </label>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">SEO</h2>

          <div>
            <label className="block text-sm font-medium mb-2">SEO Title</label>
            <input
              type="text"
              value={formData.seoTitle}
              onChange={(e) => handleInputChange('seoTitle', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="Custom title for search engines (defaults to main title)"
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.seoTitle.length}/60 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">SEO Description</label>
            <textarea
              value={formData.seoDescription}
              onChange={(e) => handleInputChange('seoDescription', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="Custom description for search engines (defaults to excerpt)"
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.seoDescription.length}/160 characters</p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/resources')}
            className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Resource'}
          </button>
        </div>
      </form>

      {/* Error Message Modal */}
      {errorMessage && (
        <ConfirmationDialog
          isOpen={!!errorMessage}
          title="Error"
          message={errorMessage}
          confirmText="OK"
          cancelText=""
          isDestructive={false}
          onConfirm={() => setErrorMessage(null)}
          onCancel={() => setErrorMessage(null)}
          loading={false}
        />
      )}
      </div>
    </AdminLayout>
  );
}
