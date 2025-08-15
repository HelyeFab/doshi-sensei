import { NextRequest, NextResponse } from 'next/server';
import ServerFirebaseCache from '@/utils/serverFirebaseCache';

interface ElevenLabsSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    const { articleId, content, voice = 'male', provider = 'elevenlabs' } = body;

    if (!articleId || !content) {
      console.error('[TTS API] Missing required fields:', { 
        articleId: articleId || 'MISSING',
        contentPreview: content ? content.substring(0, 50) + '...' : 'MISSING',
        requestBody: body 
      });
      return NextResponse.json({ error: 'Article ID and content are required' }, { status: 400 });
    }

    // Initialize server-side cache
    const cache = ServerFirebaseCache.getInstance();

    // Check cache first (server-side)
    try {
      const cachedUrl = await cache.getCachedAudioUrl(articleId, content, voice, provider);
      if (cachedUrl) {
        const cacheTime = Date.now() - startTime;
        console.log(`✅ Returning cached audio for article ${articleId} (${cacheTime}ms)`);
        return NextResponse.json({
          audioUrl: cachedUrl,
          success: true,
          cached: true,
          provider,
          responseTime: cacheTime
        });
      }
    } catch (cacheError) {

      // Continue to generate new audio
    }

    // Generate audio for the entire content
    let audioBlob: Blob | null = null;

    if (provider === 'elevenlabs') {
      const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
      
      if (elevenLabsApiKey) {
        console.log('[TTS API] Using ElevenLabs with API key:', elevenLabsApiKey.substring(0, 8) + '...');
        try {
          // ElevenLabs voice IDs
          const voiceId = voice === 'female' 
            ? 'RBnMinrYKeccY3vaUxlZ'  // Japanese female voice
            : 'Mv8AjrYZCBkdsmDHNwcB'; // Japanese male voice
          
          const settings: ElevenLabsSettings = {
            stability: 0.65,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true,
          };

          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey,
              },
              body: JSON.stringify({
                text: content,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: settings,
              }),
            }
          );

          if (response.ok) {
            const audioBuffer = await response.arrayBuffer();
            audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

          } else {
            const errorText = await response.text();
            console.error('❌ ElevenLabs API error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              voiceId,
              contentLength: content.length
            });
            // Fall through to Google TTS
          }
        } catch (error) {
          console.error('❌ ElevenLabs API error:', error);
          // Fall through to Google TTS
        }
      } else {

      }
    }

    // Fallback to Google TTS if ElevenLabs failed or not requested
    if (!audioBlob) {

      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;

      if (!googleApiKey) {
        console.error('[TTS API] No Google TTS API key found');
        console.error('[TTS API] Available env vars:', Object.keys(process.env).filter(k => k.includes('TTS') || k.includes('ELEVENLABS')));
        return NextResponse.json({
          error: 'No TTS API keys configured. Please check environment variables.',
          debug: {
            elevenLabsConfigured: !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
            googleConfigured: !!process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY
          }
        }, { status: 500 });
      }

      // Google TTS has a 5000 character limit, so we need to split the content
      const chunks = splitTextIntoChunks(content, 4500); // Leave some margin
      const audioChunks: ArrayBuffer[] = [];

      for (const chunk of chunks) {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text: chunk },
            voice: {
              languageCode: 'ja-JP',
              name: voice === 'female' ? 'ja-JP-Neural2-B' : 'ja-JP-Neural2-C',
              ssmlGender: voice === 'female' ? 'FEMALE' : 'MALE'
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
              pitch: 0.0,
              volumeGainDb: 0.0
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Google TTS API error:', response.status, errorText);
          return NextResponse.json({
            error: `Google TTS API error: ${response.status}`,
            details: errorText,
          }, { status: response.status });
        }

        const data = await response.json();
        if (data.audioContent) {
          // Convert base64 to ArrayBuffer
          const binaryString = atob(data.audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioChunks.push(bytes.buffer);
        }
      }

      // Combine audio chunks
      if (audioChunks.length > 0) {
        const combinedBuffer = combineAudioBuffers(audioChunks);
        audioBlob = new Blob([combinedBuffer], { type: 'audio/mp3' });
      }
    }

    if (!audioBlob) {
      return NextResponse.json({
        error: 'Failed to generate audio',
      }, { status: 500 });
    }

    // Cache the audio in Firebase Storage (server-side)
    try {
      // Convert Blob to Buffer for server-side storage
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const audioUrl = await cache.cacheAudio(articleId, content, voice, provider, buffer);
      
      const totalTime = Date.now() - startTime;

      return NextResponse.json({
        audioUrl,
        success: true,
        cached: false,
        provider,
        responseTime: totalTime
      });
    } catch (cacheError) {
      console.error('❌ Failed to cache audio:', cacheError);
      
      // Even if caching fails, return the audio as base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      
      const totalTime = Date.now() - startTime;
      console.log(`⚠️ Audio generated but not cached, using base64 fallback (${totalTime}ms)`);
      
      return NextResponse.json({
        audioContent: base64Audio,
        success: true,
        cached: false,
        provider,
        warning: 'Failed to cache audio, using base64 fallback',
        responseTime: totalTime
      });
    }

  } catch (error) {
    console.error('❌ Server-side TTS error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Split text into chunks for Google TTS (max 5000 chars)
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const sentences = text.split(/[。！？]/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const fullSentence = trimmedSentence + '。';
    
    if (currentChunk.length + fullSentence.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = fullSentence;
      } else {
        // Single sentence exceeds max length, split it
        chunks.push(fullSentence.substring(0, maxLength));
      }
    } else {
      currentChunk += fullSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Combine multiple audio buffers into one
 */
function combineAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  
  let offset = 0;
  for (const buffer of buffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  
  return combined.buffer;
}