import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, setDoc, updateDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import axios from 'axios';

// YouTube Data API v3 endpoint
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Extract channel ID from URL
function extractChannelId(url: string): string | null {
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
  
  return null;
}

// Convert ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Sync YouTube channel API called');
    
    // Initialize Firebase Admin
    const admin = await getFirebaseAdmin();
    console.log('Firebase Admin initialized');
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No valid authorization header');
      return NextResponse.json({ error: 'Unauthorized - No valid authorization header' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Token received, length:', token?.length);
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Token verified for user:', decodedToken.uid);
      
      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', decodedToken.uid));
      const userData = userDoc.data();
      if (!userData?.isAdmin) {
        console.error('User is not admin:', decodedToken.uid);
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      console.log('Admin access confirmed');
    } catch (authError: any) {
      console.error('Auth verification failed:', authError.message || authError);
      return NextResponse.json({ error: `Invalid token: ${authError.message || 'Unknown error'}` }, { status: 401 });
    }

    const { channelId } = await request.json();
    
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Get YouTube API key from environment
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    // Get channel data from Firestore
    const channelDoc = await getDoc(doc(db, 'youtubeChannels', channelId));
    if (!channelDoc.exists()) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const channelData = channelDoc.data();
    let youtubeChannelId = channelData.youtubeChannelId || channelData.channelId;
    
    // If we don't have a valid YouTube channel ID, try to extract it
    if (!youtubeChannelId || youtubeChannelId.includes('youtube.com')) {
      const channelUrl = channelData.channelUrl;
      
      // Extract YouTube channel ID from URL
      youtubeChannelId = extractChannelId(channelUrl);
      
      // If it's a handle (@username), we need to search for the channel
      if (channelUrl.includes('/@')) {
        const handle = channelUrl.match(/@([^\/\?]+)/)?.[1];
        if (handle) {
          // Search for channel by handle
          const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
            params: {
              part: 'snippet',
              q: handle,
              type: 'channel',
              maxResults: 1,
              key: apiKey
            }
          });
          
          if (searchResponse.data.items?.length > 0) {
            youtubeChannelId = searchResponse.data.items[0].snippet.channelId;
          }
        }
      }
    }
    
    // If it starts with UC (channel ID format), use it directly
    if (!youtubeChannelId || (!youtubeChannelId.startsWith('UC') && !youtubeChannelId.startsWith('@'))) {
      return NextResponse.json({ error: 'Could not determine valid YouTube channel ID' }, { status: 400 });
    }

    console.log('Syncing channel:', youtubeChannelId);

    // Fetch channel details
    const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'snippet,contentDetails',
        id: youtubeChannelId,
        key: apiKey
      }
    });

    if (!channelResponse.data.items?.length) {
      return NextResponse.json({ error: 'YouTube channel not found' }, { status: 404 });
    }

    const ytChannel = channelResponse.data.items[0];
    const uploadsPlaylistId = ytChannel.contentDetails.relatedPlaylists.uploads;

    // Update channel info in Firestore
    await updateDoc(doc(db, 'youtubeChannels', channelId), {
      channelTitle: ytChannel.snippet.title,
      description: ytChannel.snippet.description,
      thumbnailUrl: ytChannel.snippet.thumbnails.high?.url || ytChannel.snippet.thumbnails.default?.url,
      youtubeChannelId: youtubeChannelId,
      uploadsPlaylistId: uploadsPlaylistId,
      lastCheckedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Fetch recent videos from uploads playlist (last 10 videos)
    const videosResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: 10,
        key: apiKey
      }
    });

    const videoIds = videosResponse.data.items.map((item: any) => item.contentDetails.videoId);
    
    // Fetch detailed video information
    const videoDetailsResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoIds.join(','),
        key: apiKey
      }
    });

    // Check which videos already exist
    const existingVideosQuery = query(
      collection(db, 'youtubeVideoResources'),
      where('videoId', 'in', videoIds)
    );
    const existingVideosSnapshot = await getDocs(existingVideosQuery);
    const existingVideoIds = new Set(existingVideosSnapshot.docs.map(doc => doc.data().videoId));

    let videosAdded = 0;
    let videosUpdated = 0;

    // Save or update videos in Firestore
    for (const video of videoDetailsResponse.data.items) {
      const videoData = {
        videoId: video.id,
        channelId: channelId, // Firestore document ID of the channel
        youtubeChannelId: youtubeChannelId,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.standard?.url || video.snippet.thumbnails.default?.url,
        publishedAt: Timestamp.fromDate(new Date(video.snippet.publishedAt)),
        duration: parseDuration(video.contentDetails.duration),
        viewCount: parseInt(video.statistics.viewCount || '0'),
        likeCount: parseInt(video.statistics.likeCount || '0'),
        commentCount: parseInt(video.statistics.commentCount || '0'),
        
        // Resource-related fields
        resourceCategory: channelData.resourceCategory,
        resourceTags: channelData.resourceTags || [],
        isPremiumContent: channelData.isPremiumContent || false,
        shadowingEnabled: channelData.shadowingEnabled || false,
        
        // Tracking fields
        transcriptCached: false,
        shadowingSessionCount: 0,
        importedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const videoDocId = `${channelId}_${video.id}`;
      
      if (existingVideoIds.has(video.id)) {
        // Update existing video
        await updateDoc(doc(db, 'youtubeVideoResources', videoDocId), {
          ...videoData,
          importedAt: undefined // Don't update importedAt for existing videos
        });
        videosUpdated++;
      } else {
        // Add new video
        await setDoc(doc(db, 'youtubeVideoResources', videoDocId), videoData);
        videosAdded++;
      }
    }

    // Update channel stats
    await updateDoc(doc(db, 'youtubeChannels', channelId), {
      videosImported: (channelData.videosImported || 0) + videosAdded,
      lastSyncedAt: Timestamp.now()
    });

    return NextResponse.json({
      success: true,
      channelTitle: ytChannel.snippet.title,
      videosAdded,
      videosUpdated,
      totalVideos: videoIds.length
    });

  } catch (error) {
    console.error('Sync error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        return NextResponse.json(
          { error: 'YouTube API quota exceeded or API key invalid' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to sync channel videos' },
      { status: 500 }
    );
  }
}