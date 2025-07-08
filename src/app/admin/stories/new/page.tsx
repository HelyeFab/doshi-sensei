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
import { validateStoryJson, parseStoryJson, StoryJsonImport } from '@/utils/storyJsonValidator';
import { strings } from '@/config/strings';

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
  status: 'draft' | 'published' | 'archived';
  slug: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
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
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonValidationErrors, setJsonValidationErrors] = useState<string[]>([]);
  const [jsonValidationWarnings, setJsonValidationWarnings] = useState<string[]>([]);

  const todayISOString = new Date().toISOString().slice(0, 10);
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
    status: 'published',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    publishedAt: todayISOString
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

  // When status changes, always ensure publishedAt is set if published
  useEffect(() => {
    if (formData.status === 'published' && !formData.publishedAt) {
      setFormData(prev => ({ ...prev, publishedAt: todayISOString }));
    }
    if (formData.status === 'draft') {
      setFormData(prev => ({ ...prev, publishedAt: '' }));
    }
  }, [formData.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    try {
      setLoading(true);

      // Validation
      if (!formData.title.trim() || !formData.titleJa.trim()) {
        showNotification({
          title: strings.admin.articles.missingInfo,
          message: strings.admin.articles.enterTitles,
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      if (formData.pages.some(page => !page.text.trim() || !page.translation.trim())) {
        showNotification({
          title: strings.admin.articles.incompletePages,
          message: strings.admin.articles.allPagesRequired,
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      if (formData.status === 'published' && !formData.publishedAt) {
        showNotification({
          title: strings.admin.articles.missingPublishDate,
          message: strings.admin.articles.selectPublishDate,
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      const storyData = {
        ...formData,
        status: formData.status as 'draft' | 'published' | 'archived',
        publishedAt: new Date(formData.publishedAt || todayISOString),
        authorId: user.uid,
        viewCount: 0,
        completionCount: 0,
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

  const handleJsonImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showNotification({
        title: 'Invalid File Type',
        message: 'Please select a JSON file',
        type: 'warning'
      });
      return;
    }

    try {
      // Parse JSON file
      const { data, error } = await parseStoryJson(file);

      if (error) {
        showNotification({
          title: 'Failed to Parse JSON',
          message: error,
          type: 'error'
        });
        return;
      }

      // Validate JSON structure
      const validation = validateStoryJson(data);

      setJsonValidationErrors(validation.errors);
      setJsonValidationWarnings(validation.warnings);

      if (!validation.isValid) {
        showNotification({
          title: 'Invalid Story Format',
          message: `Found ${validation.errors.length} error(s) in JSON file`,
          type: 'error'
        });
        return;
      }

      // Import validated data
      const importedData = validation.data as StoryJsonImport;

      // Convert imported pages to StoryPage format
      const pages: StoryPage[] = importedData.pages.map((page, index) => ({
        pageNumber: index + 1,
        text: page.text,
        translation: page.translation,
        imageUrl: '',
        imageAlt: page.imageAlt || ''
      }));

      // Convert imported quiz to StoryQuizQuestion format
      const quiz: StoryQuizQuestion[] = (importedData.quiz || []).map((q, index) => ({
        id: `q${index + 1}`,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || ''
      }));

      // Update form data
      setFormData({
        ...formData,
        title: importedData.title,
        titleJa: importedData.titleJa,
        description: importedData.description || '',
        jlptLevel: importedData.jlptLevel,
        theme: importedData.theme,
        tags: importedData.tags || [],
        pages,
        quiz,
        seoTitle: importedData.seoTitle || '',
        seoDescription: importedData.seoDescription || '',
        publishedAt: todayISOString
      });

      setCurrentPageIndex(0);
      setShowJsonImport(false);

      showNotification({
        title: 'Story Imported Successfully',
        message: `Imported ${pages.length} page(s) and ${quiz.length} quiz question(s)`,
        type: 'success'
      });

      if (validation.warnings.length > 0) {
        console.warn('Import warnings:', validation.warnings);
      }
    } catch (error) {
      console.error('Error importing JSON:', error);
      showNotification({
        title: 'Import Failed',
        message: 'An unexpected error occurred while importing the story',
        type: 'error'
      });
    } finally {
      // Reset file input
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = '';
      }
    }
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
    <>
      {/* Top Gradient Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6 mt-8 mb-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/admin/stories')}
                className="mr-2 p-2 rounded-full hover:bg-muted transition-colors"
                title="Back to Stories List"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-foreground">Create New Story</h1>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowJsonImport(!showJsonImport)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Import from JSON
              </button>
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

          {/* JSON Import Section */}
          {showJsonImport && (
            <div className="bg-card rounded-lg p-6 border border-border space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Import Story from JSON</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowJsonImport(false);
                    setJsonValidationErrors([]);
                    setJsonValidationWarnings([]);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    ref={jsonFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleJsonImport}
                    className="hidden"
                    id="json-import"
                  />
                  <label
                    htmlFor="json-import"
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer"
                  >
                    Select JSON File
                  </label>
                  <a
                    href="/story-template.json"
                    download="story-template.json"
                    className="ml-4 text-sm text-primary hover:underline"
                  >
                    Download Template
                  </a>
                </div>

                {jsonValidationErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">Validation Errors:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                      {jsonValidationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {jsonValidationWarnings.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Warnings:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                      {jsonValidationWarnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">JSON file should contain:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Story title in English and Japanese</li>
                    <li>JLPT level and theme</li>
                    <li>Pages with Japanese text (with ruby tags) and English translations</li>
                    <li>Optional: Quiz questions, tags, and SEO information</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-card rounded-lg p-6 border border-border space-y-4">
              <h2 className="text-xl font-semibold">Basic Information</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">English Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder={strings.forms.placeholders.storyTitle}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Japanese Title (with furigana) *</label>
                  <input
                    type="text"
                    id="titleJa"
                    name="titleJa"
                    required
                    value={formData.titleJa}
                    onChange={(e) => handleInputChange('titleJa', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground japanese-text"
                    placeholder={strings.forms.placeholders.storyJapaneseTitle}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder={strings.forms.placeholders.storyDescription}
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
                  className={`inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
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

            {/* Pages Overview */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Pages Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
                {formData.pages.map((page, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentPageIndex(index)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${currentPageIndex === index
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-1">
                        {page.imageUrl ? '📷' : '🖼️'}
                      </div>
                      <p className="text-sm font-medium">Page {index + 1}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {page.imageUrl ? 'Image added' : 'No image'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                {formData.pages.filter(p => p.imageUrl).length} of {formData.pages.length} pages have images
              </div>
            </div>

            {/* Pages */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Story Pages ({formData.pages.length})</h2>
                <div className="flex gap-2">
                  {formData.pages.length < 20 && (
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
                {formData.pages.map((page, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentPageIndex(index)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${currentPageIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                      }`}
                  >
                    <span>Page {index + 1}</span>
                    {page.imageUrl ? (
                      <span className="text-xs">📷</span>
                    ) : (
                      <span className="text-xs opacity-50">🖼️</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Current Page Editor */}
              <div className="space-y-4">
                <div className="bg-muted/20 rounded-lg p-4">
                  <label className="block text-sm font-medium mb-2">Page {currentPage.pageNumber} Image</label>

                  {currentPage.imageUrl ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        <img
                          src={currentPage.imageUrl}
                          alt={currentPage.imageAlt || `Page ${currentPage.pageNumber}`}
                          className="max-w-md rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => updatePage(currentPageIndex, 'imageUrl', '')}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Image Alt Text (for accessibility)</label>
                        <input
                          type="text"
                          value={currentPage.imageAlt}
                          onChange={(e) => updatePage(currentPageIndex, 'imageAlt', e.target.value)}
                          className="w-full max-w-md px-3 py-1 text-sm border border-border rounded bg-background"
                          placeholder="Describe the image for screen readers"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, currentPageIndex)}
                        className="hidden"
                        id={`page-${currentPageIndex}-image`}
                      />
                      <label
                        htmlFor={`page-${currentPageIndex}-image`}
                        className={`inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      >
                        {uploadingImage ? 'Uploading...' : '📷 Upload Image for This Page'}
                      </label>

                      {currentPage.imageAlt && (
                        <p className="mt-2 text-sm text-muted-foreground italic">
                          Suggested image: "{currentPage.imageAlt}"
                        </p>
                      )}
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

            {/* Publish Date */}
            {formData.status === 'published' && (
              <div className="mb-4">
                <label className="block font-semibold mb-1">Publish Date</label>
                <input
                  type="date"
                  value={formData.publishedAt}
                  onChange={e => handleInputChange('publishedAt', e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            )}

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
      </div>
    </>
  );
}
