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
  
  // Get admin email from environment variable (server-side)
  const adminEmail = process.env.ADMIN_EMAIL;
  
  // Three-layer admin verification:
  // 1. Check Firebase custom claim (most secure)
  // 2. Check if email matches environment variable
  // 3. Check Firestore document for isAdmin flag
  let isAdmin = false;
  let verificationMethod = 'none';
  
  // Layer 1: Custom claim
  if (decodedToken.admin === true) {
    isAdmin = true;
    verificationMethod = 'custom_claim';
  }
  // Layer 2: Email from environment variable
  else if (adminEmail && decodedToken.email === adminEmail) {
    isAdmin = true;
    verificationMethod = 'email_env';
    
    // Try to set custom claim for future verifications
    try {
      await admin.auth().setCustomUserClaims(decodedToken.uid, { admin: true });
      console.log(`Set admin claim for ${decodedToken.email}`);
    } catch (error) {
      console.error('Failed to set admin claim:', error);
    }
  }
  // Layer 3: Check Firestore
  else {
    try {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(decodedToken.uid)
        .get();
      
      if (userDoc.exists && userDoc.data()?.isAdmin === true) {
        isAdmin = true;
        verificationMethod = 'firestore';
        
        // Set custom claim for future verifications
        try {
          await admin.auth().setCustomUserClaims(decodedToken.uid, { admin: true });
          console.log(`Set admin claim for ${decodedToken.email} based on Firestore`);
        } catch (error) {
          console.error('Failed to set admin claim:', error);
        }
      }
    } catch (error) {
      console.error('Failed to check Firestore for admin status:', error);
    }
  }
  
  console.log(`Admin verification for ${decodedToken.email}: ${isAdmin} (method: ${verificationMethod})`);

  return NextResponse.json({
    isAdmin,
    uid: decodedToken.uid,
    email: decodedToken.email,
    verificationMethod
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