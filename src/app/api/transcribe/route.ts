import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY;

export async function POST(request: NextRequest) {
  try {

    // Check if API key is configured
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not found in environment variables');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 401 }
      );
    }

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
        // Extract MIME type from data URL if present
        let mimeType = 'audio/mpeg';
        if (audioBlob.includes('data:')) {
          const mimeMatch = audioBlob.match(/data:([^;]+);/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
        }
        
        const base64Data = audioBlob.split(',')[1] || audioBlob;
        const binaryData = Buffer.from(base64Data, 'base64');
        audioData = new Blob([binaryData], { type: mimeType });
        
        console.log('Processed audio blob:', {
          mimeType,
          size: audioData.size,
          sizeInMB: (audioData.size / (1024 * 1024)).toFixed(2)
        });
      } catch (error) {
        console.error('Error processing audio blob:', error);
        return NextResponse.json(
          { error: 'Failed to process audio data. Please ensure the file is a valid audio format.' },
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
    // Detect the audio type from the blob or use a generic one
    const audioType = audioData.type || 'audio/mpeg';
    const extension = audioType.includes('webm') ? 'webm' : 
                     audioType.includes('wav') ? 'wav' : 
                     audioType.includes('m4a') ? 'm4a' : 
                     audioType.includes('ogg') ? 'ogg' : 'mp3';
    formData.append('file', audioData, `audio.${extension}`);
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
        // Parse the specific error from OpenAI
        let userFriendlyMessage = 'Unable to process the audio file. ';
        
        if (errorMessage.includes('Invalid file format')) {
          userFriendlyMessage = 'The audio format is not supported. Please try converting to MP3, M4A, or WAV format. Supported formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm.';
        } else if (errorMessage.includes('too short') || errorMessage.includes('duration')) {
          userFriendlyMessage = 'The audio is too short or silent. Please ensure the audio contains speech and is at least 1 second long.';
        } else if (errorMessage.includes('too long')) {
          userFriendlyMessage = 'The audio file is too long. Please split it into shorter segments (max 10 minutes).';
        } else {
          userFriendlyMessage += errorMessage;
        }
        
        return NextResponse.json(
          { error: userFriendlyMessage },
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