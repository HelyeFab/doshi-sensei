/**
 * API Route: Create Referral Code
 * POST /api/share/create-referral
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/sharing/ReferralService';
import { auth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }
    
    // Verify token
    const token = authHeader.split('Bearer ')[1];
    let userId: string;
    
    try {
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { campaign } = body;
    
    // Generate referral code
    const referralService = ReferralService.getInstance();
    const referralCode = await referralService.generateReferralCode(userId);
    
    // Create share link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://doshisensei.com';
    const shareLink = campaign 
      ? `${baseUrl}?ref=${referralCode}&campaign=${campaign}`
      : `${baseUrl}?ref=${referralCode}`;
    
    return NextResponse.json({
      referralCode,
      shareLink,
      expiresAt: null // No expiration for now
    });
  } catch (error) {
    console.error('Create referral error:', error);
    return NextResponse.json(
      { error: 'Failed to create referral code' },
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