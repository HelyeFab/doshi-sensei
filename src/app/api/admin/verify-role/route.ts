import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';

// Server-side admin role verification using Firebase custom claims
export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  const { token } = await request.json();

  if (!token) {
    throw new Error('Unauthorized - No authentication token provided');
  }

  // Get Firebase Admin from request context
  const admin = (request as any).firebaseAdmin;
  
  // Verify the Firebase token
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  // Check if user has admin custom claim
  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

  return NextResponse.json({
    isAdmin,
    uid: decodedToken.uid,
    email: decodedToken.email
  });
});

// Set admin custom claim for a user (only callable by existing admin)
export const PUT = withFirebaseAdmin(async (request: NextRequest) => {
  const { token, targetUserId, setAdmin } = await request.json();

  if (!token || !targetUserId) {
    throw new Error('Bad request - Missing required parameters');
  }

  // Get Firebase Admin from request context
  const admin = (request as any).firebaseAdmin;
  
  // Verify the requesting user is admin
  const decodedToken = await admin.auth().verifyIdToken(token);
  const isAdmin = decodedToken.admin === true;

  if (!isAdmin) {
    throw new Error('Forbidden - Insufficient permissions');
  }

  // Set custom claims for target user
  await admin.auth().setCustomUserClaims(targetUserId, {
    admin: setAdmin === true
  });

  return NextResponse.json({
    success: true,
    message: `Admin status ${setAdmin ? 'granted to' : 'revoked from'} user ${targetUserId}`
  });
});