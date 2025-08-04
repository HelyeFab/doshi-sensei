import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Console log management is development-only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Console log management is not available in production' },
      { status: 404 }
    );
  }

  // In development, this feature would work but we're avoiding the import
  // to prevent build issues. The console management can be done via CLI.
  return NextResponse.json(
    { error: 'Console log management via API is temporarily disabled. Please use CLI commands.' },
    { status: 503 }
  );
}