import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Add a test vocabulary item directly to Firestore
    const testItem = {
      type: 'word',
      content: 'テスト',
      meaning: 'test',
      lastStudied: new Date(),
      reviewCount: 0,
      intervalIndex: 0,
      nextReview: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      contextPath: '/api/test-tracking'
    };
    
    // Save to Firestore
    const docRef = adminDb.collection('users').doc(uid).collection('recentStudyItems').doc();
    await docRef.set(testItem);
    
    // Get all recent items to verify
    const snapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('recentStudyItems')
      .orderBy('lastStudied', 'desc')
      .limit(5)
      .get();
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastStudied: doc.data().lastStudied?.toDate?.()?.toISOString() || 'Unknown'
    }));
    
    return NextResponse.json({
      success: true,
      message: 'Test item added successfully',
      addedItem: testItem,
      allItems: items,
      userId: uid
    });
    
  } catch (error: any) {
    console.error('Error in test-tracking:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to add test item' 
    }, { status: 500 });
  }
}