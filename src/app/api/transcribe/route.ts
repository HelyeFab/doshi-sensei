import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the audio file from the form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'ja';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (25MB limit for Whisper API)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Call our backend transcription service
    const backendFormData = new FormData();
    backendFormData.append('audio', audioFile);
    
    // First, upload the audio to a temporary URL (you could use a service like Cloudinary or uploadthing)
    // For now, we'll use a blob URL approach
    const audioBlob = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(audioBlob);
    const audioBase64 = audioBuffer.toString('base64');
    const audioDataUrl = `data:${audioFile.type};base64,${audioBase64}`;

    // Call the transcription API
    const response = await fetch('https://yt-audio-api-d432.onrender.com/transcribe-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl: audioDataUrl,
        language: language
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Transcription failed', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Configure route segment
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout