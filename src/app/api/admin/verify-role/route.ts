import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

// Server-side admin role verification using Firebase custom claims
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user has admin custom claim
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

    return NextResponse.json({
      isAdmin,
      uid: decodedToken.uid,
      email: decodedToken.email
    });

  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

// Set admin custom claim for a user (only callable by existing admin)
export async function PUT(request: NextRequest) {
  try {
    const { token, targetUserId, setAdmin } = await request.json();

    if (!token || !targetUserId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    
    // Verify the requesting user is admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Set custom claims for target user
    await admin.auth().setCustomUserClaims(targetUserId, {
      admin: setAdmin === true
    });

    return NextResponse.json({
      success: true,
      message: `Admin status ${setAdmin ? 'granted to' : 'revoked from'} user ${targetUserId}`
    });

  } catch (error) {
    console.error('Set admin claim error:', error);
    return NextResponse.json(
      { error: 'Failed to update admin status' },
      { status: 500 }
    );
  }
}