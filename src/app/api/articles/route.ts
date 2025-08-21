import { NextRequest, NextResponse } from 'next/server';
import { ArticleManager } from '@/utils/articleManager';
import { ArticlePaginationOptions } from '@/types/news';

// GET /api/articles - Get paginated articles with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const options: ArticlePaginationOptions = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      difficulty: searchParams.get('difficulty')?.split(',') as any,
      category: searchParams.get('category')?.split(','),
      source: searchParams.get('source')?.split(','),
      sortBy: searchParams.get('sortBy') as any || 'scrapedAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc'
    };
    
    // Filter out empty arrays and validate JLPT levels
    if (options.difficulty?.length === 1 && options.difficulty[0] === '' as any) {
      options.difficulty = undefined;
    } else if (options.difficulty) {
      // Filter out any empty strings and validate JLPT levels
      const validLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
      const filteredDifficulty = options.difficulty.filter(level => level && validLevels.includes(level));
      if (filteredDifficulty.length === 0) {
        options.difficulty = undefined;
      } else {
        options.difficulty = filteredDifficulty as any;
      }
    }
    if (options.category?.length === 1 && options.category[0] === '') {
      options.category = undefined;
    }
    if (options.source?.length === 1 && options.source[0] === '') {
      options.source = undefined;
    }
    
    const result = await ArticleManager.getArticles(options);
    
    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page: result.currentPage,
        limit: options.limit,
        total: result.totalCount,
        hasNext: result.hasNextPage,
        hasPrev: result.hasPreviousPage
      }
    });
    
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch articles' 
      },
      { status: 500 }
    );
  }
}

// POST /api/articles/refresh - Force refresh articles (admin only)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh') {
      const result = await ArticleManager.refreshArticles();
      
      return NextResponse.json({
        success: result.success,
        message: result.message,
        stats: result.stats
      });
    }
    
    if (action === 'cleanup') {
      const deletedCount = await ArticleManager.cleanupExpiredArticles();
      
      return NextResponse.json({
        success: true,
        message: `Cleanup completed: ${deletedCount} articles deleted`,
        deletedCount
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error in article action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Action failed' 
      },
      { status: 500 }
    );
  }
}