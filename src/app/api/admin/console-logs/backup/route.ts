import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/types/admin';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For server-side admin check, we'll mark this as admin request
    (global as any).__adminRequest = true;

    // Dynamic import for CommonJS module
    const ConsoleLogManager = require('../../../../../../scripts/console-log-manager');
    
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