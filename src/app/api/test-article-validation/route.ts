import { NextRequest, NextResponse } from 'next/server';
import { articlePostProcessor } from '@/services/articlePostProcessor';

// Test endpoint for article validation
// This allows manual testing of the article validation flow
export async function POST(request: NextRequest) {
  try {
    const { articleId, forceReprocess } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    console.log(`🧪 [TEST] Processing article: ${articleId}`);
    
    // Process the article
    const result = await articlePostProcessor.reprocessArticle(articleId, forceReprocess);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: `Article ${articleId} processed successfully`,
        articleId
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Failed to process article ${articleId}`,
        articleId
      });
    }

  } catch (error: any) {
    console.error('Test validation error:', error);
    return NextResponse.json(
      { error: 'Failed to process article', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to trigger batch processing
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST] Triggering batch article processing...');
    
    // Process unvalidated articles
    await articlePostProcessor.processUnvalidatedArticles(3); // Process 3 articles
    
    return NextResponse.json({
      success: true,
      message: 'Batch processing triggered'
    });

  } catch (error: any) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger batch processing', details: error.message },
      { status: 500 }
    );
  }
}