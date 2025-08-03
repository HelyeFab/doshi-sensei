/**
 * API Route: Create Referral Code
 * POST /api/share/create-referral
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { customAlphabet } from 'nanoid';

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
      const admin = await getFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }
    
    // Get request body (optional)
    let campaign: string | undefined;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const body = await request.json();
        campaign = body.campaign;
      }
    } catch (e) {
      // No body or invalid JSON, continue without campaign
    }
    
    // Generate referral code
    const admin = await getFirebaseAdmin();
    const firestore = admin.firestore();
    
    // Check if user already has a referral code
    const referralsRef = firestore.collection('referrals');
    const existingQuery = await referralsRef
      .where('referrerId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    let referralCode: string;
    
    if (!existingQuery.empty) {
      // Use existing code
      referralCode = existingQuery.docs[0].data().referralCode;
    } else {
      // Generate new code
      const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
      referralCode = nanoid();
      
      // Save to Firestore
      await referralsRef.add({
        referrerId: userId,
        referralCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        stats: {
          views: 0,
          clicks: 0,
          conversions: 0
        }
      });
    }
    
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
      { 
        error: 'Failed to create referral code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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