import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminDb } from '@/lib/firebase-admin';
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
      // Get session to check user's premium status
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required for premium lessons' },
          { status: 401 }
        );
      }
      
      // Check user's subscription status in Firebase
      const userDoc = await adminDb.collection('users').doc(session.user.id).get();
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