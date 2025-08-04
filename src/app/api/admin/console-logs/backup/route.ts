import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { adminGuard } from '@/lib/adminGuard';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const session = await getServerSession();
    const adminCheck = await adminGuard(request);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Dynamic import for CommonJS module
    const ConsoleLogManager = require('../../../../../scripts/console-log-manager');
    
    // Create manager instance
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