'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Story, StoryPage, StoryQuizQuestion, STORY_THEMES, STORY_TAGS } from '@/types/story';
import { JLPTLevel, JLPT_LEVELS } from '@/types/kanji';
import { storyManager } from '@/utils/storyManager';
import { marked } from 'marked';

interface StoryFormData {
  title: string;
  titleJa: string;
  description: string;
  jlptLevel: JLPTLevel;
  theme: string;
  tags: string[];
  coverImageUrl: string;
  pages: StoryPage[];
  quiz: StoryQuizQuestion[];
  status: 'draft' | 'published';
  slug: string;
  seoTitle: string;
  seoDescription: string;
}

export default function NewStoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    titleJa: '',
    description: '',
    jlptLevel: 'N5',
    theme: 'Slice of Life',
    tags: [],
    coverImageUrl: '',
    pages: [
      {
        pageNumber: 1,
        imageUrl: '',
        imageAlt: '',
        text: '',
        translation: ''
      }
    ],
    quiz: [],
    status: 'draft',
    slug: '',
    seoTitle: '',
    seoDescription: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [quizInput, setQuizInput] = useState({
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: ''
  });

  // Check admin access
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('story-draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
        showNotification({
          title: 'Draft Restored',
          message: 'Your previous draft has been restored.',
          type: 'info'
        });
      } catch (error) {
        console.error('Error parsing saved draft:', error);
      }
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title || formData.titleJa || formData.pages.some(p => p.text)) {
        localStorage.setItem('story-draft', JSON.stringify(formData));
        setLastSaved(new Date());
      }
    }, 2000); // Save after 2 seconds of no changes

    return () => clearTimeout(timer);
  }, [formData]);

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !formData.slug) {
      setFormData(prev => ({ ...prev, slug: storyManager.generateSlug(formData.title) }));
    }
  }, [formData.title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    try {
      setLoading(true);

      // Validation
      if (!formData.title.trim() || !formData.titleJa.trim()) {
        showNotification({
          title: 'Missing Information',
          message: '📝 Please enter both English and Japanese titles.',
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      if (formData.pages.some(page => !page.text.trim() || !page.translation.trim())) {
        showNotification({
          title: 'Incomplete Pages',
          message: '📄 All pages must have both Japanese text and English translation.',
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      if (!formData.coverImageUrl.trim()) {
        showNotification({
          title: 'Missing Cover Image',
          message: '🖼️ Please add a cover image.',
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      const storyData = {
        ...formData,
        authorId: user.uid,
        viewCount: 0,
        completionCount: 0,
        publishedAt: formData.status === 'published' ? new Date() : undefined
      };

      await storyManager.saveStory(storyData);
      
      // Clear the draft from localStorage on success
      localStorage.removeItem('story-draft');
      
      showNotification({
        title: 'Success!',
        message: '✅ Story created successfully!',
        type: 'success'
      });
      router.push('/admin/stories');
    } catch (error: any) {
      console.error('Error creating story:', error);
      showNotification({
        title: 'Failed to Create Story',
        message: error.message || 'Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof StoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPage = () => {
    const newPage: StoryPage = {
      pageNumber: formData.pages.length + 1,
      imageUrl: '',
      imageAlt: '',
      text: '',
      translation: ''
    };
    setFormData(prev => ({ ...prev, pages: [...prev.pages, newPage] }));
    setCurrentPageIndex(formData.pages.length);
  };

  const removePage = (index: number) => {
    if (formData.pages.length === 1) {
      showNotification({
        title: 'Cannot Remove Page',
        message: 'Story must have at least one page.',
        type: 'warning'
      });
      return;
    }

    const newPages = formData.pages.filter((_, i) => i !== index);
    // Update page numbers
    newPages.forEach((page, i) => {
      page.pageNumber = i + 1;
    });

    setFormData(prev => ({ ...prev, pages: newPages }));
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1);
    }
  };

  const updatePage = (index: number, field: keyof StoryPage, value: string) => {
    const newPages = [...formData.pages];
    newPages[index] = { ...newPages[index], [field]: value };
    setFormData(prev => ({ ...prev, pages: newPages }));
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

  const addQuizQuestion = () => {
    if (!quizInput.question.trim()) {
      showNotification({
        title: 'Missing Question',
        message: 'Please enter a question.',
        type: 'warning'
      });
      return;
    }

    if (quizInput.options.some(opt => !opt.trim())) {
      showNotification({
        title: 'Incomplete Options',
        message: 'Please fill in all answer options.',
        type: 'warning'
      });
      return;
    }

    const newQuestion: StoryQuizQuestion = {
      id: `q${formData.quiz.length + 1}`,
      ...quizInput
    };

    setFormData(prev => ({ ...prev, quiz: [...prev.quiz, newQuestion] }));
    setQuizInput({
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    });
  };

  const removeQuizQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      quiz: prev.quiz.filter((_, i) => i !== index)
    }));
  };

  const clearDraft = () => {
    localStorage.removeItem('story-draft');
    showNotification({
      title: 'Draft Cleared',
      message: 'Your draft has been cleared. Refreshing page...',
      type: 'info'
    });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, pageIndex?: number) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showNotification({
        title: 'Invalid File Type',
        message: 'Please select an image file',
        type: 'warning'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        title: 'File Too Large',
        message: 'Image size must be less than 5MB',
        type: 'warning'
      });
      return;
    }

    try {
      setUploadingImage(true);
      const token = await user.getIdToken();
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update the appropriate image URL
      if (pageIndex !== undefined) {
        updatePage(pageIndex, 'imageUrl', data.url);
      } else {
        handleInputChange('coverImageUrl', data.url);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showNotification({
        title: 'Upload Failed',
        message: 'Failed to upload image: ' + error.message,
        type: 'error'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const currentPage = formData.pages[currentPageIndex];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Story</h1>
          <p className="text-muted-foreground mt-1">Create an interactive Japanese story with images and quiz</p>
          {lastSaved && (
            <p className="text-xs text-muted-foreground mt-2">
              ✓ Auto-saved {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {(formData.title || formData.titleJa || formData.pages.some(p => p.text)) && (
            <button
              type="button"
              onClick={clearDraft}
              className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30"
            >
              Clear Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => router.push('/admin/stories')}
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
              <label className="block text-sm font-medium mb-2">English Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="The Adventure Begins"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Japanese Title (with furigana) *</label>
              <input
                type="text"
                required
                value={formData.titleJa}
                onChange={(e) => handleInputChange('titleJa', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground japanese-text"
                placeholder="<ruby>冒険<rt>ぼうけん</rt></ruby>が<ruby>始<rt>はじ</rt></ruby>まる"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="A young hero embarks on an exciting journey..."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">JLPT Level</label>
              <select
                value={formData.jlptLevel}
                onChange={(e) => handleInputChange('jlptLevel', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                {JLPT_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select
                value={formData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                {STORY_THEMES.map((theme) => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">URL Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="the-adventure-begins"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Cover Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e)}
              className="hidden"
              id="cover-image-upload"
            />
            <label
              htmlFor="cover-image-upload"
              className={`inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer ${
                uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploadingImage ? 'Uploading...' : 'Upload Cover Image'}
            </label>
            {formData.coverImageUrl && (
              <div className="mt-2">
                <img
                  src={formData.coverImageUrl}
                  alt="Cover"
                  className="max-w-xs rounded-lg border border-border"
                />
              </div>
            )}
          </div>
        </div>

        {/* Pages */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Story Pages ({formData.pages.length})</h2>
            <div className="flex gap-2">
              {formData.pages.length < 5 && (
                <button
                  type="button"
                  onClick={addPage}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Add Page
                </button>
              )}
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {formData.pages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentPageIndex(index)}
                className={`px-4 py-2 rounded-lg ${
                  currentPageIndex === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                }`}
              >
                Page {index + 1}
              </button>
            ))}
          </div>

          {/* Current Page Editor */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Page {currentPage.pageNumber} Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, currentPageIndex)}
                className="hidden"
                id={`page-${currentPageIndex}-image`}
              />
              <label
                htmlFor={`page-${currentPageIndex}-image`}
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer"
              >
                {uploadingImage ? 'Uploading...' : 'Upload Page Image'}
              </label>
              {currentPage.imageUrl && (
                <div className="mt-2">
                  <img
                    src={currentPage.imageUrl}
                    alt={`Page ${currentPage.pageNumber}`}
                    className="max-w-md rounded-lg border border-border"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Japanese Text (with ruby tags) *</label>
              <textarea
                value={currentPage.text}
                onChange={(e) => updatePage(currentPageIndex, 'text', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
                placeholder="<ruby>昔<rt>むかし</rt></ruby>、<ruby>昔<rt>むかし</rt></ruby>、ある<ruby>所<rt>ところ</rt></ruby>に..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">English Translation *</label>
              <textarea
                value={currentPage.translation}
                onChange={(e) => updatePage(currentPageIndex, 'translation', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Once upon a time, in a certain place..."
              />
            </div>

            {formData.pages.length > 1 && (
              <button
                type="button"
                onClick={() => removePage(currentPageIndex)}
                className="px-3 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                Remove This Page
              </button>
            )}
          </div>
        </div>

        {/* Quiz */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">Quiz Questions ({formData.quiz.length}/5)</h2>

          {/* Existing Questions */}
          {formData.quiz.map((q, index) => (
            <div key={q.id} className="p-4 bg-secondary/20 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium">{index + 1}. {q.question}</p>
                <button
                  type="button"
                  onClick={() => removeQuizQuestion(index)}
                  className="text-destructive hover:text-destructive/90"
                >
                  Remove
                </button>
              </div>
              <ul className="ml-4 space-y-1">
                {q.options.map((opt, i) => (
                  <li key={i} className={i === q.correctIndex ? 'text-green-600 font-medium' : ''}>
                    {i + 1}. {opt} {i === q.correctIndex && '✓'}
                  </li>
                ))}
              </ul>
              {q.explanation && (
                <p className="text-sm text-muted-foreground mt-2">Explanation: {q.explanation}</p>
              )}
            </div>
          ))}

          {/* Add New Question */}
          {formData.quiz.length < 5 && (
            <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Question</label>
                <input
                  type="text"
                  value={quizInput.question}
                  onChange={(e) => setQuizInput(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="What did the main character find?"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {quizInput.options.map((opt, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium mb-1">
                      Option {i + 1} {i === quizInput.correctIndex && '(Correct)'}
                    </label>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...quizInput.options];
                        newOptions[i] = e.target.value;
                        setQuizInput(prev => ({ ...prev, options: newOptions }));
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                <select
                  value={quizInput.correctIndex}
                  onChange={(e) => setQuizInput(prev => ({ ...prev, correctIndex: parseInt(e.target.value) }))}
                  className="px-3 py-2 border border-border rounded-lg bg-background"
                >
                  {quizInput.options.map((_, i) => (
                    <option key={i} value={i}>Option {i + 1}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Explanation (optional)</label>
                <input
                  type="text"
                  value={quizInput.explanation}
                  onChange={(e) => setQuizInput(prev => ({ ...prev, explanation: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="The answer can be found in paragraph 2..."
                />
              </div>

              <button
                type="button"
                onClick={addQuizQuestion}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Add Question
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="text-xl font-semibold">Tags</h2>

          <div className="flex gap-2">
            <select
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">Select a tag...</option>
              {STORY_TAGS.filter(tag => !formData.tags.includes(tag)).map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addTag}
              disabled={!tagInput}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50"
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

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
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
              placeholder="Custom title for search engines (defaults to story title)"
            />
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
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/stories')}
            className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </form>
    </div>
  );
}