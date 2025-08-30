import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, limit, orderBy } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'BsBIOFuU6EeBrp2A4dUbgEqSZof2';
  
  try {
    const results: any = {
      userId,
      timestamp: new Date().toISOString(),
      collections: {}
    };
    
    // Check learning_events collection structure
    const userDocRef = doc(db, 'learning_events', userId);
    const userDoc = await getDoc(userDocRef);
    
    results.userDocExists = userDoc.exists();
    results.userDocData = userDoc.exists() ? userDoc.data() : null;
    
    // Check events subcollection
    try {
      const eventsRef = collection(db, 'learning_events', userId, 'events');
      const eventsQuery = query(eventsRef, orderBy('timestamp', 'desc'), limit(5));
      const eventsSnapshot = await getDocs(eventsQuery);
      
      results.collections.events = {
        count: eventsSnapshot.size,
        sample: eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      };
    } catch (e: any) {
      results.collections.events = {
        error: e.message
      };
    }
    
    // Check stats subcollection
    try {
      const statsRef = collection(db, 'learning_events', userId, 'stats');
      const statsSnapshot = await getDocs(statsRef);
      
      results.collections.stats = {
        count: statsSnapshot.size,
        documents: statsSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      };
    } catch (e: any) {
      results.collections.stats = {
        error: e.message
      };
    }
    
    // Check kanaProgress collection (for Review Hub integration)
    try {
      const kanaProgressRef = collection(db, 'users', userId, 'kanaProgress');
      const kanaQuery = query(kanaProgressRef, limit(5));
      const kanaSnapshot = await getDocs(kanaQuery);
      
      results.collections.kanaProgress = {
        count: kanaSnapshot.size,
        sample: kanaSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      };
    } catch (e: any) {
      results.collections.kanaProgress = {
        error: e.message
      };
    }
    
    // Check the user's subscription status
    try {
      const userRef = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        results.userSubscription = {
          plan: userData.subscription?.plan || 'free',
          status: userData.subscription?.status || 'inactive'
        };
      }
    } catch (e: any) {
      results.userSubscription = {
        error: e.message
      };
    }
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}