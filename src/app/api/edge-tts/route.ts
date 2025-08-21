import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'ja-JP-NanamiNeural' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Dynamic import to avoid SSR issues
    const { EdgeTTS } = await import('@lixen/edge-tts');
    const tts = new EdgeTTS();


    // Synthesize speech with text and voice - Edge TTS API takes both parameters
    const audioBuffer = await tts.synthesize(text, voice);

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error('Edge TTS returned empty audio buffer');
    }


    // Convert ArrayBuffer to Buffer for Node.js response
    const buffer = Buffer.from(audioBuffer);

    // Return audio as WAV response (Edge TTS typically returns WAV)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('❌ Server-side Edge TTS error:', error);

    // Return detailed error for debugging
    return NextResponse.json({
      error: 'Edge TTS synthesis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      serverSide: true
    }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}