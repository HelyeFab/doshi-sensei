import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that should bypass middleware
const PUBLIC_PATHS = [
  '/_next',
  '/api/webhook',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/icon.svg',
];

// Admin paths that should always be accessible
const ADMIN_PATHS = ['/admin', '/api/admin'];
const MAINTENANCE_PATHS = ['/maintenance', '/api/health'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for maintenance mode (only uses env variables, safe for edge runtime)
  const maintenanceMode = await checkMaintenanceMode(request);
  
  if (maintenanceMode.isActive && 
      !ADMIN_PATHS.some(path => pathname.startsWith(path)) &&
      !MAINTENANCE_PATHS.some(path => pathname.startsWith(path))) {
    
    // Log the shutdown trigger for monitoring
    console.log(`[MAINTENANCE] Mode activated: ${maintenanceMode.reason}`);
    
    // API endpoints return JSON error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          message: maintenanceMode.message || 'We are performing maintenance. Please try again later.',
          estimatedTime: maintenanceMode.estimatedTime
        },
        { status: 503 }
      );
    }
    
    // Redirect web pages to maintenance page
    const url = request.nextUrl.clone();
    url.pathname = '/maintenance';
    url.searchParams.set('reason', maintenanceMode.reason);
    if (maintenanceMode.message) {
      url.searchParams.set('message', maintenanceMode.message);
    }
    return NextResponse.redirect(url);
  }

  // Add basic security headers
  const response = NextResponse.next();
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

async function checkMaintenanceMode(request: NextRequest): Promise<{
  isActive: boolean;
  reason: string;
  message?: string;
  estimatedTime?: string;
}> {
  // Priority 1: Environment variable kill switch (works on edge runtime)
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
    return {
      isActive: true,
      reason: 'env_variable',
      message: process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE,
      estimatedTime: process.env.NEXT_PUBLIC_MAINTENANCE_ETA
    };
  }

  // Note: Database checks disabled in middleware due to Netlify Edge runtime limitations
  // Use environment variables for maintenance mode control
  
  return { isActive: false, reason: 'none' };
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};