'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MdxEditorProps {
  slug: string;
  onClose: () => void;
  onSave: () => void;
}

export function MdxEditor({ slug, onClose, onSave }: MdxEditorProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [slug]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/blog/mdx?slug=${slug}`);
      const data = await response.json();
      setContent(data.content || '');
    } catch (error) {
      console.error('Error fetching MDX content:', error);
      // Could add error state here if needed
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Extract slug from frontmatter if changed
      const slugMatch = content.match(/^slug:\s*"?([^"\n]+)"?/m);
      const newSlug = slugMatch ? slugMatch[1] : slug;
      
      const response = await fetch('/api/admin/blog/mdx', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slug, 
          content,
          newSlug: newSlug !== slug ? newSlug : undefined
        }),
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const error = await response.json();
        console.error('Failed to save:', error.error);
      }
    } catch (error) {
      console.error('Error saving MDX content:', error);
      // Could add error state here if needed
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Edit MDX File: {slug}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className="px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80"
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : preview ? (
            <div className="h-full overflow-y-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans">{content}</pre>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 bg-muted border border-border rounded-lg text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="MDX content..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            💡 Tip: Edit frontmatter to change title, date, tags, etc.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}