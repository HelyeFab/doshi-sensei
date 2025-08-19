import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  // Clean URL first - remove any tracking parameters
  const cleanUrl = url.split('?')[0] + (url.includes('?v=') ? '?v=' + url.split('?v=')[1]?.split('&')[0] : '');
  
  const patterns = [
    // Standard watch URLs
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URLs (youtu.be)
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URLs
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Mobile URLs
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // YouTube Shorts
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // Old format
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      console.log('✅ Extracted video ID:', match[1], 'from URL:', url);
      return match[1];
    }
  }
  
  console.log('❌ Could not extract video ID from URL:', url);
  return null;
}

// Extract channel ID from channel URLs
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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    console.log('🔵 [CHANNEL-INFO API] Received request for URL:', url);
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Use the API key from environment
    const API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    
    console.log('🔑 [CHANNEL-INFO API] API Key configured:', !!API_KEY, 'Key prefix:', API_KEY?.substring(0, 10) + '...');
    
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    let channelId: string | null = null;
    let videoInfo = null;

    // Check if it's a video URL or channel URL
    const videoId = extractVideoId(url);
    console.log('🎬 [CHANNEL-INFO API] Extracted video ID:', videoId);
    
    if (videoId) {
      // It's a video URL - get channel info from the video
      console.log('📺 Fetching video info for:', videoId);
      
      const videoResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: videoId,
          key: API_KEY
        }
      });

      if (videoResponse.data.items && videoResponse.data.items.length > 0) {
        const video = videoResponse.data.items[0];
        channelId = video.snippet.channelId;
        
        // Store video info for reference
        videoInfo = {
          videoId: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnailUrl: video.snippet.thumbnails?.maxres?.url || 
                       video.snippet.thumbnails?.high?.url ||
                       video.snippet.thumbnails?.medium?.url,
          publishedAt: video.snippet.publishedAt,
          duration: video.contentDetails.duration,
          viewCount: parseInt(video.statistics?.viewCount || '0'),
          likeCount: parseInt(video.statistics?.likeCount || '0'),
          commentCount: parseInt(video.statistics?.commentCount || '0')
        };
        
        console.log('✅ Found channel ID from video:', channelId);
      }
    } else {
      // Try to extract channel ID directly
      channelId = extractChannelId(url);
      
      // If it's a @handle URL, we need to search for the channel
      if (!channelId && url.includes('@')) {
        const handleMatch = url.match(/@([^\/\?]+)/);
        if (handleMatch) {
          const handle = handleMatch[1];
          console.log('🔍 Searching for channel by handle:', handle);
          
          const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
            params: {
              part: 'snippet',
              q: `@${handle}`,
              type: 'channel',
              maxResults: 1,
              key: API_KEY
            }
          });
          
          if (searchResponse.data.items && searchResponse.data.items.length > 0) {
            channelId = searchResponse.data.items[0].snippet.channelId;
            console.log('✅ Found channel ID from handle:', channelId);
          }
        }
      }
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'Could not extract channel information from URL' },
        { status: 400 }
      );
    }

    // Now fetch full channel information
    console.log('📊 Fetching full channel info for:', channelId);
    
    const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'snippet,contentDetails,statistics,brandingSettings',
        id: channelId,
        key: API_KEY
      }
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    const channel = channelResponse.data.items[0];
    
    // Extract all relevant channel information
    const channelInfo = {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      channelUrl: `https://youtube.com/channel/${channel.id}`,
      description: channel.snippet.description,
      customUrl: channel.snippet.customUrl,
      publishedAt: channel.snippet.publishedAt,
      thumbnailUrl: channel.snippet.thumbnails?.high?.url || 
                   channel.snippet.thumbnails?.medium?.url ||
                   channel.snippet.thumbnails?.default?.url,
      bannerUrl: channel.brandingSettings?.image?.bannerExternalUrl,
      country: channel.snippet.country,
      
      // Statistics
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
      
      // Additional branding
      keywords: channel.brandingSettings?.channel?.keywords,
      unsubscribedTrailer: channel.brandingSettings?.channel?.unsubscribedTrailer,
      
      // Playlists (for later use)
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads
    };

    // Fetch recent videos from this channel (optional - for preview)
    let recentVideos = [];
    if (channelInfo.uploadsPlaylistId) {
      try {
        console.log('📹 Fetching recent videos from channel...');
        
        const videosResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
          params: {
            part: 'snippet,contentDetails',
            playlistId: channelInfo.uploadsPlaylistId,
            maxResults: 5,
            key: API_KEY
          }
        });
        
        if (videosResponse.data.items) {
          recentVideos = videosResponse.data.items.map((item: any) => ({
            videoId: item.contentDetails.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails?.medium?.url,
            publishedAt: item.snippet.publishedAt
          }));
        }
      } catch (error) {
        console.error('Error fetching recent videos:', error);
        // Not critical, continue without recent videos
      }
    }

    console.log('✅ Successfully fetched complete channel information');
    
    return NextResponse.json({
      success: true,
      channel: channelInfo,
      sourceVideo: videoInfo, // If it was a video URL
      recentVideos: recentVideos,
      statistics: {
        subscriberCount: channelInfo.subscriberCount.toLocaleString(),
        videoCount: channelInfo.videoCount.toLocaleString(),
        totalViews: channelInfo.viewCount.toLocaleString()
      }
    });

  } catch (error) {
    console.error('YouTube Channel API error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.error?.message || '';
        if (errorMessage.includes('quota')) {
          return NextResponse.json(
            { error: 'YouTube API quota exceeded. Please try again later.' },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { error: 'YouTube API access denied. Please check API key configuration.' },
          { status: 403 }
        );
      }
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: 'Channel not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch channel information' },
      { status: 500 }
    );
  }
}