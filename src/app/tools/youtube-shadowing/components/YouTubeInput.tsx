'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useStrings } from '@/contexts/LanguageContext';

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function YouTubeInput({ onSubmit, isLoading }: YouTubeInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const strings = useStrings();

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+.*$/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+.*$/,
      /^(https?:\/\/)?(m\.)?youtube\.com\/watch\?v=[\w-]+.*$/,
      /^(https?:\/\/)?(music\.)?youtube\.com\/watch\?v=[\w-]+.*$/  // YouTube Music support
    ];
    
    return patterns.some(pattern => pattern.test(url));
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([\w-]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      setError(strings.youtubeShadowing?.errors?.emptyUrl || 'Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(trimmedUrl)) {
      setError(strings.youtubeShadowing?.errors?.invalidUrl || 'Please enter a valid YouTube URL');
      return;
    }

    const videoId = extractVideoId(trimmedUrl);
    if (!videoId) {
      setError(strings.youtubeShadowing?.errors?.extractFailed || 'Could not extract video ID from URL');
      return;
    }

    // Normalize URL to standard format
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    onSubmit(normalizedUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="youtube-url" className="block text-sm font-medium text-foreground mb-2">
          {strings.youtubeShadowing?.urlLabel || 'YouTube URL'}
        </label>
        <div className="relative">
          <input
            id="youtube-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 pl-12 pr-12 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors bg-background text-foreground"
            disabled={isLoading}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Image
              src="/flat-icons/ui/youtube.svg"
              alt="YouTube"
              width={24}
              height={24}
              className="opacity-60"
            />
          </div>
          {url && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setUrl('');
                setError('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-md transition-colors"
              aria-label="Clear URL"
            >
              <svg className="w-5 h-5 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {strings.youtubeShadowing?.processing || 'Processing...'}
          </span>
        ) : (
          strings.youtubeShadowing?.extractButton || 'Extract Audio & Start'
        )}
      </button>

      <div className="text-sm text-muted-foreground">
        <p className="mb-2">{strings.youtubeShadowing?.supportedFormats || 'Supported formats:'}</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>youtube.com/watch?v=...</li>
          <li>youtu.be/...</li>
          <li>youtube.com/shorts/...</li>
          <li>m.youtube.com/watch?v=...</li>
          <li>music.youtube.com/watch?v=...</li>
        </ul>
      </div>
    </form>
  );
}