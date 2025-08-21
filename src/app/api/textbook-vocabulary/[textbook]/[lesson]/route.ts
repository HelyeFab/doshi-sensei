import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function GET(request: NextRequest) {
  try {
    const parts = request.nextUrl.pathname.split('/');
    const textbook = parts[parts.length - 2];
    const lesson = parts[parts.length - 1];
    const userId = request.headers.get('x-user-id');
    const idToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    
    const result = await serverFirebaseFunctions.getTextbookVocabulary(
      { textbook, lesson, userId },
      idToken || undefined
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in textbook-vocabulary/[textbook]/[lesson]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}