import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import { clearRulesCache } from '@/lib/server-dynamic-rules-admin';

export const runtime = 'nodejs';

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  try {
    // Get Firebase Admin and verify auth
    const firebaseAdmin = (request as any).firebaseAdmin;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = decodedToken.admin === true || (adminEmail && decodedToken.email === adminEmail);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Clear the server-side rules cache
    clearRulesCache();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Server-side cache cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Clear cache error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to clear cache',
        details: error.stack,
      },
      { status: 500 }
    );
  }
});