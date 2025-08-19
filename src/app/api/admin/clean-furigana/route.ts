import { NextRequest, NextResponse } from 'next/server';
import { cleanArticleFurigana, hasFuriganaAnnotations } from '@/utils/cleanArticleFurigana';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../../../../../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { articleId, batchSize = 10 } = await request.json();

    if (articleId) {
      // Clean a specific article
      const articleRef = db.collection('articles').doc(articleId);
      const articleDoc = await articleRef.get();
      
      if (!articleDoc.exists) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }

      const data = articleDoc.data();
      const content = data?.content || data?.body || '';
      
      if (hasFuriganaAnnotations(content)) {
        const cleanedContent = cleanArticleFurigana(content);
        
        await articleRef.update({
          content: cleanedContent,
          furiganaCleaned: true,
          cleanedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({
          success: true,
          message: 'Article cleaned',
          articleId,
          before: content.substring(0, 100),
          after: cleanedContent.substring(0, 100)
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Article already clean',
          articleId
        });
      }
    } else {
      // Clean a batch of articles
      const articlesSnapshot = await db.collection('articles')
        .where('visible', '==', true)
        .limit(batchSize)
        .get();
      
      if (articlesSnapshot.empty) {
        return NextResponse.json({
          success: true,
          message: 'No articles found',
          cleaned: 0
        });
      }

      let cleanedCount = 0;
      const results = [];

      for (const docSnapshot of articlesSnapshot.docs) {
        const data = docSnapshot.data();
        const content = data.content || data.body || '';
        
        if (hasFuriganaAnnotations(content)) {
          const cleanedContent = cleanArticleFurigana(content);
          
          await docSnapshot.ref.update({
            content: cleanedContent,
            furiganaCleaned: true,
            cleanedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          results.push({
            id: docSnapshot.id,
            title: data.title?.substring(0, 50),
            hadFurigana: true
          });
          
          cleanedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cleaned ${cleanedCount} of ${articlesSnapshot.size} articles`,
        cleaned: cleanedCount,
        total: articlesSnapshot.size,
        results
      });
    }
  } catch (error) {
    console.error('Error cleaning articles:', error);
    return NextResponse.json(
      { error: 'Failed to clean articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  try {
    const articlesSnapshot = await db.collection('articles')
      .where('visible', '==', true)
      .get();
    
    let withFurigana = 0;
    let cleaned = 0;
    const samples = [];

    for (const docSnapshot of articlesSnapshot.docs) {
      const data = docSnapshot.data();
      const content = data.content || data.body || '';
      
      if (hasFuriganaAnnotations(content)) {
        withFurigana++;
        if (samples.length < 3) {
          samples.push({
            id: docSnapshot.id,
            title: data.title?.substring(0, 50),
            sample: content.substring(0, 100)
          });
        }
      }
      
      if (data.furiganaCleaned) {
        cleaned++;
      }
    }

    return NextResponse.json({
      total: articlesSnapshot.size,
      withFurigana,
      cleaned,
      needsCleaning: withFurigana,
      samples
    });
  } catch (error) {
    console.error('Error checking articles:', error);
    return NextResponse.json(
      { error: 'Failed to check articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}