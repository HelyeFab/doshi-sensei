import { NextRequest, NextResponse } from 'next/server';
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }

    // Verify the user
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get user's recent study items
    const recentItemsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('recentStudyItems')
      .orderBy('lastStudied', 'desc')
      .limit(5)
      .get();
    
    const recentItems = recentItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (recentItems.length === 0) {
      return NextResponse.json({ 
        message: 'No recent study items found',
        itemsFound: 0 
      });
    }
    
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;
    
    if (!fcmToken) {
      return NextResponse.json({ 
        error: 'No FCM token found',
        itemsFound: recentItems.length,
        items: recentItems
      }, { status: 400 });
    }
    
    // Create notification content based on recent items
    const itemContents = recentItems.map(item => item.content).filter(Boolean);
    const firstThree = itemContents.slice(0, 3).join(', ');
    const remaining = itemContents.length > 3 ? ` and ${itemContents.length - 3} more` : '';
    
    // Send notification
    const message = {
      notification: {
        title: '📚 Time to Review Your Vocabulary!',
        body: `You studied: ${firstThree}${remaining}. Ready for a quick review?`
      },
      data: {
        type: 'vocabulary_review',
        path: '/tools/textbook-vocabulary',
        itemCount: String(recentItems.length),
        timestamp: new Date().toISOString()
      },
      token: fcmToken
    };
    
    try {
      const response = await getMessaging().send(message);
      
      // Mark items as notified
      const batch = db.batch();
      recentItemsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          lastNotified: new Date(),
          notificationCount: (doc.data().notificationCount || 0) + 1
        });
      });
      await batch.commit();
      
      return NextResponse.json({ 
        success: true,
        messageId: response,
        itemsNotified: recentItems.length,
        items: itemContents,
        message: 'Scheduled notification sent successfully'
      });
    } catch (fcmError: any) {
      // FCM error - token might be invalid
      console.error('FCM Error:', fcmError);
      return NextResponse.json({ 
        error: 'Failed to send notification',
        fcmError: fcmError.message,
        itemsFound: recentItems.length,
        items: itemContents,
        suggestion: 'Check if notifications are enabled on your device'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Error in scheduled trigger:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to trigger scheduled check' 
    }, { status: 500 });
  }
}