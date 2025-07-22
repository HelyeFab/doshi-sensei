'use client';

import { useEffect, useState } from 'react';
import { TranscriptLine } from '../page';
import { useStrings } from '@/contexts/LanguageContext';

interface TranscriptDisplayProps {
  videoUrl: string;
  audioUrl: string;
  onTranscriptLoaded: (transcript: TranscriptLine[]) => void;
}

export default function TranscriptDisplay({ 
  videoUrl, 
  audioUrl, 
  onTranscriptLoaded 
}: TranscriptDisplayProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const strings = useStrings();

  useEffect(() => {
    loadTranscript();
  }, [videoUrl]);

  const loadTranscript = async () => {
    setStatus('loading');
    setError(null);

    try {
      // TODO: Replace with actual API call
      // This would fetch YouTube captions or use speech-to-text
      
      // Mock transcript data for demonstration
      const mockTranscript: TranscriptLine[] = [
        {
          id: '1',
          text: 'こんにちは、今日は日本語の勉強について話します。',
          startTime: 0,
          endTime: 3.5,
          words: ['こんにちは', '今日は', '日本語の', '勉強について', '話します']
        },
        {
          id: '2',
          text: '日本語を学ぶことは楽しいですが、時々難しいです。',
          startTime: 3.5,
          endTime: 7.2,
          words: ['日本語を', '学ぶことは', '楽しいですが', '時々', '難しいです']
        },
        {
          id: '3',
          text: '毎日練習することが大切です。',
          startTime: 7.2,
          endTime: 10.0,
          words: ['毎日', '練習することが', '大切です']
        },
        {
          id: '4',
          text: 'シャドーイングは発音を改善する良い方法です。',
          startTime: 10.0,
          endTime: 13.5,
          words: ['シャドーイングは', '発音を', '改善する', '良い', '方法です']
        },
        {
          id: '5',
          text: '一緒に頑張りましょう！',
          startTime: 13.5,
          endTime: 15.5,
          words: ['一緒に', '頑張りましょう']
        }
      ];

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStatus('completed');
      onTranscriptLoaded(mockTranscript);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
      console.error('Transcript loading error:', err);
    }
  };

  const retry = () => {
    loadTranscript();
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="font-medium text-foreground mb-4">{strings.youtubeShadowing?.loadingTranscript || 'Loading Transcript'}</h3>
      
      {status === 'loading' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-muted-foreground">{strings.youtubeShadowing?.fetchingTranscript || 'Fetching transcript...'}</span>
          </div>
          
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground">
            {strings.youtubeShadowing?.transcriptNote || 'Looking for captions or generating transcript...'}
          </p>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center gap-3 text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">{strings.youtubeShadowing?.transcriptSuccess || 'Transcript loaded successfully!'}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {strings.youtubeShadowing?.transcriptErrorNote || 'The video might not have captions available'}
              </p>
            </div>
          </div>
          
          <button
            onClick={retry}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {strings.youtubeShadowing?.tryAgain || 'Try again'}
          </button>
        </div>
      )}

    </div>
  );
}