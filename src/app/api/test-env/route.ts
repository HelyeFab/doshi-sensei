import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Check which Firebase environment variables are available
  const firebaseVars = Object.keys(process.env).filter(key => 
    key.includes('FIREBASE') || key.includes('NEXT_PUBLIC_FIREBASE')
  );
  
  const hasNonPublicVars = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_CLIENT_ID: !!process.env.FIREBASE_CLIENT_ID,
    FIREBASE_PRIVATE_KEY_ID: !!process.env.FIREBASE_PRIVATE_KEY_ID,
  };
  
  const hasPublicVars = {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: !!process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
    NEXT_PUBLIC_FIREBASE_CLIENT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID,
    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID,
  };
  
  return NextResponse.json({
    success: true,
    availableFirebaseVars: firebaseVars,
    hasNonPublicVars,
    hasPublicVars,
    timestamp: new Date().toISOString(),
    note: 'This is a Next.js API route checking env vars'
  });
}