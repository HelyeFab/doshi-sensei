import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

async function getArticleStats() {
  // Get article statistics directly from Firestore
  const articlesSnapshot = await adminDb.collection('articles').get();
  const viewsSnapshot = await adminDb.collection('userArticleViews').get();
  const bookmarksSnapshot = await adminDb.collection('bookmarks').get();

  const stats = {
    totalArticles: articlesSnapshot.size,
    articlesByDifficulty: {} as Record<string, number>,
    articlesBySource: {} as Record<string, number>,
    articlesByCategory: {} as Record<string, number>,
    averageReadingTime: 0,
    totalBookmarks: bookmarksSnapshot.size,
    expiringSoon: 0,
    totalViews: viewsSnapshot.size,
    topArticles: [] as any[],
    recentViews: [] as any[]
  };

  // Process articles for statistics
  let totalReadingTime = 0;
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  articlesSnapshot.forEach((doc: any) => {
    const article = doc.data();
    
    // Count by difficulty
    if (article.difficulty) {
      stats.articlesByDifficulty[article.difficulty] = 
        (stats.articlesByDifficulty[article.difficulty] || 0) + 1;
    }
    
    // Count by source
    const sourceName = article.source?.name || article.source || 'unknown';
    stats.articlesBySource[sourceName] = 
      (stats.articlesBySource[sourceName] || 0) + 1;
    
    // Count by category
    if (article.category) {
      stats.articlesByCategory[article.category] = 
        (stats.articlesByCategory[article.category] || 0) + 1;
    }
    
    // Sum reading times
    if (article.estimatedReadingTime) {
      totalReadingTime += article.estimatedReadingTime;
    }
    
    // Check if expiring soon
    if (article.expiresAt) {
      const expiresAt = article.expiresAt.toDate ? article.expiresAt.toDate() : new Date(article.expiresAt);
      if (expiresAt <= sevenDaysFromNow) {
        stats.expiringSoon++;
      }
    }
  });

  // Calculate average reading time
  stats.averageReadingTime = stats.totalArticles > 0 
    ? Math.round(totalReadingTime / stats.totalArticles) 
    : 0;

  // Get top 10 most viewed articles
  const articleViews: Record<string, number> = {};
  viewsSnapshot.forEach((doc: any) => {
    const data = doc.data();
    if (data.articleId) {
      articleViews[data.articleId] = (articleViews[data.articleId] || 0) + 1;
    }
  });

  const sortedArticles = Object.entries(articleViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  stats.topArticles = sortedArticles.map(([articleId, views]) => ({
    articleId,
    views
  }));

  return stats;
}

export async function GET(request: NextRequest) {
  try {
    const idToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    
    // Verify the ID token and check admin status
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
      console.log('[ArticleStats] Token verified for user:', decodedToken.uid);
    } catch (tokenError: any) {
      console.error('[ArticleStats] Token verification failed:', tokenError.message);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    // Check admin status from custom claims or email
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    
    console.log('[ArticleStats] Admin check:', { 
      uid: decodedToken.uid,
      email: decodedToken.email,
      hasAdminClaim: decodedToken.admin === true,
      isAdmin
    });
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const stats = await getArticleStats();

    // Return in the format expected by the client
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error in admin/articles/stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const idToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    
    // Verify the ID token and check admin status
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
      console.log('[ArticleStats] Token verified for user:', decodedToken.uid);
    } catch (tokenError: any) {
      console.error('[ArticleStats] Token verification failed:', tokenError.message);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    // Check admin status from custom claims or email
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    
    console.log('[ArticleStats] Admin check:', { 
      uid: decodedToken.uid,
      email: decodedToken.email,
      hasAdminClaim: decodedToken.admin === true,
      isAdmin
    });
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // For refresh action, just return the stats again
    const body = await request.json();
    if (body.action === 'refresh') {
      const stats = await getArticleStats();
      
      return NextResponse.json({
        success: true,
        stats
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in admin/articles/stats POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}