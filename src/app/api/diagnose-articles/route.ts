import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      return NextResponse.json({ 
        error: 'Firebase not initialized',
        message: 'Database connection not available'
      }, { status: 500 });
    }
    const searchParams = request.nextUrl.searchParams;
    const specificId = searchParams.get('id');
    
    if (specificId) {
      // Check specific article
      console.log(`Checking specific article: ${specificId}`);
      const articleDoc = await getDoc(doc(db, 'articles', specificId));
      
      if (!articleDoc.exists()) {
        return NextResponse.json({ 
          error: 'Article not found',
          id: specificId 
        }, { status: 404 });
      }
      
      const data = articleDoc.data();
      
      return NextResponse.json({
        id: specificId,
        exists: true,
        fields: Object.keys(data),
        hasContent: !!data.content,
        hasBody: !!data.body,
        hasText: !!data.text,
        hasSummary: !!data.summary,
        contentLength: data.content?.length || 0,
        bodyLength: data.body?.length || 0,
        textLength: data.text?.length || 0,
        summaryLength: data.summary?.length || 0,
        title: data.title,
        sampleContent: data.content?.substring(0, 200) || data.body?.substring(0, 200) || data.text?.substring(0, 200) || 'NO CONTENT',
        fullData: data
      });
    }
    
    // General diagnosis
    const articlesRef = collection(db, 'articles');
    const q = query(articlesRef, limit(10));
    const snapshot = await getDocs(q);
    
    const articles = [];
    const stats = {
      total: 0,
      withContent: 0,
      withBody: 0,
      withText: 0,
      withSummary: 0,
      noContent: 0,
      contentFields: new Set<string>()
    };
    
    snapshot.forEach(doc => {
      stats.total++;
      const data = doc.data();
      
      // Check which content fields exist
      Object.keys(data).forEach(key => {
        if (key.toLowerCase().includes('content') || 
            key.toLowerCase().includes('body') || 
            key.toLowerCase().includes('text')) {
          stats.contentFields.add(key);
        }
      });
      
      const hasContent = !!data.content;
      const hasBody = !!data.body;
      const hasText = !!data.text;
      const hasSummary = !!data.summary;
      
      if (hasContent) stats.withContent++;
      if (hasBody) stats.withBody++;
      if (hasText) stats.withText++;
      if (hasSummary) stats.withSummary++;
      if (!hasContent && !hasBody && !hasText) stats.noContent++;
      
      articles.push({
        id: doc.id,
        title: data.title || 'NO TITLE',
        fields: Object.keys(data),
        hasContent,
        hasBody,
        hasText,
        hasSummary,
        contentLength: data.content?.length || 0,
        bodyLength: data.body?.length || 0,
        textLength: data.text?.length || 0,
        summaryLength: data.summary?.length || 0,
        sampleContent: (data.content || data.body || data.text || data.summary || '').substring(0, 100)
      });
    });
    
    return NextResponse.json({
      articles,
      stats: {
        ...stats,
        contentFields: Array.from(stats.contentFields)
      }
    });
    
  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json({ 
      error: 'Failed to diagnose articles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}