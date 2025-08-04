import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { adminGuard } from '@/lib/adminGuard';

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const session = await getServerSession();
    const adminCheck = await adminGuard(request);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { categories, files, methods, dryRun } = body;

    // Dynamic import for CommonJS module
    const ConsoleLogManager = require('../../../../../scripts/console-log-manager');
    
    // Create manager instance
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