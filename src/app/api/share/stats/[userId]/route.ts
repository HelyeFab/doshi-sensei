/**
 * API Route: Get User Share Stats
 * GET /api/share/stats/[userId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { UserShareStats } from '@/types/sharing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params before using them (Next.js 15 requirement)
    const { userId } = await params;
    
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }
    
    // Verify token and check if user can access these stats
    const token = authHeader.split('Bearer ')[1];
    let requestingUserId: string;
    
    try {
      const admin = await getFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(token);
      requestingUserId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }
    
    // Users can only access their own stats (unless admin)
    if (requestingUserId !== userId) {
      // TODO: Add admin check here
      return NextResponse.json(
        { error: 'Unauthorized to view these stats' },
        { status: 403 }
      );
    }
    
    // Get user stats from Firestore
    const admin = await getFirebaseAdmin();
    const firestore = admin.firestore();
    
    // Get share events
    const shareEventsRef = firestore.collection('shareEvents');
    const shareEventsQuery = await shareEventsRef
      .where('userId', '==', userId)
      .get();
    
    // Get conversions
    const conversionsRef = firestore.collection('referralConversions');
    const conversionsQuery = await conversionsRef
      .where('referrerId', '==', userId)
      .get();
    
    // Calculate stats
    const totalShares = shareEventsQuery.size;
    const totalConversions = conversionsQuery.size;
    const conversionRate = totalShares > 0 ? totalConversions / totalShares : 0;
    
    // Aggregate share methods
    const sharesByMethod: Record<string, number> = {};
    const sharesByContent: Record<string, number> = {};
    let successfulShares = 0;
    
    shareEventsQuery.forEach(doc => {
      const data = doc.data();
      if (data.method) {
        sharesByMethod[data.method] = (sharesByMethod[data.method] || 0) + 1;
      }
      if (data.success) {
        successfulShares++;
      }
      if (data.content?.type) {
        sharesByContent[data.content.type] = (sharesByContent[data.content.type] || 0) + 1;
      }
    });
    
    const topPlatform = Object.entries(sharesByMethod)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
    
    return NextResponse.json({
      totalShares,
      successfulShares,
      sharesByMethod,
      sharesByContent,
      conversions: totalConversions,
      conversionRate,
      topPlatform,
      lastShareDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get share stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get share statistics' },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}