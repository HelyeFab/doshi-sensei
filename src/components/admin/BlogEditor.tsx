'use client';

import { useState, useEffect } from 'react';
import { BlogPost } from '@/services/blogService';
import { uploadImage } from '@/services/imageUploadService';
import { Timestamp } from 'firebase/firestore';

interface BlogEditorProps {
  post?: BlogPost;
  onSave: (post: Partial<BlogPost>) => Promise<void>;
  saving?: boolean;
  onCancel: () => void;
}

export function BlogEditor({ post, onSave, saving = false, onCancel }: BlogEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    author: 'Dōshi Sensei Team',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published' | 'scheduled',
    publishDate: new Date().toISOString().split('T')[0],
    publishTime: '09:00',
    seoTitle: '',
    seoDescription: '',
    cover: '',
    ogImage: '',
    canonical: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (post) {
      const publishDate = post.publishDate instanceof Timestamp 
        ? post.publishDate.toDate() 
        : new Date(post.publishDate);
      
      setFormData({
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        author: post.author || 'Dōshi Sensei Team',
        tags: post.tags || [],
        status: post.status || 'draft',
        publishDate: publishDate.toISOString().split('T')[0],
        publishTime: publishDate.toTimeString().slice(0, 5),
        seoTitle: post.seoTitle || '',
        seoDescription: post.seoDescription || '',
        cover: post.cover || '',
        ogImage: post.ogImage || '',
        canonical: post.canonical || '',
      });
    }
  }, [post]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate slug from title
    if (name === 'title' && !post) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'cover' | 'ogImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadImage(file, 'blog');
      setFormData(prev => ({
        ...prev,
        [field]: url,
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time for scheduled posts
    const publishDateTime = new Date(`${formData.publishDate}T${formData.publishTime}`);
    
    const postData: Partial<BlogPost> = {
      title: formData.title,
      slug: formData.slug,
      content: formData.content,
      excerpt: formData.excerpt,
      author: formData.author,
      tags: formData.tags,
      status: formData.status,
      publishDate: publishDateTime,
      seoTitle: formData.seoTitle || formData.title,
      seoDescription: formData.seoDescription || formData.excerpt,
      cover: formData.cover,
      ogImage: formData.ogImage || formData.cover,
      canonical: formData.canonical,
    };

    await onSave(postData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-card rounded-lg border border-border p-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter post title"
            />
          </div>

          {/* Slug */}
          <div className="bg-card rounded-lg border border-border p-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              URL Slug *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">/blog/</span>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="url-friendly-slug"
              />
            </div>
          </div>

          {/* Content */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-foreground">
                Content * (Markdown/MDX)
              </label>
              <button
                type="button"
                onClick={() => setPreview(!preview)}
                className="text-sm text-primary hover:text-primary/80"
              >
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted rounded-lg p-4 min-h-[400px]">
                <div dangerouslySetInnerHTML={{ 
                  __html: formData.content.replace(/\n/g, '<br />') 
                }} />
              </div>
            ) : (
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows={20}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                placeholder="Write your content in Markdown or MDX..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Supports Markdown and MDX components like {'<Callout>'}, {'<Ruby>'}, and {'<YouTube>'}
            </p>
          </div>

          {/* Excerpt */}
          <div className="bg-card rounded-lg border border-border p-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Excerpt
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Brief description for previews and SEO"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publishing */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-medium text-foreground mb-4">Publishing</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              {formData.status === 'scheduled' && (
                <>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Publish Date
                    </label>
                    <input
                      type="date"
                      name="publishDate"
                      value={formData.publishDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Publish Time
                    </label>
                    <input
                      type="time"
                      name="publishTime"
                      value={formData.publishTime}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-medium text-foreground mb-4">Tags</h3>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-primary/60 hover:text-primary"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-medium text-foreground mb-4">Images</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Cover Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'cover')}
                  disabled={uploadingImage}
                  className="w-full text-sm text-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {formData.cover && (
                  <img src={formData.cover} alt="Cover" className="mt-2 w-full h-32 object-cover rounded" />
                )}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  OG Image (Social Media)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'ogImage')}
                  disabled={uploadingImage}
                  className="w-full text-sm text-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {formData.ogImage && (
                  <img src={formData.ogImage} alt="OG" className="mt-2 w-full h-32 object-cover rounded" />
                )}
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-medium text-foreground mb-4">SEO</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  SEO Title
                </label>
                <input
                  type="text"
                  name="seoTitle"
                  value={formData.seoTitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Leave empty to use post title"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  SEO Description
                </label>
                <textarea
                  name="seoDescription"
                  value={formData.seoDescription}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Leave empty to use excerpt"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Canonical URL
                </label>
                <input
                  type="url"
                  name="canonical"
                  value={formData.canonical}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com/original-post"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-card text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || uploadingImage}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
        </button>
      </div>
    </form>
  );
}