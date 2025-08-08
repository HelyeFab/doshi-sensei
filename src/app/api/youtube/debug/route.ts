import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Check which dependencies are available
  let ytdlAvailable = false;
  let cacheAvailable = false;
  
  try {
    const ytdl = await import('@distube/ytdl-core');
    ytdlAvailable = !!ytdl;
  } catch (e) {
    // ytdl not available
  }
  
  try {
    const { TranscriptCacheManager } = await import('@/utils/transcriptCache');
    cacheAvailable = !!TranscriptCacheManager;
  } catch (e) {
    // cache not available
  }
  
  return NextResponse.json({
    status: 'ok',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasSupaKey: !!process.env.SUPA_YOUTUBE_API_KEY,
      hasSearchKey: !!process.env.SEARCH_API,
      hasYouTubeKey: !!process.env.YOUTUBE_API_KEY || !!process.env.GOOGLE_API_KEY,
      supaKeyFirst10: process.env.SUPA_YOUTUBE_API_KEY?.substring(0, 10),
      searchKeyFirst10: process.env.SEARCH_API?.substring(0, 10),
    },
    dependencies: {
      ytdlCore: ytdlAvailable,
      transcriptCache: cacheAvailable,
    },
    timestamp: new Date().toISOString()
  });
}