import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ 
      error: 'No auth header',
      authHeader 
    }, { status: 401 });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const admin = await getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    const adminEmails = [
      'emmanuelfabiani23@gmail.com',
      'hove.international+3@gmail.com',
      'admin@doshisensei.com'
    ];
    
    const isAdmin = adminEmails.includes(decodedToken.email || '');
    
    return NextResponse.json({
      success: true,
      email: decodedToken.email,
      isAdmin,
      adminEmails,
      uid: decodedToken.uid
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Token verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 401 });
  }
}