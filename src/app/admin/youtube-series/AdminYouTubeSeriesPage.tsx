'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useStrings } from '@/contexts/LanguageContext';
import { collection, query, orderBy, getDocs, deleteDoc, doc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { YouTubeChannel, YouTubeChannelFormData } from '@/types/youtube-series';
import { formatDistanceToNow } from 'date-fns';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

export default function AdminYouTubeSeriesPage() {
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<YouTubeChannel | null>(null);
  const [formData, setFormData] = useState<YouTubeChannelFormData>({
    channelUrl: '',
    monitoringEnabled: true,
    checkInterval: 24,
    autoCreateResource: true,
    resourceCategory: 'YouTube Series',
    resourceTags: '',
    isPremiumContent: false,
    autoExtractTranscript: true,
    shadowingEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    loading: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    isDestructive: true,
    onConfirm: () => {},
  });

  // Check admin access
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  // Load channels
  useEffect(() => {
    if (isAdmin) {
      loadChannels();
    }
  }, [isAdmin]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const channelsQuery = query(
        collection(db, 'youtubeChannels'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(channelsQuery);
      const channelsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as YouTubeChannel));
      
      setChannels(channelsList);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractChannelIdFromUrl = (url: string): string => {
    // Extract channel ID from various YouTube URL formats
    const patterns = [
      /youtube\.com\/channel\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /youtube\.com\/c\/([^\/\?]+)/,
      /youtube\.com\/user\/([^\/\?]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return url; // Return as-is if no pattern matches
  };

  const extractVideoIdFromUrl = (url: string): string | null => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Check if it's a video URL
      const videoId = extractVideoIdFromUrl(formData.channelUrl);
      let finalChannelUrl = formData.channelUrl;
      let channelInfo = null;
      
      if (videoId) {
        // It's a video URL - fetch channel info from the video
        const response = await fetch('/api/youtube/v3', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formData.channelUrl,
            apiKey: 'AIzaSyDfETlyCtkm_-iM8p7G3fCaVqK4bu1wjsg' // Using the API key from env
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          channelInfo = {
            channelId: data.video.channelId,
            channelTitle: data.video.channelTitle,
            videoId: videoId,
            videoTitle: data.video.title
          };
          // Convert to channel URL
          finalChannelUrl = `https://youtube.com/channel/${data.video.channelId}`;
        }
      }
      
      const channelId = channelInfo?.channelId || extractChannelIdFromUrl(finalChannelUrl);
      const channelData = {
        channelId,
        channelUrl: finalChannelUrl,
        channelTitle: channelInfo?.channelTitle || channelId, // Will be updated when syncing
        sourceVideoUrl: videoId ? formData.channelUrl : null, // Store original video URL if provided
        sourceVideoId: videoId,
        monitoringEnabled: formData.monitoringEnabled,
        checkInterval: formData.checkInterval,
        autoCreateResource: formData.autoCreateResource,
        resourceCategory: formData.resourceCategory,
        resourceTags: formData.resourceTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        isPremiumContent: formData.isPremiumContent,
        autoExtractTranscript: formData.autoExtractTranscript,
        shadowingEnabled: formData.shadowingEnabled,
        videosImported: 0,
        totalViews: 0,
        totalShadowingSessions: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      let docId;
      if (editingChannel) {
        // Update existing channel
        await updateDoc(doc(db, 'youtubeChannels', editingChannel.id), {
          ...channelData,
          createdAt: editingChannel.createdAt, // Preserve original creation date
        });
        docId = editingChannel.id;
      } else {
        // Add new channel
        const docRef = await addDoc(collection(db, 'youtubeChannels'), channelData);
        docId = docRef.id;
      }
      
      // Auto-sync the channel after adding
      if (docId && !editingChannel) {
        await syncChannel(docId);
      }

      // Reset form and reload
      setFormData({
        channelUrl: '',
        monitoringEnabled: true,
        checkInterval: 24,
        autoCreateResource: true,
        resourceCategory: 'YouTube Series',
        resourceTags: '',
        isPremiumContent: false,
        autoExtractTranscript: true,
        shadowingEnabled: true,
      });
      setShowAddForm(false);
      setEditingChannel(null);
      loadChannels();
    } catch (error) {
      console.error('Error saving channel:', error);
      alert('Error saving channel. Please check the console.');
    } finally {
      setSaving(false);
    }
  };

  const syncChannel = async (channelId: string) => {
    try {
      setSyncing(channelId);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken(true); // Force refresh token
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/admin/sync-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ channelId })
      });
      
      if (response.ok) {
        const result = await response.json();

        await loadChannels();
        alert(`Successfully synced ${result.channelTitle}! Added ${result.videosAdded} videos, updated ${result.videosUpdated}.`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing channel:', error);
      alert('Error syncing channel. Please check the console.');
    } finally {
      setSyncing(null);
    }
  };

  const handleEdit = (channel: YouTubeChannel) => {
    setEditingChannel(channel);
    setFormData({
      channelUrl: channel.channelUrl,
      monitoringEnabled: channel.monitoringEnabled,
      checkInterval: channel.checkInterval,
      autoCreateResource: channel.autoCreateResource,
      resourceCategory: channel.resourceCategory,
      resourceTags: channel.resourceTags.join(', '),
      isPremiumContent: channel.isPremiumContent,
      autoExtractTranscript: channel.autoExtractTranscript,
      shadowingEnabled: channel.shadowingEnabled,
    });
    setShowAddForm(true);
  };

  const handleDelete = (channel: YouTubeChannel) => {
    setConfirmDialog({
      isOpen: true,
      loading: false,
      title: 'Delete YouTube Channel',
      message: `Are you sure you want to delete "${channel.channelTitle}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          await deleteDoc(doc(db, 'youtubeChannels', channel.id));
          loadChannels();
        } catch (error) {
          console.error('Error deleting channel:', error);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  if (adminLoading || loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">YouTube Series Management</h1>
            <p className="text-muted-foreground">
              Manage YouTube channels for automatic resource generation and shadowing integration.
            </p>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-card rounded-lg border border-border p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingChannel ? 'Edit Channel' : 'Add New Channel'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">YouTube URL</label>
                  <input
                    type="url"
                    value={formData.channelUrl}
                    onChange={(e) => setFormData({ ...formData, channelUrl: e.target.value })}
                    placeholder="Channel URL or Video URL (e.g. https://youtu.be/VIDEO_ID)"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can paste either a channel URL or any video URL from the channel
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Resource Category</label>
                    <input
                      type="text"
                      value={formData.resourceCategory}
                      onChange={(e) => setFormData({ ...formData, resourceCategory: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Check Interval (hours)</label>
                    <input
                      type="number"
                      value={formData.checkInterval}
                      onChange={(e) => setFormData({ ...formData, checkInterval: parseInt(e.target.value) })}
                      min="1"
                      max="168"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.resourceTags}
                    onChange={(e) => setFormData({ ...formData, resourceTags: e.target.value })}
                    placeholder="japanese, learning, beginner"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.monitoringEnabled}
                      onChange={(e) => setFormData({ ...formData, monitoringEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable monitoring</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.autoCreateResource}
                      onChange={(e) => setFormData({ ...formData, autoCreateResource: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Auto-create resources</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.autoExtractTranscript}
                      onChange={(e) => setFormData({ ...formData, autoExtractTranscript: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Auto-extract transcripts</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.shadowingEnabled}
                      onChange={(e) => setFormData({ ...formData, shadowingEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable shadowing integration</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPremiumContent}
                      onChange={(e) => setFormData({ ...formData, isPremiumContent: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Mark as premium content</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : (editingChannel ? 'Update' : 'Add')} Channel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingChannel(null);
                      setFormData({
                        channelUrl: '',
                        monitoringEnabled: true,
                        checkInterval: 24,
                        autoCreateResource: true,
                        resourceCategory: 'YouTube Series',
                        resourceTags: '',
                        isPremiumContent: false,
                        autoExtractTranscript: true,
                        shadowingEnabled: true,
                      });
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-8 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Add New Channel
            </button>
          )}

          {/* Channels List */}
          <div className="space-y-4">
            {channels.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground">No channels added yet.</p>
              </div>
            ) : (
              channels.map((channel) => (
                <div key={channel.id} className="bg-card rounded-lg border border-border p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {channel.channelTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {channel.channelUrl}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          channel.monitoringEnabled 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {channel.monitoringEnabled ? '✓ Monitoring' : 'Paused'}
                        </span>
                        
                        {channel.autoCreateResource && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Auto-create
                          </span>
                        )}
                        
                        {channel.shadowingEnabled && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            Shadowing
                          </span>
                        )}
                        
                        {channel.isPremiumContent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            Premium
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Category: {channel.resourceCategory}</p>
                        <p>Tags: {channel.resourceTags.join(', ') || 'None'}</p>
                        <p>Check every: {channel.checkInterval} hours</p>
                        <p>Videos imported: {channel.videosImported}</p>
                        {channel.lastCheckedAt && (
                          <p>Last checked: {formatDistanceToNow(channel.lastCheckedAt.toDate(), { addSuffix: true })}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => syncChannel(channel.id)}
                        className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Sync Videos"
                        disabled={syncing === channel.id}
                      >
                        {syncing === channel.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(channel)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(channel)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        loading={confirmDialog.loading}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </AdminLayout>
  );
}