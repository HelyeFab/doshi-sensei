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
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="YouTube Series" backHref="/" />
      
      <MobileAwareContainer className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-card rounded-lg p-6 border border-border">
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Curated Japanese Learning Series
            </h1>
            <p className="text-muted-foreground mb-4">
              Handpicked YouTube channels with valuable Japanese learning content. 
              Watch directly or practice with our shadowing tool.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                📚 {channels.length} Channels
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                🎬 {Object.values(recentVideos).flat().length} Videos Available
              </span>
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
            channels.map((channel) => (
              <div key={channel.id} className="bg-card rounded-lg border border-border overflow-hidden">
                {/* Channel Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-start gap-4">
                    {channel.thumbnailUrl && (
                      <ExternalImage
                        src={channel.thumbnailUrl}
                        alt={channel.channelTitle}
                        width={80}
                        height={80}
                        className="rounded-full flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-foreground mb-2">
                        {channel.channelTitle}
                      </h2>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {channel.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {channel.resourceTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-secondary text-secondary-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                        {channel.isPremiumContent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            💎 Premium
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={channel.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
                      title="View on YouTube"
                    >
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Recent Videos */}
                {recentVideos[channel.id] && recentVideos[channel.id].length > 0 && (
                  <div className="p-6">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Recent Videos
                    </h3>
                    <div className="space-y-4">
                      {recentVideos[channel.id].map((video) => (
                        <div key={video.id} className="flex gap-4 group">
                          {/* Video Thumbnail */}
                          <div className="relative flex-shrink-0">
                            <ExternalImage
                              src={video.thumbnailUrl}
                              alt={video.title}
                              width={160}
                              height={90}
                              className="rounded-lg"
                            />
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                              {formatDuration(video.duration)}
                            </div>
                            {isNewVideo(video) && (
                              <div className="absolute top-1 left-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                                  NEW
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Video Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
                              {video.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {video.publishedAt && formatDistanceToNow(video.publishedAt.toDate(), { addSuffix: true })}
                              {video.viewCount && ` • ${video.viewCount.toLocaleString()} views`}
                            </p>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {video.resourceId && (
                                <SmartNavigationLink
                                  href={`/resources/${video.resourceSlug || video.resourceId}`}
                                  className="inline-flex items-center px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                  <span>Read as Resource</span>
                                  <svg className="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </SmartNavigationLink>
                              )}
                              
                              {channel.shadowingEnabled && (
                                <SmartNavigationLink
                                  href={`/tools/youtube-shadowing?v=${video.videoId}`}
                                  className="inline-flex items-center px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors"
                                >
                                  <span>Practice Shadowing</span>
                                  <svg className="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </SmartNavigationLink>
                              )}
                              
                              <a
                                href={`https://youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/70 transition-colors"
                              >
                                <span>Watch on YouTube</span>
                                <svg className="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>

                            {/* Stats */}
                            {video.transcriptCached && (
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <span className="text-green-500">✓</span>
                                  Transcript Available
                                </span>
                                {video.shadowingSessionCount > 0 && (
                                  <span>{video.shadowingSessionCount} practice sessions</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* View All Link */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        onClick={() => router.push(`/tools/youtube-series/${channel.id}`)}
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        View all videos from {channel.channelTitle} →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </MobileAwareContainer>
    </div>
  );
}