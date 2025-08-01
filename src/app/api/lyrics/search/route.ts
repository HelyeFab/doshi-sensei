import { NextRequest, NextResponse } from 'next/server';
import { lyricsService } from '@/services/lyrics/LyricsService';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify auth token
    try {
      await getFirebaseAdmin(); // Ensure admin is initialized
      const token = authHeader.split('Bearer ')[1];
      await getAuth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid auth token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { query, artist, title, videoData } = body;

    if (!query && !artist && !title && !videoData) {
      return NextResponse.json(
        { error: 'Query, artist/title, or video data required' },
        { status: 400 }
      );
    }

    // Detect if it's a music video
    let musicVideoInfo = null;
    if (videoData) {
      musicVideoInfo = lyricsService.detectMusicVideo(videoData);
      
      // If not detected as music, return early
      if (!musicVideoInfo.isMusic) {
        return NextResponse.json({
          isMusic: false,
          confidence: musicVideoInfo.confidence,
          indicators: musicVideoInfo.indicators,
        });
      }
    }

    // Search for lyrics
    const searchQuery = query || 
      (musicVideoInfo?.artist && musicVideoInfo?.title 
        ? `${musicVideoInfo.artist} ${musicVideoInfo.title}`
        : `${artist || ''} ${title || ''}`);

    const lyrics = await lyricsService.searchLyrics(searchQuery, {
      artist: artist || musicVideoInfo?.artist,
      title: title || musicVideoInfo?.title,
      preferJapanese: true,
    });

    if (!lyrics) {
      return NextResponse.json({
        isMusic: musicVideoInfo?.isMusic || false,
        musicVideoInfo,
        lyrics: null,
        message: 'No lyrics found',
      });
    }

    return NextResponse.json({
      isMusic: true,
      musicVideoInfo,
      lyrics,
    });

  } catch (error) {
    console.error('Lyrics search error:', error);
    return NextResponse.json(
      { error: 'Failed to search lyrics' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}