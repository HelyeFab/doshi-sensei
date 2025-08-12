'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [allVideos, setAllVideos] = useState<{ [channelId: string]: YouTubeVideoResource[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showOnlyShadowing, setShowOnlyShadowing] = useState(false);

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
      
      console.log('Loaded channels:', channelsList);
      setChannels(channelsList);
      
      // Load all videos
      const allVideosQuery = query(
        collection(db, 'youtubeVideoResources'),
        orderBy('publishedAt', 'desc')
      );
      
      const allVideosSnapshot = await getDocs(allVideosQuery);
      const allVideosList = allVideosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as YouTubeVideoResource));
      
      console.log('Loaded videos:', allVideosList);
      
      // Group videos by channel
      const videosMap: { [channelId: string]: YouTubeVideoResource[] } = {};
      
      // First, get videos that belong to our channels
      for (const channel of channelsList) {
        videosMap[channel.id] = allVideosList.filter(video => video.channelId === channel.id);
      }
      
      // Also check for orphan videos (videos without matching channel)
      const orphanVideos = allVideosList.filter(video => 
        !channelsList.some(channel => channel.id === video.channelId)
      );
      
      if (orphanVideos.length > 0) {
        console.log('Found orphan videos (videos without matching channel):', orphanVideos);
        // Group orphan videos by their channelId
        orphanVideos.forEach(video => {
          if (!videosMap[video.channelId]) {
            videosMap[video.channelId] = [];
          }
          videosMap[video.channelId].push(video);
        });
      }
      
      setAllVideos(videosMap);
      
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

  // Get all unique tags from channels
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    channels.forEach(channel => {
      channel.resourceTags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [channels]);

  // Filter channels based on search and filters
  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = channel.channelTitle.toLowerCase().includes(query);
        const matchesDescription = channel.description?.toLowerCase().includes(query);
        const matchesVideos = allVideos[channel.id]?.some(video => 
          video.title.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDescription && !matchesVideos) return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some(tag => channel.resourceTags?.includes(tag));
        if (!hasTag) return false;
      }

      // Shadowing filter
      if (showOnlyShadowing && !channel.shadowingEnabled) return false;

      return true;
    });
  }, [channels, searchQuery, selectedTags, showOnlyShadowing, allVideos]);

  // Calculate real statistics
  const totalVideos = Object.values(allVideos).flat().length;
  const totalViews = Object.values(allVideos).flat().reduce((acc, v) => acc + (v.viewCount || 0), 0);

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
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-2xl p-6 md:p-8 border border-primary/20 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                  Curated Japanese Learning Series
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                  Handpicked YouTube channels with valuable Japanese learning content. 
                  Watch directly or practice with our advanced shadowing tool.
                </p>
                {channels.length > 0 && totalVideos > 0 && (
                  <div className="flex flex-wrap gap-3 mt-6">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-card/80 shadow-sm border border-border">
                      <span className="text-lg mr-2">📺</span>
                      <span className="text-sm font-medium text-foreground">
                        {channels.length} {channels.length === 1 ? 'Channel' : 'Channels'}
                      </span>
                    </div>
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-card/80 shadow-sm border border-border">
                      <span className="text-lg mr-2">🎬</span>
                      <span className="text-sm font-medium text-foreground">
                        {totalVideos} {totalVideos === 1 ? 'Video' : 'Videos'}
                      </span>
                    </div>
                    {totalViews > 0 && (
                      <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-card/80 shadow-sm border border-border">
                        <span className="text-lg mr-2">👁️</span>
                        <span className="text-sm font-medium text-foreground">
                          {totalViews.toLocaleString()} Views
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="hidden lg:block">
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
                  <span className="text-5xl">🎌</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search channels or videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground self-center mr-2">Tags:</span>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag) 
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Shadowing Filter */}
                <button
                  onClick={() => setShowOnlyShadowing(!showOnlyShadowing)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                    showOnlyShadowing
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>🎯</span>
                  Shadowing Only
                </button>

                {/* Clear Filters */}
                {(searchQuery || selectedTags.length > 0 || showOnlyShadowing) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTags([]);
                      setShowOnlyShadowing(false);
                    }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Results Count */}
              {(searchQuery || selectedTags.length > 0 || showOnlyShadowing) && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredChannels.length} of {channels.length} channels
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="max-w-6xl mx-auto space-y-8">
          {filteredChannels.length === 0 && Object.keys(allVideos).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">No Series Available Yet</h3>
              <p className="text-muted-foreground">
                Check back soon for curated Japanese learning content!
              </p>
            </div>
          ) : (
            <>
              {/* Display channels with their videos */}
              {filteredChannels.map((channel) => {
                const channelVideos = allVideos[channel.id] || [];
                const displayVideos = channelVideos.slice(0, 6); // Show up to 6 videos
                const channelTotalViews = channelVideos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
                
                return (
                  <div key={channel.id} className="space-y-4">
                  {/* Channel Header - Outside the card */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      {channel.thumbnailUrl ? (
                        <ExternalImage
                          src={channel.thumbnailUrl}
                          alt={channel.channelTitle}
                          width={48}
                          height={48}
                          className="rounded-full border-2 border-border shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                          <span className="text-lg">📺</span>
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                          {channel.channelTitle}
                          {channel.monitoringEnabled && (
                            <span className="text-primary text-sm">●</span>
                          )}
                        </h2>
                        {channel.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 max-w-xl">
                            {channel.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Channel Badges */}
                      <div className="flex gap-2">
                        {channel.shadowingEnabled && (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            🎯 Shadowing
                          </span>
                        )}
                        {channel.isPremiumContent && (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                            💎 Premium
                          </span>
                        )}
                      </div>
                      <a
                        href={channel.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-card hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm border border-border"
                        title="View channel on YouTube"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Video Grid - Distinctive card design */}
                  {displayVideos.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {displayVideos.map((video) => (
                        <div key={video.id} className="group relative bg-gradient-to-br from-card via-card to-muted/20 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
                          {/* Video Thumbnail with Overlay */}
                          <div className="relative aspect-video bg-black">
                            <ExternalImage
                              src={video.thumbnailUrl}
                              alt={video.title}
                              width={480}
                              height={270}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Duration Badge */}
                            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                              {formatDuration(video.duration)}
                            </div>
                            
                            {/* New Badge */}
                            {isNewVideo(video) && (
                              <div className="absolute top-2 left-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-accent/90 backdrop-blur-sm text-accent-foreground shadow-lg">
                                  NEW
                                </span>
                              </div>
                            )}

                            {/* Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-primary/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Video Info Card */}
                          <div className="p-4 space-y-3">
                            {/* Channel Name */}
                            <div className="text-xs text-muted-foreground font-medium">
                              {channel.channelTitle}
                            </div>
                            
                            {/* Title */}
                            <h4 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                              {video.title}
                            </h4>
                            
                            {/* Metadata */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {video.publishedAt && formatDistanceToNow(video.publishedAt.toDate(), { addSuffix: true })}
                              </span>
                              {video.viewCount && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {video.viewCount > 1000000 
                                    ? `${(video.viewCount / 1000000).toFixed(1)}M`
                                    : video.viewCount > 1000
                                    ? `${(video.viewCount / 1000).toFixed(1)}K`
                                    : video.viewCount.toLocaleString()
                                  }
                                </span>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              {channel.shadowingEnabled && (
                                <SmartNavigationLink
                                  href={`/tools/youtube-shadowing?v=${video.videoId}`}
                                  className="flex-1 flex items-center justify-center px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  Practice
                                </SmartNavigationLink>
                              )}
                              
                              <a
                                href={`https://youtu.be/${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${
                                  channel.shadowingEnabled ? 'flex-1' : 'flex-1'
                                } flex items-center justify-center px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all`}
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                                Watch
                              </a>
                            </div>

                            {/* Additional Info */}
                            {(video.transcriptCached || video.shadowingSessionCount > 0) && (
                              <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                                {video.transcriptCached && (
                                  <span className="inline-flex items-center text-xs text-primary">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Transcript
                                  </span>
                                )}
                                {video.shadowingSessionCount > 0 && (
                                  <span className="inline-flex items-center text-xs text-muted-foreground">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {video.shadowingSessionCount} practiced
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View More Button */}
                  {channelVideos.length > 6 && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => router.push(`/tools/youtube-series/${channel.id}`)}
                        className="inline-flex items-center px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors"
                      >
                        View all {channelVideos.length} videos
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Display orphan videos (videos without a matching channel) */}
            {Object.entries(allVideos).map(([channelId, videos]) => {
              // Skip if this channelId has a matching channel
              if (channels.some(ch => ch.id === channelId)) return null;
              if (videos.length === 0) return null;
              
              const displayVideos = videos.slice(0, 6);
              
              return (
                <div key={channelId} className="space-y-4">
                  {/* Simple header for orphan videos */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <span className="text-lg">📺</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          YouTube Videos
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {videos.length} video{videos.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Video Grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayVideos.map((video) => (
                      <div key={video.id} className="group relative bg-gradient-to-br from-card via-card to-muted/20 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
                        {/* Video Thumbnail with Overlay */}
                        <div className="relative aspect-video bg-black">
                          <ExternalImage
                            src={video.thumbnailUrl}
                            alt={video.title}
                            width={480}
                            height={270}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          {/* Duration Badge */}
                          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                            {formatDuration(video.duration)}
                          </div>
                          
                          {/* New Badge */}
                          {isNewVideo(video) && (
                            <div className="absolute top-2 left-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-accent/90 backdrop-blur-sm text-accent-foreground shadow-lg">
                                NEW
                              </span>
                            </div>
                          )}

                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-primary/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Video Info Card */}
                        <div className="p-4 space-y-3">
                          {/* Title Only (no channel name since we don't have it) */}
                          <h4 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                            {video.title}
                          </h4>
                          
                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {video.publishedAt && formatDistanceToNow(video.publishedAt.toDate(), { addSuffix: true })}
                            </span>
                            {video.viewCount && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {video.viewCount > 1000000 
                                  ? `${(video.viewCount / 1000000).toFixed(1)}M`
                                  : video.viewCount > 1000
                                  ? `${(video.viewCount / 1000).toFixed(1)}K`
                                  : video.viewCount.toLocaleString()
                                }
                              </span>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <SmartNavigationLink
                              href={`/tools/youtube-shadowing?v=${video.videoId}`}
                              className="flex-1 flex items-center justify-center px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Practice
                            </SmartNavigationLink>
                            
                            <a
                              href={`https://youtu.be/${video.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              Watch
                            </a>
                          </div>

                          {/* Additional Info */}
                          {(video.transcriptCached || video.shadowingSessionCount > 0) && (
                            <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                              {video.transcriptCached && (
                                <span className="inline-flex items-center text-xs text-primary">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Transcript
                                </span>
                              )}
                              {video.shadowingSessionCount > 0 && (
                                <span className="inline-flex items-center text-xs text-muted-foreground">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  {video.shadowingSessionCount} practiced
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* View More Button */}
                  {videos.length > 6 && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => router.push(`/tools/youtube-series/${channelId}`)}
                        className="inline-flex items-center px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors"
                      >
                        View all {videos.length} videos
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            </>
          )}
        </div>
      </MobileAwareContainer>
    </div>
  );
}