'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { User } from 'firebase/auth';

interface RegenerateImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  currentImageUrl?: string;
  currentPrompt: string;
  characterName: string;
  characterDescription: string;
  visualStyle: string;
  modelSheetUrl?: string;
  characterId?: string;
  sessionId?: string;
  onRegenerate: (newImageUrl: string, newPrompt: string) => void;
  user: User | null;
}

export default function RegenerateImageModal({
  isOpen,
  onClose,
  pageNumber,
  currentImageUrl,
  currentPrompt,
  characterName,
  characterDescription,
  visualStyle,
  modelSheetUrl,
  characterId,
  sessionId,
  onRegenerate,
  user
}: RegenerateImageModalProps) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/regenerate-story-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          pageNumber,
          imagePrompt: prompt,
          characterName,
          characterDescription,
          visualStyle,
          modelSheetUrl,
          characterId,
          sessionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate image');
      }

      const { imageUrl, revisedPrompt } = await response.json();
      setPreviewUrl(imageUrl);
      
      // Update the prompt with the revised version if it was changed by DALL-E
      if (revisedPrompt && revisedPrompt !== prompt) {
        setPrompt(revisedPrompt);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (previewUrl) {
      onRegenerate(previewUrl, prompt);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background text-foreground rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Regenerate Image - Page {pageNumber}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Current Image */}
          {currentImageUrl && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Current Image</h3>
              <img 
                src={currentImageUrl} 
                alt={`Current page ${pageNumber}`}
                className="w-full max-w-md mx-auto rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* Character Info */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Character Information</h3>
            <p className="text-sm"><strong>Name:</strong> {characterName}</p>
            <p className="text-sm"><strong>Description:</strong> {characterDescription}</p>
            <p className="text-sm"><strong>Style:</strong> {visualStyle}</p>
            {characterId && (
              <p className="text-sm"><strong>Character ID:</strong> <code className="bg-muted-foreground/20 px-1 rounded">{characterId}</code></p>
            )}
            {modelSheetUrl && (
              <p className="text-sm text-primary">
                ✓ Character model sheet available for consistency
              </p>
            )}
          </div>

          {/* Prompt Editor */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Image Prompt (Edit as needed)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 p-3 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Describe the scene..."
            />
            <p className="text-sm text-muted-foreground mt-1">
              The character details and style will be automatically added to ensure consistency.
            </p>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">New Image Preview</h3>
              <img 
                src={previewUrl} 
                alt={`New preview for page ${pageNumber}`}
                className="w-full max-w-md mx-auto rounded-lg shadow-lg border-4 border-green-500"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            {previewUrl && (
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Accept New Image
              </button>
            )}
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? 'Generating...' : previewUrl ? 'Try Again' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}