import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    
    const { articleId, userId, idToken } = await request.json();
    
    const result = await serverFirebaseFunctions.trackArticleView(
      { articleId, userId },
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in articles/view:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}