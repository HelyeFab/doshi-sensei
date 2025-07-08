'use client';

import { useState, useEffect } from 'react';
import { MoodBoard, KanjiItem, MoodBoardImport } from '@/types/moodBoard';
import { KanjiEditor } from './KanjiEditor';
import { MoodBoardPreview } from './MoodBoardPreview';
import { JsonEditor } from './JsonEditor';
import { convertImportToMoodBoard, validateMoodBoardImport } from '@/utils/moodBoardConverter';
import { strings } from '@/config/strings';

interface MoodBoardEditorProps {
  initialData?: MoodBoard;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

const DEFAULT_GRADIENTS = [
  { name: 'Purple Dream', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Ocean Blue', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { name: 'Peach', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: 'Berry', value: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)' },
  { name: 'Mint', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
];

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

export function MoodBoardEditor({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
}: MoodBoardEditorProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    emoji: initialData?.emoji || '🎨',
    jlpt: initialData?.jlpt || 'N5',
    background: initialData?.background || DEFAULT_GRADIENTS[0].value,
    description: initialData?.description || '',
    kanji: initialData?.kanji || [],
    isActive: initialData?.isActive ?? true,
    sortOrder: initialData?.sortOrder ?? 0,
  });

  const [editorMode, setEditorMode] = useState<'form' | 'json'>('form');
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        emoji: initialData.emoji,
        jlpt: initialData.jlpt,
        background: initialData.background,
        description: initialData.description,
        kanji: initialData.kanji,
        isActive: initialData.isActive,
        sortOrder: initialData.sortOrder ?? 0,
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = strings.forms.validation.titleRequired;
    }

    if (!formData.emoji) {
      newErrors.emoji = strings.forms.validation.emojiRequired;
    }

    if (!formData.description.trim()) {
      newErrors.description = strings.forms.validation.descriptionRequired;
    }

    if (formData.kanji.length === 0) {
      newErrors.kanji = strings.forms.validation.kanjiRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSave(formData);
  };

  const handleKanjiUpdate = (kanji: KanjiItem[]) => {
    setFormData(prev => ({ ...prev, kanji }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);

        // Handle array format (your JSON has an array with one object)
        const importData = Array.isArray(jsonData) ? jsonData[0] : jsonData;

        // Validate the import format
        if (!validateMoodBoardImport(importData)) {
          setUploadError('Invalid JSON format. Please check the file structure.');
          return;
        }

        // Convert to internal format
        const convertedData = convertImportToMoodBoard(importData);

        // Update form with converted data
        setFormData({
          ...convertedData,
          isActive: formData.isActive,
          sortOrder: formData.sortOrder
        } as any);

        setUploadError(null);
        setErrors({});
      } catch (error) {
        setUploadError('Failed to parse JSON file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        console.error('JSON parse error:', error);
      }
    };

    reader.readAsText(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setFormData(prev => ({ ...prev, emoji }));
    if (errors.emoji) {
      setErrors(prev => ({ ...prev, emoji: '' }));
    }
  };

  if (editorMode === 'json') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setEditorMode('form')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Switch to Form Mode
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Preview
          </button>
        </div>
        <JsonEditor
          initialData={formData}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto overflow-x-hidden">
      {showPreview && (
        <MoodBoardPreview
          moodBoard={{
            ...formData,
            id: initialData?.id || 'preview',
            createdAt: initialData?.createdAt || new Date(),
          } as MoodBoard}
          onClose={() => setShowPreview(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Editor Mode Toggle */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {strings.admin.moodBoards.editor}
            </h2>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('json')}
                className="px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                JSON Mode
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">{strings.admin.moodBoards.importFromJson}</h3>
                <p className="text-xs text-muted-foreground">{strings.admin.moodBoards.uploadJsonDescription}</p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-block">
                  {strings.forms.buttons.chooseFile}
                </span>
              </label>
            </div>
            {uploadError && (
              <div className="mt-2 text-sm text-destructive">{uploadError}</div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                {strings.forms.labels.title} *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground ${errors.title ? 'border-destructive' : 'border-border'
                  }`}
                placeholder={strings.forms.placeholders.moodBoardTitle}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="emoji" className="block text-sm font-medium text-foreground mb-2">
                  {strings.forms.labels.emoji} *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="emoji"
                    name="emoji"
                    value={formData.emoji}
                    onChange={handleInputChange}
                    className={`w-20 px-3 py-2 text-center text-2xl border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground ${errors.emoji ? 'border-destructive' : 'border-border'
                      }`}
                    maxLength={2}
                  />
                  <div className="flex flex-wrap gap-1">
                    {['🌿', '🏠', '🔢', '🍱', '🎌', '🏮', '🌸', '⛩️'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="p-1.5 sm:p-2 text-lg sm:text-xl hover:bg-muted rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                {errors.emoji && (
                  <p className="mt-1 text-sm text-destructive">{errors.emoji}</p>
                )}
              </div>

              <div>
                <label htmlFor="jlpt" className="block text-sm font-medium text-foreground mb-2">
                  {strings.forms.labels.jlptLevel}
                </label>
                <select
                  id="jlpt"
                  name="jlpt"
                  value={formData.jlpt}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                >
                  {JLPT_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              {strings.forms.labels.description} *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground ${errors.description ? 'border-destructive' : 'border-border'
                }`}
              placeholder={strings.forms.placeholders.moodBoardDescription}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {strings.forms.labels.status}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  {strings.forms.labels.active}
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-foreground mb-2">
                {strings.forms.labels.sortOrder}
              </label>
              <input
                type="number"
                id="sortOrder"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Visual Design */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {strings.admin.moodBoards.visualDesign}
          </h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Background Gradient
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {DEFAULT_GRADIENTS.map(gradient => (
                <button
                  key={gradient.name}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, background: gradient.value }))}
                  className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${formData.background === gradient.value
                      ? 'border-primary ring-2 ring-primary ring-offset-1 sm:ring-offset-2'
                      : 'border-border hover:border-muted-foreground'
                    }`}
                  style={{ background: gradient.value }}
                >
                  <span className="absolute bottom-1 left-1 text-xs font-medium text-white bg-black/50 px-2 py-1 rounded">
                    {gradient.name}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="customGradient" className="block text-sm font-medium text-foreground mb-2">
                Custom Gradient CSS
              </label>
              <input
                type="text"
                id="customGradient"
                value={formData.background}
                onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground font-mono text-sm"
                placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
            </div>
          </div>
        </div>

        {/* Kanji Management */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Kanji Management
          </h3>
          {errors.kanji && (
            <p className="mb-4 text-sm text-destructive">{errors.kanji}</p>
          )}
          <KanjiEditor
            kanji={formData.kanji}
            onUpdate={handleKanjiUpdate}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : initialData ? 'Update Mood Board' : 'Create Mood Board'}
          </button>
        </div>
      </form>
    </div>
  );
}
