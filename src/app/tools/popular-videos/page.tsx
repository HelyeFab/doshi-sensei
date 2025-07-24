'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { StandardPageHeader } from '@/components/StandardPageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Play, TrendingUp, Clock, Users, Calendar, ExternalLink, Sparkles, Fire, Award } from 'lucide-react';
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
  "url": "https://doshisensei.com/tools/popular-videos"
};

export default function PopularVideos() {
  const strings = useStrings();
  const { checkAndTrack } = useAccess();
  const router = useRouter();
  const [popularVideos, setPopularVideos] = useState<PopularVideo[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<PopularVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'popular' | 'trending'>('popular');

  useEffect(() => {
    loadPopularVideos();
  }, []);

  const loadPopularVideos = async () => {
    try {
      setIsLoading(true);

      // Query for most accessed YouTube videos only (for safety/privacy)
      const popularQuery = query(
        collection(db, 'transcriptCache'),
        where('contentType', '==', 'youtube'),
        orderBy('accessCount', 'desc'),
        limit(20)
      );

      const popularSnapshot = await getDocs(popularQuery);
      const popularData = popularSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PopularVideo));

      setPopularVideos(popularData);

      // Query for trending YouTube videos (accessed in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trendingQuery = query(
        collection(db, 'transcriptCache'),
        where('contentType', '==', 'youtube'),
        where('lastAccessed', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('lastAccessed', 'desc'),
        limit(10)
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
        router.push(`/tools/youtube-shadowing?url=${encodeURIComponent(video.videoUrl || '')}`);
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
        {thumbnailUrl && (
          <div className="relative aspect-video bg-black group">
            <img 
              src={thumbnailUrl} 
              alt={video.videoTitle || 'Video thumbnail'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
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
        )}

        {/* Content */}
        <div className="p-5">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-3 text-lg">
            {video.videoTitle || 'Untitled Video'}
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

      <StandardPageHeader 
        title="Popular Videos"
        backHref="/tools/youtube-shadowing" 
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
                  <div className="text-3xl font-bold">{popularVideos.length}</div>
                  <div className="text-sm opacity-80">Popular Videos</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
                >
                  <div className="text-3xl font-bold">
                    {popularVideos.reduce((sum, v) => sum + v.accessCount, 0).toLocaleString()}
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
                    ${(popularVideos.reduce((sum, v) => sum + (v.accessCount - 1), 0) * 0.006).toFixed(0)}
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
            className="flex gap-2 mb-8 bg-card rounded-2xl p-2 shadow-sm border border-border"
          >
            <button
              onClick={() => setActiveTab('popular')}
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
              onClick={() => setActiveTab('trending')}
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
                {activeTab === 'popular' && popularVideos.map((video, index) => (
                  <VideoCard key={video.id} video={video} index={index} />
                ))}
                {activeTab === 'trending' && trendingVideos.map((video, index) => (
                  <VideoCard key={video.id} video={video} index={index} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty States */}
          {!isLoading && activeTab === 'popular' && popularVideos.length === 0 && (
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