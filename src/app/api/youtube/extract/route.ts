import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Dynamic import for ytdl-core to avoid server-side issues
let ytdl: any;
try {
  ytdl = require('ytdl-core');
} catch (error) {
  console.error('Failed to import ytdl-core:', error);
}

// Import cache manager with error handling
let TranscriptCacheManager: any;
try {
  TranscriptCacheManager = require('@/utils/transcriptCache').TranscriptCacheManager;
} catch (error) {
  console.error('Failed to import TranscriptCacheManager:', error);
}

// YouTube Data API v3 endpoint
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Helper function to validate YouTube and YouTube Music URLs
function isValidYouTubeUrl(url: string): boolean {
  // Check standard YouTube URLs
  if (ytdl.validateURL(url)) {
    return true;
  }
  
  // Check YouTube Music URLs
  const youtubeMusicPattern = /^https?:\/\/(music\.)?youtube\.com\/(watch|embed)\?v=([a-zA-Z0-9_-]{11})/;
  const youtubeMusicShortPattern = /^https?:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/;
  
  return youtubeMusicPattern.test(url) || youtubeMusicShortPattern.test(url);
}

// Helper to extract video ID from YouTube Music URLs
function extractVideoIdFromUrl(url: string): string | null {
  // Try standard extraction first
  try {
    return ytdl.getVideoID(url);
  } catch {
    // Fallback for YouTube Music URLs
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || !isValidYouTubeUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube or YouTube Music URL' },
        { status: 400 }
      );
    }

    console.log('=== Starting YouTube extraction ===');
    console.log('URL:', url);
    console.log('Request headers:', request.headers);
    
    // Check cache FIRST - caching is MANDATORY
    if (!TranscriptCacheManager) {
      throw new Error('TranscriptCacheManager is required but not available');
    }
    
    let contentId = '';
    let cachedTranscript = null;
    
    try {
      // Generate content ID for cache lookup
      contentId = TranscriptCacheManager.generateContentId({
        type: 'youtube',
        videoUrl: url
      });
      
      console.log('Checking transcript cache for:', contentId);
      cachedTranscript = await TranscriptCacheManager.getCachedTranscript(contentId);
    } catch (cacheError) {
      console.error('Error checking cache:', cacheError);
      // For read errors, we can continue (might be first time)
      // But for critical errors like missing Firestore, we should fail
      if (cacheError?.message?.includes('Firestore is required')) {
        throw cacheError;
      }
      cachedTranscript = null;
    }
    
    if (cachedTranscript && cachedTranscript.transcript.length > 0) {
      console.log('Using cached transcript! Access count:', cachedTranscript.accessCount);
      return NextResponse.json({
        success: true,
        transcript: cachedTranscript.transcript,
        language: cachedTranscript.language,
        videoTitle: cachedTranscript.videoTitle,
        videoMetadata: cachedTranscript.metadata,
        method: 'cache',
        fromCache: true
      });
    }
    
    console.log('No cache hit, fetching from YouTube...');
    console.log('Environment check - GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
    console.log('Environment check - YOUTUBE_API_KEY exists:', !!process.env.YOUTUBE_API_KEY);
    console.log('Environment check - SUPA_YOUTUBE_API_KEY exists:', !!process.env.SUPA_YOUTUBE_API_KEY);
    
    // Extract video ID for YouTube API calls
    const videoId = extractVideoIdFromUrl(url);
    let videoMetadata = null;
    
    // First, try YouTube Data API v3 for video metadata using server-side API key
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.YOUTUBE_API_KEY;
    
    if (GOOGLE_API_KEY) {
      try {
        console.log('Fetching video metadata from YouTube Data API v3...');
        
        const videoResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
          params: {
            part: 'snippet,contentDetails',
            id: videoId,
            key: GOOGLE_API_KEY
          }
        });

        if (videoResponse.data.items && videoResponse.data.items.length > 0) {
          const video = videoResponse.data.items[0];
          videoMetadata = {
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            description: video.snippet.description,
            thumbnails: video.snippet.thumbnails,
            duration: video.contentDetails.duration,
            publishedAt: video.snippet.publishedAt
          };
          console.log('Successfully fetched video metadata:', videoMetadata.title);
        }
      } catch (youtubeApiError: any) {
        console.error('YouTube Data API error:', youtubeApiError.message);
        if (youtubeApiError.response) {
          console.error('API Response:', youtubeApiError.response.status, youtubeApiError.response.data);
        }
        // Continue with other methods - don't let this block SupaData
      }
    } else {
      console.warn('GOOGLE_API_KEY not configured in environment variables');
    }
    
    // Then try SupaData AI for transcripts
    const SUPA_API_KEY = process.env.SUPA_YOUTUBE_API_KEY;
    
    if (SUPA_API_KEY) {
      // Retry logic for SupaData API
      let supaResponse = null;
      let lastError = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`=== Trying SupaData AI (attempt ${attempt + 1}/${maxRetries}) ===`);
          console.log('SupaData API Key first 10 chars:', SUPA_API_KEY.substring(0, 10) + '...');
          console.log('Request URL:', url);
          console.log('Request params:', { url, lang: 'ja' });
          
          // Add a small delay between retries
          if (attempt > 0) {
            console.log(`Waiting ${attempt * 1000}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
          
          supaResponse = await axios.get(
            `https://api.supadata.ai/v1/transcript`,
            {
              params: { 
                url,
                lang: 'ja' // Request Japanese subtitles specifically
              },
              headers: {
                'x-api-key': SUPA_API_KEY
              },
              timeout: 30000 // 30 second timeout
            }
          );
          
          // If successful, break out of retry loop
          if (supaResponse && supaResponse.data) {
            console.log(`SupaData succeeded on attempt ${attempt + 1}`);
            break;
          }
        } catch (error: any) {
          lastError = error;
          console.error(`SupaData attempt ${attempt + 1} failed:`, error.message);
          if (attempt === maxRetries - 1) {
            throw error; // Re-throw on last attempt
          }
        }
      }
      
      if (supaResponse && supaResponse.data) {
        
        console.log('SupaData response status:', supaResponse.status);
        console.log('SupaData response data keys:', Object.keys(supaResponse.data || {}));
          console.log('Successfully got transcript from SupaData AI');
          console.log('Response lang:', supaResponse.data.lang);
          console.log('Available langs:', supaResponse.data.availableLangs);
          console.log('Content exists:', !!supaResponse.data.content);
          console.log('Content length:', supaResponse.data.content?.length || 0);
          
          // Check if Japanese subtitles are available
          if (supaResponse.data.lang !== 'ja' && !supaResponse.data.availableLangs?.includes('ja')) {
            console.log('No Japanese subtitles available from SupaData');
            throw new Error('No Japanese subtitles available');
          }
          
          // Parse SupaData response to our format
          const transcript = parseSupaDataTranscript(supaResponse.data);
          console.log('Parsed transcript length:', transcript.length);
          console.log('First transcript item:', transcript[0]);
          
          if (transcript && transcript.length > 0) {
            // Save to cache before returning
            console.log('=== Saving to transcript cache ===');
            console.log('Content ID:', contentId);
            console.log('Video URL:', url);
            console.log('Video title:', videoMetadata?.title || supaResponse.data.title || 'Unknown');
            
            // Cache saving is MANDATORY
            if (!TranscriptCacheManager) {
              throw new Error('TranscriptCacheManager is required but not available');
            }
            
            try {
              await TranscriptCacheManager.saveTranscriptToCache({
                contentId,
                contentType: 'youtube',
                videoUrl: url,
                videoTitle: videoMetadata?.title || supaResponse.data.title || 'Unknown',
                transcript,
                language: 'ja',
                metadata: {
                  youtubeVideoId: videoId,
                  channelName: videoMetadata?.channelTitle,
                  uploadDate: videoMetadata?.publishedAt,
                  thumbnailUrl: videoMetadata?.thumbnails?.medium?.url || videoMetadata?.thumbnails?.default?.url,
                  duration: videoMetadata?.duration
                }
              });
              console.log('=== Cache save completed successfully ===');
            } catch (cacheError: any) {
              console.error('=== CRITICAL: Cache save failed after retries ===', cacheError);
              // Cache is mandatory but we have the transcript - log error but continue
              console.error('IMPORTANT: Transcript was extracted but failed to cache');
              console.error('This means the next request will have to extract again');
              // Still return the transcript to the user rather than failing completely
            }
            
            return NextResponse.json({
              success: true,
              transcript,
              language: 'ja',
              isAutoGenerated: false, // SupaData provides quality transcripts
              videoTitle: videoMetadata?.title || supaResponse.data.title || 'Unknown',
              videoMetadata: videoMetadata,
              method: 'supadata-ai'
            });
          }
      } else if (lastError) {
        // Handle error if all retries failed
        console.error('=== SupaData AI error after all retries ===');
        console.error('Error message:', lastError.message);
        console.error('Error response status:', lastError.response?.status);
        console.error('Error response data:', lastError.response?.data);
        if (lastError.response?.status === 404) {
          console.log('No transcript available from SupaData');
        } else if (lastError.response?.status === 401) {
          console.error('SupaData API key authentication failed');
        } else if (lastError.response?.status === 403) {
          console.error('SupaData API key forbidden - check permissions');
        } else if (lastError.code === 'ECONNABORTED' || lastError.code === 'ETIMEDOUT') {
          console.error('SupaData request timed out - service may be slow');
        } else if (lastError.response?.status >= 500) {
          console.error('SupaData server error - service may be temporarily down');
        }
        // Continue to fallback methods
      }
    } else {
      console.warn('SUPA_YOUTUBE_API_KEY not configured');
    }
    
    // Method 1: Try ytdl-core to get video info (if available)
    if (ytdl) {
      try {
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      
      console.log('Video title:', videoDetails.title);
      console.log('Available captions:', info.player_response?.captions);
      
      // Check for captions in player response
      const captionTracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (captionTracks && captionTracks.length > 0) {
        console.log('Found caption tracks:', captionTracks.map(t => t.languageCode));
        
        // Look for Japanese captions
        const jaTrack = captionTracks.find(track => 
          track.languageCode === 'ja' || 
          track.languageCode === 'ja-JP'
        );
        
        if (jaTrack) {
          console.log('Found Japanese captions, fetching...');
          
          // Fetch the actual captions
          try {
            const captionResponse = await axios.get(jaTrack.baseUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              }
            });
            
            // Parse the caption data
            const captionData = captionResponse.data;
            const transcript = parseYouTubeCaptions(captionData);
            
            return NextResponse.json({
              success: true,
              transcript,
              language: jaTrack.languageCode,
              isAutoGenerated: jaTrack.kind === 'asr',
              videoTitle: videoMetadata?.title || videoDetails.title,
              videoMetadata: videoMetadata,
              method: 'ytdl-core'
            });
          } catch (captionError) {
            console.error('Error fetching captions:', captionError);
          }
        }
      }
      } catch (ytdlError) {
        console.error('ytdl-core error:', ytdlError);
      }
    } else {
      console.log('ytdl-core not available - skipping this method');
    }
    
    // Method 2: Try get_video_info approach (more reliable)
    try {
      console.log('Trying get_video_info method for video:', videoId);
      
      // First, get video info to extract caption URLs
      const videoInfoUrl = `https://www.youtube.com/get_video_info?video_id=${videoId}&hl=ja`;
      
      const videoInfoResponse = await axios.post(videoInfoUrl, null, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
        }
      });
      
      // Parse the URL-encoded response
      const params = new URLSearchParams(videoInfoResponse.data);
      const playerResponse = params.get('player_response');
      
      if (playerResponse) {
        const playerData = JSON.parse(playerResponse);
        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captionTracks) {
          console.log('Found caption tracks via get_video_info:', captionTracks.map((t: any) => t.languageCode));
          
          // Look for Japanese captions
          const jaTrack = captionTracks.find((track: any) => 
            track.languageCode === 'ja' || 
            track.languageCode === 'ja-JP'
          );
          
          if (jaTrack && jaTrack.baseUrl) {
            console.log('Found Japanese track, fetching from:', jaTrack.baseUrl);
            
            const captionResponse = await axios.get(jaTrack.baseUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              }
            });
            
            const transcript = parseYouTubeCaptions(captionResponse.data);
            
            if (transcript.length > 0) {
              return NextResponse.json({
                success: true,
                transcript,
                language: jaTrack.languageCode,
                isAutoGenerated: jaTrack.kind === 'asr',
                videoTitle: videoMetadata?.title || playerData?.videoDetails?.title,
                videoMetadata: videoMetadata,
                method: 'get_video_info'
              });
            }
          }
        }
      }
    } catch (getVideoInfoError) {
      console.error('get_video_info error:', getVideoInfoError);
    }
    
    // Method 3: Try alternative endpoints
    const alternativeUrls = [
      `https://video.google.com/timedtext?lang=ja&v=${videoId}`,
      `https://video.google.com/timedtext?lang=ja&v=${videoId}&kind=asr`,
      `https://www.youtube.com/api/timedtext?lang=ja&v=${videoId}&fmt=json3`,
    ];
    
    for (const altUrl of alternativeUrls) {
      try {
        console.log('Trying alternative URL:', altUrl);
        const response = await axios.get(altUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Language': 'ja,en;q=0.9',
          },
          timeout: 5000
        });
        
        if (response.data) {
          const transcript = parseYouTubeCaptions(response.data);
          if (transcript.length > 0) {
            return NextResponse.json({
              success: true,
              transcript,
              language: 'ja',
              isAutoGenerated: altUrl.includes('kind=asr'),
              videoTitle: videoMetadata?.title,
              videoMetadata: videoMetadata,
              method: 'alternative-endpoint'
            });
          }
        }
      } catch (altError: any) {
        console.error(`Alternative URL failed:`, altError.message);
        if (altError.response) {
          console.error(`Response status: ${altError.response.status}`);
          console.error(`Response data:`, altError.response.data?.substring(0, 200));
        }
      }
    }
    
    // No captions found
    console.log('=== All methods failed ===');
    console.log('Returning error response with metadata:', !!videoMetadata);
    
    return NextResponse.json({
      success: false,
      error: 'No Japanese captions found',
      message: 'This video does not have Japanese captions available. Try uploading the audio for AI transcription.',
      videoTitle: videoMetadata?.title,
      videoMetadata: videoMetadata
    });
    
  } catch (error: any) {
    console.error('=== API route critical error ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', error);
    
    // Check for specific error types
    let errorMessage = 'Failed to process request';
    let statusCode = 500;
    
    if (error?.message?.includes('Firebase') || error?.message?.includes('Firestore')) {
      errorMessage = 'Database connection error - transcripts may still work';
      console.error('Firebase/Firestore error detected - continuing without cache');
    } else if (error?.message?.includes('ytdl')) {
      errorMessage = 'YouTube extraction library error';
    } else if (error?.code === 'MODULE_NOT_FOUND') {
      errorMessage = 'Server configuration error - missing dependencies';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: error?.message || 'Unknown error',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name || 'UnknownError',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: statusCode }
    );
  }
}

function parseYouTubeCaptions(data: string): any[] {
  const transcript: any[] = [];
  
  try {
    if (typeof data === 'string') {
      if (data.includes('<text')) {
        // Parse XML format
        const textRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([^<]+)<\/text>/g;
        let match;
        let index = 1;
        
        while ((match = textRegex.exec(data)) !== null) {
          const start = parseFloat(match[1]);
          const duration = parseFloat(match[2]);
          const text = match[3]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n/g, ' ')
            .trim();
          
          if (text) {
            transcript.push({
              id: String(index++),
              text: text,
              startTime: start,
              endTime: start + duration,
              words: text.split(/[\s、。！？]/g).filter(w => w.length > 0)
            });
          }
        }
      } else if (data.startsWith('{') || data.startsWith('[')) {
        // Parse JSON format
        const json = JSON.parse(data);
        const events = json.events || json;
        
        if (Array.isArray(events)) {
          events.forEach((event: any, index: number) => {
            if (event.segs || event.text) {
              const text = event.text || event.segs.map((s: any) => s.utf8).join('');
              const start = (event.tStartMs || event.start || 0) / 1000;
              const duration = (event.dDurationMs || event.dur || 5000) / 1000;
              
              transcript.push({
                id: String(index + 1),
                text: text.trim(),
                startTime: start,
                endTime: start + duration,
                words: text.trim().split(/[\s、。！？]/g).filter((w: string) => w.length > 0)
              });
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing captions:', error);
  }
  
  return transcript;
}

function parseSupaDataTranscript(data: any): any[] {
  const transcript: any[] = [];
  
  try {
    // SupaData returns data in format: { lang: 'ja', content: [...], availableLangs: [...] }
    if (data.content && Array.isArray(data.content)) {
      data.content.forEach((segment: any, index: number) => {
        // Convert milliseconds to seconds
        const startTime = (segment.offset || 0) / 1000;
        const duration = (segment.duration || 5000) / 1000;
        const endTime = startTime + duration;
        
        transcript.push({
          id: String(index + 1),
          text: segment.text || '',
          startTime: startTime,
          endTime: endTime,
          words: (segment.text || '').split(/[\s、。！？]/g).filter((w: string) => w.length > 0)
        });
      });
    }
    // Fallback for other possible formats
    else if (data.transcript) {
      // If it's already formatted as an array of segments
      if (Array.isArray(data.transcript)) {
        data.transcript.forEach((segment: any, index: number) => {
          transcript.push({
            id: String(index + 1),
            text: segment.text || segment.content || '',
            startTime: segment.start || segment.startTime || index * 5,
            endTime: segment.end || segment.endTime || (index + 1) * 5,
            words: (segment.text || segment.content || '').split(/[\s、。！？]/g).filter((w: string) => w.length > 0)
          });
        });
      } 
      // If it's a plain text transcript
      else if (typeof data.transcript === 'string') {
        // Split by sentences or paragraphs and create segments
        const sentences = data.transcript.split(/[。！？\n]+/).filter((s: string) => s.trim());
        const avgDuration = 5; // 5 seconds per segment as default
        
        sentences.forEach((sentence: string, index: number) => {
          transcript.push({
            id: String(index + 1),
            text: sentence.trim(),
            startTime: index * avgDuration,
            endTime: (index + 1) * avgDuration,
            words: sentence.trim().split(/[\s、。！？]/g).filter((w: string) => w.length > 0)
          });
        });
      }
    }
  } catch (error) {
    console.error('Error parsing SupaData transcript:', error);
  }
  
  return transcript;
}