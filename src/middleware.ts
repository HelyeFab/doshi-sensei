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

  // Check for maintenance mode
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
  // Priority 1: Environment variable kill switch
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
    return {
      isActive: true,
      reason: 'env_variable',
      message: process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE,
      estimatedTime: process.env.NEXT_PUBLIC_MAINTENANCE_ETA
    };
  }

  // Priority 2: Check Firestore for dynamic control (admin dashboard)
  try {
    const response = await fetch(`${request.nextUrl.origin}/api/admin/maintenance-status`, {
      method: 'GET',
      headers: {
        'x-internal-request': 'true'
      },
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.maintenanceMode) {
        return {
          isActive: true,
          reason: 'admin_dashboard',
          message: data.message,
          estimatedTime: data.estimatedTime
        };
      }
    }
  } catch (error) {
    // If we can't check the database, continue normally
    console.error('[MAINTENANCE] Failed to check database status:', error);
  }

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