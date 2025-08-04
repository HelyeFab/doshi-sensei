import { NextResponse } from 'next/server';

// This file ensures the console-logs directory exists but returns 404 in production
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Console log management is not available in production' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    message: 'Console log management API',
    endpoints: [
      '/api/admin/console-logs/scan',
      '/api/admin/console-logs/backup',
      '/api/admin/console-logs/backups',
      '/api/admin/console-logs/remove',
      '/api/admin/console-logs/restore'
    ]
  });
}