import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/adminGuard';
import { getConsoleLogManager } from '@/lib/console-log-manager-wrapper';

export async function POST(request: NextRequest) {
  // Console log management is development-only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Console log management is not available in production' },
      { status: 404 }
    );
  }
  try {
    // Check admin access
    const adminCheck = await adminGuard(request);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { backupFile, logIds, categories, files } = body;

    // Get console log manager
    const ConsoleLogManager = await getConsoleLogManager();
    const manager = new ConsoleLogManager();
    
    // Restore console logs
    const restoredCount = await manager.restoreConsoleLogs({
      backupFile,
      logIds,
      categories,
      files
    });
    
    return NextResponse.json({
      success: true,
      restored: restoredCount
    });
  } catch (error) {
    console.error('Console log restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore console logs' },
      { status: 500 }
    );
  }
}