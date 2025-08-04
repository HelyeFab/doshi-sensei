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
    const { categories, files, methods, dryRun } = body;

    // Get console log manager
    const ConsoleLogManager = await getConsoleLogManager();
    const manager = new ConsoleLogManager();
    
    // Scan first
    await manager.scanConsoleLogs();
    
    // Create backup if not dry run
    let backupFile = null;
    if (!dryRun) {
      const backupPath = await manager.createBackup();
      backupFile = backupPath;
    }
    
    // Remove console logs
    const removed = await manager.removeConsoleLogs({
      categories,
      files,
      methods,
      dryRun: dryRun || false
    });
    
    return NextResponse.json({
      success: true,
      removed,
      backupFile,
      dryRun: dryRun || false
    });
  } catch (error) {
    console.error('Console log remove error:', error);
    return NextResponse.json(
      { error: 'Failed to remove console logs' },
      { status: 500 }
    );
  }
}