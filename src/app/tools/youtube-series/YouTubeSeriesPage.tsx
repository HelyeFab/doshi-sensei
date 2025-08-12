'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { YouTubeChannel, YouTubeVideoResource } from '@/types/youtube-series';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { ExternalImage } from '@/components/ui/OptimizedImage';

export default function YouTubeSeriesPage() {
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [recentVideos, setRecentVideos] = useState<{ [channelId: string]: YouTubeVideoResource[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load channels and their recent videos
  useEffect(() => {
    loadChannelsAndVideos();
  }, []);

  const loadChannelsAndVideos = async () => {
    try {
      setLoading(true);
      
      // Load all active channels
      const channelsQuery = query(
        collection(db, 'youtubeChannels'),
        where('monitoringEnabled', '==', true),
        orderBy('channelTitle', 'asc')
      );
      
      const channelsSnapshot = await getDocs(channelsQuery);
      const channelsList = channelsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as YouTubeChannel));
      
      setChannels(channelsList);
      
      // Load recent videos for each channel (last 3 videos)
      const videosMap: { [channelId: string]: YouTubeVideoResource[] } = {};
      
      for (const channel of channelsList) {
        const videosQuery = query(
          collection(db, 'youtubeVideoResources'),
          where('channelId', '==', channel.id),
          orderBy('publishedAt', 'desc')
        );
        
        const videosSnapshot = await getDocs(videosQuery);
        const videos = videosSnapshot.docs.slice(0, 3).map(doc => ({
          id: doc.id,
          ...doc.data()
        } as YouTubeVideoResource));
        
        videosMap[channel.id] = videos;
      }
      
      setRecentVideos(videosMap);
      
    } catch (err) {
      console.error('Error loading channels:', err);
      setError('Failed to load YouTube series');
    } finally {
      setLoading(false);
    }
  };

  // Check if a video is "new" (added in last 7 days)
  const isNewVideo = (video: YouTubeVideoResource): boolean => {
    if (!video.importedAt) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return video.importedAt.toDate() > sevenDaysAgo;
  };

  // Format video duration from seconds to readable format
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title="YouTube Series" backHref="/" />
        <MobileAwareContainer className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📺</div>
            <p className="text-muted-foreground">Loading curated series...</p>
          </div>
        </MobileAwareContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title="YouTube Series" backHref="/" />
        <MobileAwareContainer className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-destructive">{error}</p>
          </div>
        </MobileAwareContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SmartPageHeader title="YouTube Series" backHref="/" />
      
      <MobileAwareContainer className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto mb-10">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 border border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Curated Japanese Learning Series
                </h1>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                  Handpicked YouTube channels with valuable Japanese learning content. 
                  Watch directly or practice with our advanced shadowing tool for immersive learning.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                    <span className="text-2xl mr-2">📺</span>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{channels.length}</p>
                      <p className="text-xs text-muted-foreground">Channels</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                    <span className="text-2xl mr-2">🎬</span>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{Object.values(recentVideos).flat().length}</p>
                      <p className="text-xs text-muted-foreground">Videos</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                    <span className="text-2xl mr-2">👁️</span>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {Object.values(recentVideos).flat().reduce((acc, v) => acc + (v.viewCount || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Views</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <span className="text-6xl">🎌</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="max-w-6xl mx-auto space-y-6">
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">No Series Available Yet</h3>
              <p className="text-muted-foreground">
                Check back soon for curated Japanese learning content!
              </p>
            </div>
          ) : (
            channels.map((channel) => {
              const channelVideos = recentVideos[channel.id] || [];
              const totalViews = channelVideos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
              const avgViews = channelVideos.length > 0 ? Math.round(totalViews / channelVideos.length) : 0;
              
              return (
                <div key={channel.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
                  {/* Channel Header with Gradient Background */}
                  <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                    <div className="flex items-start gap-4">
                      {channel.thumbnailUrl ? (
                        <div className="relative">
                          <ExternalImage
                            src={channel.thumbnailUrl}
                            alt={channel.channelTitle}
                            width={100}
                            height={100}
                            className="rounded-full border-4 border-white dark:border-gray-700 shadow-md"
                          />
                          {channel.monitoringEnabled && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-white dark:border-gray-700 shadow-md">
                          <span className="text-3xl">📺</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-bold text-foreground mb-1">
                              {channel.channelTitle}
                            </h2>
                            {channel.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 max-w-2xl">
                                {channel.description}
                              </p>
                            )}
                          </div>
                          <a
                            href={channel.channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            title="View on YouTube"
                          >
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                        </div>
                        
                        {/* Channel Stats */}
                        <div className="flex flex-wrap gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Videos:</span>
                            <span className="text-sm font-semibold">{channel.videosImported || channelVideos.length}</span>
                          </div>
                          {avgViews > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Avg Views:</span>
                              <span className="text-sm font-semibold">{avgViews.toLocaleString()}</span>
                            </div>
                          )}
                          {channel.lastSyncedAt && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Updated:</span>
                              <span className="text-sm font-semibold">
                                {formatDistanceToNow(channel.lastSyncedAt.toDate(), { addSuffix: true })}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Tags and Badges */}
                        <div className="flex flex-wrap gap-2">
                          {channel.resourceTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              #{tag}
                            </span>
                          ))}
                          {channel.isPremiumContent && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-sm">
                              💎 Premium
                            </span>
                          )}
                          {channel.shadowingEnabled && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm">
                              🎯 Shadowing
                            </span>
                          )}
                          {channel.autoExtractTranscript && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-400 to-green-500 text-white shadow-sm">
                              📝 Transcripts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Videos */}
                  {channelVideos.length > 0 && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span>Recent Videos</span>
                      <span className="text-xs font-normal">({channelVideos.length} available)</span>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {channelVideos.slice(0, 3).map((video) => (
                        <div key={video.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                          {/* Video Thumbnail */}
                          <div className="relative aspect-video">
                            <ExternalImage
                              src={video.thumbnailUrl}
                              alt={video.title}
                              width={320}
                              height={180}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs px-2 py-1 rounded font-medium">
                              {formatDuration(video.duration)}
                            </div>
                            {isNewVideo(video) && (
                              <div className="absolute top-2 left-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg">
                                  NEW
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>

                          {/* Video Info */}
                          <div className="p-4">
                            <h4 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2 min-h-[3rem]">
                              {video.title}
                            </h4>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {video.publishedAt && formatDistanceToNow(video.publishedAt.toDate(), { addSuffix: true })}
                              </span>
                              {video.viewCount && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {video.viewCount.toLocaleString()}
                                </span>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                              {channel.shadowingEnabled && (
                                <SmartNavigationLink
                                  href={`/tools/youtube-shadowing?v=${video.videoId}`}
                                  className="flex items-center justify-center px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Shadow</span>
                                </SmartNavigationLink>
                              )}
                              
                              <a
                                href={`https://youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center px-2 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md text-xs font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-sm"
                              >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                                <span>Watch</span>
                              </a>
                            </div>

                            {/* Stats */}
                            {(video.transcriptCached || video.shadowingSessionCount > 0) && (
                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                {video.transcriptCached && (
                                  <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Transcript
                                  </span>
                                )}
                                {video.shadowingSessionCount > 0 && (
                                  <span className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    {video.shadowingSessionCount} sessions
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* View All Link */}
                    {channelVideos.length > 3 && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => router.push(`/tools/youtube-series/${channel.id}`)}
                          className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          View all {channelVideos.length} videos
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </MobileAwareContainer>
    </div>
  );
}