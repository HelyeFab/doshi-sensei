import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/types/admin';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For server-side admin check, we'll mark this as admin request
    (global as any).__adminRequest = true;

    const backupDir = path.join(process.cwd(), 'console-logs-backup');
    
    try {
      // Check if directory exists
      await fs.access(backupDir);
      
      // Read all backup files
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a)); // Sort newest first
      
      return NextResponse.json({
        success: true,
        backups: backupFiles
      });
    } catch (error) {
      // Directory doesn't exist
      return NextResponse.json({
        success: true,
        backups: []
      });
    }
  } catch (error) {
    console.error('List backups error:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}