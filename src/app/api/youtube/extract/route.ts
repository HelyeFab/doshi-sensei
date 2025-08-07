import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import ytdl from 'ytdl-core';
import { TranscriptCacheManager } from '@/utils/transcriptCache';

// YouTube Data API v3 endpoint
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Helper function to validate YouTube and YouTube Music URLs
function isValidYouTubeUrl(url: string): boolean {
  try {
    // Use ytdl's built-in validation
    return ytdl.validateURL(url);
  } catch {
    // Fallback to pattern matching if ytdl fails
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }
}

// Helper to extract video ID from YouTube URLs
function extractVideoIdFromUrl(url: string): string | null {
  try {
    // Use ytdl's built-in getVideoID
    return ytdl.getVideoID(url);
  } catch {
    // Fallback to pattern matching if ytdl fails
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /embed\/([a-zA-Z0-9_-]{11})/,
      /shorts\/([a-zA-Z0-9_-]{11})/
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
    
    // Check cache FIRST before making any API calls
    let contentId = '';
    let cachedTranscript = null;
    
    if (TranscriptCacheManager) {
      try {
        // Generate content ID for cache lookup
        contentId = TranscriptCacheManager.generateContentId({
          type: 'youtube',
          videoUrl: url
        });
        
        console.log('📦 Checking transcript cache for:', contentId);
        cachedTranscript = await TranscriptCacheManager.getCachedTranscript(contentId);
        
        if (cachedTranscript) {
          console.log('✅ Cache hit! Transcript found in cache');
        } else {
          console.log('📭 Cache miss - will fetch from API');
        }
      } catch (cacheError: any) {
        console.error('⚠️ Cache check error (non-blocking):', cacheError.message);
        // Cache errors shouldn't block SupaData API calls
        cachedTranscript = null;
      }
    } else {
      console.warn('⚠️ Cache system not available - proceeding without cache');
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
    console.log('Environment check - YOUTUBE_API_KEY exists:', !!process.env.YOUTUBE_API_KEY);
    console.log('Environment check - GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
    console.log('Environment check - SUPA_YOUTUBE_API_KEY exists:', !!process.env.SUPA_YOUTUBE_API_KEY);
    console.log('Environment check - SEARCH_API exists:', !!process.env.SEARCH_API);
    
    // Extract video ID for YouTube API calls
    const videoId = extractVideoIdFromUrl(url);
    let videoMetadata = null;
    
    // First, try YouTube Data API v3 for video metadata using server-side API key
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
      } catch (youtubeApiError: any) {
        console.error('YouTube Data API error:', youtubeApiError.message);
        if (youtubeApiError.response) {
          console.error('API Response:', youtubeApiError.response.status, youtubeApiError.response.data);
        }
        // Continue with other methods - don't let this block SupaData
      }
    } else {
      console.warn('YOUTUBE_API_KEY/GOOGLE_API_KEY not configured in environment variables');
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
            
            // Try to save to cache (but don't let cache errors block the response)
            if (TranscriptCacheManager && TranscriptCacheManager.saveTranscriptToCache) {
              try {
                console.log('💾 Attempting to save transcript to cache...');
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
                console.log('✅ Cache save completed successfully');
              } catch (cacheError: any) {
                console.error('⚠️ Cache save failed (non-blocking):', cacheError.message);
                // Cache failed but we have the transcript - continue
                console.warn('📝 Transcript extracted successfully but not cached - next request will fetch again');
              }
            } else {
              console.warn('⚠️ Cache system not available - transcript not saved');
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
    
    // Method 2: Try SearchAPI as fallback
    const SEARCH_API_KEY = process.env.SEARCH_API;
    
    if (SEARCH_API_KEY && !cachedTranscript) {
      try {
        console.log('=== Trying SearchAPI as fallback ===');
        console.log('SearchAPI Key exists:', !!SEARCH_API_KEY);
        console.log('Video ID:', videoId);
        
        // SearchAPI endpoint for YouTube transcripts
        const searchApiUrl = 'https://www.searchapi.io/api/v1/search';
        
        const searchApiResponse = await axios.get(searchApiUrl, {
          params: {
            engine: 'youtube_transcripts',
            video_id: videoId,
            api_key: SEARCH_API_KEY,
            lang: 'ja' // Request Japanese transcripts (single language code)
          },
          timeout: 15000 // 15 second timeout
        });
        
        console.log('SearchAPI response status:', searchApiResponse.status);
        console.log('SearchAPI response data structure:', {
          hasData: !!searchApiResponse.data,
          hasTranscripts: !!searchApiResponse.data?.transcripts,
          transcriptsType: Array.isArray(searchApiResponse.data?.transcripts) ? 'array' : typeof searchApiResponse.data?.transcripts,
          transcriptsLength: searchApiResponse.data?.transcripts?.length || 0
        });
        
        if (searchApiResponse.data && searchApiResponse.data.transcripts) {
          console.log('SearchAPI transcripts found, segments:', searchApiResponse.data.transcripts.length);
          
          // SearchAPI returns transcripts as an array directly when language matches
          const transcript = searchApiResponse.data.transcripts;
          
          if (transcript && transcript.length > 0) {
            console.log('✅ Found Japanese transcript via SearchAPI');
            console.log('Transcript segments:', transcript.length);
            console.log('First segment:', transcript[0]);
            
            // Parse SearchAPI format to our format
            const parsedTranscript = transcript.map((segment: any, index: number) => ({
              id: `line_${index + 1}`,
              text: segment.text || '',
              startTime: segment.start || 0,
              endTime: (segment.start || 0) + (segment.duration || 5),
              words: []
            }));
            
            // Save to cache
            if (TranscriptCacheManager && TranscriptCacheManager.saveTranscriptToCache) {
              try {
                console.log('💾 Saving SearchAPI transcript to cache...');
                await TranscriptCacheManager.saveTranscriptToCache({
                  contentId,
                  contentType: 'youtube',
                  videoUrl: url,
                  videoTitle: videoMetadata?.title || searchApiResponse.data.video_title || 'Unknown',
                  transcript: parsedTranscript,
                  language: 'ja',
                  metadata: {
                    youtubeVideoId: videoId,
                    channelName: videoMetadata?.channelTitle || searchApiResponse.data.channel_title,
                    uploadDate: videoMetadata?.publishedAt,
                    thumbnailUrl: videoMetadata?.thumbnails?.medium?.url || videoMetadata?.thumbnails?.default?.url,
                    duration: videoMetadata?.duration || searchApiResponse.data.video_duration
                  }
                });
                console.log('✅ SearchAPI transcript cached successfully');
              } catch (cacheError: any) {
                console.error('⚠️ Failed to cache SearchAPI transcript:', cacheError.message);
              }
            }
            
            return NextResponse.json({
              success: true,
              transcript: parsedTranscript,
              language: 'ja', // We requested Japanese
              isAutoGenerated: searchApiResponse.data.is_generated || false,
              videoTitle: videoMetadata?.title || 'Unknown',
              videoMetadata: videoMetadata,
              method: 'searchapi'
            });
          } else {
            console.log('❌ No transcripts found via SearchAPI');
            // Check if there are available languages in the response
            if (searchApiResponse.data.available_languages) {
              console.log('Available languages:', searchApiResponse.data.available_languages);
              const hasJapanese = searchApiResponse.data.available_languages.some(
                (lang: any) => lang.lang === 'ja' || lang.lang === 'ja-JP'
              );
              if (!hasJapanese) {
                console.log('Japanese not available in transcript languages');
              }
            }
          }
        } else {
          console.log('❌ SearchAPI response missing expected data structure');
          console.log('Response keys:', Object.keys(searchApiResponse.data || {}));
        }
      } catch (searchApiError: any) {
        console.error('=== SearchAPI error ===');
        console.error('Error message:', searchApiError.message);
        if (searchApiError.response) {
          console.error('Response status:', searchApiError.response.status);
          console.error('Response data:', searchApiError.response.data);
          
          if (searchApiError.response.status === 401) {
            console.error('SearchAPI authentication failed - check API key');
          } else if (searchApiError.response.status === 429) {
            console.error('SearchAPI rate limit reached');
          } else if (searchApiError.response.status === 404) {
            console.error('No transcripts available via SearchAPI');
          }
        }
        // Continue to next fallback method
      }
    } else if (!SEARCH_API_KEY) {
      console.warn('SEARCH_API key not configured');
    }
    
    // Method 3: Try ytdl-core to get video info
    try {
      console.log('=== Trying ytdl-core as fallback ===');
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
    } catch (ytdlError: any) {
      console.error('ytdl-core error:', ytdlError.message);
      // Continue to next method
    }
    
    // Method 4: Try get_video_info approach (more reliable)
    try {
      console.log('=== Trying get_video_info method ===');
      console.log('Video ID:', videoId);
      
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
    } catch (getVideoInfoError: any) {
      console.error('get_video_info error:', getVideoInfoError.message);
      // Continue to next method
    }
    
    // Method 5: Try alternative endpoints
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
    console.log('=== All extraction methods exhausted ===');
    console.log('SupaData attempted:', !!SUPA_API_KEY);
    console.log('SearchAPI attempted:', !!SEARCH_API_KEY);
    console.log('ytdl-core available:', !!ytdl);
    console.log('Video metadata found:', !!videoMetadata);
    console.log('Returning fallback response');
    
    return NextResponse.json({
      success: false,
      error: 'No Japanese transcript available',
      message: 'This video doesn\'t have Japanese subtitles. Here\'s what you can do:',
      suggestions: [
        '📥 Download the audio using a browser extension or online tool',
        '📤 Upload the audio file to get an AI-generated transcript',
        '🎬 Try a different video that has Japanese subtitles',
        '📝 Upload your own subtitle file if you have one'
      ],
      videoTitle: videoMetadata?.title,
      videoMetadata: videoMetadata,
      tips: 'Many YouTube videos don\'t have Japanese captions. Our AI transcription works great with uploaded audio!'
    });
    
  } catch (error: any) {
    console.error('=== API route critical error ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', error);
    
    // Provide human-readable error messages for users
    let userMessage = 'We couldn\'t extract the transcript from this video. Please try one of these options:';
    let suggestions = [
      'Upload the audio file directly for AI transcription',
      'Try a different YouTube video',
      'Check if the video has Japanese subtitles enabled'
    ];
    let statusCode = 500;
    
    // Specific error handling with user-friendly messages
    if (error?.message?.includes('Invalid YouTube')) {
      userMessage = 'This doesn\'t appear to be a valid YouTube URL.';
      suggestions = ['Make sure you\'re using a YouTube or YouTube Music link'];
      statusCode = 400;
    } else if (error?.message?.includes('Firebase') || error?.message?.includes('Firestore')) {
      userMessage = 'Our transcript cache is temporarily unavailable, but you can still get transcripts.';
      suggestions = ['The extraction will work but won\'t be cached for faster access next time'];
      statusCode = 503;
    } else if (error?.message?.includes('rate limit')) {
      userMessage = 'We\'ve hit our API limit temporarily.';
      suggestions = [
        'Please wait a few minutes and try again',
        'Or upload the audio file directly'
      ];
      statusCode = 429;
    } else if (error?.message?.includes('SupaData')) {
      userMessage = 'The transcript service is having issues right now.';
      suggestions = [
        'Try again in a few moments',
        'Download the audio and upload it directly',
        'Check if the video has built-in Japanese subtitles'
      ];
      statusCode = 503;
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        suggestions: suggestions,
        technicalDetails: process.env.NODE_ENV === 'development' ? {
          message: error?.message || 'Unknown error',
          type: error?.constructor?.name || 'UnknownError',
          stack: error?.stack
        } : undefined
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