import { NextRequest, NextResponse } from 'next/server';
import { ArticleManager } from '@/utils/articleManager';
import admin from '@/lib/firebase-admin';

// Helper function to verify user token and get user info
async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }
  
  const token = authHeader.substring(7);
  const decodedToken = await admin.auth().verifyIdToken(token);
  return decodedToken;
}

// GET /api/articles/bookmarks - Get user's bookmarks
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    const bookmarks = await ArticleManager.getUserBookmarks(user.uid);
    
    return NextResponse.json({
      success: true,
      data: bookmarks,
      count: bookmarks.length
    });
    
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch bookmarks' 
      },
      { status: error instanceof Error && error.message.includes('authorization') ? 401 : 500 }
    );
  }
}

// POST /api/articles/bookmarks - Add bookmark
export async function POST(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    const { articleId } = await request.json();
    
    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }
    
    // Check if user is premium (you'll need to implement this based on your subscription system)
    const isPremium = user.subscription?.status === 'active' || false; // Adjust based on your implementation
    
    const success = await ArticleManager.bookmarkArticle(user.uid, articleId, isPremium);
    
    return NextResponse.json({
      success,
      message: 'Article bookmarked successfully'
    });
    
  } catch (error) {
    console.error('Error adding bookmark:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to bookmark article';
    const statusCode = errorMessage.includes('limit') ? 403 : 
                      errorMessage.includes('authorization') ? 401 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// DELETE /api/articles/bookmarks - Remove bookmark
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    
    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }
    
    await ArticleManager.removeBookmark(user.uid, articleId);
    
    return NextResponse.json({
      success: true,
      message: 'Bookmark removed successfully'
    });
    
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove bookmark' 
      },
      { status: error instanceof Error && error.message.includes('authorization') ? 401 : 500 }
    );
  }
}