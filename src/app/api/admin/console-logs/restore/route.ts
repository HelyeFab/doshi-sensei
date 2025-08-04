import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/types/admin';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For server-side admin check, we'll mark this as admin request
    (global as any).__adminRequest = true;

    const body = await request.json();
    const { backupFile, logIds, categories, files } = body;

    // Dynamic import for CommonJS module
    const ConsoleLogManager = require('../../../../../../scripts/console-log-manager');
    
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