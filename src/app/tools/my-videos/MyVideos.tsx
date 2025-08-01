'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Calendar, ExternalLink, Trash2, Search, Loader2, History, TrendingUp, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { practiceHistoryService } from '@/services/practiceHistory/PracticeHistoryService';
import { PracticeHistoryItem } from '@/services/practiceHistory/types';
import { LoginRequired } from '@/components/FeatureGate';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "My Practice Videos - Doshi Sensei",
  "description": "View and manage your Japanese YouTube video practice history. Quick access to videos you've practiced before.",
  "url": "https://doshisensei.com/tools/my-videos"
};

export default function MyVideos() {
  const strings = useStrings();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, userType } = useSubscription2();
  const [videos, setVideos] = useState<PracticeHistoryItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<PracticeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'mostPracticed'>('recent');
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    video: PracticeHistoryItem | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    video: null,
    isDeleting: false
  });

  // Initialize service and load videos
  useEffect(() => {
    if (!authLoading && user) {
      initializeAndLoadVideos();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authLoading, isPremium]);

  const initializeAndLoadVideos = async () => {
    try {
      setIsLoading(true);
      
      // Initialize practice history service
      await practiceHistoryService.initialize(user?.uid, isPremium);
      
      // Get service status
      const status = practiceHistoryService.getStatus();
      setServiceStatus(status);
      
      // Load all videos
      const allVideos = await practiceHistoryService.getAllItems();
      setVideos(allVideos);
      setFilteredVideos(allVideos);
    } catch (error) {
      console.error('Error loading practice history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort videos
  useEffect(() => {
    let filtered = [...videos];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video => {
        const title = video.videoTitle.toLowerCase();
        const channel = video.channelName?.toLowerCase() || '';
        return title.includes(query) || channel.includes(query);
      });
    }
    
    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => 
        new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime()
      );
    } else {
      filtered.sort((a, b) => b.practiceCount - a.practiceCount);
    }
    
    setFilteredVideos(filtered);
  }, [searchQuery, videos, sortBy]);

  const handlePracticeAgain = (video: PracticeHistoryItem) => {
    router.push(`/tools/youtube-shadowing?url=${encodeURIComponent(video.videoUrl)}&fromHistory=true`);
  };

  const handleDelete = (video: PracticeHistoryItem) => {
    setDeleteConfirm({
      isOpen: true,
      video,
      isDeleting: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.video) return;
    
    setDeleteConfirm(prev => ({ ...prev, isDeleting: true }));
    
    try {
      await practiceHistoryService.deleteItem(deleteConfirm.video.videoId);
      setVideos(prev => prev.filter(v => v.videoId !== deleteConfirm.video!.videoId));
      setDeleteConfirm({ isOpen: false, video: null, isDeleting: false });
    } catch (error) {
      console.error('Error deleting video:', error);
      setDeleteConfirm(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, video: null, isDeleting: false });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return new Date(date).toLocaleDateString();
  };

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  // Show login required for guests
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader 
          title="My Practice Videos"
          backHref="/" 
        />
        <LoginRequired message="Sign in to track your practice history and quickly access videos you've watched before." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      <SmartPageHeader 
        title="My Practice Videos"
        backHref="/" 
      />

      <div className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 mb-8 text-white overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 w-96 h-96 bg-white rounded-full blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-80 h-80 bg-white rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <History className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Your Practice History</h1>
                  <p className="text-white/80">
                    {isPremium ? 'Synced across all devices' : 'Saved on this device'}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">{videos.length}</div>
                  <div className="text-sm opacity-80">Videos Practiced</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">
                    {videos.reduce((sum, v) => sum + v.practiceCount, 0)}
                  </div>
                  <div className="text-sm opacity-80">Total Sessions</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">
                    {Math.round(videos.reduce((sum, v) => sum + (v.totalPracticeTime || 0), 0) / 60)}m
                  </div>
                  <div className="text-sm opacity-80">Practice Time</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Storage Notice */}
          {userType === 'free' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6 border border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    Free Account - Local Storage Only
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Your practice history is saved on this device only. Upgrade to Premium to sync across all devices.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Search and Sort */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 space-y-4"
          >
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search your practice history..."
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

            {/* Sort Options */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('recent')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  sortBy === 'recent'
                    ? 'bg-purple-600 text-white'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Most Recent
              </button>
              <button
                onClick={() => setSortBy('mostPracticed')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  sortBy === 'mostPracticed'
                    ? 'bg-purple-600 text-white'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Most Practiced
              </button>
            </div>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p className="text-muted-foreground">Loading your practice history...</p>
            </div>
          )}

          {/* Video Grid */}
          {!isLoading && filteredVideos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-black group">
                    {video.thumbnailUrl || video.videoId ? (
                      <img 
                        src={video.thumbnailUrl || getYouTubeThumbnail(video.videoId)}
                        alt={video.videoTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-80" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Practice Count Badge */}
                    <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md">
                      Practiced {video.practiceCount}x
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                      {video.videoTitle}
                    </h3>
                    
                    {video.channelName && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {video.channelName}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(video.lastPracticed)}</span>
                      </div>
                      {video.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.round(video.duration / 60)}m</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePracticeAgain(video)}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Practice Again
                      </button>
                      <button
                        onClick={() => handleDelete(video)}
                        className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredVideos.length === 0 && searchQuery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                No videos match "{searchQuery}". Try a different search term.
              </p>
            </motion.div>
          )}

          {!isLoading && videos.length === 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Practice History Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Start practicing with YouTube videos and they'll appear here for quick access.
              </p>
              <button
                onClick={() => router.push('/tools/youtube-shadowing')}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Start Practicing
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        title="Remove Video"
        message={`Are you sure you want to remove "${deleteConfirm.video?.videoTitle || 'this video'}" from your history?`}
        confirmText="Remove"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={deleteConfirm.isDeleting}
      />
    </div>
  );
}