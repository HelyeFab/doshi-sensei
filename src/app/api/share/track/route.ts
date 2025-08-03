/**
 * API Route: Track Share Event
 * POST /api/share/track
 */

import { NextRequest, NextResponse } from 'next/server';
import { ShareService } from '@/services/sharing/ShareService';
import { auth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from auth token (optional - can track anonymous shares)
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        // Continue without user ID - anonymous tracking
        console.log('Anonymous share tracking');
      }
    }
    
    // Get request body
    const body = await request.json();
    const { method, content, referralCode } = body;
    
    if (!method || !content) {
      return NextResponse.json(
        { error: 'Method and content required' },
        { status: 400 }
      );
    }
    
    // Track share using ShareService
    const shareService = ShareService.getInstance();
    const result = await shareService.share(
      {
        ...content,
        referralCode
      },
      method,
      userId
    );
    
    return NextResponse.json({
      success: result.success,
      eventId: Date.now().toString() // Simple event ID
    });
  } catch (error) {
    console.error('Track share error:', error);
    return NextResponse.json(
      { error: 'Failed to track share event' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}