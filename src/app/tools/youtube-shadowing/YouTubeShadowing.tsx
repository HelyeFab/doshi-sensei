'use client';

import { useState, useRef, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useAuth } from '@/contexts/AuthContext';
import { practiceHistoryService } from '@/services/practiceHistory/PracticeHistoryService';
import { TranscriptCacheManager } from '@/utils/transcriptCache';
import { videoHistoryService } from '@/services/videoHistory';
import { AccordionItem } from '@/components/Accordion';
import YouTubeInput from './components/YouTubeInput';
import FileUploader from './components/FileUploader';
import AudioExtractor from './components/AudioExtractor';
import TranscriptDisplay from './components/TranscriptDisplay';
import ShadowingPlayer from './components/ShadowingPlayer';
import YouTubePlayer from './components/YouTubePlayer';
import EditableTranscriptReader from './components/EditableTranscriptReader';
import EnhancedShadowingPlayer from './components/EnhancedShadowingPlayer';
import ShadowingAudioPlayer from '@/components/audio/ShadowingAudioPlayer';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Media Shadowing Practice - Doshi Sensei",
  "description": "Practice Japanese shadowing with YouTube videos or your own media files. Get AI-generated transcripts and improve your pronunciation.",
  "url": "https://doshisensei.com/tools/youtube-shadowing"
};

export interface TranscriptLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words?: string[];
}

export interface ShadowingSession {
  videoUrl: string;
  videoTitle?: string;
  audioUrl?: string;
  transcript: TranscriptLine[];
  currentLineIndex: number;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
  videoMetadata?: {
    title: string;
    channelTitle: string;
    description: string;
    thumbnails: any;
    duration: string;
    publishedAt: string;
  };
}

export default function YouTubeShadowing() {
  const strings = useStrings();
  const { checkAndTrack, canUse, remaining } = useFeature('youtube_shadowing', {
    showToast: true,
    showModal: true,
    trackUsage: true
  });
  const { checkAndTrack: checkAndTrackUpload, remaining: remainingUploads } = useFeature('uploaded_media_shadowing', {
    showToast: true,
    showModal: true,
    trackUsage: true
  });
  const { isPremium, userType } = useSubscription2();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ShadowingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFurigana, setShowFurigana] = useState(true);
  const [showGrammar, setShowGrammar] = useState(false);
  const [grammarMode, setGrammarMode] = useState<'none' | 'all' | 'content' | 'grammar'>('content');
  const [showShadowingMode, setShowShadowingMode] = useState(true);
  const [isVideoFree, setIsVideoFree] = useState(false);
  const [inputMode, setInputMode] = useState<'youtube' | 'upload'>('youtube');
  const previousUrlsRef = useRef<{ videoUrl?: string; audioUrl?: string }>({});

  // Debug logging helper
  const debugLog = (category: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();

  };

  // Parse YouTube duration format (ISO 8601) to seconds
  const parseDuration = (duration: string): number => {
    if (!duration) return 0;
    
    // YouTube uses ISO 8601 format: PT1H2M10S = 1 hour, 2 minutes, 10 seconds
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/,
      /youtube\.com\/shorts\/([^&\s]+)/,
      /music\.youtube\.com\/watch\?v=([^&\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = session?.videoUrl ? extractVideoId(session.videoUrl) : null;

  // Create short YouTube URL
  const getShortYouTubeUrl = (url: string): string => {
    const id = extractVideoId(url);
    return id ? `youtu.be/${id}` : url;
  };

  // Generate content ID for caching
  const getContentId = (): string => {
    if (!session) return '';
    
    if (session.videoUrl && (!session.fileInfo || session.videoUrl.includes('youtube'))) {
      return TranscriptCacheManager.generateContentId({
        type: 'youtube',
        videoUrl: session.videoUrl
      });
    } else if (session.fileInfo) {
      return TranscriptCacheManager.generateContentId({
        type: session.fileInfo.type.startsWith('video/') ? 'video' : 'audio',
        fileName: session.fileInfo.name,
        fileSize: session.fileInfo.size
      });
    }
    
    return 'unknown_' + Date.now();
  };

  // Determine content type
  const getContentType = (): 'youtube' | 'audio' | 'video' => {
    if (!session) return 'youtube';
    
    if (session.videoUrl && (!session.fileInfo || session.videoUrl.includes('youtube'))) {
      return 'youtube';
    } else if (session.fileInfo) {
      return session.fileInfo.type.startsWith('video/') ? 'video' : 'audio';
    }
    
    return 'youtube';
  };

  // Initialize practice history and video history services
  useEffect(() => {
    debugLog('PRACTICE_HISTORY_INIT', 'Initializing practice history service', {
      userId: user?.uid,
      userType,
      isPremium,
      isAuthenticated: !!user
    });
    
    if (user || userType === 'guest') {
      // Initialize practice history
      practiceHistoryService.initialize(user?.uid, isPremium).then(() => {
        const status = practiceHistoryService.getStatus();
        debugLog('PRACTICE_HISTORY_INIT', 'Service initialized successfully', status);
      }).catch(error => {
        debugLog('PRACTICE_HISTORY_INIT', 'Failed to initialize service', error);
      });
      
      // Initialize video history
      const initVideoHistory = async () => {
        try {
          // Check if we need to migrate guest history
          if (user?.uid && userType !== 'guest') {
            // User just signed in - migrate any guest history
            await videoHistoryService.migrateGuestHistory(user.uid);
            debugLog('VIDEO_HISTORY_MIGRATION', 'Migrated guest history to user account', {
              userId: user.uid
            });
          } else {
            // Normal initialization
            await videoHistoryService.initialize(user?.uid);
          }
          
          debugLog('VIDEO_HISTORY_INIT', 'Video history service initialized', {
            userId: user?.uid,
            videoCount: videoHistoryService.getUniqueVideoCount()
          });
        } catch (error) {
          debugLog('VIDEO_HISTORY_INIT', 'Failed to initialize video history', error);
        }
      };
      
      initVideoHistory();
    } else {
      debugLog('PRACTICE_HISTORY_INIT', 'Skipping init - no user');
    }
  }, [user, isPremium, userType]);

  // Handle URL parameters (e.g., from My Videos)
  useEffect(() => {
    const urlParam = searchParams.get('url');
    const fromHistory = searchParams.get('fromHistory');
    const fromPopular = searchParams.get('fromPopular');
    
    if (urlParam && !session) {
      // Decode the URL and automatically start processing
      const decodedUrl = decodeURIComponent(urlParam);

      handleUrlSubmit(decodedUrl);
    }
  }, [searchParams]);

  // Cleanup blob URLs when component unmounts or session changes
  useEffect(() => {
    return () => {
      // Cleanup any previous blob URLs
      if (previousUrlsRef.current.videoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrlsRef.current.videoUrl);
      }
      if (previousUrlsRef.current.audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrlsRef.current.audioUrl);
      }
    };
  }, []);

  // Helper function to safely update session with cleanup
  const updateSession = (newSession: ShadowingSession | null) => {
    // Cleanup previous blob URLs
    if (session?.videoUrl?.startsWith('blob:') && session.videoUrl !== newSession?.videoUrl) {
      URL.revokeObjectURL(session.videoUrl);
    }
    if (session?.audioUrl?.startsWith('blob:') && session.audioUrl !== newSession?.audioUrl) {
      URL.revokeObjectURL(session.audioUrl);
    }
    
    // Update refs
    if (newSession) {
      previousUrlsRef.current = {
        videoUrl: newSession.videoUrl,
        audioUrl: newSession.audioUrl
      };
    }
    
    setSession(newSession);
  };

  const handleUrlSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Extract video ID from URL
      const videoId = extractVideoId(url);
      
      if (!videoId) {
        setError('Invalid YouTube URL');
        setIsLoading(false);
        return;
      }
      
      // Check if user has already used this video
      const hasUsedVideo = videoHistoryService.hasUsedVideo(videoId);
      
      if (hasUsedVideo) {
        // Video is free - user has already accessed it before
        debugLog('VIDEO_ACCESS', 'Free access - video in history', { videoId });
        setIsVideoFree(true);
        
        // Proceed without checking limits
        updateSession({
          videoUrl: url,
          transcript: [],
          currentLineIndex: 0
        });
      } else {
        // New video - check access limits
        debugLog('VIDEO_ACCESS', 'New video - checking limits', { videoId });
        setIsVideoFree(false);
        
        const canUse = await checkAndTrack();
        
        if (!canUse) {
          // Access denied - modal will be shown automatically
          setIsLoading(false);
          return;
        }
        
        // Add video to history for future free access
        await videoHistoryService.addVideo(videoId);
        debugLog('VIDEO_HISTORY', 'Added video to history', { 
          videoId,
          totalVideos: videoHistoryService.getUniqueVideoCount()
        });
        
        // Proceed with video
        updateSession({
          videoUrl: url,
          transcript: [],
          currentLineIndex: 0
        });
      }
    } catch (err) {
      setError('Failed to process YouTube URL');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check access limits for uploads
      const canUse = await checkAndTrackUpload();
      
      if (!canUse) {
        // Access denied - modal will be shown automatically
        setIsLoading(false);
        return;
      }
      
      // Create blob URL for the file
      const blobUrl = URL.createObjectURL(file);
      
      // Determine if it's video or audio
      const isVideo = file.type.startsWith('video/');
      
      // Create session with file info
      // For both video and audio files, we set audioUrl to trigger transcription
      updateSession({
        videoUrl: blobUrl,
        videoTitle: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        transcript: [],
        currentLineIndex: 0,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        audioUrl: blobUrl // Set audioUrl for both video and audio to trigger transcription
      });
      
      debugLog('FILE_UPLOAD', 'File uploaded successfully', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isVideo
      });
    } catch (err) {
      setError('Failed to process uploaded file');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioExtracted = (audioUrl: string, title?: string) => {
    if (session) {
      updateSession({
        ...session,
        audioUrl,
        videoTitle: title
      });
    }
  };

  const handleTranscriptLoaded = async (transcript: TranscriptLine[], videoTitle?: string, videoMetadata?: any) => {
    debugLog('TRANSCRIPT_LOADED', 'Transcript received', {
      transcriptLength: transcript.length,
      videoTitle,
      hasMetadata: !!videoMetadata,
      sessionExists: !!session,
      videoId: session?.videoUrl ? extractVideoId(session.videoUrl) : null
    });
    
    if (session) {
      updateSession({
        ...session,
        transcript,
        ...(videoTitle && { videoTitle }),
        ...(videoMetadata && { videoMetadata })
      });
      
      // Save to practice history if it's a YouTube video AND user is authenticated
      if (session.videoUrl && videoId && user && user.uid) {
        debugLog('PRACTICE_HISTORY_SAVE', 'Starting save process', {
          videoId,
          videoUrl: session.videoUrl,
          videoTitle: videoTitle || session.videoTitle,
          userId: user.uid,
          userEmail: user.email,
          isAuthenticated: !!user,
          serviceStatus: practiceHistoryService.getStatus()
        });
        
        try {
          const now = new Date();
          const practiceItem = {
            id: `${user?.uid || 'guest'}_${videoId}`,
            videoUrl: session.videoUrl,
            videoTitle: videoTitle || session.videoTitle || 'Untitled Video',
            videoId: videoId,
            thumbnailUrl: videoMetadata?.thumbnails?.medium?.url || videoMetadata?.thumbnails?.default?.url,
            channelName: videoMetadata?.channelTitle,
            lastPracticed: now,
            firstPracticed: now,
            practiceCount: 1,
            contentType: 'youtube' as const,
            duration: videoMetadata?.duration ? parseDuration(videoMetadata.duration) : undefined,
            totalPracticeTime: 0,
            metadata: {
              channelTitle: videoMetadata?.channelTitle,
              description: videoMetadata?.description,
              publishedAt: videoMetadata?.publishedAt,
            }
          };
          
          debugLog('PRACTICE_HISTORY_SAVE', 'Practice item prepared', practiceItem);
          
          // Check if already exists and update practice count
          const existingItem = await practiceHistoryService.getItem(videoId);
          debugLog('PRACTICE_HISTORY_SAVE', 'Checked for existing item', { found: !!existingItem, existingItem });
          
          if (existingItem) {
            practiceItem.firstPracticed = existingItem.firstPracticed;
            practiceItem.practiceCount = (existingItem.practiceCount || 0) + 1;
            practiceItem.totalPracticeTime = existingItem.totalPracticeTime || 0;
            debugLog('PRACTICE_HISTORY_SAVE', 'Updated practice count', { 
              existingCount: existingItem.practiceCount,
              newCount: practiceItem.practiceCount 
            });
          }
          
          debugLog('PRACTICE_HISTORY_SAVE', 'Calling addOrUpdateItem...');
          await practiceHistoryService.addOrUpdateItem(practiceItem);
          debugLog('PRACTICE_HISTORY_SAVE', '✅ Successfully saved to practice history', { videoTitle });
          
          // Verify it was saved
          const savedItem = await practiceHistoryService.getItem(videoId);
          debugLog('PRACTICE_HISTORY_SAVE', 'Verification check', { savedSuccessfully: !!savedItem, savedItem });
          
        } catch (error: any) {
          debugLog('PRACTICE_HISTORY_SAVE', '❌ Failed to save practice history', { 
            error: error.message,
            code: error.code,
            stack: error.stack
          });
        }
      } else {
        debugLog('PRACTICE_HISTORY_SAVE', '⚠️ Not saving to practice history', {
          reason: !user ? 'User not authenticated' : !videoId ? 'No video ID' : 'No session URL',
          sessionUrl: session?.videoUrl,
          videoId,
          userAuthenticated: !!user,
          userId: user?.uid
        });
        if (!user) {
          debugLog('PRACTICE_HISTORY_SAVE', 'Guest users cannot save practice history - please sign in!');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      <SmartPageHeader 
        title={strings.youtubeShadowing?.title || "YouTube Shadowing"}
      />
      
      {/* How to use Shadowing */}
      <div className="px-4 mb-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <AccordionItem 
            title="How to Use Shadowing"
            icon={<span className="text-xl">🎥</span>}
            defaultOpen={false}
            className="border-0"
          >
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside mb-4">
              <li>Paste a YouTube URL or upload your own video/audio file</li>
              <li>Wait for the AI to generate Japanese subtitles (usually 20-30 seconds)</li>
              <li>Use the player controls to practice: play, pause, and repeat sentences</li>
              <li>Click on any line to jump to that part of the content</li>
            </ol>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-base mt-0.5">💡</span>
              <p className="text-sm text-foreground">
                <span className="font-medium">Quick tip:</span> To change playback settings, pause the video first. Settings can't be adjusted during playback.
              </p>
            </div>
          </AccordionItem>
        </div>
      </div>
      
      {/* Usage Display */}
      {userType !== 'guest' && (
        <div className="px-4 mb-4 space-y-2">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {userType === 'free' ? 'New videos today' : 'Today\'s usage'}
              </span>
              <span className="text-sm font-medium">
                {isPremium ? (
                  <span className="text-green-600 dark:text-green-400">Unlimited</span>
                ) : remaining === undefined || remaining === null ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : remaining > 0 ? (
                  <span className="text-primary">{remaining} new {remaining === 1 ? 'video' : 'videos'} remaining</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">Daily limit reached</span>
                )}
              </span>
            </div>
          </div>
          
          {/* Free Access Info */}
          {!isPremium && (
            <div className="bg-accent/10 rounded-lg p-2.5 border border-accent/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>✨</span>
                <span>Videos you've used before have <span className="font-medium text-foreground">free unlimited access</span> for practice!</span>
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Guest users notice */}
      {userType === 'guest' && (
        <div className="px-4 mb-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Sign in to start practicing with YouTube shadowing and save your progress.
            </p>
          </div>
        </div>
      )}

      <div className="px-4 pb-20">
        <AnimatePresence mode="wait">
          {!session && (
            <motion.div
              key="start-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl p-10 mb-8 text-white overflow-hidden"
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                  <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-white rounded-full blur-3xl" />
                </div>
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <div className="text-6xl mb-4">🎬</div>
                  <h2 className="text-3xl font-bold mb-3">
                    {strings.youtubeShadowing?.subtitle || "Master Japanese with Any Media"}
                  </h2>
                  <p className="text-lg opacity-90 max-w-2xl mx-auto">
                    {strings.youtubeShadowing?.description || "Turn YouTube videos or your own media files into interactive shadowing practice sessions. Get AI-powered transcripts and improve your pronunciation!"}
                  </p>
                </div>
              </motion.div>


              {/* Input Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl shadow-lg border border-border p-8 mb-6"
              >
                {/* Input Mode Tabs */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setInputMode('youtube')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                      inputMode === 'youtube'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>📺</span>
                      YouTube URL
                    </span>
                  </button>
                  <button
                    onClick={() => setInputMode('upload')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                      inputMode === 'upload'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>📤</span>
                      Upload File
                    </span>
                  </button>
                </div>
                
                {/* YouTube Input */}
                {inputMode === 'youtube' && (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                      <span className="text-2xl">📺</span>
                      Paste YouTube URL
                    </h3>
                    
                    <YouTubeInput 
                      onSubmit={handleUrlSubmit}
                      isLoading={isLoading}
                    />
                  </>
                )}
                
                {/* File Upload */}
                {inputMode === 'upload' && (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                      <span className="text-2xl">📤</span>
                      Upload Media File
                    </h3>
                    
                    <FileUploader
                      onFileSelect={handleFileUpload}
                      isLoading={isLoading}
                      maxSizeMB={isPremium ? 200 : 50}
                    />
                    
                    {/* Usage Display for Uploads */}
                    {userType !== 'guest' && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Upload limit today
                          </span>
                          <span className="text-sm font-medium">
                            {isPremium ? (
                              <span className="text-green-600 dark:text-green-400">Unlimited</span>
                            ) : remainingUploads === undefined || remainingUploads === null ? (
                              <span className="text-muted-foreground">Loading...</span>
                            ) : remainingUploads > 0 ? (
                              <span className="text-primary">{remainingUploads} {remainingUploads === 1 ? 'upload' : 'uploads'} remaining</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">Daily limit reached</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">🤷</span>
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                          Oops! Something went sideways...
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          {error}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          💡 Tip: Try again - it often works on the second attempt!
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>


              {/* Popular Videos CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-600/20 dark:to-pink-600/20 rounded-2xl border border-purple-500/20 dark:border-purple-600/30 p-6 md:p-8 mb-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground mb-2 flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      Community Favorites
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base">
                      Skip the wait! Browse YouTube videos already transcribed by the community for instant practice.
                    </p>
                  </div>
                  <SmartNavigationLink href="/popular-videos"
                    className="w-full md:w-auto text-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium whitespace-nowrap"
                   title="Browse Videos">
                    Browse Videos
                  </SmartNavigationLink>
                </div>
              </motion.div>

              {/* Features Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <div className="text-3xl mb-3">🎯</div>
                  <h4 className="font-semibold text-foreground mb-2">Instant Transcripts</h4>
                  <p className="text-sm text-muted-foreground">
                    AI-powered transcription in seconds
                  </p>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <div className="text-3xl mb-3">🗣️</div>
                  <h4 className="font-semibold text-foreground mb-2">Shadow Practice</h4>
                  <p className="text-sm text-muted-foreground">
                    Perfect your pronunciation & rhythm
                  </p>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <div className="text-3xl mb-3">📚</div>
                  <h4 className="font-semibold text-foreground mb-2">Furigana Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Reading assistance for all levels
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {session && (
            <motion.div
              key="session-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto"
            >
              {/* Video Info Card */}
              {(session.videoTitle || session.videoMetadata) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white relative"
                >
                  {/* Free Access Badge */}
                  {isVideoFree && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <span>✨</span> Free Access
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    {/* Video Thumbnail or Icon */}
                    {session.videoMetadata?.thumbnails?.medium ? (
                      <img 
                        src={session.videoMetadata.thumbnails.medium.url}
                        alt={session.videoTitle || 'Video thumbnail'}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="text-4xl flex-shrink-0">🎬</div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold mb-1 truncate">
                        {session.videoTitle || session.videoMetadata?.title || 'Loading video title...'}
                      </h2>
                      {session.videoMetadata?.channelTitle && (
                        <p className="text-sm opacity-90 mb-1">
                          by {session.videoMetadata.channelTitle}
                        </p>
                      )}
                      <p className="text-sm opacity-80 truncate">
                        {session.videoUrl.includes('youtube.com') || session.videoUrl.includes('youtu.be') 
                          ? getShortYouTubeUrl(session.videoUrl)
                          : session.videoUrl}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Audio Extraction - Only for YouTube videos */}
              {!session.audioUrl && !session.fileInfo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <AudioExtractor
                    videoUrl={session.videoUrl}
                    onAudioExtracted={handleAudioExtracted}
                  />
                </motion.div>
              )}
              
              {/* For uploaded video files, extract audio if needed */}
              {!session.audioUrl && session.fileInfo && session.fileInfo.type.startsWith('video/') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card rounded-xl p-6 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                      <span className="text-xl">🎬</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Video file ready</p>
                      <p className="text-xs text-muted-foreground">
                        {session.fileInfo.name} • Ready for transcription
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Transcript Loading */}
              {session.audioUrl && session.transcript.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <TranscriptDisplay
                    videoUrl={session.videoUrl}
                    audioUrl={session.audioUrl}
                    fileInfo={session.fileInfo}
                    onTranscriptLoaded={handleTranscriptLoaded}
                  />
                </motion.div>
              )}

              {/* Video and Transcript Display */}
              {((session.audioUrl || (session.videoUrl && videoId)) && session.transcript.length > 0) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  {/* Mode Toggle - Clean Two Button Layout */}
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowShadowingMode(true)}
                        className={`px-4 py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base ${
                          showShadowingMode 
                            ? 'bg-primary text-primary-foreground shadow-md' 
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <span className="hidden sm:inline">Shadowing Mode</span>
                        <span className="sm:hidden">Shadowing</span>
                      </button>
                      <button
                        onClick={() => setShowShadowingMode(false)}
                        className={`px-4 py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base ${
                          !showShadowingMode 
                            ? 'bg-primary text-primary-foreground shadow-md' 
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <span className="hidden sm:inline">Transcript Mode</span>
                        <span className="sm:hidden">Transcript</span>
                      </button>
                    </div>
                  </div>

                  {/* Transcript Reader */}
                  {!showShadowingMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <EditableTranscriptReader
                        transcript={session.transcript}
                        currentLineIndex={session.currentLineIndex}
                        onLineClick={(index) => updateSession({ ...session, currentLineIndex: index })}
                        showFurigana={showFurigana}
                        showGrammar={showGrammar}
                        contentId={getContentId()}
                        contentType={getContentType()}
                        videoUrl={session.videoUrl}
                        videoTitle={session.videoTitle}
                        onTranscriptRegenerated={(newTranscript) => {
                          // Update the session with the new transcript
                          updateSession({ 
                            ...session, 
                            transcript: newTranscript,
                            currentLineIndex: 0 // Reset to beginning
                          });
                          // Stay on transcript view to see the changes
                          setShowShadowingMode(false);
                        }}
                      />
                    </motion.div>
                  )}

                  {/* Enhanced Shadowing Player */}
                  {showShadowingMode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <EnhancedShadowingPlayer
                        session={session}
                        onLineChange={(index) => updateSession({ ...session, currentLineIndex: index })}
                        showVideo={true}
                        showFurigana={showFurigana}
                        onToggleFurigana={() => setShowFurigana(!showFurigana)}
                        showGrammar={showGrammar}
                        onToggleGrammar={() => setShowGrammar(!showGrammar)}
                        grammarMode={grammarMode}
                        onGrammarModeChange={setGrammarMode}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}