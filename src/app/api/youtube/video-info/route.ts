import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import ytdl from '@distube/ytdl-core';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Just the ID itself
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Format duration from ISO 8601 to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Method 1: Try YouTube Data API v3 (if API key is available)
    const GOOGLE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (GOOGLE_API_KEY) {
      try {
        const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
          params: {
            part: 'snippet,contentDetails,statistics',
            id: videoId,
            key: GOOGLE_API_KEY
          }
        });
        
        if (response.data.items && response.data.items.length > 0) {
          const video = response.data.items[0];
          
          return NextResponse.json({
            success: true,
            videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle,
            thumbnailUrl: video.snippet.thumbnails.maxresdefault?.url || 
                         video.snippet.thumbnails.high?.url ||
                         video.snippet.thumbnails.medium?.url ||
                         `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            publishedAt: video.snippet.publishedAt,
            duration: parseDuration(video.contentDetails.duration),
            viewCount: parseInt(video.statistics.viewCount || '0'),
            likeCount: parseInt(video.statistics.likeCount || '0'),
            commentCount: parseInt(video.statistics.commentCount || '0'),
            tags: video.snippet.tags || [],
            method: 'youtube-api'
          });
        }
      } catch (apiError) {
        console.error('YouTube API error:', apiError);
        // Fall through to alternative methods
      }
    }
    
    // Method 2: Try ytdl-core as fallback
    try {

      const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const videoDetails = info.videoDetails;
      
      // Get best quality thumbnail
      const thumbnails = videoDetails.thumbnails || [];
      const bestThumbnail = thumbnails[thumbnails.length - 1]?.url || 
                            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      return NextResponse.json({
        success: true,
        videoId,
        title: videoDetails.title,
        description: videoDetails.description || '',
        channelId: videoDetails.channelId,
        channelTitle: videoDetails.author?.name || '',
        thumbnailUrl: bestThumbnail,
        publishedAt: videoDetails.publishDate,
        duration: parseInt(videoDetails.lengthSeconds || '0'),
        viewCount: parseInt(videoDetails.viewCount || '0'),
        likeCount: parseInt(videoDetails.likes?.toString() || '0'),
        tags: videoDetails.keywords || [],
        method: 'ytdl-core'
      });
    } catch (ytdlError) {
      console.error('ytdl-core error:', ytdlError);
    }
    
    // Method 3: Return basic info with default thumbnail
    // This always works as long as we have a valid video ID
    return NextResponse.json({
      success: true,
      videoId,
      title: `YouTube Video ${videoId}`,
      description: '',
      channelId: '',
      channelTitle: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      publishedAt: new Date().toISOString(),
      duration: 0,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      tags: [],
      method: 'fallback',
      partial: true // Indicates this is partial data
    });
    
  } catch (error) {
    console.error('Video info API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch video information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}