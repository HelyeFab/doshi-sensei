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
  const url = request.nextUrl;

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if this is an RSC (React Server Component) request
  const isRSC = url.searchParams.has('_rsc') || 
                request.headers.get('rsc') === '1' ||
                request.headers.get('accept')?.includes('text/x-component');

  // Handle RSC requests specially to prevent 502 errors
  if (isRSC) {
    console.log(`[Middleware] RSC request for: ${pathname}`);
    
    // ALWAYS handle RSC requests specially, not just problematic paths
    const response = NextResponse.next();
    
    // AGGRESSIVE: Force no caching for all RSC requests
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    response.headers.set('X-Accel-Expires', '0');
    
    // Tell service workers to bypass cache
    response.headers.set('X-Service-Worker-Bypass', '1');
    response.headers.set('X-RSC-Route', pathname);
    
    // Disable proxy buffering
    response.headers.set('X-Accel-Buffering', 'no');
    
    // For Netlify, increase timeout
    if (process.env.NETLIFY) {
      response.headers.set('X-Function-Timeout', '25000'); // 25 seconds
    }
    
    return response;
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