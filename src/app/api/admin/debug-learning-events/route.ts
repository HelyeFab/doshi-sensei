import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../../../../../firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const adminDb = admin.firestore();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'BsBIOFuU6EeBrp2A4dUbgEqSZof2';
  
  try {
    const results: any = {
      userId,
      timestamp: new Date().toISOString(),
      analysis: {},
      data: {}
    };
    
    // 1. Check learning_events collection structure
    console.log('Checking learning_events for user:', userId);
    const learningEventsRef = adminDb.collection('learning_events').doc(userId);
    const learningEventsDoc = await learningEventsRef.get();
    
    results.data.learningEventsDoc = {
      exists: learningEventsDoc.exists,
      data: learningEventsDoc.exists ? learningEventsDoc.data() : null
    };
    
    // 2. Check events subcollection
    const eventsRef = learningEventsRef.collection('events');
    const eventsSnapshot = await eventsRef.orderBy('timestamp', 'desc').limit(10).get();
    
    results.data.events = {
      count: eventsSnapshot.size,
      samples: eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          category: data.category,
          content: data.content?.value,
          timestamp: data.timestamp,
          synced: data.synced,
          userId: data.userId
        };
      })
    };
    
    // Count total events
    const allEventsSnapshot = await eventsRef.get();
    results.data.events.totalCount = allEventsSnapshot.size;
    
    // 3. Check stats subcollection
    const statsRef = learningEventsRef.collection('stats');
    const statsSnapshot = await statsRef.get();
    
    results.data.stats = {
      count: statsSnapshot.size,
      documents: statsSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }))
    };
    
    // 4. Check kanaProgress collection (Review Hub)
    const kanaProgressRef = adminDb.collection('users').doc(userId).collection('kanaProgress');
    const kanaSnapshot = await kanaProgressRef.limit(5).get();
    
    results.data.kanaProgress = {
      count: kanaSnapshot.size,
      samples: kanaSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
    
    // 5. Check user subscription
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      results.data.userInfo = {
        exists: true,
        subscription: userData?.subscription || null,
        plan: userData?.subscription?.plan || 'free',
        status: userData?.subscription?.status || 'inactive'
      };
    } else {
      results.data.userInfo = {
        exists: false
      };
    }
    
    // 6. Analysis of the data structure
    results.analysis = {
      learningEventsStructure: {
        hasMainDocument: learningEventsDoc.exists,
        hasEventsSubcollection: eventsSnapshot.size > 0,
        hasStatsSubcollection: statsSnapshot.size > 0,
        eventTypes: [...new Set(eventsSnapshot.docs.map(doc => doc.data().type))],
        categories: [...new Set(eventsSnapshot.docs.map(doc => doc.data().category))]
      },
      kanaIntegration: {
        hasKanaProgress: kanaSnapshot.size > 0,
        kanaCharacters: kanaSnapshot.docs.map(doc => doc.data().character)
      },
      userTier: results.data.userInfo.plan || 'unknown',
      recommendations: []
    };
    
    // Add recommendations based on findings
    if (!learningEventsDoc.exists) {
      results.analysis.recommendations.push('Main learning_events document does not exist - this is normal for subcollection structure');
    }
    
    if (eventsSnapshot.size === 0) {
      results.analysis.recommendations.push('No events found - user may not have tracked any learning activities yet');
    }
    
    if (statsSnapshot.size === 0 && results.data.userInfo.plan !== 'free') {
      results.analysis.recommendations.push('No stats documents found for premium user - stats sync may not be working');
    }
    
    if (kanaSnapshot.size === 0) {
      results.analysis.recommendations.push('No kana progress found - Review Hub integration for kana may not be active');
    }
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (error: any) {
    console.error('Error checking learning events:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      userId
    }, { status: 500 });
  }
}