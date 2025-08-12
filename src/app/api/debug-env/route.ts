import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only allow in development or with secret key
  const secretKey = request.nextUrl.searchParams.get('key');
  
  if (process.env.NODE_ENV === 'production' && secretKey !== 'debug-2025-wanikani') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check various environment configurations
  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    hasWanikaniToken: !!process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN,
    wanikaniTokenPrefix: process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN?.substring(0, 8),
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    hasSupaKey: !!process.env.SUPA_YOUTUBE_API_KEY,
    hasGoogleKey: !!process.env.GOOGLE_API_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    // Check if we're in Netlify
    isNetlify: !!process.env.NETLIFY,
    netlifyContext: process.env.CONTEXT,
    // Check service worker registration
    swDisabled: process.env.NODE_ENV === 'development',
    // Check if hardcoded token is being used
    fallbackTokenUsed: !process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN,
  };

  return NextResponse.json(envInfo);
}