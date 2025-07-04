import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'female' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'Google TTS API key not configured',
        fallback: true
      }, { status: 500 });
    }

    console.log('🎯 Server-side TTS request:', { text, voice, apiKeyPresent: !!apiKey });

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
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
      console.log('✅ Server-side TTS successful');
      return NextResponse.json({
        audioContent: data.audioContent,
        success: true
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
