import { NextRequest, NextResponse } from 'next/server';
import { ArticleManager } from '@/utils/articleManager';
import admin from '@/lib/firebase-admin';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }
  
  const token = authHeader.substring(7);
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  // Check if user has admin custom claim or is the admin email
  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
  
  if (!isAdmin) {
    throw new Error('Insufficient permissions');
  }
  
  return decodedToken;
}

// GET /api/admin/articles/stats - Get article statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const stats = await ArticleManager.getArticleStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching article stats:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// POST /api/admin/articles/stats - Force cleanup and refresh (admin only)
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const { action } = await request.json();
    
    if (action === 'cleanup') {
      const deletedCount = await ArticleManager.cleanupExpiredArticles();
      const stats = await ArticleManager.getArticleStats();
      
      return NextResponse.json({
        success: true,
        message: `Cleanup completed: ${deletedCount} articles processed`,
        deletedCount,
        stats
      });
    }
    
    if (action === 'refresh') {
      const result = await ArticleManager.refreshArticles();
      
      return NextResponse.json({
        success: result.success,
        message: result.message,
        stats: result.stats
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "cleanup" or "refresh"' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error in admin article action:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Action failed';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}