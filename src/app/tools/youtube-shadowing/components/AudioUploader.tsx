'use client';

import { useState } from 'react';
import { Upload, Link, Loader2 } from 'lucide-react';
import { useStrings } from '@/contexts/LanguageContext';

interface AudioUploaderProps {
  onAudioReady: (audioUrl: string, title: string) => void;
}

export default function AudioUploader({ onAudioReady }: AudioUploaderProps) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [audioUrl, setAudioUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strings = useStrings();

  const handleUrlSubmit = () => {
    if (!audioUrl.trim()) {
      setError('Please enter a valid audio URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(audioUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setError(null);
    onAudioReady(audioUrl, 'Audio from URL');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file (MP3, WAV, etc.)');
      return;
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be less than 25MB');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create a blob URL for the file
      const blobUrl = URL.createObjectURL(file);
      onAudioReady(blobUrl, file.name);
    } catch (err) {
      setError('Failed to process audio file');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="font-medium text-foreground mb-4">
        {strings.youtubeShadowing?.uploadAudio || 'Alternative: Provide Your Own Audio'}
      </h3>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('url')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'url'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Link className="w-4 h-4 inline-block mr-2" />
          Audio URL
        </button>
        <button
          onClick={() => setMode('file')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'file'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Upload File
        </button>
      </div>

      {/* URL Input */}
      {mode === 'url' && (
        <div className="space-y-3">
          <input
            type="url"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://example.com/audio.mp3"
            className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!audioUrl.trim() || isLoading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Use This Audio
          </button>
        </div>
      )}

      {/* File Upload */}
      {mode === 'file' && (
        <div className="space-y-3">
          <label className="block">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="hidden"
            />
            <div className="w-full p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
              {isLoading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Processing...'
                  : 'Click to upload audio file (MP3, WAV, etc.)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Max 25MB</p>
            </div>
          </label>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground mt-4">
        Upload audio extracted locally or provide a direct audio URL. The AI will transcribe it for shadowing practice.
      </p>
    </div>
  );
}