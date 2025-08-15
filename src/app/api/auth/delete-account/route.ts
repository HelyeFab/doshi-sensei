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
    
    // Delete user's stats
    batch.delete(db.collection('userStats').doc(uid));
    
    // Delete user's daily activities
    const activitiesSnapshot = await db.collection('dailyActivities')
      .where('userId', '==', uid)
      .get();
    
    activitiesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete user's caught Pokemon
    const pokemonSnapshot = await db.collection('userPokemon').doc(uid).get();
    if (pokemonSnapshot.exists) {
      batch.delete(pokemonSnapshot.ref);
    }

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