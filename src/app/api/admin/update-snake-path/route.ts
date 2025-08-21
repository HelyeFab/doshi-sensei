import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // This route doesn't need Firebase Admin
  // It's a client-side only operation
  return NextResponse.json({ 
    success: true, 
    message: 'Snake path updates are handled client-side' 
  });
}