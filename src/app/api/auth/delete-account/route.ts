import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { headers } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const auth = admin.auth();
    const db = admin.firestore();
    
    // Get the authorization header
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the token
    const token = authorization.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user data before deletion for logging
    const userRecord = await auth.getUser(uid);
    console.log(`Deleting account for user: ${userRecord.email} (${uid})`);

    // Delete user data from Firestore
    const batch = db.batch();
    
    // Delete user document
    batch.delete(db.collection('users').doc(uid));
    
    // Delete user's stats if they exist
    const userStatsRef = db.collection('userStats').doc(uid);
    const userStatsSnap = await userStatsRef.get();
    if (userStatsSnap.exists) {
      batch.delete(userStatsRef);
    }
    
    // Delete user's daily activities
    const activitiesSnapshot = await db.collection('dailyActivities')
      .where('userId', '==', uid)
      .get();
    
    activitiesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete user's caught Pokemon if exists
    const pokemonRef = db.collection('userPokemon').doc(uid);
    const pokemonSnap = await pokemonRef.get();
    if (pokemonSnap.exists) {
      batch.delete(pokemonRef);
    }

    // Delete user's subscription and entitlement data
    const entitlementsSnapshot = await db.collection('userEntitlements')
      .where('userId', '==', uid)
      .get();
    
    entitlementsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete any usage tracking data
    const usageSnapshot = await db.collection('featureUsage')
      .where('userId', '==', uid)
      .get();
    
    usageSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Commit all deletions
    await batch.commit();

    // Finally, delete the user account from Firebase Auth
    await auth.deleteUser(uid);

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