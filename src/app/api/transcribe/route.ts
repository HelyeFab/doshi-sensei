import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    console.log('Transcribe API called');
    
    // Check if API key is configured
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not found in environment variables');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 401 }
      );
    }
    
    console.log('OpenAI API key found, length:', OPENAI_API_KEY.length);

    const { audioUrl, audioBlob, language = 'ja' } = await request.json();

    if (!audioUrl && !audioBlob) {
      return NextResponse.json(
        { error: 'No audio URL or blob provided' },
        { status: 400 }
      );
    }

    let audioData: Blob;

    // Handle audio URL
    if (audioUrl) {
      try {
        // For blob URLs, we need to handle them differently
        if (audioUrl.startsWith('blob:')) {
          return NextResponse.json(
            { error: 'Blob URLs cannot be fetched server-side. Please use audioBlob parameter instead.' },
            { status: 400 }
          );
        }
        
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        audioData = await response.blob();
      } catch (error) {
        console.error('Error fetching audio:', error);
        return NextResponse.json(
          { error: 'Failed to fetch audio from URL. For local files, please use the audioBlob parameter.' },
          { status: 400 }
        );
      }
    } else {
      // Handle base64 audio blob
      try {
        const base64Data = audioBlob.split(',')[1];
        const binaryData = Buffer.from(base64Data, 'base64');
        audioData = new Blob([binaryData], { type: 'audio/mp3' });
      } catch (error) {
        console.error('Error processing audio blob:', error);
        return NextResponse.json(
          { error: 'Failed to process audio data' },
          { status: 400 }
        );
      }
    }

    // Check file size (25MB limit for Whisper API)
    if (audioData.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file is too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Create form data for OpenAI API
    const formData = new FormData();
    formData.append('file', audioData, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', whisperResponse.status, errorText);
      
      let errorMessage = 'Failed to transcribe audio';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (e) {
        // Not JSON, use text
        errorMessage = errorText || errorMessage;
      }
      
      if (whisperResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your API key configuration.' },
          { status: 401 }
        );
      } else if (whisperResponse.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      } else if (whisperResponse.status === 400) {
        return NextResponse.json(
          { error: `Bad request: ${errorMessage}` },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const whisperData = await whisperResponse.json();

    // Convert Whisper response to our transcript format
    const transcript = whisperData.segments?.map((segment: any, index: number) => ({
      id: `${index + 1}`,
      text: segment.text.trim(),
      startTime: segment.start,
      endTime: segment.end,
      words: segment.text.trim().split(/\s+/),
    })) || [];

    return NextResponse.json({
      success: true,
      transcript,
      language: whisperData.language,
      duration: whisperData.duration,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error during transcription' },
      { status: 500 }
    );
  }
}

// Also support GET for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    hasApiKey: !!OPENAI_API_KEY 
  });
}