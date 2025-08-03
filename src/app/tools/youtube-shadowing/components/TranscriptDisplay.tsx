'use client';

import { useEffect, useState } from 'react';
import { TranscriptLine } from '../page';
import { useStrings } from '@/contexts/LanguageContext';
import SubtitleUploader from './SubtitleUploader';
import { TranscriptCacheManager } from '@/utils/transcriptCache';
import { UserEditedTranscriptsManager } from '@/utils/userEditedTranscripts';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';

interface TranscriptDisplayProps {
  videoUrl: string;
  audioUrl: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
  onTranscriptLoaded: (transcript: TranscriptLine[], videoTitle?: string, videoMetadata?: any) => void;
  onGoBack?: () => void;
}

export default function TranscriptDisplay({ 
  videoUrl, 
  audioUrl, 
  fileInfo,
  onTranscriptLoaded,
  onGoBack 
}: TranscriptDisplayProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryHint, setShowRetryHint] = useState(false);
  const strings = useStrings();
  const { user } = useAuth();
  const { isPremium } = useSubscription2();

  useEffect(() => {
    loadTranscript();
  }, [videoUrl]);

  const loadTranscript = async () => {
    setStatus('loading');
    setError(null);
    
    // Add global error handler to prevent page reload
    const handleError = (e: ErrorEvent) => {
      console.error('Global error caught:', e);
      e.preventDefault();
      setStatus('error');
      setError('An unexpected error occurred. Please try again.');
    };
    
    window.addEventListener('error', handleError);

    // Declare contentId at the top of the try block
    let contentId: string = '';
    
    try {
      // Generate content ID for cache lookup FIRST
      if (videoUrl && !fileInfo) {
        // YouTube video
        contentId = TranscriptCacheManager.generateContentId({
          type: 'youtube',
          videoUrl: videoUrl
        });
      } else if (fileInfo) {
        // Generate content ID for uploaded files
        contentId = TranscriptCacheManager.generateContentId({
          type: fileInfo.type.startsWith('video/') ? 'video' : 'audio',
          fileName: fileInfo.name,
          fileSize: fileInfo.size
        });
      } else {
        // Fallback
        contentId = 'unknown_' + Date.now();
      }
      
      console.log('Generated contentId:', contentId);
      
      // Always check cache first, regardless of mode
      if (contentId && !contentId.startsWith('unknown_')) {
        console.log('Checking cache for contentId:', contentId);
        const cachedTranscript = await TranscriptCacheManager.getCachedTranscript(contentId);
        
        if (cachedTranscript && cachedTranscript.transcript.length > 0) {
          console.log('Found cached transcript! Using it instead of extraction.');
          console.log('Cache details:', {
            contentId,
            transcriptLength: cachedTranscript.transcript.length,
            videoTitle: cachedTranscript.videoTitle,
            accessCount: cachedTranscript.accessCount
          });
          setLoadingMessage('Found cached transcript!');
          
          // Check if user has edited this transcript
          if (user && isPremium) {
            const userEdited = await UserEditedTranscriptsManager.getUserEditedTranscript(
              user.uid,
              contentId
            );
            
            if (userEdited) {
              console.log('Using user-edited transcript!');
              setStatus('completed');
              onTranscriptLoaded(userEdited.transcript, userEdited.metadata?.videoTitle || cachedTranscript.videoTitle);
              window.removeEventListener('error', handleError);
              return;
            }
          }
          
          setStatus('completed');
          onTranscriptLoaded(cachedTranscript.transcript, cachedTranscript.videoTitle, cachedTranscript.metadata);
          window.removeEventListener('error', handleError);
          return;
        } else {
          console.log('No cached transcript found or empty transcript', {
            contentId,
            cacheExists: !!cachedTranscript,
            transcriptLength: cachedTranscript?.transcript?.length || 0
          });
        }
      }
      
      // For YouTube player mode, try to extract subtitles if no cache
      if (audioUrl === 'youtube-player') {
        // Use local Next.js API route
        const response = await fetch('/api/youtube/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: videoUrl
          })
        });

        const contentType = response.headers.get('content-type');
        
        if (response.ok) {
          // Check if response is JSON
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            if (data.success && data.transcript && data.transcript.length > 0) {
              console.log(`Found ${data.isAutoGenerated ? 'auto-generated' : 'manual'} subtitles using ${data.method}`);
              console.log(`Language: ${data.language}, Transcript count: ${data.transcript.length}`);
              if (data.videoTitle) {
                console.log(`Video title: ${data.videoTitle}`);
              }
              if (data.videoMetadata) {
                console.log('Video metadata:', data.videoMetadata);
              }
              
              // Save to cache for future use
              console.log('Saving extracted transcript to cache...');
              await TranscriptCacheManager.saveTranscriptToCache({
                contentId,
                contentType: 'youtube',
                videoUrl: videoUrl,
                videoTitle: data.videoTitle || 'Untitled',
                transcript: data.transcript,
                language: data.language || 'ja',
                duration: data.duration,
                userId: user?.uid,
                metadata: data.videoMetadata
              });
              
              setStatus('completed');
              onTranscriptLoaded(data.transcript, data.videoTitle, data.videoMetadata);
              return;
            } else {
              // No captions found
              const errorMessage = data.message || 'No Japanese captions found for this video.';
              console.log('No captions found:', data);
              
              // Still pass video metadata if available
              if (data.videoTitle || data.videoMetadata) {
                onTranscriptLoaded([], data.videoTitle, data.videoMetadata);
              }
              
              setStatus('error');
              setError(errorMessage);
              return;
            }
          } else {
            // HTML response, likely an error page
            console.error('Received HTML instead of JSON, likely a 404 or server error');
            setStatus('error');
            setError('Service temporarily unavailable. Please try uploading audio or subtitles manually.');
            return;
          }
        } else {
          if (contentType && contentType.includes('text/html')) {
            console.error('Server returned HTML error page');
            setStatus('error');
            setError('Service temporarily unavailable. The server may be restarting.');
          } else {
            const errorText = await response.text();
            console.error('Failed to extract subtitles:', errorText);
            setStatus('error');
            setError('Failed to connect to subtitle extraction service');
          }
          return;
        }
        
        // Fallback to placeholder if subtitle extraction fails
        const placeholderTranscript: TranscriptLine[] = [
          {
            id: '1',
            text: 'この動画には日本語字幕がありません。',
            startTime: 0,
            endTime: 3,
            words: ['この動画には', '日本語字幕が', 'ありません']
          },
          {
            id: '2',
            text: '音声をアップロードしてAIで文字起こしすることができます。',
            startTime: 3,
            endTime: 6,
            words: ['音声を', 'アップロードして', 'AIで', '文字起こし', 'することができます']
          }
        ];
        
        setStatus('completed');
        onTranscriptLoaded(placeholderTranscript);
        return;
      }
      
      // If not YouTube mode or no cached transcript found, check for uploaded files
      setLoadingMessage('Checking for cached transcript...');

      // No cache hit, proceed with transcription
      setLoadingMessage('Generating new transcript...');
      
      // Call our local Whisper transcription API
      const requestBody: any = {
        language: 'ja' // Japanese language
      };

      // Handle blob URLs by converting to base64
      if (audioUrl.startsWith('blob:')) {
        try {
          const response = await fetch(audioUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          const base64Data = await base64Promise;
          requestBody.audioBlob = base64Data;
        } catch (error) {
          console.error('Failed to convert blob URL to base64:', error);
          requestBody.audioUrl = audioUrl; // Fallback to URL
        }
      } else {
        requestBody.audioUrl = audioUrl;
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to transcribe audio';
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          if (response.status === 401) {
            errorMessage = 'OpenAI API key not configured or invalid. Please check the configuration.';
          } else if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
          } else if (errorMessage.includes('API key not configured')) {
            errorMessage = 'The transcription service is not properly configured. Please use manual transcript upload instead.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.transcript || data.transcript.length === 0) {
        throw new Error('No transcript generated. The audio might be too short or unclear.');
      }

      // Save to cache for future use
      setLoadingMessage('Saving transcript for future use...');
      
      // Extract YouTube video ID if it's a YouTube URL
      const youtubeVideoId = videoUrl ? TranscriptCacheManager.generateContentId({
        type: 'youtube',
        videoUrl
      }).replace('youtube_', '') : undefined;
      
      await TranscriptCacheManager.saveTranscriptToCache({
        contentId,
        contentType: videoUrl ? 'youtube' : 'audio',
        videoUrl: videoUrl || undefined,
        videoTitle: videoUrl ? `YouTube Video (${youtubeVideoId})` : fileInfo?.name || 'Untitled',
        transcript: data.transcript,
        language: data.language || 'ja',
        duration: data.duration,
        userId: user?.uid,
        metadata: {
          youtubeVideoId: youtubeVideoId,
          // Mark that this was transcribed via Whisper (no original metadata)
          transcriptionMethod: 'whisper',
          fileInfo: fileInfo
        }
      });

      setStatus('completed');
      onTranscriptLoaded(data.transcript);

    } catch (err) {
      setStatus('error');
      console.error('Transcript loading error:', err);
      
      // Handle different error types
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. The transcription is taking too long. Please try a shorter audio file.');
        } else if (err.message.includes('Failed to fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load transcript');
      }
    } finally {
      // Clean up error handler
      window.removeEventListener('error', handleError);
    }
  };

  const retry = () => {
    setRetryCount(prev => prev + 1);
    setShowRetryHint(false);
    // Show retry hint after first failure
    if (retryCount === 0) {
      setTimeout(() => setShowRetryHint(true), 3000);
    }
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
            <span className="text-sm text-muted-foreground">
              {audioUrl === 'youtube-player' 
                ? (retryCount === 0 
                    ? 'Checking for YouTube subtitles...' 
                    : retryCount === 1 
                      ? 'Giving it another shot... 🎲'
                      : 'Third time\'s the charm! 🍀')
                : (loadingMessage || strings.youtubeShadowing?.fetchingTranscript || 'Transcribing audio with OpenAI Whisper...')}
            </span>
          </div>
          
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground">
            {audioUrl === 'youtube-player'
              ? 'Looking for manual or auto-generated captions...'
              : (strings.youtubeShadowing?.transcriptNote || 'Using OpenAI Whisper to transcribe Japanese audio. This may take 30-60 seconds...')}
          </p>
        </div>
      )}

      {status === 'completed' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">{strings.youtubeShadowing?.transcriptSuccess || 'Transcript loaded successfully!'}</span>
          </div>
          {loadingMessage.includes('cached') && (
            <p className="text-xs text-muted-foreground ml-8">
              Using cached transcript - loaded instantly from community database! 🚀
            </p>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          {/* Show SubtitleUploader for YouTube videos */}
          {audioUrl === 'youtube-player' ? (
            <>
              <div className="flex items-start gap-3 mb-4">
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
              
              <div className="flex items-center gap-3 mb-4">
                {onGoBack && (
                  <button
                    onClick={onGoBack}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                  >
                    ← Go Back
                  </button>
                )}
                <span className="text-sm text-muted-foreground">
                  {onGoBack ? 'or upload subtitles manually:' : 'Upload subtitles manually:'}
                </span>
              </div>
              
              <SubtitleUploader onSubtitlesLoaded={onTranscriptLoaded} />
            </>
          ) : (
            <>
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
              
              <div className="space-y-3">
                <button
                  onClick={retry}
                  className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-2"
                >
                  {retryCount === 0 ? '🔄' : retryCount === 1 ? '🤔' : '💪'} 
                  {strings.youtubeShadowing?.tryAgain || 'Try again'}
                </button>
                
                {showRetryHint && retryCount === 1 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Pro tip:</strong> Sometimes the subtitle elves are just taking a coffee break! 
                      Trying again often works like magic. ☕✨
                    </p>
                  </div>
                )}
                
                {retryCount >= 2 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mt-3">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      🎯 <strong>Still not working?</strong> The video might genuinely lack Japanese captions. 
                      You can upload the audio manually above for AI transcription! 
                      {retryCount >= 3 && " (You're persistent, I like that! 😄)"}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}