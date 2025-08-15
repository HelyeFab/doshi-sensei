import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// YouTube Data API v3 endpoint
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url, apiKey } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
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

    // Fetch video details and captions list
    const videoResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: apiKey
      }
    });

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const video = videoResponse.data.items[0];
    const videoInfo = {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      thumbnails: video.snippet.thumbnails,
      defaultLanguage: video.snippet.defaultLanguage,
      defaultAudioLanguage: video.snippet.defaultAudioLanguage
    };

    // Fetch captions
    let captions = [];
    let transcript = null;
    
    try {
      const captionsResponse = await axios.get(`${YOUTUBE_API_BASE}/captions`, {
        params: {
          part: 'snippet',
          videoId: videoId,
          key: apiKey
        }
      });

      if (captionsResponse.data.items) {
        captions = captionsResponse.data.items.map((caption: any) => ({
          id: caption.id,
          language: caption.snippet.language,
          name: caption.snippet.name,
          audioTrackType: caption.snippet.audioTrackType,
          isCC: caption.snippet.isCC,
          isAutoSynced: caption.snippet.isAutoSynced,
          isDraft: caption.snippet.isDraft
        }));

        // Find Japanese captions
        const jaCaption = captions.find((cap: any) => 
          cap.language === 'ja' || 
          cap.language === 'ja-JP'
        );

        if (jaCaption) {

          // Note: The YouTube Data API v3 doesn't provide direct access to caption content
          // We need to use the caption download feature which requires OAuth2 authentication
          // For now, we'll return the caption metadata
          transcript = {
            available: true,
            language: jaCaption.language,
            name: jaCaption.name,
            isAutoSynced: jaCaption.isAutoSynced,
            message: 'Caption track found. Use alternative methods to download content.'
          };
        }
      }
    } catch (captionError) {
      console.error('Error fetching captions:', captionError);
      // Captions might not be available or require additional permissions
    }

    return NextResponse.json({
      success: true,
      video: videoInfo,
      captions: captions,
      transcript: transcript,
      shortUrl: `youtu.be/${videoId}`
    });

  } catch (error) {
    console.error('YouTube API v3 error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        return NextResponse.json(
          { error: 'YouTube API quota exceeded or API key invalid' },
          { status: 403 }
        );
      }
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch video information' },
      { status: 500 }
    );
  }
}