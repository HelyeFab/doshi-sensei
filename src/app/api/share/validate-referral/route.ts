/**
 * API Route: Validate Referral Code
 * GET /api/share/validate-referral?code=XXXXXXXX
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/sharing/ReferralService';

export async function GET(request: NextRequest) {
  try {
    // Get referral code from query params
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json(
        { error: 'Referral code required' },
        { status: 400 }
      );
    }
    
    // Validate referral code
    const referralService = ReferralService.getInstance();
    const validation = await referralService.validateReferralCode(code);
    
    // Track click if valid
    if (validation.valid) {
      await referralService.trackReferralClick(code);
    }
    
    return NextResponse.json({
      valid: validation.valid,
      referrerId: validation.referrerId,
      campaign: null, // Could be extended to include campaign info
      expiresAt: null
    });
  } catch (error) {
    console.error('Validate referral error:', error);
    return NextResponse.json(
      { error: 'Failed to validate referral code' },
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}