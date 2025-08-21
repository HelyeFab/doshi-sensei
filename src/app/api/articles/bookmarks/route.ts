import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    const { action, articleId, articleTitle, idToken } = await request.json();
    
    const result = await serverFirebaseFunctions.manageBookmarks(
      { action, articleId, articleTitle },
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in articles/bookmarks:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}