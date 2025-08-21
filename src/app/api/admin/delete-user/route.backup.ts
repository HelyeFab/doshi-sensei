import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Get the email from request
    const { email, uid } = await request.json();
    
    if (!email && !uid) {
      return NextResponse.json(
        { error: 'Email or UID required' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    const admin = await getFirebaseAdmin();
    const db = getFirestore();
    
    // Get user by email if UID not provided
    let userRecord;
    if (uid) {
      userRecord = await admin.auth().getUser(uid);
    } else {
      userRecord = await admin.auth().getUserByEmail(email);
    }
    
    // Delete from Authentication
    await admin.auth().deleteUser(userRecord.uid);
    console.log('Deleted from Firebase Auth:', userRecord.email);
    
    // Delete from Firestore
    await db.collection('users').doc(userRecord.uid).delete();
    console.log('Deleted from Firestore:', userRecord.uid);
    
    // Also delete related subcollections if they exist
    const subcollections = [
      'kanjiProgress',
      'kanjiStudySessions',
      'stats',
      'achievements'
    ];
    
    for (const subcollection of subcollections) {
      const snapshot = await db
        .collection('users')
        .doc(userRecord.uid)
        .collection(subcollection)
        .get();
      
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Deleted ${snapshot.size} documents from ${subcollection}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `User ${userRecord.email} completely deleted from both Auth and Firestore`
    });
    
  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    // Handle specific errors
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found in Firebase Auth' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}