'use client';

import { useEffect, useState, useRef } from 'react';
import { TranscriptLine } from '../YouTubeShadowing';
import { useStrings } from '@/contexts/LanguageContext';
import SubtitleUploader from './SubtitleUploader';
import { TranscriptCacheManager } from '@/utils/transcriptCache';
import { UserEditedTranscriptsManager } from '@/utils/userEditedTranscripts';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { 
  YOUTUBE_EXTRACTION_MESSAGES, 
  CACHE_HIT_MESSAGES,
  getRandomLoadingMessage,
  getLoadingMessageSequence 
} from '@/utils/loadingMessages';

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
  
  // Refs for managing loading message rotation
  const loadingMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIndexRef = useRef(0);

  useEffect(() => {
    loadTranscript();
    
    // In development, expose debug function globally
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as any).debugListCachedTranscripts = TranscriptCacheManager.debugListAllCachedTranscripts;
      console.log('🔧 Debug: Run debugListCachedTranscripts() in console to see all cached transcripts');
    }
  }, [videoUrl]);

  // Start rotating loading messages when status is loading
  useEffect(() => {
    if (status === 'loading' && audioUrl === 'youtube-player') {
      // Start with a random message
      const initialMessage = getRandomLoadingMessage(YOUTUBE_EXTRACTION_MESSAGES);
      setLoadingMessage(initialMessage.message);
      
      // Rotate through messages every 2-3 seconds
      loadingMessageIntervalRef.current = setInterval(() => {
        const newMessage = getRandomLoadingMessage(YOUTUBE_EXTRACTION_MESSAGES);
        setLoadingMessage(newMessage.message);
      }, 2500);
    } else {
      // Clear interval when not loading
      if (loadingMessageIntervalRef.current) {
        clearInterval(loadingMessageIntervalRef.current);
        loadingMessageIntervalRef.current = null;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (loadingMessageIntervalRef.current) {
        clearInterval(loadingMessageIntervalRef.current);
      }
    };
  }, [status, audioUrl]);

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

      // Always check cache first, regardless of mode
      if (contentId && !contentId.startsWith('unknown_')) {

        const cachedTranscript = await TranscriptCacheManager.getCachedTranscript(contentId);
        
        if (cachedTranscript && cachedTranscript.transcript.length > 0) {

          const cacheMessage = getRandomLoadingMessage(CACHE_HIT_MESSAGES);
          setLoadingMessage(cacheMessage.message);
          
          // Check if user has edited this transcript
          if (user && isPremium) {
            const userEdited = await UserEditedTranscriptsManager.getUserEditedTranscript(
              user.uid,
              contentId
            );
            
            if (userEdited) {

              setStatus('completed');
              onTranscriptLoaded(userEdited.transcript, userEdited.metadata?.videoTitle || cachedTranscript.videoTitle);
              window.removeEventListener('error', handleError);
              return;
            }
          }
          
          // Include formatted transcript if available
          const enrichedMetadata = {
            ...cachedTranscript.metadata,
            formattedTranscript: cachedTranscript.formattedTranscript,
            hasFormattedVersion: !!cachedTranscript.formattedTranscript
          };
          
          setStatus('completed');
          onTranscriptLoaded(cachedTranscript.transcript, cachedTranscript.videoTitle, enrichedMetadata);
          window.removeEventListener('error', handleError);
          return;
        } else {

        }
      }
      
      // For YouTube player mode, try to extract subtitles if no cache
      if (audioUrl === 'youtube-player') {

        // Don't set a specific message here since the useEffect will handle rotation
        
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

              if (data.videoTitle) {

              }
              if (data.videoMetadata) {

              }
              
              // Save to cache for future use

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
              
              // Store formatted transcript in metadata if available

              const enrichedMetadata = {
                ...data.videoMetadata,
                formattedTranscript: data.formattedTranscript,
                hasFormattedVersion: data.hasFormattedVersion
              };
              
              setStatus('completed');
              onTranscriptLoaded(data.transcript, data.videoTitle, enrichedMetadata);
              return;
            } else {
              // No captions found
              const errorMessage = data.message || 'No Japanese captions found for this video.';

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
          // Handle error responses

          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              console.error('🎬 [CLIENT] API error data:', errorData);
              
              // Use the friendly error message from the API
              if (errorData.error) {
                setError(errorData.error);
              } else if (errorData.message) {
                setError(errorData.message);
              } else {
                setError('Unable to extract transcript. Please try uploading the audio file directly.');
              }
              
              // Show suggestions if available
              if (errorData.suggestions && Array.isArray(errorData.suggestions)) {
                const suggestionsText = '\n\n' + errorData.suggestions.join('\n');
                setError(prev => prev + suggestionsText);
              }
              
              setStatus('error');
            } catch (parseError) {
              console.error('Failed to parse error response:', parseError);
              setStatus('error');
              setError('Service error. Please try uploading audio or subtitles manually.');
            }
          } else if (contentType && contentType.includes('text/html')) {
            console.error('Server returned HTML error page');
            setStatus('error');
            setError('Service temporarily unavailable. The server may be restarting.');
          } else {
            const errorText = await response.text();
            console.error('Failed to extract subtitles:', errorText);
            setStatus('error');
            setError('Failed to connect to subtitle extraction service. Please try again or upload audio manually.');
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
      if (audioUrl !== 'youtube-player') {
        setLoadingMessage('Sending audio to OpenAI Whisper for transcription... 🎤');
      }
      
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
          
          // The API now returns user-friendly messages, so we can use them directly
          // Only override for specific cases that need additional context
          if (response.status === 401 && !errorMessage.includes('configured')) {
            errorMessage = 'OpenAI API key not configured or invalid. Please check the configuration.';
          } else if (response.status === 429 && !errorMessage.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.transcript || data.transcript.length === 0) {
        throw new Error('No transcript generated. The audio might be too short or unclear.');
      }

      // Save ALL content to cache (YouTube, audio, video) to avoid reprocessing
      // This saves API calls and processing time for duplicate content
      if (user) {
        try {
          // Show a fun saving message
          const savingMessages = [
            'Saving transcript for the next person (pay it forward!)... 💾',
            'Contributing to the community knowledge base... ☁️',
            'Storing in the transcript vault for future learners... 🏦',
            'Adding to the collective learning hive mind... 🐝'
          ];
          setLoadingMessage(savingMessages[Math.floor(Math.random() * savingMessages.length)]);
          
          // Prepare metadata based on content type
          const metadata: any = {
            transcriptionMethod: 'whisper'
          };
          
          if (videoUrl) {
            // For YouTube videos
            const youtubeVideoId = TranscriptCacheManager.generateContentId({
              type: 'youtube',
              videoUrl
            }).replace('youtube_', '');
            metadata.youtubeVideoId = youtubeVideoId;
          } else if (fileInfo) {
            // For uploaded files
            metadata.fileName = fileInfo.name;
            metadata.fileSize = fileInfo.size;
            metadata.fileType = fileInfo.type;
          }
          
          // Build cache params, only including defined values
          const cacheParams: any = {
            contentId,
            contentType: videoUrl ? 'youtube' : (fileInfo?.type.startsWith('video/') ? 'video' : 'audio'),
            videoTitle: videoUrl ? 
              `YouTube Video` : 
              (fileInfo?.name || 'Untitled'),
            transcript: data.transcript,
            language: data.language || 'ja',
            userId: user.uid,
            metadata
          };
          
          // Only add optional fields if they have values
          if (videoUrl) {
            cacheParams.videoUrl = videoUrl;
          }
          if (data.duration !== undefined && data.duration !== null) {
            cacheParams.duration = data.duration;
          }
          
          await TranscriptCacheManager.saveTranscriptToCache(cacheParams);
          
          console.log('✅ Successfully cached transcript for future use');
        } catch (cacheError) {
          // Don't fail the whole operation if caching fails
          // Just log the error and continue
          console.error('⚠️ Failed to cache transcript (non-critical):', cacheError);
        }
      } else {
        console.log('ℹ️ Skipping cache - user not authenticated');
      }

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
              {loadingMessage || 
                (audioUrl === 'youtube-player' 
                  ? 'Starting YouTube transcript extraction...' 
                  : 'Transcribing audio with OpenAI Whisper...')}
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
              ? loadingMessage?.includes('cache') 
                ? 'Checking if someone already transcribed this video...' 
                : loadingMessage?.includes('SupaData') 
                  ? 'Using advanced AI extraction (costs us $0.001 per video)...'
                  : 'Processing multiple APIs in parallel for best results...'
              : 'Using OpenAI Whisper to transcribe Japanese audio. This may take 30-60 seconds...'}
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
                <span className="text-2xl flex-shrink-0 mt-0.5">😔</span>
                <div className="flex-1">
                  {/* Friendly error messages with emojis */}
                  {error.includes('permission') ? (
                    <>
                      <p className="text-sm text-destructive font-medium">
                        🔒 Oops! We couldn't save the transcript
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This is usually a temporary issue. Please try again! 
                      </p>
                    </>
                  ) : error.includes('rate limit') ? (
                    <>
                      <p className="text-sm text-destructive font-medium">
                        ⏳ We've hit our daily limit for automatic transcripts
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        But don't worry! You can still upload subtitles manually or try again tomorrow 🌟
                      </p>
                    </>
                  ) : error.includes('\n\n') ? (
                    <>
                      <p className="text-sm text-destructive font-medium">{error.split('\n\n')[0]}</p>
                      <div className="mt-3 space-y-1">
                        {error.split('\n\n')[1]?.split('\n').map((suggestion, index) => (
                          <p key={index} className="text-sm text-muted-foreground">
                            💡 {suggestion}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-destructive font-medium">
                        📝 No Japanese captions found for this video
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        But you have options! Try a different video or upload subtitles manually 🎯
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => loadTranscript()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                {onGoBack && (
                  <button
                    onClick={onGoBack}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                  >
                    ← Go Back
                  </button>
                )}
                <span className="text-sm text-muted-foreground">
                  or upload subtitles manually 👇
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