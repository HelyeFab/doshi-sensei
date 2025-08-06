import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Console log management is development-only
  // Return 404 immediately in production
  return NextResponse.json(
    { error: 'Console log management is not available in production' },
    { status: 404 }
  );
}