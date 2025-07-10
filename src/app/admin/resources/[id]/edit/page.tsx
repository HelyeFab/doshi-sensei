'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { ResourceFormData, ResourcePost, RESOURCE_CATEGORIES } from '@/types/resources';
import { getResourcePost, updateResourcePost, extractExcerpt, calculateReadingTime } from '@/utils/resources';
import { marked } from 'marked';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useStrings } from '@/hooks/useLanguage';

interface EditResourcePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditResourcePage({ params }: EditResourcePageProps) {
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [resourceId, setResourceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [resource, setResource] = useState<ResourcePost | null>(null);
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

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setResourceId(resolvedParams.id);
    });
  }, [params]);

  // Check admin access
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  // Load resource data
  useEffect(() => {
    if (isAdmin && resourceId) {
      loadResource();
    }
  }, [isAdmin, resourceId]);

  const loadResource = async () => {
    try {
      setLoading(true);
      const resourceData = await getResourcePost(resourceId);

      if (!resourceData) {
        setErrorMessage('Resource not found');
        router.push('/admin/resources');
        return;
      }

      setResource(resourceData);
      setFormData({
        title: resourceData.title,
        subtitle: resourceData.subtitle || '',
        slug: resourceData.slug,
        content: resourceData.content,
        excerpt: resourceData.excerpt,
        imageUrl: resourceData.imageUrl || '',
        imageAlt: resourceData.imageAlt || '',
        status: resourceData.status,
        scheduledFor: resourceData.scheduledFor ? resourceData.scheduledFor.toISOString().slice(0, 16) : '',
        tags: resourceData.tags,
        category: resourceData.category || '',
        isPremium: resourceData.isPremium,
        seoTitle: resourceData.seoTitle || '',
        seoDescription: resourceData.seoDescription || '',
        featured: resourceData.featured
      });
    } catch (error) {
      console.error('Error loading resource:', error);
      setErrorMessage('Failed to load resource');
      router.push('/admin/resources');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    try {
      setSaving(true);

      // Validation
      if (!formData.title.trim()) {
        setErrorMessage(strings.forms.validation.required);
        return;
      }

      if (!formData.content.trim()) {
        setErrorMessage(strings.forms.validation.required);
        return;
      }

      await updateResourcePost(resourceId, formData);
      router.push('/admin/resources');
    } catch (error: any) {
      console.error('Error updating resource:', error);
      setErrorMessage(error.message || 'Failed to update resource. Please try again.');
    } finally {
      setSaving(false);
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

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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

      // Create a unique file name
      const timestamp = Date.now();
      const fileName = `resources/${user.uid}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update form with the uploaded image URL
      setFormData(prev => ({
        ...prev,
        imageUrl: downloadURL
      }));

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrorMessage('Failed to upload image. Please try again.');
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

  if (adminLoading || !isAdmin || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!resource) {
    return <div className="min-h-screen flex items-center justify-center">Resource not found</div>;
  }

  const readingTime = calculateReadingTime(formData.content);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Resource</h1>
          <p className="text-muted-foreground mt-1">Editing: {resource.title}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => window.open(`/resources/${resource.slug}`, '_blank')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            View Live
          </button>
          <button
            onClick={() => router.push('/admin/resources')}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90"
          >
            Cancel
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">Basic Information</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                required
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
              placeholder="Brief description for cards and SEO"
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
            />
            <label
              htmlFor="image-upload"
              className={`inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                }`}
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
              placeholder="Custom title for search engines"
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
              placeholder="Custom description for search engines"
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
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
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
  );
}
