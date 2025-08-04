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
    const { backupFile, logIds, categories, files } = body;

    // Dynamic import for CommonJS module
    const ConsoleLogManager = require('../../../../../scripts/console-log-manager');
    
    // Create manager instance
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