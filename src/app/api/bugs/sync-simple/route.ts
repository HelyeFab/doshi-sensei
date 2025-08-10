import { NextRequest, NextResponse } from 'next/server';

// Simple mock data for testing the authentication
const mockBugReports = [
  {
    id: 'BUG_20250810_TEST1',
    category: 'bug',
    title: 'Test Bug Report 1',
    description: 'This is a test bug report to verify the sync functionality',
    userEmail: 'test@example.com',
    userName: 'Test User',
    url: 'https://doshisensei.com/test',
    userAgent: 'Mozilla/5.0 Test',
    viewport: '1920x1080',
    timestamp: new Date().toISOString(),
    status: 'new',
    priority: 'medium',
    tags: ['test', 'sync-test'],
    adminNotes: [],
    obsidianSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'BUG_20250810_TEST2', 
    category: 'feature',
    title: 'Feature Request - Better Sync',
    description: 'Would be great to have real-time sync with Obsidian',
    userEmail: 'user2@example.com',
    userName: 'User Two',
    url: 'https://doshisensei.com/features',
    userAgent: 'Mozilla/5.0 Chrome',
    viewport: '1366x768',
    timestamp: new Date().toISOString(),
    status: 'new',
    priority: 'low',
    tags: ['feature', 'enhancement'],
    adminNotes: [],
    obsidianSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    
    // Debug logging
    console.log('[Bug Sync Simple API] Request received');
    console.log('[Bug Sync Simple API] API Key from header:', apiKey ? `${apiKey.substring(0, 10)}...` : 'None provided');
    console.log('[Bug Sync Simple API] Valid API Key from env:', process.env.BUG_SYNC_API_KEY ? `${process.env.BUG_SYNC_API_KEY.substring(0, 10)}...` : 'NOT SET IN ENV');
    
    if (!apiKey) {
      console.log('[Bug Sync Simple API] Rejected: No API key provided');
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Validate API key
    const validApiKey = process.env.BUG_SYNC_API_KEY;
    if (!validApiKey) {
      console.error('[Bug Sync Simple API] ERROR: BUG_SYNC_API_KEY not set in environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error - API key not configured' },
        { status: 500 }
      );
    }
    
    if (apiKey !== validApiKey) {
      console.log('[Bug Sync Simple API] Rejected: Invalid API key');
      console.log('[Bug Sync Simple API] Key mismatch');
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    console.log('[Bug Sync Simple API] Authentication successful');

    // For now, return mock data to test the connection
    return NextResponse.json({
      success: true,
      count: mockBugReports.length,
      lastSync: new Date().toISOString(),
      reports: mockBugReports,
      message: 'This is a simplified test endpoint. Once authentication works, we\'ll connect to Firebase.'
    });

  } catch (error: any) {
    console.error('[Bug Sync Simple API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Mark reports as synced
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const validApiKey = process.env.BUG_SYNC_API_KEY;
    if (!validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const { reportIds } = await request.json();
    
    console.log('[Bug Sync Simple API] Marking as synced:', reportIds);

    return NextResponse.json({
      success: true,
      syncedCount: reportIds?.length || 0,
      syncedAt: new Date().toISOString(),
      message: 'Mock sync successful'
    });

  } catch (error: any) {
    console.error('[Bug Sync Simple API] POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update sync status' },
      { status: 500 }
    );
  }
}