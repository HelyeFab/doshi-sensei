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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Add security headers
  const response = NextResponse.next();
  
  // Skip CSP in development to avoid Stripe/API loading issues
  if (process.env.NODE_ENV === 'development') {
    // Remove any CSP headers that might be set
    response.headers.delete('Content-Security-Policy');
  }
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // For API routes in Netlify, ensure proper handling
  if (pathname.startsWith('/api/') && process.env.NETLIFY) {
    // Set a reasonable timeout header
    response.headers.set('X-Function-Timeout', '9000');
  }

  return response;
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