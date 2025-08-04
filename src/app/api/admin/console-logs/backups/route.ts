import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { adminGuard } from '@/lib/adminGuard';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const session = await getServerSession();
    const adminCheck = await adminGuard(request);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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