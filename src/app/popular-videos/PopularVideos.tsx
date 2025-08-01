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
import { Play, TrendingUp, Clock, Users, Calendar, ExternalLink, Sparkles, Flame, Award, Search, Filter, History as HistoryIcon, ChevronDown, FileVideo, Mic, Youtube, Trash2 } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
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
  userCount?: number; // Number of unique users who practiced this
  totalPractices?: number; // Total practice sessions across all users
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

const ITEMS_PER_PAGE = 12;

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Popular YouTube Videos - Doshi Sensei",
  "description": "Discover the most popular Japanese YouTube videos transcribed by the community. Learn from what others are watching!",
  "url": "https://doshisensei.com/popular-videos"
};

export default function PopularVideos() {
  const strings = useStrings();
  const { checkAndTrack } = useAccess();
  const router = useRouter();
  const { isPremium } = useSubscription2();
  const [user] = useAuthState(auth);
  
  const [popularVideos, setPopularVideos] = useState<PopularVideo[]>([]);
  const [historyVideos, setHistoryVideos] = useState<PopularVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('popular');
  const [contentFilter, setContentFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [popularLastDoc, setPopularLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [historyLastDoc, setHistoryLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMorePopular, setHasMorePopular] = useState(true);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialVideos();
  }, [contentFilter]);
  
  useEffect(() => {
    if (activeTab === 'history' && user && historyVideos.length === 0) {
      loadHistoryVideos(true);
    }
  }, [activeTab, user]);

  const loadInitialVideos = async () => {
    setIsLoading(true);
    setPopularVideos([]);
    setPopularLastDoc(null);
    setHasMorePopular(true);
    
    await loadPopularVideos(true);
    
    setIsLoading(false);
  };
  
  const loadPopularVideos = async (isInitial = false) => {
    try {
      if (!isInitial) {
        setIsLoadingMore(true);
      }

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
        .sort((a, b) => b.userCount - a.userCount)
        .slice(0, ITEMS_PER_PAGE);

      setPopularVideos(sortedVideos);
      
      // Since we're loading all at once, disable pagination
      setHasMorePopular(false);

    } catch (error) {
      console.error('Error loading popular videos:', error);
    } finally {
      if (!isInitial) {
        setIsLoadingMore(false);
      }
    }
  };
  
  
  const loadHistoryVideos = async (isInitial = false) => {
    if (!user) return;
    
    console.log('=== Loading History Videos ===');
    console.log('User ID:', user.uid);
    console.log('Is Initial Load:', isInitial);
    
    try {
      if (!isInitial) {
        setIsLoadingMore(true);
      }
      
      // First, try to get from userPracticeHistory (actual user history)
      const practiceHistoryConstraints: any[] = [
        collection(db, 'userPracticeHistory'),
        where('userId', '==', user.uid),
        orderBy('lastPracticed', 'desc'),
        limit(ITEMS_PER_PAGE)
      ];
      
      console.log('Practice History Query Constraints:', practiceHistoryConstraints);
      
      if (contentFilter !== 'all') {
        practiceHistoryConstraints.splice(2, 0, where('contentType', '==', contentFilter));
      }
      
      if (historyLastDoc && !isInitial) {
        practiceHistoryConstraints.push(startAfter(historyLastDoc));
      }
      
      const practiceHistoryQuery = query(...practiceHistoryConstraints);
      console.log('Executing practice history query...');
      
      const practiceHistorySnapshot = await getDocs(practiceHistoryQuery);
      console.log('Practice history docs found:', practiceHistorySnapshot.docs.length);
      
      // Convert practice history items to PopularVideo format
      const practiceHistoryData = practiceHistorySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Practice history doc:', doc.id, data);
        return {
          id: data.videoId || doc.id,
          videoTitle: data.videoTitle,
          videoUrl: data.videoUrl,
          accessCount: data.practiceCount || 1,
          createdAt: data.firstPracticed || data.createdAt,
          lastAccessed: data.lastPracticed,
          language: 'ja',
          duration: data.duration,
          contentType: data.contentType || 'youtube',
          createdBy: data.userId,
          metadata: {
            youtubeVideoId: data.videoId,
            channelName: data.channelName || data.metadata?.channelTitle,
            thumbnailUrl: data.thumbnailUrl
          }
        } as PopularVideo;
      });

      // Also get from transcriptCache (fallback for older data)
      const cacheConstraints: any[] = [
        collection(db, 'transcriptCache'),
        where('createdBy', '==', user.uid),
        orderBy('lastAccessed', 'desc'),
        limit(ITEMS_PER_PAGE)
      ];
      
      if (contentFilter !== 'all') {
        cacheConstraints.splice(2, 0, where('contentType', '==', contentFilter));
      }
      
      const cacheQuery = query(...cacheConstraints);
      console.log('Executing transcript cache query...');
      
      const cacheSnapshot = await getDocs(cacheQuery);
      console.log('Transcript cache docs found:', cacheSnapshot.docs.length);
      
      const cacheData = cacheSnapshot.docs.map(doc => {
        console.log('Cache doc:', doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data()
        } as PopularVideo;
      });

      // Merge and deduplicate the results
      const mergedData = [...practiceHistoryData];
      const seenIds = new Set(practiceHistoryData.map(item => item.id));
      
      cacheData.forEach(item => {
        if (!seenIds.has(item.id)) {
          mergedData.push(item);
          seenIds.add(item.id);
        }
      });

      // Sort by most recent
      mergedData.sort((a, b) => {
        const aTime = a.lastAccessed?.toDate?.()?.getTime() || 0;
        const bTime = b.lastAccessed?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });

      // Take only the requested page size
      const pageData = mergedData.slice(0, ITEMS_PER_PAGE);
      
      if (pageData.length < ITEMS_PER_PAGE) {
        setHasMoreHistory(false);
      }
      
      if (practiceHistorySnapshot.docs.length > 0) {
        setHistoryLastDoc(practiceHistorySnapshot.docs[practiceHistorySnapshot.docs.length - 1]);
      }

      if (isInitial) {
        setHistoryVideos(pageData);
      } else {
        setHistoryVideos(prev => [...prev, ...pageData]);
      }

    } catch (error) {
      console.error('Error loading history videos:', error);
    } finally {
      if (!isInitial) {
        setIsLoadingMore(false);
      }
    }
  };
  
  const loadMore = async () => {
    if (isLoadingMore) return;
    
    if (activeTab === 'popular' && hasMorePopular) {
      await loadPopularVideos();
    } else if (activeTab === 'history' && hasMoreHistory) {
      await loadHistoryVideos();
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getYouTubeThumbnail = (videoId?: string) => {
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };
  
  const getContentIcon = (contentType: 'youtube' | 'audio' | 'video') => {
    switch (contentType) {
      case 'youtube':
        return <Youtube className="w-5 h-5" />;
      case 'audio':
        return <Mic className="w-5 h-5" />;
      case 'video':
        return <FileVideo className="w-5 h-5" />;
      default:
        return <Play className="w-5 h-5" />;
    }
  };
  
  // Filter videos based on search query
  const filteredVideos = useMemo(() => {
    const videos = activeTab === 'popular' ? popularVideos : historyVideos;
    
    if (!searchQuery) return videos;
    
    return videos.filter(video => 
      video.videoTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.metadata?.channelName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, popularVideos, historyVideos, searchQuery]);

  const handleDeleteVideo = async (video: PopularVideo) => {
    if (!confirm('Are you sure you want to remove this video from your history?')) return;
    
    try {
      const videoId = video.metadata?.youtubeVideoId || video.id;
      await practiceHistoryService.deleteItem(videoId);
      
      // Remove from local state
      setHistoryVideos(prev => prev.filter(v => v.id !== video.id));
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const VideoCard = ({ video, index }: { video: PopularVideo; index: number }) => {
    const videoId = video.metadata?.youtubeVideoId || (video.contentType === 'youtube' ? video.id.replace('youtube_', '') : null);
    const thumbnailUrl = video.contentType === 'youtube' ? getYouTubeThumbnail(videoId) : null;
    const isHistoryTab = activeTab === 'history';
    const isOwnVideo = user && video.createdBy === user.uid;

    const handlePracticeClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      
      // Check if user has access to use YouTube shadowing
      const canAccess = await checkAndTrack('youtube_shadowing');
      
      if (canAccess) {
        // User has access, navigate to the shadowing page
        router.push(`/tools/youtube-shadowing?url=${encodeURIComponent(video.videoUrl || '')}&fromPopular=true`);
      }
      // If no access, the checkAndTrack function will automatically show the upgrade modal
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -5 }}
        className="bg-card rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-xl transition-all duration-300"
      >
        {/* Thumbnail or Content Type Indicator */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 group">
          {thumbnailUrl ? (
            <ExternalImage
              src={thumbnailUrl} 
              alt={video.videoTitle || 'Video thumbnail'}
              className="w-full h-full object-cover"
              width={320}
              height={180}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                  {getContentIcon(video.contentType)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {video.contentType === 'audio' ? 'Audio File' : 'Video File'}
                </p>
              </div>
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
            </div>
          </div>

          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs px-2 py-1 rounded-md font-medium">
              {formatDuration(video.duration)}
            </div>
          )}

          {/* Popularity badge */}
          {(video.userCount || video.accessCount || 0) > 10 && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Popular
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-3 text-lg">
            {video.videoTitle || `Untitled ${video.contentType === 'audio' ? 'Audio' : video.contentType === 'video' ? 'Video' : 'Content'}`}
          </h3>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="font-medium">{(video.userCount || video.accessCount || 0).toLocaleString()} users</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(video.createdAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePracticeClick}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium text-center flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Practice Now
            </button>
            {video.videoUrl && video.contentType === 'youtube' && (
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl transition-all duration-200 hover:scale-105"
                title="View on YouTube"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            {isHistoryTab && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteVideo(video);
                }}
                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl transition-all duration-200 hover:scale-105"
                title="Remove from history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
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
        title="Popular Videos"
        backHref="/" 
      />

      <div className="px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 rounded-3xl p-10 mb-8 text-white overflow-hidden"
          >
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Community Powered Learning</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Popular Japanese Videos
              </h1>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Discover what the community is practicing. Videos ranked by how many users have practiced with them!
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-2xl sm:text-3xl font-bold">{popularVideos.length}</div>
                  <div className="text-xs sm:text-sm opacity-80">Popular Videos</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-2xl sm:text-3xl font-bold">
                    {popularVideos.reduce((sum, v) => sum + v.accessCount, 0).toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm opacity-80">Total Uses</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 col-span-2 sm:col-span-1"
                >
                  <div className="text-2xl sm:text-3xl font-bold">
                    ${(popularVideos.reduce((sum, v) => sum + (v.accessCount - 1), 0) * 0.006).toFixed(0)}
                  </div>
                  <div className="text-xs sm:text-sm opacity-80">Saved by Community</div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 space-y-4"
          >
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search videos by title or channel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
            
            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card rounded-xl p-4 border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Content Type</p>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'youtube', 'audio', 'video'] as FilterType[]).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setContentFilter(filter)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            contentFilter === filter
                              ? 'bg-primary text-white'
                              : 'bg-muted hover:bg-muted/80 text-foreground'
                          }`}
                        >
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2 mb-8 bg-card rounded-2xl p-2 shadow-sm border border-border"
          >
            <button
              onClick={() => setActiveTab('popular')}
              className={`flex-1 px-2 sm:px-4 md:px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                activeTab === 'popular'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Award className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">Most Popular</span>
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-2 sm:px-4 md:px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <HistoryIcon className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">My History</span>
              </button>
            )}
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl shadow-md border border-border overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted"></div>
                  <div className="p-5">
                    <div className="h-5 bg-muted rounded-lg w-3/4 mb-3"></div>
                    <div className="h-4 bg-muted rounded-lg w-1/2 mb-4"></div>
                    <div className="h-10 bg-muted rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Video Grid */}
          <AnimatePresence mode="wait">
            {!isLoading && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredVideos.map((video, index) => (
                  <VideoCard key={video.id} video={video} index={index} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Load More Button */}
          {!isLoading && filteredVideos.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center mt-8"
            >
              {((activeTab === 'popular' && hasMorePopular) ||
                (activeTab === 'history' && hasMoreHistory)) && (
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5" />
                      Load More
                    </>
                  )}
                </button>
              )}
            </motion.div>
          )}

          {/* Empty States */}
          {!isLoading && activeTab === 'popular' && filteredVideos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Popular Videos Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Be the first to transcribe some YouTube videos and help the community!
              </p>
              <button
                onClick={async () => {
                  const canAccess = await checkAndTrack('youtube_shadowing');
                  if (canAccess) {
                    router.push('/tools/youtube-shadowing');
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium mt-6"
              >
                <Play className="w-5 h-5" />
                Start Transcribing
              </button>
            </motion.div>
          )}

          {!isLoading && activeTab === 'history' && filteredVideos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <HistoryIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No History Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery ? 'No videos match your search.' : 'Start practicing with some videos to see your history here!'}
              </p>
            </motion.div>
          )}

          {/* Community Impact */}
          {!isLoading && popularVideos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-3xl p-8 border border-green-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground mb-1">Community Impact</h3>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{popularVideos.reduce((sum, v) => sum + (v.userCount || 1), 0).toLocaleString()}</span> users
                    have practiced with these videos, creating <span className="font-semibold text-green-600">{popularVideos.reduce((sum, v) => sum + (v.totalPractices || 1), 0).toLocaleString()}</span> total
                    practice sessions!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}