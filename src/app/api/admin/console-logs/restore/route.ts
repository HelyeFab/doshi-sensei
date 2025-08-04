import { NextRequest, NextResponse } from 'next/server';

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { backupFile, logIds, categories, files } = body;

    // Dynamically load the console log manager in development
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.join(process.cwd(), 'scripts', 'console-log-manager.js');
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Console log manager script not found');
    }

    // Clear require cache to get fresh instance
    delete require.cache[require.resolve(scriptPath)];
    
    // Load the module
    const ConsoleLogManager = require(scriptPath);
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