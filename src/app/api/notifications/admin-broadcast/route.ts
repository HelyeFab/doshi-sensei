import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import * as admin from 'firebase-admin';

interface BroadcastRequest {
  title: string;
  body: string;
  type: 'announcement' | 'feature' | 'campaign' | 'maintenance';
  url?: string;
  targetAudience: 'all' | 'active' | 'inactive' | 'premium' | 'free';
}

export async function POST(request: NextRequest) {
  try {
    // Get Firebase Admin instance
    const firebaseAdmin = await getFirebaseAdmin();
    
    // Verify admin authentication
    const authToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(authToken);
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body: BroadcastRequest = await request.json();
    const { title, body: message, type, url, targetAudience } = body;

    // Validate input
    if (!title || !message || !type || !targetAudience) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = firebaseAdmin.firestore();
    
    // Build query based on target audience
    let query = db.collection('notificationPreferences')
      .where('enabled', '==', true);

    // Get target users based on audience
    const snapshot = await query.get();
    const tokens: string[] = [];
    const userIds: string[] = [];
    let totalUsers = 0;
    let usersWithTokens = 0;

    for (const doc of snapshot.docs) {
      const prefs = doc.data();
      totalUsers++;
      
      // Apply audience filters
      if (targetAudience === 'premium' || targetAudience === 'free') {
        const userDoc = await db.collection('users').doc(prefs.userId).get();
        const userData = userDoc.data();
        const isPremium = userData?.subscription?.status === 'active';
        
        if ((targetAudience === 'premium' && !isPremium) || 
            (targetAudience === 'free' && isPremium)) {
          continue;
        }
      }
      
      if (targetAudience === 'active' || targetAudience === 'inactive') {
        const statsDoc = await db.collection('userStats').doc(prefs.userId).get();
        const stats = statsDoc.data();
        const lastActive = stats?.lastActiveDate?.toDate();
        const daysSinceActive = lastActive 
          ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        if ((targetAudience === 'active' && daysSinceActive > 7) ||
            (targetAudience === 'inactive' && daysSinceActive <= 7)) {
          continue;
        }
      }
      
      userIds.push(prefs.userId);
      if (prefs.fcmToken) {
        tokens.push(prefs.fcmToken);
        usersWithTokens++;
      }
    }

    // Send push notifications to users with tokens
    let sentCount = 0;
    let failedCount = 0;
    
    if (tokens.length > 0) {
      const messaging = firebaseAdmin.messaging();
      
      // Send in batches of 500 (FCM limit)
      for (let i = 0; i < tokens.length; i += 500) {
        const batch = tokens.slice(i, i + 500);
        
        try {
          const response = await messaging.sendMulticast({
            tokens: batch,
            notification: {
              title,
              body: message,
            },
            data: {
              type,
              url: url || 'https://doshisensei.com',
              timestamp: new Date().toISOString(),
            },
            webpush: {
              fcmOptions: {
                link: url || 'https://doshisensei.com',
              },
              notification: {
                icon: '/doshi.png',
                badge: '/badge-72x72.png',
                requireInteraction: type === 'announcement' || type === 'maintenance',
              },
            },
          });
          
          sentCount += response.successCount;
          failedCount += response.failureCount;
          
          // Remove invalid tokens
          response.responses.forEach((resp, idx) => {
            if (resp.error?.code === 'messaging/registration-token-not-registered') {
              // Remove invalid token
              const invalidToken = batch[idx];
              db.collection('notificationPreferences')
                .where('fcmToken', '==', invalidToken)
                .get()
                .then(snapshot => {
                  snapshot.forEach(doc => {
                    doc.ref.update({ fcmToken: firebaseAdmin.firestore.FieldValue.delete() });
                  });
                });
            }
          });
        } catch (error) {
          console.error('Batch send failed:', error);
          failedCount += batch.length;
        }
      }
    }

    // Log broadcast event
    await db.collection('notificationLogs').add({
      type: 'broadcast',
      broadcastType: type,
      title,
      body: message,
      targetAudience,
      totalTargetUsers: userIds.length,
      sentCount,
      failedCount,
      usersWithoutTokens: userIds.length - usersWithTokens,
      sentAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      sentBy: decodedToken.email,
      status: 'completed',
    });

    // Create in-app notification records for ALL targeted users
    // This ensures users without push notifications still see the message
    const batch = db.batch();
    const timestamp = firebaseAdmin.firestore.Timestamp.now();
    
    for (const userId of userIds) {
      const notifRef = db.collection('users').doc(userId)
        .collection('notifications').doc();
      
      batch.set(notifRef, {
        title,
        body: message,
        type,
        url,
        read: false,
        createdAt: timestamp,
        broadcastId: type + '_' + timestamp.toMillis(),
      });
    }
    
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Broadcast sent successfully',
      stats: {
        totalTargetUsers: userIds.length,
        pushNotificationsSent: sentCount,
        pushNotificationsFailed: failedCount,
        usersWithoutPushTokens: userIds.length - usersWithTokens,
        inAppNotificationsCreated: userIds.length,
      },
    });

  } catch (error) {
    console.error('Admin broadcast notification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}