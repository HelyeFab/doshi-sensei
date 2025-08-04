import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/adminGuard';
import { getConsoleLogManager } from '@/lib/console-log-manager-wrapper';
import path from 'path';

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

    // Get console log manager
    const ConsoleLogManager = await getConsoleLogManager();
    const manager = new ConsoleLogManager();
    
    // Scan and create backup
    await manager.scanConsoleLogs();
    const backupPath = await manager.createBackup();
    
    return NextResponse.json({
      success: true,
      backupFile: path.basename(backupPath),
      totalLogs: manager.logs?.length || 0
    });
  } catch (error) {
    console.error('Console log backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup: ' + (error as Error).message },
      { status: 500 }
    );
  }
}