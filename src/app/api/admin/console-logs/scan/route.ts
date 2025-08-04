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

    // Dynamic import for CommonJS module
    const ConsoleLogManager = require('../../../../../scripts/console-log-manager');
    
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