'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';
import { Play, TrendingUp, Clock, Users, Calendar, ExternalLink, Sparkles, Flame, Award, Search, Filter, History as HistoryIcon, ChevronDown, FileVideo, Mic, Youtube, Trash2, Loader2 } from 'lucide-react';
import { useFeature } from '@/hooks/useFeature';
import { useRouter } from 'next/navigation';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ExternalImage } from '@/components/ui/OptimizedImage';
import { practiceHistoryService } from '@/services/practiceHistory/PracticeHistoryService';

interface PopularVideo {
  id: string;
  videoTitle?: string;
  videoUrl?: string;
  accessCount: number;
  userCount?: number;
  totalPractices?: number;
  createdAt: Timestamp;
  lastAccessed: Timestamp;
  language: string;
  duration?: number;
  contentType: 'youtube' | 'audio' | 'video';
  createdBy?: string;
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
    thumbnailUrl?: string;
  };
}

type TabType = 'popular' | 'history';
type FilterType = 'all' | 'youtube' | 'audio' | 'video';

const ITEMS_PER_BATCH = 20; // Load 20 items at a time

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Popular YouTube Videos - Doshi Sensei",
  "description": "Discover the most popular Japanese YouTube videos transcribed by the community. Learn from what others are watching!",
  "url": "https://doshisensei.com/popular-videos"
};

export default function PopularVideosEnhanced() {
  const strings = useStrings();
  const { checkAndTrack } = useFeature('youtube_shadowing', {
    showToast: true,
    showModal: true,
    trackUsage: true
  });
  const router = useRouter();
  const { isPremium } = useSubscription2();
  const [user] = useAuthState(auth);
  
  const [allVideos, setAllVideos] = useState<PopularVideo[]>([]);
  const [displayedVideos, setDisplayedVideos] = useState<PopularVideo[]>([]);
  const [historyVideos, setHistoryVideos] = useState<PopularVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('popular');
  const [contentFilter, setContentFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(1);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter videos based on search
  const filteredVideos = useMemo(() => {
    if (!debouncedSearchQuery) return allVideos;
    
    const query = debouncedSearchQuery.toLowerCase();
    return allVideos.filter(video => {
      const title = video.videoTitle?.toLowerCase() || '';
      const channel = video.metadata?.channelName?.toLowerCase() || '';
      return title.includes(query) || channel.includes(query);
    });
  }, [allVideos, debouncedSearchQuery]);

  // Update displayed videos when filtered videos change
  useEffect(() => {
    const itemsToShow = Math.min(filteredVideos.length, currentBatch * ITEMS_PER_BATCH);
    setDisplayedVideos(filteredVideos.slice(0, itemsToShow));
  }, [filteredVideos, currentBatch]);

  // Reset batch when search or filter changes
  useEffect(() => {
    setCurrentBatch(1);
  }, [debouncedSearchQuery, contentFilter]);

  useEffect(() => {
    loadAllVideos();
  }, [contentFilter]);
  
  useEffect(() => {
    if (activeTab === 'history' && user && historyVideos.length === 0) {
      loadHistoryVideos();
    }
  }, [activeTab, user]);

  const loadAllVideos = async () => {
    setIsLoading(true);
    setAllVideos([]);
    setDisplayedVideos([]);
    setCurrentBatch(1);
    
    try {
      // Query all practice history to aggregate by video
      const practiceQuery = query(
        collection(db, 'userPracticeHistory'),
        where('contentType', contentFilter === 'all' ? 'in' : '==', 
          contentFilter === 'all' ? ['youtube', 'audio', 'video'] : contentFilter)
      );

      const snapshot = await getDocs(practiceQuery);
      
      // Aggregate by videoId to count unique users
      const videoAggregation = new Map<string, {
        video: any;
        userCount: number;
        uniqueUsers: Set<string>;
        totalPractices: number;
      }>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const videoId = data.videoId;
        
        if (!videoAggregation.has(videoId)) {
          videoAggregation.set(videoId, {
            video: data,
            userCount: 0,
            uniqueUsers: new Set(),
            totalPractices: 0
          });
        }
        
        const agg = videoAggregation.get(videoId)!;
        agg.uniqueUsers.add(data.userId);
        agg.totalPractices += data.practiceCount || 1;
        
        // Keep the most recent version of video data
        if (new Date(data.lastPracticed.toDate()) > new Date(agg.video.lastPracticed.toDate())) {
          agg.video = data;
        }
      });

      // Convert to array and sort by unique user count
      const sortedVideos = Array.from(videoAggregation.values())
        .map(agg => ({
          ...agg.video,
          id: agg.video.videoId,
          accessCount: agg.uniqueUsers.size,
          userCount: agg.uniqueUsers.size,
          totalPractices: agg.totalPractices,
          createdAt: agg.video.firstPracticed,
          lastAccessed: agg.video.lastPracticed,
          language: 'ja',
          duration: agg.video.duration,
          contentType: agg.video.contentType,
          metadata: {
            youtubeVideoId: agg.video.videoId,
            channelName: agg.video.channelName || agg.video.metadata?.channelTitle,
            thumbnailUrl: agg.video.thumbnailUrl
          }
        } as PopularVideo))
        .sort((a, b) => b.userCount - a.userCount);

      setAllVideos(sortedVideos);
      
      // Initially display first batch
      setDisplayedVideos(sortedVideos.slice(0, ITEMS_PER_BATCH));

    } catch (error) {
      console.error('Error loading popular videos:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadMoreVideos = () => {
    if (isLoadingMore) return;
    
    const totalAvailable = filteredVideos.length;
    const currentlyShowing = displayedVideos.length;
    
    if (currentlyShowing >= totalAvailable) return;
    
    setIsLoadingMore(true);
    
    // Simulate async loading for smooth UX
    setTimeout(() => {
      setCurrentBatch(prev => prev + 1);
      setIsLoadingMore(false);
    }, 300);
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [displayedVideos, filteredVideos, isLoadingMore]);
  
  const loadHistoryVideos = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const history = await practiceHistoryService.getUserHistory(user.uid);
      
      const historyItems = history.map(item => ({
        id: item.videoId,
        videoTitle: item.videoTitle,
        videoUrl: item.videoUrl,
        accessCount: item.practiceCount,
        userCount: 1,
        totalPractices: item.practiceCount,
        createdAt: Timestamp.fromDate(new Date(item.firstPracticed)),
        lastAccessed: Timestamp.fromDate(new Date(item.lastPracticed)),
        language: 'ja',
        duration: item.duration,
        contentType: item.contentType as 'youtube' | 'audio' | 'video',
        metadata: {
          youtubeVideoId: item.videoId,
          channelName: item.channelName,
          thumbnailUrl: item.thumbnailUrl
        }
      } as PopularVideo));
      
      setHistoryVideos(historyItems);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = async (video: PopularVideo) => {
    if (await checkAndTrack()) {
      const url = video.videoUrl || `https://www.youtube.com/watch?v=${video.metadata?.youtubeVideoId}`;
      router.push(`/tools/youtube-shadowing?url=${encodeURIComponent(url)}`);
    }
  };

  const handleDeleteHistoryItem = async (videoId: string) => {
    if (!user || !confirm('Remove this video from your history?')) return;
    
    try {
      await practiceHistoryService.deleteHistoryItem(user.uid, videoId);
      setHistoryVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error deleting history item:', error);
      alert('Failed to remove video from history');
    }
  };

  const getVideoUrl = (video: PopularVideo): string => {
    if (video.videoUrl) return video.videoUrl;
    if (video.metadata?.youtubeVideoId) {
      return `https://www.youtube.com/watch?v=${video.metadata.youtubeVideoId}`;
    }
    return '#';
  };

  const getThumbnailUrl = (video: PopularVideo): string | null => {
    if (video.metadata?.thumbnailUrl) return video.metadata.thumbnailUrl;
    if (video.metadata?.youtubeVideoId) {
      return `https://img.youtube.com/vi/${video.metadata.youtubeVideoId}/mqdefault.jpg`;
    }
    return null;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (timestamp: Timestamp): string => {
    const now = Date.now();
    const date = timestamp.toDate().getTime();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(diff / 604800000);
    const months = Math.floor(diff / 2592000000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    return `${months}mo ago`;
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Youtube className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'video': return <FileVideo className="w-4 h-4" />;
      default: return <Play className="w-4 h-4" />;
    }
  };

  const videosToDisplay = activeTab === 'popular' ? displayedVideos : historyVideos;
  const hasMore = activeTab === 'popular' && displayedVideos.length < filteredVideos.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      <SmartPageHeader 
        title={strings.popularVideos?.title || "Popular Videos"}
        showSettings={false}
      />

      <div className="mobile-nav-padding">
        {/* Search and Filters */}
        <div className="px-4 pt-4 pb-2">
          <div className="max-w-6xl mx-auto space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos by title or channel..."
                className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Tabs and Filter */}
            <div className="flex items-center justify-between">
              {/* Tabs */}
              <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                <button
                  onClick={() => setActiveTab('popular')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    activeTab === 'popular' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Popular
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      activeTab === 'history' 
                        ? 'bg-primary text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <HistoryIcon className="w-4 h-4 inline mr-2" />
                    My History
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  showFilters 
                    ? 'bg-gray-200 text-gray-900' 
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filter
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Filter Options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-2">
                    {(['all', 'youtube', 'audio', 'video'] as FilterType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setContentFilter(type)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          contentFilter === type
                            ? 'bg-primary text-white'
                            : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                        }`}
                      >
                        {type === 'all' ? 'All Content' : (
                          <>
                            {getContentIcon(type)}
                            <span className="ml-2 capitalize">{type}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Summary */}
        {!isLoading && (
          <div className="px-4 py-2">
            <div className="max-w-6xl mx-auto">
              <p className="text-sm text-gray-600">
                {activeTab === 'popular' ? (
                  <>
                    Showing {displayedVideos.length} of {filteredVideos.length} videos
                    {debouncedSearchQuery && ` matching "${debouncedSearchQuery}"`}
                  </>
                ) : (
                  `${historyVideos.length} videos in your history`
                )}
              </p>
            </div>
          </div>
        )}

        {/* Videos Grid */}
        <div className="px-4 pb-20">
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : videosToDisplay.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
                  {activeTab === 'popular' ? (
                    <TrendingUp className="w-10 h-10 text-gray-400" />
                  ) : (
                    <HistoryIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeTab === 'popular' 
                    ? (debouncedSearchQuery ? 'No videos found' : 'No Popular Videos Yet')
                    : 'No History Yet'
                  }
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {activeTab === 'popular' 
                    ? (debouncedSearchQuery 
                        ? 'Try adjusting your search or filters'
                        : 'Be the first to transcribe some YouTube videos and help the community learn!'
                      )
                    : 'Start practicing with some videos to build your history'
                  }
                </p>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {videosToDisplay.map((video, index) => {
                      const thumbnailUrl = getThumbnailUrl(video);
                      const videoUrl = getVideoUrl(video);
                      
                      return (
                        <motion.div
                          key={video.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.02 }}
                          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden group"
                        >
                          {/* Thumbnail */}
                          <div className="aspect-video relative bg-gray-100">
                            {thumbnailUrl ? (
                              <ExternalImage
                                src={thumbnailUrl}
                                alt={video.videoTitle || 'Video thumbnail'}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                {getContentIcon(video.contentType)}
                              </div>
                            )}
                            
                            {/* Overlay with stats */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {video.userCount || video.accessCount}
                                  </span>
                                  {video.totalPractices && (
                                    <span className="flex items-center gap-1">
                                      <Play className="w-4 h-4" />
                                      {video.totalPractices}
                                    </span>
                                  )}
                                  {video.duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      {formatDuration(video.duration)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Content type badge */}
                            <div className="absolute top-2 right-2">
                              <div className="bg-black/70 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs">
                                {getContentIcon(video.contentType)}
                                <span className="capitalize">{video.contentType}</span>
                              </div>
                            </div>
                          </div>

                          {/* Video Info */}
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                              {video.videoTitle || 'Untitled Video'}
                            </h3>
                            
                            {video.metadata?.channelName && (
                              <p className="text-sm text-gray-600 mb-2">
                                {video.metadata.channelName}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                              <span>{formatRelativeTime(video.lastAccessed)}</span>
                              <span>{video.userCount || video.accessCount} users</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStartPractice(video)}
                                className="flex-1 bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                              >
                                Practice
                              </button>
                              
                              {video.contentType === 'youtube' && (
                                <a
                                  href={videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-4 h-4 text-gray-600" />
                                </a>
                              )}
                              
                              {activeTab === 'history' && (
                                <button
                                  onClick={() => handleDeleteHistoryItem(video.id)}
                                  className="p-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Infinite Scroll Sentinel */}
                {hasMore && (
                  <div id="scroll-sentinel" className="h-20 flex items-center justify-center">
                    {isLoadingMore && (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}