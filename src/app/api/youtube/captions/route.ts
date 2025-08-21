import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');
    const captionId = url.searchParams.get('captionId');
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    // Try to get OAuth tokens from NextAuth session first
    const session = await getServerSession(authOptions);
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;
    
    // If no NextAuth session, try to get from Firebase user's stored OAuth
    if (!accessToken && session?.user?.email) {
      try {
        // Find the Firebase user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', session.user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          accessToken = userData.youtubeOAuth?.accessToken;
          refreshToken = userData.youtubeOAuth?.refreshToken;
        }
      } catch (error) {
        console.error('Error fetching user OAuth from Firebase:', error);
      }
    }
    
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ 
        error: 'YouTube not connected',
        message: 'Please connect your YouTube account in settings to access captions'
      }, { status: 401 });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // If captionId is provided, download the specific caption track
    if (captionId) {
      try {
        // Download captions in SRT format
        const response = await youtube.captions.download({
          id: captionId,
          tfmt: 'srt' // Request SRT format
        });
        
        return NextResponse.json({
          success: true,
          caption: response.data,
          format: 'srt'
        });
      } catch (error: any) {
        console.error('Error downloading captions:', error);
        return NextResponse.json({ 
          error: 'Failed to download captions',
          details: error.message 
        }, { status: 500 });
      }
    }

    // List available caption tracks for the video
    try {
      const response = await youtube.captions.list({
        part: ['id', 'snippet'],
        videoId: videoId
      });

      const captions = response.data.items || [];
      
      // Filter for Japanese captions or return all if none found
      const japaneseCaptions = captions.filter(
        caption => caption.snippet?.language === 'ja' || 
                   caption.snippet?.language === 'ja-JP'
      );
      
      return NextResponse.json({
        success: true,
        captions: japaneseCaptions.length > 0 ? japaneseCaptions : captions,
        hasJapanese: japaneseCaptions.length > 0,
        totalTracks: captions.length
      });
    } catch (error: any) {
      console.error('Error listing captions:', error);
      
      // Check if it's a quota or permission error
      if (error.code === 403) {
        return NextResponse.json({ 
          error: 'Permission denied',
          message: 'The video owner has disabled third-party caption access'
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch captions',
        details: error.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function to parse SRT format to our transcript format
export function parseSRT(srt: string): any[] {
  const transcript: any[] = [];
  const blocks = srt.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    
    // Parse timestamp line (format: 00:00:00,000 --> 00:00:00,000)
    const timeLine = lines[1];
    if (!timeLine || !timeLine.includes('-->')) continue;
    
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    
    // Convert timestamp to seconds
    const parseTime = (timeStr: string): number => {
      const [time, ms] = timeStr.split(',');
      const [h, m, s] = time.split(':').map(Number);
      return h * 3600 + m * 60 + s + (ms ? parseInt(ms) / 1000 : 0);
    };
    
    const startTime = parseTime(startStr);
    const endTime = parseTime(endStr);
    
    // Join remaining lines as text
    const text = lines.slice(2).join(' ').trim();
    
    if (text) {
      transcript.push({
        id: String(transcript.length + 1),
        text,
        startTime,
        endTime,
        words: text.split(/[\s、。！？]/g).filter(w => w.length > 0)
      });
    }
  }
  
  return transcript;
}