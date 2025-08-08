import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import axios from 'axios';
import { TranscriptCacheManager } from '@/utils/transcriptCache';
import { getSubtitles } from 'youtube-captions-scraper';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// YouTube Data API v3 endpoint
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Helper function to log API usage
async function logApiUsage(api: string, success: boolean, error?: string, metadata?: any) {
  try {
    if (db) {
      await addDoc(collection(db, 'apiUsageLogs'), {
        api,
        success,
        error,
        metadata,
        timestamp: serverTimestamp()
      });
    }
  } catch (err) {
    console.error('Failed to log API usage:', err);
  }
}

// Helper function to extract with YouTube-Transcript.io
async function extractWithYouTubeTranscriptIO(
  videoId: string | null,
  apiKey: string | undefined,
  contentId: string,
  isAuthenticated: boolean,
  videoMetadata: any,
  url: string
): Promise<NextResponse> {
  try {
    console.log('=== Extracting with YouTube-Transcript.io ===');
    
    if (!videoId) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_VIDEO_ID',
        message: 'Could not extract video ID from URL'
      });
    }
    
    // YouTube-Transcript.io API endpoint
    const apiUrl = `https://youtube-transcript.io/api/transcript`;
    
    // Prepare request parameters
    const params: any = {
      video_id: videoId,
      lang: 'ja' // Request Japanese transcripts
    };
    
    // Add API key if provided (for paid plans)
    const headers: any = {
      'Accept': 'application/json',
      'User-Agent': 'Doshi-Sensei/1.0'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    console.log('Requesting transcript from YouTube-Transcript.io...');
    console.log('Video ID:', videoId);
    console.log('Has API key:', !!apiKey);
    
    const response = await axios.get(apiUrl, {
      params,
      headers,
      timeout: 15000
    });
    
    console.log('YouTube-Transcript.io response status:', response.status);
    
    if (response.data && response.data.transcript) {
      const transcript = response.data.transcript.map((segment: any, index: number) => ({
        id: String(index + 1),
        text: segment.text || '',
        startTime: segment.start || index * 5,
        endTime: segment.end || segment.start + segment.duration || (index + 1) * 5,
        words: (segment.text || '').split(/[\s、。！？]/g).filter((w: string) => w.length > 0)
      }));
      
      console.log('Successfully extracted transcript via YouTube-Transcript.io');
      console.log('Transcript length:', transcript.length);
      
      // Save to cache only for authenticated users
      if (isAuthenticated) {
        try {
          await TranscriptCacheManager.saveTranscriptToCache({
            contentId,
            contentType: 'youtube',
            videoUrl: url,
            videoTitle: videoMetadata?.title || response.data.title || 'Unknown',
            transcript,
            language: response.data.language || 'ja',
            metadata: {
              youtubeVideoId: videoId,
              channelName: videoMetadata?.channelTitle,
              uploadDate: videoMetadata?.publishedAt,
              thumbnailUrl: videoMetadata?.thumbnails?.medium?.url,
              duration: videoMetadata?.duration,
              method: 'youtube-transcript-io'
            }
          });
          console.log('Transcript cached successfully');
        } catch (cacheError) {
          console.error('Failed to cache transcript:', cacheError);
        }
      }
      
      // Format transcript with AI if it's Japanese
      let formattedTranscript = null;
      if ((response.data.language || 'ja').startsWith('ja')) {
        formattedTranscript = await formatTranscriptWithAI(
          transcript,
          videoMetadata?.title || response.data.title,
          contentId
        );
      }
      
      await logApiUsage('youtube-transcript-io', true, undefined, { videoId });
      
      return NextResponse.json({
        success: true,
        transcript,
        formattedTranscript,
        language: response.data.language || 'ja',
        videoTitle: videoMetadata?.title || response.data.title || 'Unknown',
        videoMetadata: videoMetadata,
        method: 'youtube-transcript-io',
        hasFormattedVersion: !!formattedTranscript
      });
    } else {
      throw new Error('No transcript data in response');
    }
  } catch (error: any) {
    console.error('YouTube-Transcript.io error:', error.message);
    
    await logApiUsage('youtube-transcript-io', false, error.message, { videoId });
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      return NextResponse.json({
        success: false,
        error: 'RATE_LIMIT',
        message: 'YouTube-Transcript.io rate limit exceeded. Please try again later or use a different provider.'
      });
    } else if (error.response?.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'AUTH_FAILED',
        message: 'Invalid API key for YouTube-Transcript.io. Please check your API key.'
      });
    } else if (error.response?.status === 404) {
      return NextResponse.json({
        success: false,
        error: 'NO_TRANSCRIPT',
        message: 'No transcript available for this video on YouTube-Transcript.io'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'EXTRACTION_FAILED',
      message: error.message || 'Failed to extract transcript via YouTube-Transcript.io'
    });
  }
}

// Helper function to format transcript with AI
async function formatTranscriptWithAI(
  transcript: any[], 
  videoTitle?: string,
  contentId?: string
): Promise<any[] | null> {
  try {
    console.log('🤖 [AI] Attempting to format transcript with GPT-4...');
    console.log('🤖 [AI] Transcript details:', {
      lineCount: transcript.length,
      totalChars: transcript.reduce((sum, line) => sum + line.text.length, 0),
      avgLineLength: transcript.reduce((sum, line) => sum + line.text.length, 0) / transcript.length
    });
    
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/format-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        videoTitle,
        language: 'ja'
      })
    });
    
    if (!response.ok) {
      console.error('AI formatting failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.formattedTranscript && data.wasFormatted) {
      console.log('✅ [AI] Transcript formatted successfully');
      console.log(`📊 [AI] Stats: ${data.stats.originalLines} -> ${data.stats.formattedLines} lines`);
      
      // Update cache with formatted version if contentId provided
      if (contentId) {
        try {
          await TranscriptCacheManager.updateWithFormattedTranscript(
            contentId,
            data.formattedTranscript
          );
          console.log('✅ [AI] Formatted transcript saved to cache');
        } catch (cacheError) {
          console.error('Failed to save formatted transcript to cache:', cacheError);
        }
      }
      
      return data.formattedTranscript;
    }
    
    return null;
  } catch (error) {
    console.error('❌ [AI] Error formatting transcript:', error);
    return null;
  }
}

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
    const { url, provider = 'auto', forceRegenerate = false, apiKey } = await request.json();
    
    if (!url || !isValidYouTubeUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube or YouTube Music URL' },
        { status: 400 }
      );
    }

    console.log('=== Starting YouTube extraction ===');
    console.log('URL:', url);
    console.log('Request headers:', request.headers);
    
    // Check if user is authenticated by looking for auth headers or cookies
    const authHeader = request.headers.get('authorization');
    const cookies = request.headers.get('cookie');
    const hasAuthCookie = cookies?.includes('authToken') || 
                          cookies?.includes('__session') || 
                          cookies?.includes('next-auth') ||
                          cookies?.includes('session');
    const isAuthenticated = !!(authHeader || hasAuthCookie);
    
    console.log('🔐 [AUTH] Authentication check:', {
      hasAuthHeader: !!authHeader,
      hasCookies: !!cookies,
      hasAuthCookie,
      isAuthenticated,
      cookiePreview: cookies ? cookies.substring(0, 100) + '...' : 'none'
    });
    
    // Check cache FIRST before making any API calls
    const contentId = TranscriptCacheManager.generateContentId({
      type: 'youtube',
      videoUrl: url
    });
    
    // Skip cache if force regenerate is requested
    if (!forceRegenerate) {
      console.log('Checking transcript cache for:', contentId);
      const cachedTranscript = await TranscriptCacheManager.getCachedTranscript(contentId);
      
      if (cachedTranscript && cachedTranscript.transcript.length > 0) {
        console.log('Using cached transcript! Access count:', cachedTranscript.accessCount);
        return NextResponse.json({
        success: true,
        transcript: cachedTranscript.transcript,
        formattedTranscript: cachedTranscript.formattedTranscript || null,
        language: cachedTranscript.language,
        videoTitle: cachedTranscript.videoTitle,
        videoMetadata: cachedTranscript.metadata,
        method: 'cache',
        fromCache: true,
        hasFormattedVersion: !!cachedTranscript.formattedTranscript
      });
      }
    }
    
    console.log('No cache hit, fetching from YouTube...');
    console.log('Selected provider:', provider);
    console.log('Environment check - GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
    console.log('Environment check - YOUTUBE_API_KEY exists:', !!process.env.YOUTUBE_API_KEY);
    console.log('Environment check - SUPA_YOUTUBE_API_KEY exists:', !!process.env.SUPA_YOUTUBE_API_KEY);
    console.log('Environment check - GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    
    // Extract video ID for YouTube API calls
    const videoId = extractVideoIdFromUrl(url);
    let videoMetadata = null;
    let hitRateLimit = false; // Track if we hit rate limits
    
    // Provider-specific extraction
    if (provider === 'youtube-transcript-io') {
      return await extractWithYouTubeTranscriptIO(videoId, apiKey, contentId, isAuthenticated, videoMetadata, url);
    } else if (provider === 'youtube-native') {
      // Continue with OAuth/native methods below
    } else if (provider === 'whisper') {
      // This would require audio extraction - not implemented yet
      return NextResponse.json({
        success: false,
        error: 'PROVIDER_NOT_IMPLEMENTED',
        message: 'Whisper provider requires audio extraction which is not yet implemented'
      });
    }
    
    // Method 1: Try OAuth/YouTube API if user has connected YouTube account
    try {
      console.log('=== Trying OAuth YouTube API method ===');
      
      // Check if user has YouTube OAuth tokens
      // Pass auth headers to captions API
      const captionsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/youtube/captions?videoId=${videoId}`, {
        headers: {
          'authorization': request.headers.get('authorization') || '',
          'cookie': request.headers.get('cookie') || ''
        }
      });
      
      if (captionsResponse.ok) {
        const captionsData = await captionsResponse.json();
        
        if (captionsData.success && captionsData.captions && captionsData.captions.length > 0) {
          console.log('Found caption tracks via OAuth:', captionsData.captions.length);
          
          // Get the first Japanese caption track (or first available)
          const captionTrack = captionsData.captions[0];
          
          if (captionTrack && captionTrack.id) {
            // Download the actual caption content
            const downloadResponse = await fetch(
              `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/youtube/captions?videoId=${videoId}&captionId=${captionTrack.id}`,
              {
                headers: {
                  'authorization': request.headers.get('authorization') || '',
                  'cookie': request.headers.get('cookie') || ''
                }
              }
            );
            
            if (downloadResponse.ok) {
              const downloadData = await downloadResponse.json();
              
              if (downloadData.success && downloadData.caption) {
                // Parse SRT format to our transcript format
                const { parseSRT } = await import('@/app/api/youtube/captions/route');
                const transcript = parseSRT(downloadData.caption);
                
                if (transcript.length > 0) {
                  console.log('Successfully got captions via OAuth YouTube API');
                  console.log('Caption language:', captionTrack.snippet?.language);
                  console.log('Transcript length:', transcript.length);
                  
                  // Save to cache only for authenticated users
                  if (isAuthenticated) {
                    try {
                      await TranscriptCacheManager.saveTranscriptToCache({
                        contentId,
                        contentType: 'youtube',
                        videoUrl: url,
                        videoTitle: captionTrack.snippet?.videoTitle || videoMetadata?.title || 'Unknown',
                        transcript,
                        language: captionTrack.snippet?.language || 'ja',
                        metadata: {
                          youtubeVideoId: videoId,
                          channelName: videoMetadata?.channelTitle,
                          uploadDate: videoMetadata?.publishedAt,
                          thumbnailUrl: videoMetadata?.thumbnails?.medium?.url,
                          duration: videoMetadata?.duration,
                          captionTrackName: captionTrack.snippet?.name,
                          isAutoGenerated: captionTrack.snippet?.trackKind === 'asr'
                        }
                      });
                      console.log('OAuth transcript cached successfully');
                    } catch (cacheError) {
                      console.error('Failed to cache OAuth transcript:', cacheError);
                    }
                  }
                  
                  // Format transcript with AI if it's Japanese
                  let formattedTranscript = null;
                  if ((captionTrack.snippet?.language || 'ja').startsWith('ja')) {
                    formattedTranscript = await formatTranscriptWithAI(
                      transcript,
                      captionTrack.snippet?.videoTitle || videoMetadata?.title,
                      contentId
                    );
                  }
                  
                  return NextResponse.json({
                    success: true,
                    transcript,
                    formattedTranscript,
                    language: captionTrack.snippet?.language || 'ja',
                    isAutoGenerated: captionTrack.snippet?.trackKind === 'asr',
                    videoTitle: captionTrack.snippet?.videoTitle || videoMetadata?.title,
                    videoMetadata: videoMetadata,
                    method: 'youtube-oauth',
                    hasFormattedVersion: !!formattedTranscript
                  });
                }
              }
            }
          }
        } else if (captionsData.error === 'YouTube not connected') {
          console.log('User has not connected YouTube account, trying other methods...');
        } else {
          console.log('No captions found via OAuth, trying other methods...');
        }
      } else {
        const errorData = await captionsResponse.json().catch(() => ({}));
        console.log('OAuth method failed:', errorData.error || captionsResponse.statusText);
      }
    } catch (oauthError: any) {
      console.error('OAuth YouTube API error:', oauthError.message);
      // Continue to fallback methods
    }
    
    // Try to get video metadata using server-side API key
    const GOOGLE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    
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
      } catch (youtubeApiError) {
        console.error('YouTube Data API error:', youtubeApiError.message);
        if (youtubeApiError.response) {
          console.error('API Response:', youtubeApiError.response.status, youtubeApiError.response.data);
        }
        // Continue with other methods - don't let this block SupaData
      }
    } else {
      console.warn('GOOGLE_API_KEY not configured in environment variables');
    }
    
    // Method 2: Try SupaData AI for transcripts (with better error handling)
    const SUPA_API_KEY = process.env.SUPA_YOUTUBE_API_KEY;
    
    if (SUPA_API_KEY) {
      // Enhanced retry logic with exponential backoff for SupaData API
      let supaResponse = null;
      let lastError = null;
      const maxRetries = 2; // Reduced retries to save API calls
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`=== Trying SupaData AI (attempt ${attempt + 1}/${maxRetries}) ===`);
          console.log('SupaData API Key first 10 chars:', SUPA_API_KEY.substring(0, 10) + '...');
          console.log('Request URL:', url);
          console.log('Request params:', { url, lang: 'ja' });
          
          // Exponential backoff: 0ms, 1000ms
          if (attempt > 0) {
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Waiting ${backoffDelay}ms before retry (exponential backoff)...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
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
            await logApiUsage('supadata', true, undefined, { videoId, attempt: attempt + 1 });
            break;
          }
        } catch (error: any) {
          lastError = error;
          console.error(`SupaData attempt ${attempt + 1} failed:`, error.message);
          
          // Special handling for different error types
          if (error.response?.status === 429) {
            console.warn('⚠️ SupaData rate limit exceeded (429) - Monthly limit reached');
            console.warn('Details:', error.response?.data?.message || 'Plan usage limit was exceeded');
            hitRateLimit = true;
            await logApiUsage('supadata', false, 'rate_limit_exceeded', { videoId, status: 429 });
            // Don't retry on 429, just move to fallback methods
            break;
          } else if (error.response?.status === 401) {
            console.error('❌ SupaData API key invalid or expired (401)');
            break; // Don't retry on auth errors
          } else if (error.response?.status === 403) {
            console.error('❌ SupaData API key forbidden - check permissions (403)');
            break; // Don't retry on permission errors
          } else if (error.response?.status === 404) {
            console.log('No transcript available from SupaData for this video');
            break; // Don't retry if transcript doesn't exist
          }
          
          // Only retry on network errors or 5xx server errors
          const shouldRetry = !error.response || error.response.status >= 500;
          if (!shouldRetry || attempt === maxRetries - 1) {
            console.log('Not retrying SupaData. Moving to fallback methods.');
            break;
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
            // Save to cache only for authenticated users
            if (isAuthenticated) {
              console.log('=== Saving to transcript cache (authenticated user) ===');
              console.log('Content ID:', contentId);
              console.log('Video URL:', url);
              console.log('Video title:', videoMetadata?.title || supaResponse.data.title || 'Unknown');
              
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
                    duration: videoMetadata?.duration,
                    method: 'supadata-ai'
                  }
                });
                console.log('=== Cache save completed ===');
              } catch (cacheError) {
                console.error('=== Cache save failed ===', cacheError);
              }
            } else {
              console.log('⚠️ [CACHE] Skipping cache save for guest user');
            }
            
            // Format transcript with AI for Japanese content
            // TEMPORARILY: Always try formatting for testing
            let formattedTranscript = null;
            console.log('🤖 [EXTRACT] Attempting AI formatting (TESTING MODE - always format)');
            formattedTranscript = await formatTranscriptWithAI(
              transcript,
              videoMetadata?.title || supaResponse.data.title,
              contentId
            );
            console.log('🤖 [EXTRACT] Formatting result:', {
              originalLines: transcript.length,
              formattedLines: formattedTranscript?.length || 0,
              wasFormatted: !!formattedTranscript
            });
            
            return NextResponse.json({
              success: true,
              transcript,
              formattedTranscript,
              language: 'ja',
              isAutoGenerated: false, // SupaData provides quality transcripts
              videoTitle: videoMetadata?.title || supaResponse.data.title || 'Unknown',
              videoMetadata: videoMetadata,
              method: 'supadata-ai',
              hasFormattedVersion: !!formattedTranscript
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
    
    // Method 3: Try youtube-captions-scraper (JavaScript package)
    try {
      console.log('=== Trying youtube-captions-scraper package ===');
      console.log('Video ID:', videoId);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('youtube-captions-scraper timeout')), 5000);
      });
      
      // Race between getting captions and timeout
      let captions: any[] = [];
      
      // First try to get Japanese captions
      try {
        captions = await Promise.race([
          getSubtitles({
            videoID: videoId!,
            lang: 'ja'
          }),
          timeoutPromise
        ]) as any[];
      } catch (jaError: any) {
        console.log('No Japanese captions via youtube-captions-scraper');
        // Continue to next method
      }
      
      if (captions && captions.length > 0) {
        console.log('Successfully got captions via youtube-captions-scraper');
        console.log('Caption count:', captions.length);
        
        // Convert to our format
        const transcript = captions.map((caption: any, index: number) => ({
          id: String(index + 1),
          text: caption.text || '',
          startTime: (caption.start || 0) / 1000, // Convert ms to seconds
          endTime: ((caption.start || 0) + (caption.dur || 5000)) / 1000,
          words: (caption.text || '').split(/[\s、。！？]/g).filter((w: string) => w.length > 0)
        }));
        
        // Save to cache only for authenticated users
        if (isAuthenticated) {
          console.log('Saving youtube-captions-scraper transcript to cache...');
          try {
            await TranscriptCacheManager.saveTranscriptToCache({
              contentId,
              contentType: 'youtube',
              videoUrl: url,
              videoTitle: videoMetadata?.title || 'Unknown',
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
            console.log('youtube-captions-scraper transcript cached successfully');
          } catch (cacheError) {
            console.error('Failed to cache youtube-captions-scraper transcript:', cacheError);
          }
        } else {
          console.log('⚠️ [CACHE] Skipping cache save for guest user');
        }
        
        return NextResponse.json({
          success: true,
          transcript,
          language: 'ja',
          isAutoGenerated: false, // youtube-captions-scraper doesn't provide this info
          videoTitle: videoMetadata?.title || 'Unknown',
          videoMetadata: videoMetadata,
          method: 'youtube-captions-scraper'
        });
      }
    } catch (captionScraperError: any) {
      console.error('youtube-captions-scraper error:', captionScraperError.message);
      // Continue to next fallback method
    }
    
    // Method 4: Try SearchAPI as fallback (with better language handling)
    const SEARCH_API_KEY = process.env.SEARCH_API;
    
    if (SEARCH_API_KEY) {
      try {
        console.log('=== Trying SearchAPI as fallback ===');
        console.log('Video ID:', videoId);
        
        const searchApiUrl = 'https://www.searchapi.io/api/v1/search';
        
        // Try Japanese first, then fallback to auto-generated
        const languagesToTry = ['ja', 'ja-JP'];
        let searchApiResponse = null;
        let successfulLang = null;
        
        for (const lang of languagesToTry) {
          try {
            console.log(`Trying SearchAPI with lang: ${lang}`);
            const response = await axios.get(searchApiUrl, {
              params: {
                engine: 'youtube_transcripts',
                video_id: videoId,
                api_key: SEARCH_API_KEY,
                lang: lang,
                // Try to get auto-generated if manual not available
                transcript_preference: 'auto'
              },
              timeout: 15000
            });
            
            if (response.data && response.data.transcripts && response.data.transcripts.length > 0) {
              searchApiResponse = response;
              successfulLang = lang;
              console.log(`Found transcripts with lang: ${lang}`);
              await logApiUsage('searchapi', true, undefined, { videoId, lang });
              break;
            }
          } catch (langError: any) {
            console.log(`No transcripts for lang: ${lang}`);
            await logApiUsage('searchapi', false, `no_transcripts_${lang}`, { videoId, lang });
            // Check if error response contains available languages
            if (langError.response?.data?.available_languages) {
              console.log('Available languages:', langError.response.data.available_languages);
            }
          }
        }
        
        // If no Japanese found, try to get any available transcript and note it
        if (!searchApiResponse) {
          try {
            console.log('No Japanese transcripts found, trying to get any available transcript...');
            const anyLangResponse = await axios.get(searchApiUrl, {
              params: {
                engine: 'youtube_transcripts',
                video_id: videoId,
                api_key: SEARCH_API_KEY
                // No lang specified - get default
              },
              timeout: 15000
            });
            
            if (anyLangResponse.data && anyLangResponse.data.transcripts) {
              searchApiResponse = anyLangResponse;
              successfulLang = anyLangResponse.data.language || 'unknown';
              console.log(`Found transcripts in language: ${successfulLang}`);
            }
          } catch (anyLangError: any) {
            console.error('Failed to get any transcripts via SearchAPI');
          }
        }
        
        console.log('SearchAPI response status:', searchApiResponse?.status || 'No response');
        
        if (searchApiResponse && searchApiResponse.data && searchApiResponse.data.transcripts) {
          console.log('SearchAPI transcripts found');
          console.log('Transcript language:', successfulLang);
          console.log('Is auto-generated:', searchApiResponse.data.is_generated);
          
          const transcript = searchApiResponse.data.transcripts;
          
          if (transcript && transcript.length > 0) {
            console.log(`Found transcript via SearchAPI (${successfulLang})`);
            
            // Parse SearchAPI format to our format
            const parsedTranscript = transcript.map((segment: any, index: number) => ({
              id: `line_${index + 1}`,
              text: segment.text || '',
              startTime: segment.start || 0,
              endTime: (segment.start || 0) + (segment.duration || 5),
              words: (segment.text || '').split(/[\s、。！？]/g).filter((w: string) => w.length > 0)
            }));
            
            // Save to cache only for authenticated users and if it's Japanese
            if (isAuthenticated && (successfulLang === 'ja' || successfulLang === 'ja-JP')) {
              try {
                await TranscriptCacheManager.saveTranscriptToCache({
                  contentId,
                  contentType: 'youtube',
                  videoUrl: url,
                  videoTitle: videoMetadata?.title || 'Unknown',
                  transcript: parsedTranscript,
                  language: successfulLang,
                  metadata: {
                    youtubeVideoId: videoId,
                    channelName: videoMetadata?.channelTitle,
                    uploadDate: videoMetadata?.publishedAt,
                    thumbnailUrl: videoMetadata?.thumbnails?.medium?.url,
                    duration: videoMetadata?.duration,
                    isAutoGenerated: searchApiResponse.data.is_generated,
                    method: 'searchapi'
                  }
                });
                console.log('SearchAPI transcript cached');
              } catch (cacheError) {
                console.error('Failed to cache SearchAPI transcript:', cacheError.message);
              }
            } else if (!isAuthenticated) {
              console.log('⚠️ [CACHE] Skipping SearchAPI cache save for guest user');
            } else {
              console.log(`⚠️ [CACHE] Not caching non-Japanese transcript (${successfulLang})`);
            }
            
            // Only return if we got Japanese transcripts
            if (successfulLang === 'ja' || successfulLang === 'ja-JP') {
              // Format transcript with AI for Japanese content
              let formattedTranscript = null;
              if (isAuthenticated) { // Only format for authenticated users
                formattedTranscript = await formatTranscriptWithAI(
                  parsedTranscript,
                  videoMetadata?.title,
                  contentId
                );
              }
              
              return NextResponse.json({
                success: true,
                transcript: parsedTranscript,
                formattedTranscript,
                language: successfulLang,
                isAutoGenerated: searchApiResponse.data.is_generated || false,
                videoTitle: videoMetadata?.title || 'Unknown',
                videoMetadata: videoMetadata,
                method: 'searchapi',
                hasFormattedVersion: !!formattedTranscript
              });
            } else {
              console.log(`Skipping non-Japanese transcript from SearchAPI (${successfulLang})`);
            }
          }
        }
      } catch (searchApiError: any) {
        console.error('SearchAPI error:', searchApiError.message);
        if (searchApiError.response) {
          console.error('Response status:', searchApiError.response.status);
          console.error('Response data:', searchApiError.response.data);
        }
      }
    }
    
    // Method 5: Try @distube/ytdl-core to get video info (with better error handling)
    try {
      console.log('=== Trying @distube/ytdl-core as fallback ===');
      
      // Create agent with cookies for better success rate
      const agent = ytdl.createAgent();
      
      const info = await ytdl.getInfo(url, { agent });
      const videoDetails = info.videoDetails;
      
      console.log('Video title:', videoDetails.title);
      console.log('Available captions:', info.player_response?.captions);
      
      // Check for captions in player response
      const captionTracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (captionTracks && captionTracks.length > 0) {
        console.log('Found caption tracks:', captionTracks.map((t: any) => t.languageCode));
        
        // Look for Japanese captions
        const jaTrack = captionTracks.find((track: any) => 
          track.languageCode === 'ja' || 
          track.languageCode === 'ja-JP'
        );
        
        if (jaTrack) {
          console.log('Found Japanese captions via ytdl-core, fetching...');
          
          // Fetch the actual captions
          try {
            const captionResponse = await axios.get(jaTrack.baseUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              timeout: 10000
            });
            
            // Parse the caption data
            const captionData = captionResponse.data;
            const transcript = parseYouTubeCaptions(captionData);
            
            if (transcript.length > 0) {
              // Save to cache only for authenticated users
              if (isAuthenticated) {
                try {
                  await TranscriptCacheManager.saveTranscriptToCache({
                    contentId,
                    contentType: 'youtube',
                    videoUrl: url,
                    videoTitle: videoMetadata?.title || videoDetails.title,
                    transcript,
                    language: jaTrack.languageCode,
                    metadata: {
                      youtubeVideoId: videoId,
                      channelName: videoMetadata?.channelTitle || videoDetails.author?.name,
                      uploadDate: videoMetadata?.publishedAt || videoDetails.publishDate,
                      thumbnailUrl: videoMetadata?.thumbnails?.medium?.url || videoDetails.thumbnails?.[0]?.url,
                      duration: videoMetadata?.duration || videoDetails.lengthSeconds
                    }
                  });
                  console.log('ytdl-core transcript cached successfully');
                } catch (cacheError) {
                  console.error('Failed to cache ytdl-core transcript:', cacheError);
                }
              } else {
                console.log('⚠️ [CACHE] Skipping ytdl-core cache save for guest user');
              }
              
              return NextResponse.json({
                success: true,
                transcript,
                language: jaTrack.languageCode,
                isAutoGenerated: jaTrack.kind === 'asr',
                videoTitle: videoMetadata?.title || videoDetails.title,
                videoMetadata: videoMetadata,
                method: '@distube/ytdl-core'
              });
            }
          } catch (captionError: any) {
            console.error('Error fetching captions via ytdl-core:', captionError.message);
          }
        }
      }
    } catch (ytdlError: any) {
      console.error('@distube/ytdl-core error:', ytdlError.message);
      if (ytdlError.message?.includes('Sign in to confirm')) {
        console.log('Video requires sign-in, cannot extract with ytdl-core');
      } else if (ytdlError.message?.includes('410')) {
        console.log('ytdl-core received 410 error - YouTube may have changed their API');
      }
    }
    
    // Method 6: Try get_video_info approach (more reliable)
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
          console.log('Found caption tracks via get_video_info:', captionTracks.map(t => t.languageCode));
          
          // Look for Japanese captions
          const jaTrack = captionTracks.find(track => 
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
    
    // Method 7: Try alternative endpoints
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
    
    // Provide more specific error message if we hit rate limits
    let errorMessage = 'This video does not have Japanese captions available. Try uploading the audio for AI transcription.';
    let errorCode = 'NO_CAPTIONS';
    
    // Check if we have a specific error to report
    if (hitRateLimit) {
      errorMessage = 'Our transcript service has reached its monthly limit. Please try again later or upload the audio directly for AI transcription.';
      errorCode = 'RATE_LIMIT';
    }
    
    return NextResponse.json({
      success: false,
      error: errorCode,
      message: errorMessage,
      videoTitle: videoMetadata?.title,
      videoMetadata: videoMetadata,
      suggestions: [
        'Try uploading the audio file directly for AI transcription',
        'Check if the video has Japanese captions enabled on YouTube',
        'Try a different video with Japanese subtitles',
        'Connect your YouTube account for better caption access'
      ]
    });
    
  } catch (error) {
    console.error('=== API route critical error ===');
    console.error('Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
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
          events.forEach((event, index) => {
            if (event.segs || event.text) {
              const text = event.text || event.segs.map(s => s.utf8).join('');
              const start = (event.tStartMs || event.start || 0) / 1000;
              const duration = (event.dDurationMs || event.dur || 5000) / 1000;
              
              transcript.push({
                id: String(index + 1),
                text: text.trim(),
                startTime: start,
                endTime: start + duration,
                words: text.trim().split(/[\s、。！？]/g).filter(w => w.length > 0)
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
      data.content.forEach((segment, index) => {
        // Convert milliseconds to seconds
        const startTime = (segment.offset || 0) / 1000;
        const duration = (segment.duration || 5000) / 1000;
        const endTime = startTime + duration;
        
        transcript.push({
          id: String(index + 1),
          text: segment.text || '',
          startTime: startTime,
          endTime: endTime,
          words: (segment.text || '').split(/[\s、。！？]/g).filter(w => w.length > 0)
        });
      });
    }
    // Fallback for other possible formats
    else if (data.transcript) {
      // If it's already formatted as an array of segments
      if (Array.isArray(data.transcript)) {
        data.transcript.forEach((segment, index) => {
          transcript.push({
            id: String(index + 1),
            text: segment.text || segment.content || '',
            startTime: segment.start || segment.startTime || index * 5,
            endTime: segment.end || segment.endTime || (index + 1) * 5,
            words: (segment.text || segment.content || '').split(/[\s、。！？]/g).filter(w => w.length > 0)
          });
        });
      } 
      // If it's a plain text transcript
      else if (typeof data.transcript === 'string') {
        // Split by sentences or paragraphs and create segments
        const sentences = data.transcript.split(/[。！？\n]+/).filter(s => s.trim());
        const avgDuration = 5; // 5 seconds per segment as default
        
        sentences.forEach((sentence, index) => {
          transcript.push({
            id: String(index + 1),
            text: sentence.trim(),
            startTime: index * avgDuration,
            endTime: (index + 1) * avgDuration,
            words: sentence.trim().split(/[\s、。！？]/g).filter(w => w.length > 0)
          });
        });
      }
    }
  } catch (error) {
    console.error('Error parsing SupaData transcript:', error);
  }
  
  return transcript;
}