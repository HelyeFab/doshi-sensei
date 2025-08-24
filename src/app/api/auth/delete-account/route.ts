import { NextRequest, NextResponse } from 'next/server';
import { callFirebaseFunction } from '@/lib/call-firebase-function';
import { headers } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the ID token
    const token = authorization.split('Bearer ')[1];
    
    console.log('Calling deleteAccount Cloud Function...');
    
    // Call the Cloud Function to delete the account
    const result = await callFirebaseFunction('deleteAccount', {}, token);

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting account:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to delete account' 
    }, { status: 500 });
  }
}