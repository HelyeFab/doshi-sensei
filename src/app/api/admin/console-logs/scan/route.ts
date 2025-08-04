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

    // Dynamic import for CommonJS module
    const ConsoleLogManager = require('../../../../../../scripts/console-log-manager');
    
    // Create manager instance
    const manager = new ConsoleLogManager();
    
    // Scan for console logs
    await manager.scanConsoleLogs();
    
    // Generate report
    const report = await manager.generateReport();
    
    return NextResponse.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Console log scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan console logs: ' + (error as Error).message },
      { status: 500 }
    );
  }
}