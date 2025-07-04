import { NextRequest, NextResponse } from 'next/server';
import { ArticleManager } from '@/utils/articleManager';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

// POST /api/articles/view - Track article view
export async function POST(request: NextRequest) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Optional: Get user ID if authenticated
    let userId: string | undefined;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const admin = await getFirebaseAdmin();
        const decodedToken = await admin.auth().verifyIdToken(token);
        userId = decodedToken.uid;
      }
    } catch (error) {
      // User not authenticated, that's fine for view tracking
      console.log('Anonymous view tracking');
    }

    await ArticleManager.trackArticleView(articleId, userId);

    return NextResponse.json({
      success: true,
      message: 'Article view tracked'
    });

  } catch (error) {
    console.error('Error tracking article view:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track view'
      },
      { status: 500 }
    );
  }
}
