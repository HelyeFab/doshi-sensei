'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Play, TrendingUp, Clock, Users, Calendar, ExternalLink, Sparkles, Flame, Award, Search, Loader2 } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { useRouter } from 'next/navigation';

interface PopularVideo {
  id: string;
  videoTitle?: string;
  videoUrl?: string;
  accessCount: number;
  createdAt: Timestamp;
  lastAccessed: Timestamp;
  language: string;
  duration?: number;
  contentType: 'youtube' | 'audio' | 'video';
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
  };
}

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Popular YouTube Videos - Doshi Sensei",
  "description": "Discover the most popular Japanese YouTube videos transcribed by the community. Learn from what others are watching!",
  "url": "https://doshisensei.com/popular-videos"
};

const ITEMS_PER_PAGE = 20;

export default function PopularVideos() {
  const strings = useStrings();
  const { checkAndTrack } = useAccess();
  const router = useRouter();
  const [popularVideos, setPopularVideos] = useState<PopularVideo[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<PopularVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<PopularVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'trending'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    loadPopularVideos();
  }, []);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, isLoading, activeTab]);

  // Filter videos based on search query
  useEffect(() => {
    const videos = activeTab === 'popular' ? popularVideos : trendingVideos;
    
    if (!searchQuery.trim()) {
      setFilteredVideos(videos);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = videos.filter(video => {
        const title = (video.videoTitle || `YouTube Video (${video.id})`).toLowerCase();
        const channel = video.metadata?.channelName?.toLowerCase() || '';
        return title.includes(query) || channel.includes(query);
      });
      setFilteredVideos(filtered);
    }
  }, [searchQuery, popularVideos, trendingVideos, activeTab]);

  const loadPopularVideos = async () => {
    try {
      setIsLoading(true);
      setHasMore(true);
      setLastDoc(null);

      // Query for most accessed YouTube videos only (for safety/privacy)
      const popularQuery = query(
        collection(db, 'transcriptCache'),
        where('contentType', '==', 'youtube'),
        orderBy('accessCount', 'desc'),
        limit(ITEMS_PER_PAGE)
      );

      const popularSnapshot = await getDocs(popularQuery);
      const popularData = popularSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PopularVideo));

      setPopularVideos(popularData);
      setLastDoc(popularSnapshot.docs[popularSnapshot.docs.length - 1] || null);
      setHasMore(popularSnapshot.docs.length === ITEMS_PER_PAGE);

      // Query for trending YouTube videos (accessed in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trendingQuery = query(
        collection(db, 'transcriptCache'),
        where('contentType', '==', 'youtube'),
        where('lastAccessed', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('lastAccessed', 'desc'),
        limit(ITEMS_PER_PAGE)
      );

      const trendingSnapshot = await getDocs(trendingQuery);
      const trendingData = trendingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PopularVideo));

      setTrendingVideos(trendingData);

    } catch (error) {
      console.error('Error loading popular videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreVideos = async () => {
    if (!lastDoc || isLoadingMore || activeTab === 'trending') return;

    try {
      setIsLoadingMore(true);

      const moreQuery = query(
        collection(db, 'transcriptCache'),
        where('contentType', '==', 'youtube'),
        orderBy('accessCount', 'desc'),
        startAfter(lastDoc),
        limit(ITEMS_PER_PAGE)
      );

      const moreSnapshot = await getDocs(moreQuery);
      const moreData = moreSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PopularVideo));

      if (moreData.length > 0) {
        setPopularVideos(prev => [...prev, ...moreData]);
        setLastDoc(moreSnapshot.docs[moreSnapshot.docs.length - 1]);
        setHasMore(moreSnapshot.docs.length === ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more videos:', error);
    } finally {
      setIsLoadingMore(false);
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

  const VideoCard = ({ video, index }: { video: PopularVideo; index: number }) => {
    const videoId = video.metadata?.youtubeVideoId || video.id.replace('youtube_', '');
    const thumbnailUrl = getYouTubeThumbnail(videoId);

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
        {/* Thumbnail */}
        <div className="relative aspect-video bg-black group">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={video.videoTitle || 'Video thumbnail'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <div className="text-white text-center">
                <Play className="w-12 h-12 mx-auto mb-2 opacity-80" />
                <p className="text-xs opacity-80">No thumbnail</p>
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
          {video.accessCount > 100 && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Fire className="w-3 h-3" />
              Popular
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-3 text-lg">
            {video.videoTitle || `YouTube Video (${videoId})`}
          </h3>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="font-medium">{video.accessCount.toLocaleString()}</span>
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
            {video.videoUrl && (
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
                Trending Japanese Content
              </h1>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Discover what the community is watching. All videos come with pre-generated transcripts for instant practice!
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-3xl font-bold">{popularVideos.length}+</div>
                  <div className="text-sm opacity-80">Videos Available</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-3xl font-bold">
                    {popularVideos.slice(0, 20).reduce((sum, v) => sum + v.accessCount, 0).toLocaleString()}+
                  </div>
                  <div className="text-sm opacity-80">Total Uses</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-3xl font-bold">
                    ${(popularVideos.slice(0, 20).reduce((sum, v) => sum + (v.accessCount - 1), 0) * 0.006).toFixed(0)}+
                  </div>
                  <div className="text-sm opacity-80">Saved by Community</div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 mb-6 bg-card rounded-2xl p-2 shadow-sm border border-border"
          >
            <button
              onClick={() => {
                setActiveTab('popular');
                setSearchQuery('');
              }}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'popular'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Award className="w-5 h-5" />
              Most Popular
            </button>
            <button
              onClick={() => {
                setActiveTab('trending');
                setSearchQuery('');
              }}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'trending'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Trending Now
            </button>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="relative max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Search videos by title or channel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-12 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Showing results for "{searchQuery}" ({filteredVideos.length} videos)
              </p>
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
                key={activeTab + searchQuery}
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

          {/* Load More Trigger (for infinite scroll) */}
          {!isLoading && activeTab === 'popular' && !searchQuery && hasMore && (
            <div 
              ref={loadMoreRef} 
              className="flex justify-center items-center py-8"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading more videos...</span>
                </div>
              ) : (
                <div className="text-muted-foreground">Scroll to load more</div>
              )}
            </div>
          )}

          {/* Empty States */}
          {!isLoading && searchQuery && filteredVideos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Results Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No videos match your search "{searchQuery}". Try different keywords.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium mt-6"
              >
                Clear Search
              </button>
            </motion.div>
          )}

          {!isLoading && !searchQuery && activeTab === 'popular' && popularVideos.length === 0 && (
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

          {!isLoading && activeTab === 'trending' && trendingVideos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Trending Videos</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Check back soon to see what the community is practicing!
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
                  <h3 className="font-bold text-lg text-foreground mb-1">Community Achievement</h3>
                  <p className="text-muted-foreground">
                    Together, we've saved <span className="font-semibold text-foreground">{popularVideos.reduce((sum, v) => sum + (v.accessCount - 1), 0).toLocaleString()}</span> API calls
                    by sharing transcripts. That's approximately <span className="font-semibold text-green-600">${(popularVideos.reduce((sum, v) => sum + (v.accessCount - 1), 0) * 0.006).toFixed(2)}</span> saved
                    for the community!
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