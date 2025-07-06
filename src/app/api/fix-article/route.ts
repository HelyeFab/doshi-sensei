import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { articleId, action } = await request.json();
    
    if (!articleId) {
      return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }
    
    const articleRef = doc(db, 'articles', articleId);
    const articleDoc = await getDoc(articleRef);
    
    if (!articleDoc.exists()) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    
    const data = articleDoc.data();
    
    if (action === 'delete') {
      // Delete the article
      await deleteDoc(articleRef);
      return NextResponse.json({ 
        success: true, 
        message: `Article ${articleId} deleted` 
      });
    } else if (action === 'fix') {
      // Try to fix the article by using summary as content
      if (data.summary && data.summary.length > 0) {
        await updateDoc(articleRef, {
          content: data.summary,
          fixedAt: new Date().toISOString(),
          originalContentWasEmpty: true
        });
        
        return NextResponse.json({ 
          success: true, 
          message: `Article ${articleId} fixed using summary as content`,
          newContent: data.summary
        });
      } else {
        return NextResponse.json({ 
          error: 'Cannot fix - no summary available',
          articleId 
        }, { status: 400 });
      }
    } else if (action === 'rescrape') {
      // Extract the URL and prepare for rescraping
      if (!data.url) {
        return NextResponse.json({ 
          error: 'Cannot rescrape - no URL available',
          articleId 
        }, { status: 400 });
      }
      
      // For now, just return the URL so we can manually rescrape
      return NextResponse.json({ 
        success: true,
        message: 'Ready to rescrape',
        url: data.url,
        articleId
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Fix article error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix article',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get('id');
    
    if (!articleId) {
      return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }
    
    const articleRef = doc(db, 'articles', articleId);
    await deleteDoc(articleRef);
    
    return NextResponse.json({ 
      success: true, 
      message: `Article ${articleId} deleted` 
    });
    
  } catch (error) {
    console.error('Delete article error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete article',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}