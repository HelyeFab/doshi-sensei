import { NextRequest, NextResponse } from 'next/server';

interface ElevenLabsSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'male', provider = 'elevenlabs' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Try ElevenLabs first if requested and API key exists
    if (provider === 'elevenlabs') {
      const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
      
      if (elevenLabsApiKey) {
        try {
          console.log('🎤 Using ElevenLabs TTS...');
          
          // ElevenLabs voice IDs - high-quality Japanese voices
          const voiceId = voice === 'female' 
            ? 'RBnMinrYKeccY3vaUxlZ'  // Japanese female voice
            : 'Mv8AjrYZCBkdsmDHNwcB'; // Japanese male voice
          
          const settings: ElevenLabsSettings = {
            stability: 0.65,        // Slightly higher for clearer pronunciation
            similarity_boost: 0.85, // Higher for better voice consistency
            style: 0.3,            // Small amount for more natural speech
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
                text,
                model_id: 'eleven_turbo_v2_5', // Better Japanese support
                voice_settings: settings,
              }),
            }
          );

          if (response.ok) {
            const audioBuffer = await response.arrayBuffer();
            // Convert to base64 for consistent API response
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            
            return NextResponse.json({
              audioContent: base64Audio,
              success: true,
              provider: 'elevenlabs'
            });
          } else {
            const errorText = await response.text();
            let errorMessage = `ElevenLabs TTS failed: ${response.status}`;
            
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.detail?.message) {
                errorMessage = errorJson.detail.message;
              } else if (errorJson.message) {
                errorMessage = errorJson.message;
              }
              
              // Check for specific error types
              if (errorMessage.includes('detected_unusual_activity')) {
                errorMessage = 'ElevenLabs has detected unusual activity. This may be due to testing from a production environment.';
              } else if (response.status === 401) {
                errorMessage = 'Invalid ElevenLabs API key.';
              } else if (response.status === 429) {
                errorMessage = 'ElevenLabs rate limit exceeded or quota reached.';
              }
            } catch (e) {
              errorMessage += ` - ${errorText}`;
            }
            
            console.error('❌ ElevenLabs error:', errorMessage);
            // Fall through to Google TTS
          }
        } catch (error) {
          console.error('❌ ElevenLabs API error:', error);
          // Fall through to Google TTS
        }
      }
    }

    // Fallback to Google TTS
    console.log('🎤 Using Google TTS...');
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;

    if (!googleApiKey) {
      return NextResponse.json({
        error: 'No TTS API keys configured',
        fallback: true
      }, { status: 500 });
    }

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          text: text
        },
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
        fallback: true
      }, { status: response.status });
    }

    const data = await response.json();

    if (data.audioContent) {
      return NextResponse.json({
        audioContent: data.audioContent,
        success: true,
        provider: 'google'
      });
    } else {
      return NextResponse.json({
        error: 'No audio content received from Google TTS',
        fallback: true
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Server-side TTS error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    }, { status: 500 });
  }
}