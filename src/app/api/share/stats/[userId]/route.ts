/**
 * API Route: Get User Share Stats
 * GET /api/share/stats/[userId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/sharing/ReferralService';
import { auth } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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
      const decodedToken = await auth.verifyIdToken(token);
      requestingUserId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }
    
    // Users can only access their own stats (unless admin)
    if (requestingUserId !== params.userId) {
      // TODO: Add admin check here
      return NextResponse.json(
        { error: 'Unauthorized to view these stats' },
        { status: 403 }
      );
    }
    
    // Get user stats
    const referralService = ReferralService.getInstance();
    const stats = await referralService.getUserReferralStats(params.userId);
    
    // Calculate additional metrics
    const topPlatform = Object.entries(stats.sharesByMethod)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
    
    return NextResponse.json({
      totalShares: stats.totalShares,
      sharesByMethod: stats.sharesByMethod,
      conversions: stats.totalConversions,
      conversionRate: stats.conversionRate,
      rewardsEarned: stats.rewardsEarned.premiumDays,
      topPlatform,
      lastShareDate: stats.lastUpdated?.toISOString()
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