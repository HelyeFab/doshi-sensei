import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { headers } from 'next/headers';
import { TEXTBOOK_CONFIG } from '@/config/textbooks';

export async function GET(
  request: NextRequest,
  { params }: { params: { textbook: string; lesson: string } }
) {
  try {
    const { textbook, lesson } = params;
    const lessonNumber = parseInt(lesson, 10);
    
    // Validate lesson number
    if (isNaN(lessonNumber) || lessonNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid lesson number' },
        { status: 400 }
      );
    }
    
    // Check if lesson requires premium
    if (lessonNumber > TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson) {
      // Get Firebase Admin instance
      const admin = await getFirebaseAdmin();
      const auth = admin.auth();
      const db = admin.firestore();
      
      // Check authorization header
      const headersList = headers();
      const authorization = headersList.get('authorization');
      
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required for premium lessons' },
          { status: 401 }
        );
      }
      
      // Verify the token
      const token = authorization.split('Bearer ')[1];
      try {
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        // Check user's subscription status in Firebase
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        
        const isPremium = userData?.subscription?.plan === 'monthly' || 
                         userData?.subscription?.plan === 'yearly';
        
        if (!isPremium) {
          return NextResponse.json(
            { 
              error: 'Premium subscription required',
              message: `Lessons ${TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson + 1}+ require a premium subscription`
            },
            { status: 403 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
    }
    
    // If we get here, user has access - load the lesson data
    try {
      // Adjust lesson number for Genki 2
      let actualLesson = lessonNumber;
      if (textbook === 'genki-2' && lessonNumber <= 11) {
        actualLesson = lessonNumber + 12;
      }
      
      // Import the lesson data
      const lessonData = await import(
        `@/data/textbook-vocabulary/${textbook}/lesson-${actualLesson}.json`
      );
      
      return NextResponse.json(lessonData.default);
    } catch (error) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in textbook vocabulary API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}