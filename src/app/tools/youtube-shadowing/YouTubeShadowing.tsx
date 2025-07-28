'use client';

import { useState, useRef, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import YouTubeInput from './components/YouTubeInput';
import AudioExtractor from './components/AudioExtractor';
import TranscriptDisplay from './components/TranscriptDisplay';
import ShadowingPlayer from './components/ShadowingPlayer';
import YouTubePlayer from './components/YouTubePlayer';
import TranscriptReader from './components/TranscriptReader';
import EnhancedShadowingPlayer from './components/EnhancedShadowingPlayer';
import AudioUploader from './components/AudioUploader';
import VideoUploader from './components/VideoUploader';
import ShadowingAudioPlayer from '@/components/audio/ShadowingAudioPlayer';
import { practiceHistoryService } from '@/services/practiceHistory/PracticeHistoryService';
import { PracticeHistoryItem } from '@/services/practiceHistory/types';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "YouTube Shadowing Practice - Doshi Sensei",
  "description": "Practice Japanese shadowing with YouTube videos. Extract audio, get transcripts, and improve your pronunciation.",
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
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining } = useFeature('youtube_shadowing');
  const { isPremium, userType } = useSubscription2();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ShadowingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFurigana, setShowFurigana] = useState(true);
  const [showGrammar, setShowGrammar] = useState(false);
  const [showShadowingMode, setShowShadowingMode] = useState(true);
  const previousUrlsRef = useRef<{ videoUrl?: string; audioUrl?: string }>({});
  const [practiceStartTime, setPracticeStartTime] = useState<Date | null>(null);
  const [urlFromParams, setUrlFromParams] = useState<string | null>(null);

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/
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

  // Initialize practice history service
  useEffect(() => {
    if (user) {
      practiceHistoryService.initialize(user.uid, isPremium);
    }
  }, [user, isPremium]);

  // Handle URL from query parameters (when coming from My Videos or Popular Videos)
  useEffect(() => {
    const url = searchParams.get('url');
    const fromHistory = searchParams.get('fromHistory');
    
    if (url && !session && !urlFromParams) {
      // Set the URL so we don't process it again
      setUrlFromParams(url);
      
      // If coming from history or popular videos, automatically start loading
      if (fromHistory === 'true') {
        handleUrlSubmit(url);
      }
    }
  }, [searchParams, session, urlFromParams]);

  // Cleanup blob URLs when component unmounts or session changes
  useEffect(() => {
    return () => {
      // Track practice session end if active
      if (practiceStartTime && session) {
        trackPracticeSession();
      }
      
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
    // Check if user has access to use this feature
    const canUse = await checkAndTrack('youtube_shadowing');
    
    if (!canUse) {
      // Access denied - modal will be shown automatically
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize session with URL
      updateSession({
        videoUrl: url,
        transcript: [],
        currentLineIndex: 0
      });
    } catch (err) {
      setError('Failed to process YouTube URL');
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
    if (session) {
      updateSession({
        ...session,
        transcript,
        ...(videoTitle && { videoTitle }),
        ...(videoMetadata && { videoMetadata })
      });
      
      // Start tracking practice session
      setPracticeStartTime(new Date());
      
      // Save to practice history if user is logged in
      if (user && session.videoUrl) {
        try {
          const videoId = extractVideoId(session.videoUrl) || session.videoUrl;
          const historyItem: PracticeHistoryItem = {
            id: `${user.uid}_${videoId}`,
            videoUrl: session.videoUrl,
            videoTitle: videoTitle || videoMetadata?.title || session.videoTitle || 'Untitled Video',
            videoId: videoId,
            thumbnailUrl: videoMetadata?.thumbnails?.medium?.url,
            channelName: videoMetadata?.channelTitle,
            lastPracticed: new Date(),
            firstPracticed: new Date(),
            practiceCount: 1,
            contentType: session.videoUrl.includes('youtube') ? 'youtube' : 
                        session.audioUrl ? 'audio' : 'video',
            duration: videoMetadata?.duration ? parseDuration(videoMetadata.duration) : undefined,
            metadata: videoMetadata
          };
          
          await practiceHistoryService.addOrUpdateItem(historyItem);
        } catch (error) {
          console.error('Failed to save practice history:', error);
        }
      }
    }
  };

  // Helper to parse YouTube duration format (PT3M45S) to seconds
  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Track practice session duration
  const trackPracticeSession = async () => {
    if (!user || !session || !practiceStartTime) return;
    
    try {
      const sessionDuration = Math.round((new Date().getTime() - practiceStartTime.getTime()) / 1000);
      const videoId = extractVideoId(session.videoUrl) || session.videoUrl;
      
      // Update with session duration
      const existingItem = await practiceHistoryService.getItem(videoId);
      if (existingItem) {
        existingItem.totalPracticeTime = (existingItem.totalPracticeTime || 0) + sessionDuration;
        await practiceHistoryService.addOrUpdateItem(existingItem);
      }
    } catch (error) {
      console.error('Failed to track practice session:', error);
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
        backHref="/" 
      />
      
      {/* Usage Display */}
      {userType !== 'guest' && (
        <div className="px-4 mb-4">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {userType === 'free' ? 'Daily usage' : 'Today\'s usage'}
              </span>
              <span className="text-sm font-medium">
                {isPremium ? (
                  <span className="text-green-600">Unlimited</span>
                ) : remaining === undefined || remaining === null ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : remaining > 0 ? (
                  <span className="text-primary">{remaining} {remaining === 1 ? 'use' : 'uses'} remaining</span>
                ) : (
                  <span className="text-red-600">Daily limit reached</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Guest users notice */}
      {userType === 'guest' && (
        <div className="px-4 mb-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Sign up for free to access YouTube shadowing (1 use per day) or upgrade to premium for 10 uses per day.
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
                    {strings.youtubeShadowing?.subtitle || "Master Japanese with YouTube"}
                  </h2>
                  <p className="text-lg opacity-90 max-w-2xl mx-auto">
                    {strings.youtubeShadowing?.description || "Turn any YouTube video into an interactive shadowing practice session. Get instant transcripts and improve your pronunciation!"}
                  </p>
                </div>
              </motion.div>

              {/* Quick Access Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Popular Videos Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <SmartNavigationLink
                    href="/popular-videos"
                    className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    title="Browse Popular Videos"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">🔥</div>
                        <div>
                          <h3 className="text-xl font-bold mb-1">Most Popular Videos</h3>
                          <p className="text-white/80 text-sm">
                            Skip the wait! Practice with videos already transcribed by the community
                          </p>
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </SmartNavigationLink>
                </motion.div>

                {/* My Videos Button (only for logged in users) */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <SmartNavigationLink
                      href="/tools/my-videos"
                      className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                      title="My Practice History"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">📚</div>
                          <div>
                            <h3 className="text-xl font-bold mb-1">My Videos</h3>
                            <p className="text-white/80 text-sm">
                              Quick access to videos you've practiced before
                            </p>
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </SmartNavigationLink>
                  </motion.div>
                )}
              </div>

              {/* Input Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl shadow-lg border border-border p-8 mb-6"
              >
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <span className="text-2xl">📺</span>
                  Paste YouTube URL
                </h3>
                
                <YouTubeInput 
                  onSubmit={handleUrlSubmit}
                  isLoading={isLoading}
                />
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive flex items-center gap-2"
                  >
                    <span className="text-xl">⚠️</span>
                    {error}
                  </motion.div>
                )}
              </motion.div>

              {/* Alternative Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Audio Upload */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative"
                >
                  <div className="absolute -top-3 left-6 bg-background px-3 z-10">
                    <span className="text-sm font-medium text-muted-foreground">Or upload audio</span>
                  </div>
                  <div className="border-2 border-dashed border-border rounded-2xl p-6 hover:border-primary/50 transition-colors">
                    <AudioUploader 
                      onAudioReady={async (audioUrl, title) => {
                        // Check if user has access to use this feature
                        const canUse = await checkAndTrack('youtube_shadowing');
                        
                        if (!canUse) {
                          // Access denied - modal will be shown automatically
                          // Clean up the blob URL if created
                          if (audioUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(audioUrl);
                          }
                          return;
                        }
                        
                        updateSession({
                          videoUrl: '',
                          audioUrl,
                          videoTitle: title,
                          transcript: [],
                          currentLineIndex: 0
                        });
                      }}
                    />
                  </div>
                </motion.div>

                {/* Video Upload */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative"
                >
                  <div className="absolute -top-3 left-6 bg-background px-3 z-10">
                    <span className="text-sm font-medium text-muted-foreground">Or upload video</span>
                  </div>
                  <div className="border-2 border-dashed border-border rounded-2xl p-6 hover:border-primary/50 transition-colors">
                    <VideoUploader 
                      onVideoReady={async (videoUrl, audioUrl, title, fileInfo) => {
                        // Check if user has access to use this feature
                        const canUse = await checkAndTrack('youtube_shadowing');
                        
                        if (!canUse) {
                          // Access denied - modal will be shown automatically
                          // Clean up the blob URLs if created
                          if (videoUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(videoUrl);
                          }
                          if (audioUrl?.startsWith('blob:')) {
                            URL.revokeObjectURL(audioUrl);
                          }
                          return;
                        }
                        
                        updateSession({
                          videoUrl,
                          audioUrl,
                          videoTitle: title,
                          transcript: [],
                          currentLineIndex: 0,
                          fileInfo
                        });
                      }}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Popular Videos CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-600/20 dark:to-pink-600/20 rounded-2xl border border-purple-500/20 dark:border-purple-600/30 p-8 mb-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground mb-2 flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      Community Favorites
                    </h3>
                    <p className="text-muted-foreground">
                      Skip the wait! Browse YouTube videos already transcribed by the community for instant practice.
                    </p>
                  </div>
                  <SmartNavigationLink href="/popular-videos"
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium whitespace-nowrap"
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
                  className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white"
                >
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

              {/* Audio Extraction */}
              {!session.audioUrl && (
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
                    onGoBack={() => {
                      // Reset session to go back to URL input
                      updateSession(null);
                      setError(null);
                    }}
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

                  {/* Transcript Reader */}
                  {!showShadowingMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <TranscriptReader
                        transcript={session.transcript}
                        currentLineIndex={session.currentLineIndex}
                        onLineClick={(index) => updateSession({ ...session, currentLineIndex: index })}
                        showFurigana={showFurigana}
                        showGrammar={showGrammar}
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