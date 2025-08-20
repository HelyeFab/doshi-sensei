import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to use service account file if it exists
    const serviceAccount = require('../../../../../firebase-service-account.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } catch (error) {
    // Fallback to environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || 'doshi-sensei';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@doshi-sensei.iam.gserviceaccount.com';
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey) {
      console.error('Firebase Admin SDK initialization failed: Missing private key');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Extract the ID token
    const idToken = authHeader.substring(7);

    // Verify the ID token
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Delete user data from Firestore
    const db = getFirestore();
    
    // Delete user document
    await db.collection('users').doc(uid).delete();
    
    // Delete usage data
    await db.collection('usage').doc(uid).delete();
    
    // Delete any other user-related data
    // Add more collections as needed
    
    // Delete the user account from Firebase Auth
    await auth.deleteUser(uid);

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}